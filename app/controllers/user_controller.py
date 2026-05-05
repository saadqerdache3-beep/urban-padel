"""
============================================================
 app/controllers/user_controller.py
============================================================
"""

from flask import request
from app.services import user_service


def get_me(current_user):
    return {"user": user_service.get_self(current_user["id"])}


def update_me(current_user):
    data = request.get_json(silent=True) or {}
    return {"user": user_service.update_self(
        user_id=current_user["id"],
        full_name=data.get("full_name"),
        email=data.get("email"),
    )}


def get_public_profile(user_id):
    return {"user": user_service.get_public(user_id)}
