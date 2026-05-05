"""
startup.py — Lancé UNE FOIS avant gunicorn.
Initialise la base de données et peuple les données de démo
si la base est vide (premier démarrage).
"""
import os
import sys
import sqlite3

# S'assure que le projet est dans le path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import DATABASE_PATH, COURTS
from app.core.database import init_database
from app.core.security import hash_password


def db_is_empty(conn):
    """Retourne True si aucun utilisateur n'existe encore."""
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        return cur.fetchone()[0] == 0
    except Exception:
        return True


def seed(conn):
    """Peuple la base avec l'admin + joueurs de démo."""
    import datetime as dt
    cur = conn.cursor()

    # Terrains
    for c in COURTS:
        cur.execute(
            "INSERT OR REPLACE INTO courts (id, name, type, capacity, price) VALUES (?, ?, ?, ?, ?)",
            (c["id"], c["name"], c["type"], c["capacity"], c["price"]),
        )

    # Utilisateurs
    users = [
        ("Admin Urban Padel", "admin@urbanpadel.ma", "admin123", "admin",  7.2),
        ("Youssef Benali",    "youssef@demo.ma",    "demo123",  "player", 4.2),
        ("Sara El Idrissi",   "sara@demo.ma",       "demo123",  "player", 3.0),
        ("Karim Tazi",        "karim@demo.ma",      "demo123",  "player", 5.5),
        ("Amine Cherkaoui",   "amine@demo.ma",      "demo123",  "player", 6.8),
    ]
    for full_name, email, pwd, role, elo in users:
        cur.execute(
            "INSERT OR IGNORE INTO users (full_name, email, password_hash, role, elo) VALUES (?, ?, ?, ?, ?)",
            (full_name, email, hash_password(pwd), role, elo),
        )

    # Matchs de démo
    cur.execute("SELECT id, email FROM users")
    by_email = {r[1]: r[0] for r in cur.fetchall()}

    tomorrow = (dt.date.today() + dt.timedelta(days=1)).strftime("%Y-%m-%d")
    after    = (dt.date.today() + dt.timedelta(days=2)).strftime("%Y-%m-%d")

    cur.execute(
        "INSERT INTO bookings (user_id, court_id, date, start_time, end_time, total, share_link) VALUES (?, 1, ?, '18:30', '20:00', 440, ?)",
        (by_email["youssef@demo.ma"], tomorrow, "https://saadqerd.pythonanywhere.com/join/booking/1"),
    )
    cur.execute(
        "INSERT INTO bookings (user_id, court_id, date, start_time, end_time, total, share_link) VALUES (?, 3, ?, '11:00', '12:30', 250, ?)",
        (by_email["sara@demo.ma"], after, "https://saadqerd.pythonanywhere.com/join/booking/2"),
    )
    cur.execute(
        """INSERT INTO matches (court_id, created_by, level_min, level_max, type, date, start_time,
           end_time, status, visibility, note, share_link)
           VALUES (2, ?, 4.0, 6.0, 'Double', ?, '20:00', '21:30', 'scheduled', 'public',
           'Match amical niveau intermédiaire+', 'https://saadqerd.pythonanywhere.com/join/match/1')""",
        (by_email["karim@demo.ma"], tomorrow),
    )
    cur.execute("INSERT INTO match_players (match_id, user_id, team) VALUES (1, ?, 1)", (by_email["karim@demo.ma"],))
    cur.execute("INSERT INTO match_players (match_id, user_id, team) VALUES (1, ?, 2)", (by_email["youssef@demo.ma"],))

    conn.commit()
    print("[startup] Base initialisée avec les données de démo.")
    print("[startup] Admin : admin@urbanpadel.ma / admin123")
    print("[startup] Joueur: youssef@demo.ma     / demo123")


def main():
    print(f"[startup] Base de données : {DATABASE_PATH}")

    # Crée les tables si elles n'existent pas
    init_database()

    # Connecte et seed si vide
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    if db_is_empty(conn):
        print("[startup] Base vide — initialisation des données de démo…")
        seed(conn)
    else:
        print("[startup] Base existante — pas de réinitialisation.")

    conn.close()
    print("[startup] Prêt.")


if __name__ == "__main__":
    main()
