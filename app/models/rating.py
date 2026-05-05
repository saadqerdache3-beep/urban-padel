"""
 app/models/rating.py — Modèle Notation (Rating)
"""


def rating_from_row(row):
    if row is None:
        return None
    return {
        "id":          row["id"],
        "from_user":   row["from_user"],
        "to_user":     row["to_user"],
        "match_id":    row["match_id"],
        "fairplay":    row["fairplay"],
        "punctuality": row["punctuality"],
        "teamspirit":  row["teamspirit"],
        "created_at":  row["created_at"],
    }
