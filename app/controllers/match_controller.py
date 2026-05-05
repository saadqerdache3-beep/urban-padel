"""
============================================================
 app/controllers/match_controller.py
============================================================
"""

from flask import request
from app.services import match_service, elo_service


def list_matches(current_user):
    """Joueur : matchs publics futurs. Admin : tous."""
    if current_user["role"] == "admin":
        return {"matches": match_service.list_all_matches()}
    return {"matches": match_service.list_public_matches()}


def list_my_matches(current_user):
    return {"matches": match_service.list_user_matches(current_user["id"])}


def get_match(current_user, match_id):
    return {"match": match_service.get_match(match_id)}


def create_match(current_user):
    data = request.get_json(silent=True) or {}
    return {"match": match_service.create_match(
        creator_id=current_user["id"],
        court_id=int(data.get("court_id")),
        date=data.get("date"),
        start_time=data.get("start_time"),
        level_min=data.get("level_min"),
        level_max=data.get("level_max"),
        visibility=data.get("visibility", "public"),
        note=data.get("note"),
    )}


def join_match(current_user, match_id):
    return {"match": match_service.join_match(match_id, current_user["id"])}


def leave_match(current_user, match_id):
    return {"match": match_service.leave_match(match_id, current_user["id"])}


def cancel_match(current_user, match_id):
    return {"match": match_service.cancel_match(
        match_id=match_id,
        user_id=current_user["id"],
        is_admin=(current_user["role"] == "admin"),
    )}


def update_match(current_user, match_id):
    """
    PATCH /api/matches/<id> — modification par le créateur ou par un admin.
    Tous les champs sont optionnels : on n'envoie que ceux qui changent.
    """
    data = request.get_json(silent=True) or {}
    return {"match": match_service.update_match(
        match_id=match_id,
        user_id=current_user["id"],
        is_admin=(current_user["role"] == "admin"),
        court_id=data.get("court_id"),
        date=data.get("date"),
        start_time=data.get("start_time"),
        level_min=data.get("level_min"),
        level_max=data.get("level_max"),
        visibility=data.get("visibility"),
        note=data.get("note"),
    )}


def submit_result(current_user, match_id):
    data = request.get_json(silent=True) or {}
    return {"match": match_service.submit_result(
        match_id=match_id,
        sets=data.get("sets", []),
        submitted_by=current_user["id"],
    )}


def rate_player(current_user, match_id):
    data = request.get_json(silent=True) or {}
    return match_service.rate_player(
        match_id=match_id,
        from_user=current_user["id"],
        to_user=int(data.get("to_user")),
        fairplay=int(data.get("fairplay")),
        punctuality=int(data.get("punctuality")),
        teamspirit=int(data.get("teamspirit")),
    )


def set_payment(current_user, match_id):
    data = request.get_json(silent=True) or {}
    return {"match": match_service.set_payment(
        match_id=match_id,
        payment_status=data.get("payment_status"),
    )}


def levels_catalog(current_user=None):
    """Catalogue des niveaux Elo (utilisé par le frontend pour les UI)."""
    return {"levels": elo_service.levels_catalog()}
