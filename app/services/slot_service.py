"""
============================================================
 app/services/slot_service.py
============================================================
 Logique des CRÉNEAUX disponibles.

 Particularité : il n'y a PAS de table `slots` en base.
 Les créneaux sont générés à la volée à partir de la
 configuration (SLOT_TIMES) et confrontés aux réservations
 et matchs existants pour déterminer leur disponibilité.

 Pourquoi cette approche ?
  - Simple : la config décide des créneaux, pas la DB.
  - Cohérent : impossible d'avoir un créneau "fantôme"
    en base (ex: 09:17).
  - Performant : une seule requête pour connaître tous
    les conflits d'une journée.
============================================================
"""

import datetime as dt
from app.core.config import SLOT_TIMES, SLOT_DURATION_MINUTES
from app.core.database import get_connection
from app.repositories import court_repository
from app.models import court_from_row


def _add_minutes(time_str: str, minutes: int) -> str:
    """Ajoute `minutes` à un temps 'HH:MM' et retourne 'HH:MM'."""
    h, m = map(int, time_str.split(":"))
    total = h * 60 + m + minutes
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"


def end_time_of(start_time: str) -> str:
    """Pratique : durée fixe 1h30 → calcule l'heure de fin."""
    return _add_minutes(start_time, SLOT_DURATION_MINUTES)


def _is_in_past(date: str, time_str: str) -> bool:
    """Renvoie True si le créneau (date + heure) est dans le passé."""
    try:
        slot_dt = dt.datetime.strptime(f"{date} {time_str}", "%Y-%m-%d %H:%M")
    except ValueError:
        return True
    return slot_dt <= dt.datetime.now()


def get_available_slots(date: str):
    """
    Pour une date donnée, retourne pour chaque terrain la liste
    des créneaux et leur statut (available / booked / past).

    Format de retour aligné avec ce que les vues BookingView
    et CreateMatchView consomment.
    """
    # 1. On récupère tous les terrains
    courts = [court_from_row(c) for c in court_repository.list_all()]

    # 2. On récupère TOUS les conflits de la journée en une seule requête
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT court_id, start_time FROM bookings
        WHERE date = ? AND status = 'scheduled'
        UNION
        SELECT court_id, start_time FROM matches
        WHERE date = ? AND status = 'scheduled'
        """,
        (date, date),
    )
    occupied = {(r["court_id"], r["start_time"]) for r in cur.fetchall()}

    # 3. Pour chaque (terrain, créneau) on calcule le statut
    result = []
    for court in courts:
        slots = []
        for t in SLOT_TIMES:
            if _is_in_past(date, t):
                status = "past"
            elif (court["id"], t) in occupied:
                status = "booked"
            else:
                status = "available"
            slots.append({
                "start_time": t,
                "end_time":   end_time_of(t),
                "status":     status,
            })
        result.append({
            "court":  court,
            "slots":  slots,
        })
    return result


def get_week_overview(start_date: str = None):
    """
    Retourne 7 jours de créneaux pour la vue admin (calendrier hebdo).
    `start_date` = lundi de la semaine au format 'YYYY-MM-DD'.
    Si non fourni, on prend le lundi de la semaine en cours.
    """
    if start_date:
        d0 = dt.datetime.strptime(start_date, "%Y-%m-%d").date()
    else:
        today = dt.date.today()
        d0 = today - dt.timedelta(days=today.weekday())  # lundi

    week = []
    for i in range(7):
        d = d0 + dt.timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        week.append({
            "date":   date_str,
            "courts": get_available_slots(date_str),
        })
    return week
