"""
============================================================
 app/core/security.py
============================================================
 Utilitaires de sécurité : hashage de mot de passe + JWT.

 Pourquoi bcrypt pour les mots de passe ?
  - Algorithme conçu pour être LENT (résiste aux attaques
    par force brute).
  - Salt automatique intégré.
  - Standard de l'industrie.

 Pourquoi JWT pour l'auth ?
  - Stateless : aucun stockage côté serveur.
  - Performant : pas de requête DB à chaque appel API.
  - Le token contient lui-même les infos (user_id, role).
============================================================
"""

import datetime as dt
import bcrypt
import jwt

from app.core.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRES_HOURS


# -----------------------------------------------------------
#  MOTS DE PASSE
# -----------------------------------------------------------
def hash_password(plain_password: str) -> str:
    """
    Transforme un mot de passe en clair en hash bcrypt.

    bcrypt génère automatiquement un "salt" aléatoire qui
    est intégré au hash final → deux mots de passe identiques
    donnent des hash différents (sécurité contre les rainbow tables).
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    # On stocke le hash en str (UTF-8) plutôt qu'en bytes pour SQLite.
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Vérifie qu'un mot de passe en clair correspond à un hash stocké.
    Retourne True/False.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except Exception:
        # Hash corrompu ou format invalide → on refuse.
        return False


# -----------------------------------------------------------
#  JSON WEB TOKENS
# -----------------------------------------------------------
def create_token(user_id: int, role: str) -> str:
    """
    Crée un JWT signé contenant :
      - sub  : l'ID utilisateur (sujet du token, en string par convention RFC 7519)
      - role : son rôle ('player' ou 'admin')
      - exp  : date d'expiration
      - iat  : date d'émission

    Le token est signé avec JWT_SECRET (HMAC-SHA256). Sans
    cette clé, personne ne peut forger un token valide.

    NB : à partir de PyJWT 2.10, la claim `sub` doit obligatoirement
    être une chaîne — on convertit donc l'ID utilisateur en str.
    Cette compatibilité est gérée à la lecture (cf. middleware.py).
    """
    now = dt.datetime.utcnow()
    payload = {
        "sub":  str(user_id),
        "role": role,
        "iat":  now,
        "exp":  now + dt.timedelta(hours=JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Décode et vérifie un JWT.

    Lève jwt.ExpiredSignatureError si le token est expiré,
    jwt.InvalidTokenError s'il est mal formé ou non signé
    avec notre clé secrète.

    Retourne le payload (dict avec sub, role, iat, exp).
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
