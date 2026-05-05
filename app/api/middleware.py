"""
============================================================
 app/api/middleware.py
============================================================
 Décorateurs d'authentification & d'autorisation pour Flask.

 Comment ça marche :
  - @auth_required : vérifie qu'un JWT valide est présent
    dans l'en-tête `Authorization: Bearer <token>`. Décode
    le token, charge l'utilisateur, et l'injecte dans la
    fonction sous le paramètre `current_user`.

  - @admin_required : équivalent + vérifie role == 'admin'.

 Ces décorateurs sont la SEULE porte d'entrée pour vérifier
 l'authentification. Les services n'ont jamais à s'en soucier.
============================================================
"""

from functools import wraps
from flask import request
import jwt

from app.core.security import decode_token
from app.core.errors import Unauthorized, Forbidden
from app.repositories import user_repository
from app.models import user_safe


def _extract_token():
    """
    Lit l'en-tête Authorization et en extrait le token.
    Format attendu : 'Bearer <token>'.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header[7:].strip()


def _load_current_user():
    """
    Décode le JWT et charge l'utilisateur en DB.
    Lève Unauthorized si le token est absent / expiré / invalide
    ou si l'utilisateur a été supprimé. Bloque aussi les comptes
    archivés (un token émis avant archivage devient inutilisable).
    """
    token = _extract_token()
    if not token:
        raise Unauthorized("Token manquant.")
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Token expiré.")
    except jwt.InvalidTokenError:
        raise Unauthorized("Token invalide.")
    user_id = payload.get("sub")
    # Compat : depuis PyJWT 2.10, `sub` est obligatoirement une string.
    # On la reconvertit en int pour les requêtes SQL.
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise Unauthorized("Token invalide.")
    row = user_repository.find_by_id(user_id)
    if row is None:
        raise Unauthorized("Utilisateur introuvable.")
    # Compte archivé → toutes les routes protégées sont bloquées,
    # même avec un token encore valide en théorie.
    try:
        if row["archived"]:
            raise Forbidden("Ce compte a été archivé. Contactez l'administrateur.")
    except (KeyError, IndexError):
        pass  # ancienne base sans la colonne archived
    return user_safe(row)


def auth_required(fn):
    """Exige un JWT valide. Injecte `current_user` dans la fonction."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user = _load_current_user()
        return fn(current_user, *args, **kwargs)
    return wrapper


def admin_required(fn):
    """Exige un JWT valide ET role == 'admin'."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user = _load_current_user()
        if current_user["role"] != "admin":
            raise Forbidden("Accès réservé aux administrateurs.")
        return fn(current_user, *args, **kwargs)
    return wrapper
