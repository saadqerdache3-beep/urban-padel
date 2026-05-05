"""
============================================================
 app/services/auth_service.py
============================================================
 Logique métier d'authentification.

 Responsabilités :
  - Valider les données d'inscription (email format, mdp >= 6 car.).
  - Hasher les mots de passe AVANT stockage.
  - Vérifier les identifiants à la connexion.
  - Émettre des JWT.

 Aucune connaissance de Flask ici (pas de request, pas de session).
 Cette couche pourrait être réutilisée par un autre client
 (CLI, mobile, etc.).
============================================================
"""

import re
from app.repositories import user_repository
from app.models import user_safe
from app.core.security import hash_password, verify_password, create_token
from app.core.errors import (
    InvalidCredentials, EmailAlreadyUsed, ValidationError, AccountArchived,
)


def _is_archived(row):
    """Helper compatible avec d'anciens schémas (colonne `archived` absente)."""
    try:
        return bool(row["archived"])
    except (KeyError, IndexError):
        return False


_EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(email: str):
    if not email or not _EMAIL_REGEX.match(email):
        raise ValidationError("Adresse email invalide.")


def _validate_password(password: str):
    if not password or len(password) < 6:
        raise ValidationError("Le mot de passe doit contenir au moins 6 caractères.")


def register(full_name: str, email: str, password: str, elo: float = 1.0):
    """
    Crée un nouveau compte joueur (rôle 'player').

    Étapes :
      1. Validation des champs.
      2. Vérifier que l'email est libre.
      3. Hasher le mot de passe.
      4. Insérer en DB.
      5. Générer un JWT.
      6. Retourner { user, token }.
    """
    full_name = (full_name or "").strip()
    email = (email or "").strip().lower()

    if not full_name:
        raise ValidationError("Le nom complet est requis.")
    _validate_email(email)
    _validate_password(password)

    if user_repository.find_by_email(email) is not None:
        raise EmailAlreadyUsed()

    # Bornage défensif de l'Elo (au cas où le client envoie n'importe quoi)
    elo = max(1.0, min(10.0, float(elo)))

    user_id = user_repository.create(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role="player",
        elo=elo,
    )
    row = user_repository.find_by_id(user_id)
    return {
        "user":  user_safe(row),
        "token": create_token(user_id, "player"),
    }


def login(email: str, password: str):
    """
    Authentifie un utilisateur. Retourne { user, token } ou lève
    InvalidCredentials.

    Important : on renvoie le MÊME message d'erreur que l'utilisateur
    soit inconnu OU que le mot de passe soit faux. Cela évite de
    "deviner" si un email existe en base (énumération).
    """
    email = (email or "").strip().lower()
    if not email or not password:
        raise InvalidCredentials()

    row = user_repository.find_by_email(email)
    if row is None:
        raise InvalidCredentials()

    if not verify_password(password, row["password_hash"]):
        raise InvalidCredentials()

    # Comptes archivés : la connexion est bloquée. On préserve l'historique
    # mais le compte ne peut plus être utilisé tant qu'il n'est pas réactivé.
    if _is_archived(row):
        raise AccountArchived()

    return {
        "user":  user_safe(row),
        "token": create_token(row["id"], row["role"]),
    }


def get_me(user_id: int):
    """Retourne l'utilisateur connecté (route GET /api/auth/me)."""
    row = user_repository.find_by_id(user_id)
    return user_safe(row)
