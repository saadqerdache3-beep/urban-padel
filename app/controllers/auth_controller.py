"""
============================================================
 app/controllers/auth_controller.py
============================================================
 Contrôleurs d'authentification.

 RÔLE D'UN CONTRÔLEUR :
  - Lire les paramètres de la requête HTTP (request.json).
  - Appeler le service correspondant.
  - Retourner un dict (jsonifié dans la couche `api/`).

 RÈGLE D'OR :
  - AUCUNE logique métier dans les contrôleurs.
  - Si vous écrivez un `if`, c'est probablement à déplacer
    dans un service.
============================================================
"""

from flask import request
from app.services import auth_service


def register():
    data = request.get_json(silent=True) or {}
    return auth_service.register(
        full_name=data.get("full_name"),
        email=data.get("email"),
        password=data.get("password"),
        elo=data.get("elo", 1.0),
    )


def login():
    data = request.get_json(silent=True) or {}
    return auth_service.login(
        email=data.get("email"),
        password=data.get("password"),
    )


def me(current_user):
    """`current_user` est injecté par le décorateur @auth_required."""
    return {"user": auth_service.get_me(current_user["id"])}
