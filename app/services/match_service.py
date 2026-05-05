"""
============================================================
 app/services/match_service.py
============================================================
 Logique métier des MATCHS — la couche la plus riche.

 Responsabilités :
  - Création d'un match (validation Elo, créneau, terrain libre).
  - Rejoindre / quitter un match (compatibilité Elo, capacité).
  - Annulation par le créateur ou un admin.
  - Soumission du score → mise à jour de l'Elo de TOUS les joueurs.
  - Notation entre joueurs après un match.
============================================================
"""

import datetime as dt

from app.repositories import (
    match_repository, court_repository, user_repository, booking_repository,
)
from app.models import (
    match_from_row, court_from_row, match_result_from_row, user_public,
)
from app.services.slot_service import end_time_of
from app.services import elo_service
from app.core.config import CANCEL_DEADLINE_HOURS
from app.core.errors import (
    NotFound, ValidationError, SlotInPast, SlotUnavailable,
    EloIncompatible, MatchFull, AlreadyJoined, NotInMatch,
    Forbidden, MatchAlreadyCompleted, AlreadyRated, CancelTooLate,
    AccountArchived,
)


# -----------------------------------------------------------
#  HELPERS PRIVÉS
# -----------------------------------------------------------
def _now():
    return dt.datetime.now()


def _ensure_active(user_id: int):
    """Refuse une action métier si le compte est archivé."""
    row = user_repository.find_by_id(user_id)
    if row is None:
        raise NotFound("Utilisateur introuvable.")
    try:
        if row["archived"]:
            raise AccountArchived()
    except (KeyError, IndexError):
        pass


def _validate_future_slot(date: str, start_time: str):
    try:
        slot_dt = dt.datetime.strptime(f"{date} {start_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise ValidationError("Date ou heure invalide.")
    if slot_dt <= _now():
        raise SlotInPast()
    return slot_dt


def _hydrate(row):
    """
    Construit le DTO complet d'un match (court + players + creator + result + raters).
    Utilisé partout où on retourne un match au frontend.

    `rated_by` : liste des IDs des joueurs ayant déjà émis ≥1 notation pour
    ce match. Permet au frontend de masquer le bouton "Évaluer" pour ceux
    qui ont fini, sans avoir à recharger l'utilisateur courant.
    """
    if row is None:
        return None
    court  = court_from_row(court_repository.find_by_id(row["court_id"]))
    players = [user_public(p) for p in match_repository.list_players(row["id"])]
    creator = user_public(user_repository.find_by_id(row["created_by"]))
    result  = match_result_from_row(match_repository.find_result(row["id"]))
    rated_by = match_repository.list_raters(row["id"])
    dto = match_from_row(row, court=court, players=players,
                         creator=creator, result=result)
    if dto is not None:
        dto["rated_by"] = rated_by
        # Pratique pour le frontend : indicateur "le match est-il dans le passé ?"
        # On le calcule côté serveur pour ne pas dépendre de l'horloge du navigateur.
        try:
            slot_dt = dt.datetime.strptime(
                f"{row['date']} {row['start_time']}", "%Y-%m-%d %H:%M"
            )
            dto["slot_in_past"] = slot_dt <= _now()
        except (ValueError, KeyError):
            dto["slot_in_past"] = False
        # Capacité max (utile pour savoir si le match est COMPLET sans dépendre du DTO court)
        dto["max_players"] = court["capacity"] if court else 0
        dto["is_full"] = court is not None and len(players) >= court["capacity"]
    return dto


# -----------------------------------------------------------
#  CRÉATION
# -----------------------------------------------------------
def create_match(creator_id: int, court_id: int, date: str, start_time: str,
                 level_min: float, level_max: float,
                 visibility: str = "public", note: str = None):
    """
    Crée un match. Étapes :
      1. Valider le compte (non archivé).
      2. Valider le créneau (futur).
      3. Récupérer le terrain → on en déduit le type (Double / Simple).
      4. Vérifier la cohérence des bornes Elo.
      5. Vérifier que l'Elo du créateur lui permet de créer ce niveau.
      6. Vérifier qu'aucun match/booking n'occupe ce créneau.
      7. Insérer le match.
      8. Ajouter automatiquement le créateur comme premier joueur.
      9. Générer le lien de partage.
    """
    _ensure_active(creator_id)
    _validate_future_slot(date, start_time)

    # 2. Terrain
    court_row = court_repository.find_by_id(court_id)
    if court_row is None:
        raise NotFound("Terrain introuvable.")
    court = court_from_row(court_row)

    # 3. Bornes Elo
    try:
        level_min = float(level_min)
        level_max = float(level_max)
    except (TypeError, ValueError):
        raise ValidationError("Niveaux Elo invalides.")
    if level_min < 1.0 or level_max > 10.0 or level_min > level_max:
        raise ValidationError("Plage de niveau Elo invalide.")

    # 4. Compatibilité Elo du créateur (cf. SPECS §4 enforcement)
    creator_row = user_repository.find_by_id(creator_id)
    if creator_row is None:
        raise NotFound("Utilisateur introuvable.")
    if not elo_service.is_compatible(creator_row["elo"], level_min, level_max):
        raise EloIncompatible(
            "Votre Elo ne vous permet pas de créer un match de ce niveau."
        )

    # 5. Visibilité
    if visibility not in ("public", "private"):
        visibility = "public"

    # 6. Conflit créneau (réservations + autres matchs)
    if booking_repository.find_conflict(court_id, date, start_time):
        raise SlotUnavailable()

    # 7. Insert
    end_time = end_time_of(start_time)
    match_id = match_repository.create(
        court_id=court_id,
        created_by=creator_id,
        level_min=level_min,
        level_max=level_max,
        match_type=court["type"],
        date=date,
        start_time=start_time,
        end_time=end_time,
        visibility=visibility,
        note=note,
    )

    # 8. Ajout automatique du créateur (équipe 1 par défaut)
    # Pour un terrain Double (4 joueurs, 2v2) ET pour un terrain Simple (2 joueurs en 1v1),
    # on a besoin de connaître l'équipe du joueur. Le créateur démarre en équipe 1.
    team = 1
    match_repository.add_player(match_id, creator_id, team=team)

    # 9. Lien de partage
    share_link = f"https://saadqerd.pythonanywhere.com/join/match/{match_id}"
    match_repository.update_share_link(match_id, share_link)

    return _hydrate(match_repository.find_by_id(match_id))


# -----------------------------------------------------------
#  LECTURE
# -----------------------------------------------------------
def get_match(match_id: int):
    row = match_repository.find_by_id(match_id)
    if row is None:
        raise NotFound("Match introuvable.")
    return _hydrate(row)


def list_public_matches():
    """Liste publique : matchs publics futurs uniquement."""
    rows = match_repository.list_public_upcoming()
    return [_hydrate(r) for r in rows]


def list_user_matches(user_id: int):
    rows = match_repository.list_by_user(user_id)
    return [_hydrate(r) for r in rows]


def list_all_matches():
    """Vue admin."""
    rows = match_repository.list_all()
    return [_hydrate(r) for r in rows]


# -----------------------------------------------------------
#  REJOINDRE / QUITTER
# -----------------------------------------------------------
def join_match(match_id: int, user_id: int):
    _ensure_active(user_id)
    row = match_repository.find_by_id(match_id)
    if row is None:
        raise NotFound("Match introuvable.")
    if row["status"] != "scheduled":
        raise ValidationError("Ce match n'est plus ouvert.")

    # Match déjà passé ? On refuse de rejoindre.
    _validate_future_slot(row["date"], row["start_time"])

    # Déjà inscrit ?
    if match_repository.is_player_in_match(match_id, user_id):
        raise AlreadyJoined()

    # Capacité
    court = court_from_row(court_repository.find_by_id(row["court_id"]))
    if match_repository.count_players(match_id) >= court["capacity"]:
        raise MatchFull()

    # Compatibilité Elo
    user_row = user_repository.find_by_id(user_id)
    if user_row is None:
        raise NotFound("Utilisateur introuvable.")
    if not elo_service.is_compatible(user_row["elo"], row["level_min"], row["level_max"]):
        raise EloIncompatible()

    # Équilibrage des équipes — pour Double (2v2) ET Simple (1v1).
    # On compte les joueurs de chaque équipe et on rejoint celle qui a le moins
    # de monde, par défaut équipe 2 si égalité.
    players = match_repository.list_players(match_id)
    team1 = sum(1 for p in players if p["team"] == 1)
    team2 = sum(1 for p in players if p["team"] == 2)
    team = 2 if team1 > team2 else 1

    match_repository.add_player(match_id, user_id, team=team)
    return _hydrate(match_repository.find_by_id(match_id))


def leave_match(match_id: int, user_id: int):
    row = match_repository.find_by_id(match_id)
    if row is None:
        raise NotFound("Match introuvable.")
    if not match_repository.is_player_in_match(match_id, user_id):
        raise NotInMatch()

    # Cas particulier : si c'est le créateur qui quitte un match vide,
    # on annule le match (libère le créneau).
    if row["created_by"] == user_id and match_repository.count_players(match_id) == 1:
        match_repository.update_status(match_id, "cancelled")

    match_repository.remove_player(match_id, user_id)
    return _hydrate(match_repository.find_by_id(match_id))


# -----------------------------------------------------------
#  ANNULATION
# -----------------------------------------------------------
def cancel_match(match_id: int, user_id: int, is_admin: bool):
    row = match_repository.find_by_id(match_id)
    if row is None:
        raise NotFound("Match introuvable.")

    if row["created_by"] != user_id and not is_admin:
        raise Forbidden("Seul le créateur du match peut l'annuler.")

    if row["status"] == "cancelled":
        return _hydrate(row)

    # Délai d'annulation (sauf admin)
    if not is_admin:
        slot_dt = dt.datetime.strptime(f"{row['date']} {row['start_time']}", "%Y-%m-%d %H:%M")
        if slot_dt - _now() < dt.timedelta(hours=CANCEL_DEADLINE_HOURS):
            raise CancelTooLate()

    match_repository.update_status(match_id, "cancelled")
    return _hydrate(match_repository.find_by_id(match_id))


# -----------------------------------------------------------
#  SCORE & ELO
# -----------------------------------------------------------
def submit_result(match_id: int, sets: list, submitted_by: int):
    """
    Enregistre le score d'un match :
      1. Match planifié, non annulé, non déjà terminé.
      2. Match COMPLET (tous les joueurs présents).
      3. Créneau DÉJÀ PASSÉ (le match a eu lieu).
      4. Le soumetteur participe au match.
      5. Sets valides (1 vainqueur clair).
      6. Mise à jour stats + Elo de chaque joueur.
      7. Statut → 'completed'.
    """
    row = match_repository.find_by_id(match_id)
    if row is None:
        raise NotFound("Match introuvable.")
    if row["status"] == "completed":
        raise MatchAlreadyCompleted()
    if row["status"] == "cancelled":
        raise ValidationError("Match annulé.")

    if not match_repository.is_player_in_match(match_id, submitted_by):
        raise Forbidden("Seul un participant peut soumettre le score.")

    # Règle métier nouvelle : on ne peut saisir un score
    # QUE si le match est complet ET déjà passé.
    court = court_from_row(court_repository.find_by_id(row["court_id"]))
    nb_players = match_repository.count_players(match_id)
    if court is not None and nb_players < court["capacity"]:
        raise ValidationError(
            f"Le match n'est pas complet ({nb_players}/{court['capacity']} joueurs)."
        )
    try:
        slot_dt = dt.datetime.strptime(
            f"{row['date']} {row['start_time']}", "%Y-%m-%d %H:%M"
        )
    except ValueError:
        raise ValidationError("Date du match invalide.")
    if slot_dt > _now():
        raise ValidationError(
            "Le score ne peut être saisi qu'après le début du match."
        )

    # 1. Validation structure
    if not isinstance(sets, list) or len(sets) == 0 or len(sets) > 5:
        raise ValidationError("Sets invalides (1 à 5 sets attendus).")
    sets_t1, sets_t2 = 0, 0
    cleaned = []
    for s in sets:
        try:
            t1 = int(s["t1"])
            t2 = int(s["t2"])
        except (KeyError, TypeError, ValueError):
            raise ValidationError("Format de set invalide.")
        if t1 < 0 or t2 < 0 or t1 > 9 or t2 > 9 or t1 == t2:
            raise ValidationError("Score de set invalide.")
        cleaned.append({"t1": t1, "t2": t2})
        if t1 > t2:
            sets_t1 += 1
        else:
            sets_t2 += 1

    if sets_t1 == sets_t2:
        raise ValidationError("Il doit y avoir un vainqueur (sets non égaux).")

    winner_team = 1 if sets_t1 > sets_t2 else 2

    # 2. Sauvegarde du score
    match_repository.save_result(match_id, cleaned, winner_team, submitted_by)

    # 3. Mise à jour stats + Elo de chaque joueur
    players = match_repository.list_players(match_id)
    for p in players:
        is_winner = (p["team"] == winner_team) if p["team"] is not None else False
        # Mode simple (pas d'équipes) : on considère le 1er joueur comme team1
        # (rare car le terrain Simple n'a qu'1 capacité).
        user_repository.increment_stats(p["id"], won=is_winner)
        new_elo = elo_service.apply_win(p["elo"]) if is_winner else elo_service.apply_loss(p["elo"])
        user_repository.update_elo(p["id"], new_elo)

    # 4. Statut du match
    match_repository.update_status(match_id, "completed")

    return _hydrate(match_repository.find_by_id(match_id))


# -----------------------------------------------------------
#  ÉDITION D'UN MATCH (créateur ou admin)
# -----------------------------------------------------------
def update_match(match_id: int, user_id: int, is_admin: bool,
                 court_id: int = None, date: str = None,
                 start_time: str = None,
                 level_min: float = None, level_max: float = None,
                 visibility: str = None, note: str = None):
    """
    Met à jour un match. Règles :
      - Seul le créateur ou un admin peut modifier.
      - Le match doit être 'scheduled' (non terminé, non annulé).
      - Si on change date/heure/terrain, on revérifie le conflit
        en s'excluant soi-même.
      - L'Elo des joueurs déjà inscrits doit rester compatible avec
        la nouvelle plage Elo (sinon l'admin a tort de la changer).
    """
    row = match_repository.find_by_id(match_id)
    if row is None:
        raise NotFound("Match introuvable.")
    if row["created_by"] != user_id and not is_admin:
        raise Forbidden("Seul le créateur du match peut le modifier.")
    if row["status"] != "scheduled":
        raise ValidationError("Ce match ne peut plus être modifié.")

    new_court_id   = int(court_id)   if court_id   is not None else row["court_id"]
    new_date       = date            if date       is not None else row["date"]
    new_start      = start_time      if start_time is not None else row["start_time"]
    new_level_min  = float(level_min) if level_min is not None else row["level_min"]
    new_level_max  = float(level_max) if level_max is not None else row["level_max"]
    new_visibility = visibility      if visibility in ("public", "private") else row["visibility"]
    new_note       = note            if note       is not None else row["note"]

    # Validation du créneau (futur)
    _validate_future_slot(new_date, new_start)

    # Validation du terrain et type
    court_row = court_repository.find_by_id(new_court_id)
    if court_row is None:
        raise NotFound("Terrain introuvable.")
    court = court_from_row(court_row)

    # Validation des bornes Elo
    if new_level_min < 1.0 or new_level_max > 10.0 or new_level_min > new_level_max:
        raise ValidationError("Plage de niveau Elo invalide.")

    # Vérifie que la nouvelle plage Elo reste compatible avec TOUS les
    # joueurs déjà inscrits — sinon on créerait une incohérence.
    for p in match_repository.list_players(match_id):
        if not elo_service.is_compatible(p["elo"], new_level_min, new_level_max):
            raise ValidationError(
                f"Le joueur {p['full_name']} (Elo {p['elo']}) n'est plus "
                f"compatible avec la nouvelle plage de niveau."
            )

    # Vérifie aussi que la capacité du nouveau terrain accueille tous les inscrits
    nb_players = match_repository.count_players(match_id)
    if nb_players > court["capacity"]:
        raise ValidationError(
            "Le terrain choisi a une capacité inférieure au nombre de joueurs déjà inscrits."
        )

    # Conflit créneau (en s'excluant)
    if booking_repository.find_conflict_excluding(
        new_court_id, new_date, new_start, exclude_match_id=match_id
    ):
        raise SlotUnavailable()

    # Persistance
    new_end = end_time_of(new_start)
    match_repository.update_match_fields(
        match_id=match_id,
        court_id=new_court_id,
        date=new_date,
        start_time=new_start,
        end_time=new_end,
        level_min=new_level_min,
        level_max=new_level_max,
        match_type=court["type"],
        visibility=new_visibility,
        note=new_note,
    )
    return _hydrate(match_repository.find_by_id(match_id))


# -----------------------------------------------------------
#  NOTATION ENTRE JOUEURS
# -----------------------------------------------------------
def rate_player(match_id: int, from_user: int, to_user: int,
                fairplay: int, punctuality: int, teamspirit: int):
    """
    Enregistre une notation après un match.
    Règles :
      - Le match doit être 'completed'.
      - Les deux joueurs doivent avoir participé.
      - Pas d'auto-notation.
      - Une seule notation par paire (from_user, to_user, match_id).
    """
    row = match_repository.find_by_id(match_id)
    if row is None:
        raise NotFound("Match introuvable.")
    if row["status"] != "completed":
        raise ValidationError("Notation possible uniquement pour un match terminé.")
    if from_user == to_user:
        raise ValidationError("Vous ne pouvez pas vous noter vous-même.")
    if not match_repository.is_player_in_match(match_id, from_user):
        raise Forbidden("Vous n'avez pas participé à ce match.")
    if not match_repository.is_player_in_match(match_id, to_user):
        raise ValidationError("Le joueur noté n'a pas participé à ce match.")

    for v in (fairplay, punctuality, teamspirit):
        if not isinstance(v, int) or v < 1 or v > 5:
            raise ValidationError("Note invalide (1 à 5).")

    if match_repository.has_rated(from_user, to_user, match_id):
        raise AlreadyRated()

    match_repository.add_rating(from_user, to_user, match_id,
                                fairplay, punctuality, teamspirit)
    user_repository.add_rating(to_user, fairplay, punctuality, teamspirit)
    # Renvoie le DTO du match à jour : le frontend reçoit immédiatement
    # le nouveau rated_by + (potentiellement) la nouvelle moyenne du noté
    # via reloadCurrentUser/reloadUsers en aval.
    return {"ok": True, "match": _hydrate(match_repository.find_by_id(match_id))}


# -----------------------------------------------------------
#  ADMIN — paiement
# -----------------------------------------------------------
def set_payment(match_id: int, payment_status: str):
    if payment_status not in ("paid", "unpaid"):
        raise ValidationError("Statut de paiement invalide.")
    if match_repository.find_by_id(match_id) is None:
        raise NotFound("Match introuvable.")
    match_repository.update_payment(match_id, payment_status)
    return get_match(match_id)
