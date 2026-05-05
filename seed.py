"""
============================================================
 seed.py — Initialisation de la base avec des données de démo
============================================================
 Crée :
   - Les 3 terrains (Terrain 1, Terrain 2, Terrain Individuel)
   - Un compte administrateur :
        admin@urbanpadel.ma  /  admin123
   - 4 joueurs de démonstration :
        youssef@demo.ma   / demo123  (Elo 4.2)
        sara@demo.ma      / demo123  (Elo 3.0)
        karim@demo.ma     / demo123  (Elo 5.5)
        amine@demo.ma     / demo123  (Elo 6.8)
   - 2 réservations
   - 2 matchs (1 public, 1 privé)

 Utilisation :
     python seed.py            (réinitialise et remplit)
     python seed.py --keep     (garde les données existantes)
============================================================
"""

import sys
import os
import datetime as dt

# Ajoute le dossier courant au PYTHONPATH pour pouvoir importer `app.*`
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import DATABASE_PATH, COURTS
from app.core.database import init_database
from app.core.security import hash_password


def reset_database():
    """Supprime le fichier SQLite pour repartir de zéro."""
    if DATABASE_PATH.exists():
        DATABASE_PATH.unlink()
        print(f"[seed] Base supprimée : {DATABASE_PATH}")


def seed_courts(conn):
    """Insère les 3 terrains."""
    cur = conn.cursor()
    for c in COURTS:
        cur.execute(
            """
            INSERT OR REPLACE INTO courts (id, name, type, capacity, price)
            VALUES (?, ?, ?, ?, ?)
            """,
            (c["id"], c["name"], c["type"], c["capacity"], c["price"]),
        )
    conn.commit()
    print("[seed] Terrains créés.")


def seed_users(conn):
    """Crée l'admin + 4 joueurs de démo."""
    cur = conn.cursor()
    users = [
        ("Admin Urban Padel", "admin@urbanpadel.ma", "admin123",   "admin",  7.2),
        ("Youssef Benali",    "youssef@demo.ma",    "demo123",     "player", 4.2),
        ("Sara El Idrissi",   "sara@demo.ma",       "demo123",     "player", 3.0),
        ("Karim Tazi",        "karim@demo.ma",      "demo123",     "player", 5.5),
        ("Amine Cherkaoui",   "amine@demo.ma",      "demo123",     "player", 6.8),
    ]
    for full_name, email, pwd, role, elo in users:
        cur.execute(
            """
            INSERT OR IGNORE INTO users (full_name, email, password_hash, role, elo)
            VALUES (?, ?, ?, ?, ?)
            """,
            (full_name, email, hash_password(pwd), role, elo),
        )
    conn.commit()
    print("[seed] Utilisateurs créés (1 admin + 4 joueurs).")


def seed_bookings_and_matches(conn):
    """
    Crée 2 réservations et 2 matchs sur les jours suivants.
    Toutes les dates sont "demain" et "après-demain" pour rester futures.
    """
    cur = conn.cursor()
    tomorrow = (dt.date.today() + dt.timedelta(days=1)).strftime("%Y-%m-%d")
    after    = (dt.date.today() + dt.timedelta(days=2)).strftime("%Y-%m-%d")

    # Récupère les IDs utilisateurs (Youssef, Sara…)
    cur.execute("SELECT id, email FROM users")
    by_email = {r["email"]: r["id"] for r in cur.fetchall()}

    # ---- Réservation 1 : Youssef sur Terrain 1 demain à 18:30 ----
    cur.execute("""
        INSERT INTO bookings (user_id, court_id, date, start_time, end_time, total, share_link)
        VALUES (?, 1, ?, '18:30', '20:00', 440, ?)
    """, (by_email["youssef@demo.ma"], tomorrow, "https://urbanpadel.ma/join/booking/1"))

    # ---- Réservation 2 : Sara sur Terrain Individuel après-demain ----
    # Tarif : 125 MAD × 2 joueurs = 250 MAD
    cur.execute("""
        INSERT INTO bookings (user_id, court_id, date, start_time, end_time, total, share_link)
        VALUES (?, 3, ?, '11:00', '12:30', 250, ?)
    """, (by_email["sara@demo.ma"], after, "https://urbanpadel.ma/join/booking/2"))

    # ---- Match public : Karim crée un match niveau 4-6 sur Terrain 2 demain à 20:00 ----
    cur.execute("""
        INSERT INTO matches
            (court_id, created_by, level_min, level_max, type, date, start_time, end_time,
             status, visibility, note, share_link)
        VALUES (2, ?, 4.0, 6.0, 'Double', ?, '20:00', '21:30',
                'scheduled', 'public', 'Match amical, niveau intermédiaire+', ?)
    """, (by_email["karim@demo.ma"], tomorrow, "https://urbanpadel.ma/join/match/1"))
    cur.execute("INSERT INTO match_players (match_id, user_id, team) VALUES (1, ?, 1)",
                (by_email["karim@demo.ma"],))
    cur.execute("INSERT INTO match_players (match_id, user_id, team) VALUES (1, ?, 1)",
                (by_email["youssef@demo.ma"],))

    # ---- Match privé : Amine crée un match niveau 6-8 sur Terrain 1 après-demain ----
    cur.execute("""
        INSERT INTO matches
            (court_id, created_by, level_min, level_max, type, date, start_time, end_time,
             status, visibility, note, share_link)
        VALUES (1, ?, 6.0, 8.0, 'Double', ?, '17:00', '18:30',
                'scheduled', 'private', 'Match privé entre amis', ?)
    """, (by_email["amine@demo.ma"], after, "https://urbanpadel.ma/join/match/2"))
    cur.execute("INSERT INTO match_players (match_id, user_id, team) VALUES (2, ?, 1)",
                (by_email["amine@demo.ma"],))

    conn.commit()
    print("[seed] Réservations et matchs de démo créés.")


def main():
    keep = "--keep" in sys.argv
    if not keep:
        reset_database()

    init_database()

    import sqlite3
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    seed_courts(conn)
    seed_users(conn)
    seed_bookings_and_matches(conn)
    conn.close()

    print("\n[seed] Terminé.")
    print("       Admin   :  admin@urbanpadel.ma  /  admin123")
    print("       Joueur  :  youssef@demo.ma      /  demo123")


if __name__ == "__main__":
    main()
