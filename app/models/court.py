"""
 app/models/court.py — Modèle Terrain (Court)
"""


def court_from_row(row):
    if row is None:
        return None
    return {
        "id":       row["id"],
        "name":     row["name"],
        "type":     row["type"],
        "capacity": row["capacity"],
        "price":    row["price"],
    }
