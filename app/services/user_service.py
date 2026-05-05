"""
============================================================
 app/services/user_service.py
============================================================
 Logique métier autour des utilisateurs (profils, mises à jour).
============================================================
"""

import re
from app.repositories import user_repository
from app.models import user_safe, user_public
from app.core.errors import NotFound, ValidationError, EmailAlreadyUsed


_EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_self(user_id: int):
    row = user_repository.find_by_id(user_id)
    if row is None:
        raise NotFound("Utilisateur introuvable.")
    return user_safe(row)


def get_public(user_id: int):
    row = user_repository.find_by_id(user_id)
    if row is None:
        raise NotFound("Joueur introuvable.")
    return user_public(row)


def update_self(user_id: int, full_name: str, email: str):
    full_name = (full_name or "").strip()
    email = (email or "").strip().lower()
    if not full_name:
        raise ValidationError("Le nom complet est requis.")
    if not _EMAIL_REGEX.match(email):
        raise ValidationError("Adresse email invalide.")
    # Email déjà pris par quelqu'un d'autre ?
    other = user_repository.find_by_email(email)
    if other is not None and other["id"] != user_id:
        raise EmailAlreadyUsed()
    user_repository.update_profile(user_id, full_name, email)
    return get_self(user_id)
