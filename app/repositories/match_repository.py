"""
============================================================
 app/repositories/match_repository.py
============================================================
 Accès SQL pour les tables `matches`, `match_players`,
 `match_results` et `ratings`.

 On regroupe ces 4 tables ici car elles sont fortement
 couplées (toujours manipulées ensemble).
============================================================
"""

import json
from app.core.database import get_connection


# -----------------------------------------------------------
#  MATCHES
# -----------------------------------------------------------
def find_by_id(match_id: int):
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
    return cur.fetchone()


def list_public_upcoming():
    """
    Liste des matchs publics futurs uniquement.
    Le filtre temporel se fait côté SQL (datetime de SQLite).
    """
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT * FROM matches
        WHERE visibility = 'public'
          AND status = 'scheduled'
          AND datetime(date || ' ' || start_time) > datetime('now', 'localtime')
        ORDER BY date ASC, start_time ASC
        """
    )
    return cur.fetchall()


def list_by_user(user_id: int):
    """Tous les matchs auxquels un utilisateur participe."""
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT m.* FROM matches m
        INNER JOIN match_players mp ON mp.match_id = m.id
        WHERE mp.user_id = ?
        ORDER BY m.date DESC, m.start_time DESC
        """,
        (user_id,),
    )
    return cur.fetchall()


def list_all():
    """Tous les matchs (vue admin)."""
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM matches ORDER BY date DESC, start_time DESC")
    return cur.fetchall()


def create(court_id: int, created_by: int, level_min: float, level_max: float,
           match_type: str, date: str, start_time: str, end_time: str,
           visibility: str, note: str = None, share_link: str = None) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO matches
            (court_id, created_by, level_min, level_max, type,
             date, start_time, end_time, visibility, note, share_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (court_id, created_by, level_min, level_max, match_type,
         date, start_time, end_time, visibility, note, share_link),
    )
    conn.commit()
    return cur.lastrowid


def update_status(match_id: int, status: str):
    conn = get_connection()
    conn.execute("UPDATE matches SET status = ? WHERE id = ?", (status, match_id))
    conn.commit()


def update_payment(match_id: int, payment_status: str):
    conn = get_connection()
    conn.execute(
        "UPDATE matches SET payment_status = ? WHERE id = ?",
        (payment_status, match_id),
    )
    conn.commit()


def update_share_link(match_id: int, share_link: str):
    conn = get_connection()
    conn.execute(
        "UPDATE matches SET share_link = ? WHERE id = ?",
        (share_link, match_id),
    )
    conn.commit()


# -----------------------------------------------------------
#  MATCH_PLAYERS
# -----------------------------------------------------------
def list_players(match_id: int):
    """
    Retourne les joueurs d'un match avec leurs infos publiques.
    Jointure avec users pour éviter N+1.
    """
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT u.*, mp.team, mp.joined_at
        FROM match_players mp
        INNER JOIN users u ON u.id = mp.user_id
        WHERE mp.match_id = ?
        ORDER BY mp.team ASC, mp.joined_at ASC
        """,
        (match_id,),
    )
    return cur.fetchall()


def count_players(match_id: int) -> int:
    cur = get_connection().cursor()
    cur.execute(
        "SELECT COUNT(*) AS n FROM match_players WHERE match_id = ?",
        (match_id,),
    )
    return cur.fetchone()["n"]


def is_player_in_match(match_id: int, user_id: int) -> bool:
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT 1 FROM match_players
        WHERE match_id = ? AND user_id = ?
        LIMIT 1
        """,
        (match_id, user_id),
    )
    return cur.fetchone() is not None


def add_player(match_id: int, user_id: int, team: int = None):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO match_players (match_id, user_id, team)
        VALUES (?, ?, ?)
        """,
        (match_id, user_id, team),
    )
    conn.commit()


def remove_player(match_id: int, user_id: int):
    conn = get_connection()
    conn.execute(
        "DELETE FROM match_players WHERE match_id = ? AND user_id = ?",
        (match_id, user_id),
    )
    conn.commit()


# -----------------------------------------------------------
#  MATCH_RESULTS
# -----------------------------------------------------------
def find_result(match_id: int):
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM match_results WHERE match_id = ?", (match_id,))
    return cur.fetchone()


def save_result(match_id: int, sets: list, winner_team: int, submitted_by: int):
    """
    Stocke le score d'un match. `sets` est sérialisé en JSON.
    Exemple sets : [{"t1": 6, "t2": 4}, {"t1": 3, "t2": 6}, {"t1": 7, "t2": 5}]
    """
    conn = get_connection()
    conn.execute(
        """
        INSERT OR REPLACE INTO match_results
            (match_id, sets, winner_team, submitted_by)
        VALUES (?, ?, ?, ?)
        """,
        (match_id, json.dumps(sets), winner_team, submitted_by),
    )
    conn.commit()


# -----------------------------------------------------------
#  RATINGS
# -----------------------------------------------------------
def has_rated(from_user: int, to_user: int, match_id: int) -> bool:
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT 1 FROM ratings
        WHERE from_user = ? AND to_user = ? AND match_id = ?
        LIMIT 1
        """,
        (from_user, to_user, match_id),
    )
    return cur.fetchone() is not None


def add_rating(from_user: int, to_user: int, match_id: int,
               fairplay: int, punctuality: int, teamspirit: int):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO ratings
            (from_user, to_user, match_id, fairplay, punctuality, teamspirit)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (from_user, to_user, match_id, fairplay, punctuality, teamspirit),
    )
    conn.commit()


def list_raters(match_id: int):
    """
    Retourne la liste des `from_user` ayant déjà émis au moins une notation
    pour ce match. Sert au frontend pour savoir qui a fini d'évaluer ses
    partenaires (et masquer le bouton "Évaluer" en conséquence).
    """
    cur = get_connection().cursor()
    cur.execute(
        "SELECT DISTINCT from_user FROM ratings WHERE match_id = ?",
        (match_id,),
    )
    return [r["from_user"] for r in cur.fetchall()]


def count_distinct_rated(from_user: int, match_id: int) -> int:
    """
    Combien de joueurs `from_user` a déjà notés pour ce match.
    Utile pour distinguer "a commencé à évaluer" de "a fini d'évaluer".
    """
    cur = get_connection().cursor()
    cur.execute(
        """
        SELECT COUNT(DISTINCT to_user) AS n
        FROM ratings
        WHERE from_user = ? AND match_id = ?
        """,
        (from_user, match_id),
    )
    return cur.fetchone()["n"] or 0


# -----------------------------------------------------------
#  ÉDITION D'UN MATCH (admin / créateur)
# -----------------------------------------------------------
def update_match_fields(match_id: int, court_id: int, date: str,
                        start_time: str, end_time: str,
                        level_min: float, level_max: float,
                        match_type: str, visibility: str, note: str):
    """
    Mise à jour partielle/complète d'un match. Réservé aux cas où
    le match n'est pas encore terminé.
    """
    conn = get_connection()
    conn.execute(
        """
        UPDATE matches
        SET court_id   = ?,
            date       = ?,
            start_time = ?,
            end_time   = ?,
            level_min  = ?,
            level_max  = ?,
            type       = ?,
            visibility = ?,
            note       = ?
        WHERE id = ?
        """,
        (court_id, date, start_time, end_time, level_min, level_max,
         match_type, visibility, note, match_id),
    )
    conn.commit()



