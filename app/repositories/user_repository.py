"""
============================================================
 app/repositories/user_repository.py
============================================================
 Accès SQL pour la table `users`.

 Règle d'or de la couche repository :
  - AUCUNE logique métier ici (pas de validation Elo,
    pas de hash, pas de règles d'autorisation).
  - UNIQUEMENT des opérations CRUD basiques.

 Toute la logique métier est dans `services/`.
============================================================
"""

from app.core.database import get_connection


def find_by_id(user_id: int):
    """Retourne la ligne SQLite ou None."""
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    return cur.fetchone()


def find_by_email(email: str):
    """Retourne la ligne SQLite ou None."""
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    return cur.fetchone()


def list_all():
    """Liste tous les utilisateurs (utilisé par l'admin)."""
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM users ORDER BY created_at DESC")
    return cur.fetchall()


def list_players():
    """Liste uniquement les joueurs (sans les admins)."""
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM users WHERE role = 'player' ORDER BY elo DESC")
    return cur.fetchall()


def create(full_name: str, email: str, password_hash: str,
           role: str = "player", elo: float = 1.0) -> int:
    """
    Insère un utilisateur. Retourne l'ID auto-incrémenté.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO users (full_name, email, password_hash, role, elo)
        VALUES (?, ?, ?, ?, ?)
        """,
        (full_name, email, password_hash, role, elo),
    )
    conn.commit()
    return cur.lastrowid


def update_elo(user_id: int, new_elo: float):
    """Met à jour le score Elo d'un joueur."""
    conn = get_connection()
    conn.execute("UPDATE users SET elo = ? WHERE id = ?", (new_elo, user_id))
    conn.commit()


def increment_stats(user_id: int, won: bool):
    """
    Incrémente les compteurs (played, wins, losses) après un match terminé.
    `won` détermine si on incrémente wins ou losses.
    """
    conn = get_connection()
    if won:
        conn.execute(
            """
            UPDATE users
            SET played = played + 1, wins = wins + 1
            WHERE id = ?
            """,
            (user_id,),
        )
    else:
        conn.execute(
            """
            UPDATE users
            SET played = played + 1, losses = losses + 1
            WHERE id = ?
            """,
            (user_id,),
        )
    conn.commit()


def add_rating(user_id: int, fairplay: int, punctuality: int, teamspirit: int):
    """
    Ajoute une notation reçue par un joueur (cumul + compteur).
    Cela permet de calculer les moyennes sans tout recharger.
    """
    conn = get_connection()
    conn.execute(
        """
        UPDATE users
        SET rating_fairplay_sum    = rating_fairplay_sum    + ?,
            rating_punctuality_sum = rating_punctuality_sum + ?,
            rating_teamspirit_sum  = rating_teamspirit_sum  + ?,
            rating_count           = rating_count + 1
        WHERE id = ?
        """,
        (fairplay, punctuality, teamspirit, user_id),
    )
    conn.commit()


def update_profile(user_id: int, full_name: str, email: str):
    """Mise à jour des informations modifiables par l'utilisateur lui-même."""
    conn = get_connection()
    conn.execute(
        "UPDATE users SET full_name = ?, email = ? WHERE id = ?",
        (full_name, email, user_id),
    )
    conn.commit()


def admin_update(user_id: int, full_name: str, email: str, role: str, elo: float):
    """Mise à jour complète par un administrateur."""
    conn = get_connection()
    conn.execute(
        """
        UPDATE users
        SET full_name = ?, email = ?, role = ?, elo = ?
        WHERE id = ?
        """,
        (full_name, email, role, elo, user_id),
    )
    conn.commit()


def set_archived(user_id: int, archived: bool):
    """
    Archive (ou désarchive) un utilisateur.
    On NE supprime jamais physiquement un compte — ses matchs joués,
    ses notations et son historique restent visibles dans la base.
    """
    conn = get_connection()
    conn.execute(
        "UPDATE users SET archived = ? WHERE id = ?",
        (1 if archived else 0, user_id),
    )
    conn.commit()
