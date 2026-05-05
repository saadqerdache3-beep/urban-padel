"""
============================================================
 app/repositories/booking_repository.py
============================================================
 Accès SQL pour la table `bookings` (réservations directes).
============================================================
"""

from app.core.database import get_connection


def find_by_id(booking_id: int):
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
    return cur.fetchone()


def list_by_user(user_id: int):
    """Réservations d'un utilisateur (ordonnées par date la plus récente)."""
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT * FROM bookings
        WHERE user_id = ?
        ORDER BY date DESC, start_time DESC
        """,
        (user_id,),
    )
    return cur.fetchall()


def list_all():
    """Toutes les réservations (vue admin)."""
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT * FROM bookings
        ORDER BY date DESC, start_time DESC
        """
    )
    return cur.fetchall()


def find_conflict(court_id: int, date: str, start_time: str):
    """
    Vérifie qu'il n'existe pas déjà une réservation OU un match planifié
    sur le même terrain au même créneau.

    Retourne True si CONFLIT.
    """
    cur = get_connection().cursor()
    # Conflit avec une autre réservation active
    cur.execute(
        """
        SELECT 1 FROM bookings
        WHERE court_id = ? AND date = ? AND start_time = ?
          AND status = 'scheduled'
        LIMIT 1
        """,
        (court_id, date, start_time),
    )
    if cur.fetchone():
        return True
    # Conflit avec un match programmé sur ce créneau
    cur.execute(
        """
        SELECT 1 FROM matches
        WHERE court_id = ? AND date = ? AND start_time = ?
          AND status = 'scheduled'
        LIMIT 1
        """,
        (court_id, date, start_time),
    )
    return cur.fetchone() is not None


def create(user_id: int, court_id: int, date: str, start_time: str,
           end_time: str, total: int, share_link: str = None) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO bookings
            (user_id, court_id, date, start_time, end_time, total, share_link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, court_id, date, start_time, end_time, total, share_link),
    )
    conn.commit()
    return cur.lastrowid


def update_status(booking_id: int, status: str):
    conn = get_connection()
    conn.execute("UPDATE bookings SET status = ? WHERE id = ?", (status, booking_id))
    conn.commit()


def update_payment(booking_id: int, payment_status: str):
    conn = get_connection()
    conn.execute(
        "UPDATE bookings SET payment_status = ? WHERE id = ?",
        (payment_status, booking_id),
    )
    conn.commit()


def update_share_link(booking_id: int, share_link: str):
    conn = get_connection()
    conn.execute(
        "UPDATE bookings SET share_link = ? WHERE id = ?",
        (share_link, booking_id),
    )
    conn.commit()


def update_fields(booking_id: int, court_id: int, date: str,
                  start_time: str, end_time: str, total: int):
    """
    Mise à jour des champs modifiables d'une réservation.
    Utilisé pour l'édition par le propriétaire ou un admin
    tant que la réservation n'est pas terminée/annulée.
    """
    conn = get_connection()
    conn.execute(
        """
        UPDATE bookings
        SET court_id   = ?,
            date       = ?,
            start_time = ?,
            end_time   = ?,
            total      = ?
        WHERE id = ?
        """,
        (court_id, date, start_time, end_time, total, booking_id),
    )
    conn.commit()


def find_conflict_excluding(court_id: int, date: str, start_time: str,
                            exclude_booking_id: int = None,
                            exclude_match_id: int = None) -> bool:
    """
    Variante de find_conflict() permettant d'IGNORER une réservation
    ou un match précis (utile lors de l'ÉDITION : on ne veut pas
    qu'un élément se considère lui-même en conflit avec lui-même).
    """
    cur = get_connection().cursor()
    if exclude_booking_id is not None:
        cur.execute(
            """
            SELECT 1 FROM bookings
            WHERE court_id = ? AND date = ? AND start_time = ?
              AND status = 'scheduled' AND id <> ?
            LIMIT 1
            """,
            (court_id, date, start_time, exclude_booking_id),
        )
    else:
        cur.execute(
            """
            SELECT 1 FROM bookings
            WHERE court_id = ? AND date = ? AND start_time = ?
              AND status = 'scheduled'
            LIMIT 1
            """,
            (court_id, date, start_time),
        )
    if cur.fetchone():
        return True
    if exclude_match_id is not None:
        cur.execute(
            """
            SELECT 1 FROM matches
            WHERE court_id = ? AND date = ? AND start_time = ?
              AND status = 'scheduled' AND id <> ?
            LIMIT 1
            """,
            (court_id, date, start_time, exclude_match_id),
        )
    else:
        cur.execute(
            """
            SELECT 1 FROM matches
            WHERE court_id = ? AND date = ? AND start_time = ?
              AND status = 'scheduled'
            LIMIT 1
            """,
            (court_id, date, start_time),
        )
    return cur.fetchone() is not None
