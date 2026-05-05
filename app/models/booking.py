"""
 app/models/booking.py — Modèle Réservation (Booking)
"""


def booking_from_row(row, court=None, user=None):
    """
    Convertit une réservation. Peut inclure le terrain et l'utilisateur
    associés (jointure faite côté repository) pour limiter les requêtes.
    """
    if row is None:
        return None
    return {
        "id":             row["id"],
        "user_id":        row["user_id"],
        "court_id":       row["court_id"],
        "date":           row["date"],
        "start_time":     row["start_time"],
        "end_time":       row["end_time"],
        "status":         row["status"],
        "total":          row["total"],
        "payment_status": row["payment_status"],
        "share_link":     row["share_link"],
        "created_at":     row["created_at"],
        "court":          court,   # dict ou None
        "user":           user,    # dict ou None (initials, full_name) — utile en vue admin
    }
