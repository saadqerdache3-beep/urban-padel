"""
 app/models/match.py — Modèle Match
"""

import json


def match_from_row(row, court=None, players=None, result=None, creator=None):
    """
    Convertit un match. `players`, `result`, `creator` et `court`
    sont fournis par le service quand on veut le détail complet.
    """
    if row is None:
        return None
    return {
        "id":             row["id"],
        "court_id":       row["court_id"],
        "created_by":     row["created_by"],
        "level_min":      row["level_min"],
        "level_max":      row["level_max"],
        "type":           row["type"],
        "date":           row["date"],
        "start_time":     row["start_time"],
        "end_time":       row["end_time"],
        "status":         row["status"],
        "visibility":     row["visibility"],
        "note":           row["note"],
        "payment_status": row["payment_status"],
        "share_link":     row["share_link"],
        "created_at":     row["created_at"],
        "court":          court,
        "players":        players or [],   # liste de user_public
        "creator":        creator,
        "result":         result,
    }


def match_player_from_row(row):
    if row is None:
        return None
    return {
        "match_id":  row["match_id"],
        "user_id":   row["user_id"],
        "team":      row["team"],
        "joined_at": row["joined_at"],
    }


def match_result_from_row(row):
    """Le champ `sets` est stocké en JSON dans SQLite, on le désérialise."""
    if row is None:
        return None
    try:
        sets = json.loads(row["sets"])
    except (json.JSONDecodeError, TypeError):
        sets = []
    return {
        "match_id":     row["match_id"],
        "sets":         sets,
        "winner_team":  row["winner_team"],
        "submitted_by": row["submitted_by"],
        "submitted_at": row["submitted_at"],
    }
