"""
============================================================
 app/services/booking_service.py
============================================================
 Logique métier des RÉSERVATIONS.

 Règles appliquées :
  - Un créneau passé ne peut pas être réservé.
  - Pas de double-réservation sur (terrain, date, créneau).
  - Annulation impossible si moins de 5h avant le début.
  - Le tarif total est calculé côté serveur (pas confiance
    au montant envoyé par le client).
============================================================
"""

import datetime as dt
from app.repositories import booking_repository, court_repository, user_repository
from app.models import booking_from_row, court_from_row, user_public
from app.services.slot_service import end_time_of
from app.core.errors import (
    NotFound, ValidationError, SlotInPast, SlotUnavailable,
    CancelTooLate, Forbidden, AccountArchived,
)


def _now():
    """Wrapper testable autour de datetime.now()."""
    return dt.datetime.now()


def _ensure_active(user_id: int):
    """Bloque une action métier si le compte est archivé."""
    row = user_repository.find_by_id(user_id)
    if row is None:
        raise NotFound("Utilisateur introuvable.")
    try:
        if row["archived"]:
            raise AccountArchived()
    except (KeyError, IndexError):
        pass  # ancien schéma sans la colonne — on ignore


def _validate_slot(date: str, start_time: str):
    """Vérifie le format date/heure et que ce n'est pas dans le passé."""
    try:
        slot_dt = dt.datetime.strptime(f"{date} {start_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise ValidationError("Date ou heure invalide.")
    if slot_dt <= _now():
        raise SlotInPast()
    return slot_dt


def create_booking(user_id: int, court_id: int, date: str, start_time: str):
    """
    Crée une réservation. Étapes :
      1. Valider le compte (non archivé).
      2. Valider le créneau (futur, format).
      3. Vérifier que le terrain existe.
      4. Vérifier qu'il n'y a pas de conflit.
      5. Calculer le prix total côté serveur.
      6. Insérer + générer le lien de partage.
    """
    _ensure_active(user_id)
    _validate_slot(date, start_time)

    court_row = court_repository.find_by_id(court_id)
    if court_row is None:
        raise NotFound("Terrain introuvable.")
    court = court_from_row(court_row)

    if booking_repository.find_conflict(court_id, date, start_time):
        raise SlotUnavailable()

    end_time = end_time_of(start_time)

    # Calcul du prix : c'est TOUJOURS prix par joueur × capacité du terrain.
    # - Terrain "Double"     : 110 × 4 = 440 MAD (4 joueurs).
    # - Terrain "Individuel" : 125 × 2 = 250 MAD (2 joueurs en 1v1).
    # Une réservation directe (sans match) implique que la personne paie
    # pour la séance complète (toutes les places).
    total = court["price"] * court["capacity"]

    booking_id = booking_repository.create(
        user_id=user_id,
        court_id=court_id,
        date=date,
        start_time=start_time,
        end_time=end_time,
        total=total,
    )

    # Lien de partage généré APRÈS l'insert (besoin de l'id)
    share_link = f"https://saadqerd.pythonanywhere.com/join/booking/{booking_id}"
    booking_repository.update_share_link(booking_id, share_link)

    return get_booking(booking_id)


def get_booking(booking_id: int):
    """Retourne le détail d'une réservation (avec court joint)."""
    row = booking_repository.find_by_id(booking_id)
    if row is None:
        raise NotFound("Réservation introuvable.")
    court = court_from_row(court_repository.find_by_id(row["court_id"]))
    return booking_from_row(row, court=court)


def list_user_bookings(user_id: int):
    rows = booking_repository.list_by_user(user_id)
    return [
        booking_from_row(r, court=court_from_row(court_repository.find_by_id(r["court_id"])))
        for r in rows
    ]


def list_all_bookings():
    """Vue admin : toutes les réservations avec utilisateur + terrain."""
    from app.repositories import user_repository
    rows = booking_repository.list_all()
    out = []
    for r in rows:
        court = court_from_row(court_repository.find_by_id(r["court_id"]))
        user  = user_public(user_repository.find_by_id(r["user_id"]))
        out.append(booking_from_row(r, court=court, user=user))
    return out


def cancel_booking(booking_id: int, user_id: int, is_admin: bool):
    """
    Annule une réservation.

    Règles :
      - Seul le propriétaire ou un admin peut annuler.
      - Pas d'annulation si moins de 5h avant le début (sauf admin).
    """
    row = booking_repository.find_by_id(booking_id)
    if row is None:
        raise NotFound("Réservation introuvable.")

    if row["user_id"] != user_id and not is_admin:
        raise Forbidden("Seul le propriétaire de la réservation peut l'annuler.")

    if row["status"] == "cancelled":
        return booking_from_row(row)

    # Vérification du délai d'annulation (cf. SPECS §5)
    if not is_admin:
        from app.core.config import CANCEL_DEADLINE_HOURS
        slot_dt = dt.datetime.strptime(f"{row['date']} {row['start_time']}", "%Y-%m-%d %H:%M")
        if slot_dt - _now() < dt.timedelta(hours=CANCEL_DEADLINE_HOURS):
            raise CancelTooLate()

    booking_repository.update_status(booking_id, "cancelled")
    return get_booking(booking_id)


def set_payment(booking_id: int, payment_status: str):
    """Action admin : marquer payé / impayé."""
    if payment_status not in ("paid", "unpaid"):
        raise ValidationError("Statut de paiement invalide.")
    if booking_repository.find_by_id(booking_id) is None:
        raise NotFound("Réservation introuvable.")
    booking_repository.update_payment(booking_id, payment_status)
    return get_booking(booking_id)


def update_booking(booking_id: int, user_id: int, is_admin: bool,
                   court_id: int = None, date: str = None,
                   start_time: str = None):
    """
    Met à jour les champs modifiables d'une réservation.
    Règles :
      - Seul le propriétaire ou un admin peut modifier.
      - La réservation doit être 'scheduled' (non terminée, non annulée).
      - Le nouveau créneau doit être futur et libre (sans se compter soi-même).
      - Le total est recalculé côté serveur (jamais reçu du client).
    """
    row = booking_repository.find_by_id(booking_id)
    if row is None:
        raise NotFound("Réservation introuvable.")
    if row["user_id"] != user_id and not is_admin:
        raise Forbidden("Seul le propriétaire de la réservation peut la modifier.")
    if row["status"] != "scheduled":
        raise ValidationError("Cette réservation ne peut plus être modifiée.")

    new_court_id = int(court_id) if court_id is not None else row["court_id"]
    new_date     = date          if date      is not None else row["date"]
    new_start    = start_time    if start_time is not None else row["start_time"]

    _validate_slot(new_date, new_start)

    court_row = court_repository.find_by_id(new_court_id)
    if court_row is None:
        raise NotFound("Terrain introuvable.")
    court = court_from_row(court_row)

    if booking_repository.find_conflict_excluding(
        new_court_id, new_date, new_start, exclude_booking_id=booking_id
    ):
        raise SlotUnavailable()

    new_end = end_time_of(new_start)
    # Prix par joueur × capacité du terrain (cohérent avec create_booking).
    new_total = court["price"] * court["capacity"]
    booking_repository.update_fields(
        booking_id=booking_id,
        court_id=new_court_id,
        date=new_date,
        start_time=new_start,
        end_time=new_end,
        total=new_total,
    )
    return get_booking(booking_id)


def admin_create_booking_for(user_id: int, court_id: int, date: str, start_time: str):
    """
    Variante de create_booking() pour la création par un admin
    POUR un autre utilisateur (l'admin choisit le client).
    Réutilise la même logique de validation.
    """
    return create_booking(user_id, court_id, date, start_time)
