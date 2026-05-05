"""
============================================================
 app/models/user.py
============================================================
 Modèle User.

 Trois fonctions de sérialisation :
  - user_from_row : conversion brute SQLite -> dict Python
  - user_safe     : version envoyée à l'utilisateur connecté
                    (sans password_hash)
  - user_public   : version envoyée pour le profil public
                    (sans email ni password_hash)

 Pourquoi 3 versions ? Pour ne JAMAIS exposer le hash du
 mot de passe ou des infos privées par accident.
============================================================
"""


def user_from_row(row):
    """Conversion brute d'une ligne SQLite en dict (avec password_hash)."""
    if row is None:
        return None
    return {
        "id":            row["id"],
        "full_name":     row["full_name"],
        "email":         row["email"],
        "password_hash": row["password_hash"],
        "role":          row["role"],
        "elo":           row["elo"],
        "played":        row["played"],
        "wins":          row["wins"],
        "losses":        row["losses"],
        "rating_fairplay_sum":    row["rating_fairplay_sum"],
        "rating_punctuality_sum": row["rating_punctuality_sum"],
        "rating_teamspirit_sum":  row["rating_teamspirit_sum"],
        "rating_count":           row["rating_count"],
        "created_at":    row["created_at"],
    }


def _initials(full_name: str) -> str:
    """Calcule les initiales (ex: 'Youssef Benali' → 'YB')."""
    if not full_name:
        return "?"
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0][0].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _ratings_avg(row):
    """Calcule les moyennes de notation (fairplay, ponctualité, esprit d'équipe)."""
    count = row["rating_count"] or 0
    if count == 0:
        return {"fairplay": None, "punctuality": None, "teamspirit": None, "count": 0}
    return {
        "fairplay":    round(row["rating_fairplay_sum"]    / count, 2),
        "punctuality": round(row["rating_punctuality_sum"] / count, 2),
        "teamspirit":  round(row["rating_teamspirit_sum"]  / count, 2),
        "count":       count,
    }


def user_safe(row):
    """
    Version "safe" pour l'utilisateur connecté lui-même
    (toutes les infos sauf le password_hash).
    Format aligné sur ce que le frontend attend (cf. AuthViews.jsx).
    """
    if row is None:
        return None
    return {
        "id":         row["id"],
        "full_name":  row["full_name"],
        "email":      row["email"],
        "initials":   _initials(row["full_name"]),
        "role":       row["role"],
        "elo":        round(row["elo"], 2),
        "stats": {
            "played": row["played"],
            "wins":   row["wins"],
            "losses": row["losses"],
        },
        "ratings":    _ratings_avg(row),
        "archived":   bool(_safe_get(row, "archived", 0)),
        "created_at": row["created_at"],
    }


def user_public(row):
    """
    Version "publique" pour afficher un autre joueur
    (pas de password_hash, pas d'email).
    """
    if row is None:
        return None
    return {
        "id":        row["id"],
        "full_name": row["full_name"],
        "initials":  _initials(row["full_name"]),
        "elo":       round(row["elo"], 2),
        "stats": {
            "played": row["played"],
            "wins":   row["wins"],
            "losses": row["losses"],
        },
        "ratings":   _ratings_avg(row),
        "archived":  bool(_safe_get(row, "archived", 0)),
    }


def user_admin(row):
    """
    Version pour la vue ADMIN : comme user_public + email + role + created_at.
    Utilisée dans /api/admin/users — l'admin a besoin de l'email pour
    identifier les comptes sans pour autant exposer le password_hash.
    """
    if row is None:
        return None
    base = user_public(row)
    base.update({
        "email":      row["email"],
        "role":       row["role"],
        "created_at": row["created_at"],
    })
    return base


def _safe_get(row, key, default):
    """
    Petit helper : sqlite3.Row lève KeyError pour une colonne absente.
    Pour rester compatible avec d'anciennes bases dont la migration
    n'a pas encore tourné, on retombe proprement sur la valeur par défaut.
    """
    try:
        v = row[key]
        return v if v is not None else default
    except (KeyError, IndexError):
        return default
