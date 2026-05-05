"""
============================================================
 app/controllers/admin_controller.py
============================================================
"""

from flask import request
from app.services import admin_service


def overview(current_user):
    return {"overview": admin_service.get_overview()}


def list_users(current_user):
    return {"users": admin_service.list_users()}


def create_user(current_user):
    """POST /api/admin/users — création d'un compte par un administrateur."""
    data = request.get_json(silent=True) or {}
    return {"user": admin_service.create_user(
        full_name=data.get("full_name", ""),
        email=data.get("email", ""),
        password=data.get("password", ""),
        role=data.get("role", "player"),
        elo=data.get("elo", 3.0),
    )}


def update_user(current_user, user_id):
    data = request.get_json(silent=True) or {}
    return {"user": admin_service.update_user(
        user_id=user_id,
        full_name=data.get("full_name", ""),
        email=data.get("email", ""),
        role=data.get("role", "player"),
        elo=data.get("elo", 1.0),
    )}


def set_user_archived(current_user, user_id):
    data = request.get_json(silent=True) or {}
    archived = bool(data.get("archived", True))
    return {"user": admin_service.set_user_archived(user_id, archived)}
