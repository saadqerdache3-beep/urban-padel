"""
============================================================
 app/core/database.py
============================================================
 Gestion centralisée de la connexion SQLite.

 Pourquoi ce fichier ?
  - Une SEULE source de connexion à la base de données.
  - Configuration cohérente (foreign_keys ON, row_factory).
  - Création automatique des tables au premier lancement.

 Pourquoi sqlite3 natif et pas un ORM (SQLAlchemy) ?
  - Pédagogiquement, c'est plus clair : on voit les vraies
    requêtes SQL.
  - Plus simple à défendre à l'oral : pas de "magie" cachée.
  - SQLite + sqlite3 = aucune dépendance externe.
============================================================
"""

import sqlite3
from flask import g
from app.core.config import DATABASE_PATH


def get_connection():
    """
    Retourne une connexion à la base SQLite.

    On utilise `flask.g` (objet "global" par requête HTTP) pour
    réutiliser la MÊME connexion durant une requête HTTP.
    Cela évite d'ouvrir/fermer la base à chaque appel SQL.

    Configuration appliquée :
      - row_factory = sqlite3.Row : permet d'accéder aux colonnes
        par leur nom (row['id']) au lieu de l'index (row[0]).
      - PRAGMA foreign_keys = ON : SQLite désactive par défaut
        les clés étrangères. On les active explicitement pour
        garantir l'intégrité référentielle.
    """
    if "db" not in g:
        conn = sqlite3.connect(str(DATABASE_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


def close_connection(exception=None):
    """
    Ferme la connexion à la fin de chaque requête HTTP.
    Branchée automatiquement via app.teardown_appcontext.
    """
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_database():
    """
    Crée toutes les tables si elles n'existent pas encore.

    Schéma exact (cf. SPECS.md §2). Les `IF NOT EXISTS` rendent
    la fonction idempotente : on peut l'appeler plusieurs fois
    sans erreur.

    Les tables sont créées dans l'ordre des dépendances :
    users → courts → bookings → matches → match_players → match_results → ratings
    """
    # On ouvre une connexion "directe" car on est hors contexte Flask
    # au moment du démarrage du serveur.
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # ------------------------------------------------------
    #  Table users
    # ------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name       TEXT    NOT NULL,
            email           TEXT    NOT NULL UNIQUE,
            password_hash   TEXT    NOT NULL,
            role            TEXT    NOT NULL DEFAULT 'player'
                            CHECK (role IN ('player', 'admin')),
            elo             REAL    NOT NULL DEFAULT 1.0,
            played          INTEGER NOT NULL DEFAULT 0,
            wins            INTEGER NOT NULL DEFAULT 0,
            losses          INTEGER NOT NULL DEFAULT 0,
            -- Notations cumulées (somme + nombre, pour calcul de moyenne)
            rating_fairplay_sum    REAL    NOT NULL DEFAULT 0,
            rating_punctuality_sum REAL    NOT NULL DEFAULT 0,
            rating_teamspirit_sum  REAL    NOT NULL DEFAULT 0,
            rating_count           INTEGER NOT NULL DEFAULT 0,
            -- Archivage : un utilisateur archivé est "désactivé" mais ses données
            -- (matchs joués, notations, historique) sont préservées pour la traçabilité.
            archived        INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Migration : ajout de la colonne `archived` si la base existait déjà avant.
    # ALTER TABLE échoue silencieusement si la colonne existe déjà.
    try:
        cur.execute("ALTER TABLE users ADD COLUMN archived INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # colonne déjà présente

    # Migration métier : le Terrain Individuel passe de 1 à 2 joueurs.
    # Avant : un seul joueur réservait le terrain pour 125 MAD.
    # Maintenant : 2 joueurs en 1v1, chacun paie 125 MAD (250 MAD la séance).
    # Cette migration est idempotente — elle se lance à chaque démarrage
    # mais ne change rien si la valeur est déjà bonne.
    try:
        cur.execute("UPDATE courts SET capacity = 2 WHERE name = 'Terrain Individuel' AND capacity < 2")
    except sqlite3.OperationalError:
        pass

    # ------------------------------------------------------
    #  Table courts (terrains du club)
    # ------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS courts (
            id        INTEGER PRIMARY KEY,
            name      TEXT    NOT NULL,
            type      TEXT    NOT NULL CHECK (type IN ('Double', 'Simple')),
            capacity  INTEGER NOT NULL,
            price     INTEGER NOT NULL  -- en MAD, par joueur (Double) ou par séance (Simple)
        )
    """)

    # ------------------------------------------------------
    #  Table bookings (réservations directes — sans match)
    # ------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            court_id        INTEGER NOT NULL,
            date            TEXT    NOT NULL,           -- format 'YYYY-MM-DD'
            start_time      TEXT    NOT NULL,           -- format 'HH:MM'
            end_time        TEXT    NOT NULL,
            status          TEXT    NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled', 'completed', 'cancelled')),
            total           INTEGER NOT NULL,           -- montant total MAD
            payment_status  TEXT    NOT NULL DEFAULT 'unpaid'
                            CHECK (payment_status IN ('paid', 'unpaid')),
            share_link      TEXT,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id)  REFERENCES users(id),
            FOREIGN KEY (court_id) REFERENCES courts(id)
        )
    """)

    # ------------------------------------------------------
    #  Table matches (matchs ouverts à plusieurs joueurs)
    # ------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            court_id        INTEGER NOT NULL,
            created_by      INTEGER NOT NULL,
            level_min       REAL    NOT NULL,           -- borne basse Elo acceptée
            level_max       REAL    NOT NULL,           -- borne haute Elo acceptée
            type            TEXT    NOT NULL CHECK (type IN ('Double', 'Simple')),
            date            TEXT    NOT NULL,
            start_time      TEXT    NOT NULL,
            end_time        TEXT    NOT NULL,
            status          TEXT    NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled', 'completed', 'cancelled')),
            visibility      TEXT    NOT NULL DEFAULT 'public'
                            CHECK (visibility IN ('public', 'private')),
            note            TEXT,
            payment_status  TEXT    NOT NULL DEFAULT 'unpaid'
                            CHECK (payment_status IN ('paid', 'unpaid')),
            share_link      TEXT,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (court_id)   REFERENCES courts(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)

    # ------------------------------------------------------
    #  Table match_players (jointure N-N matchs <-> joueurs)
    # ------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS match_players (
            match_id   INTEGER NOT NULL,
            user_id    INTEGER NOT NULL,
            team       INTEGER,             -- 1 ou 2 (pour double), NULL en simple
            joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (match_id, user_id),
            FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)  REFERENCES users(id)
        )
    """)

    # ------------------------------------------------------
    #  Table match_results (score d'un match terminé)
    # ------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS match_results (
            match_id      INTEGER PRIMARY KEY,
            -- Sets stockés en JSON : ex. '[{"t1":6,"t2":3},{"t1":4,"t2":6},{"t1":7,"t2":5}]'
            sets          TEXT NOT NULL,
            winner_team   INTEGER NOT NULL,           -- 1 ou 2
            submitted_by  INTEGER NOT NULL,
            submitted_at  TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (match_id)     REFERENCES matches(id) ON DELETE CASCADE,
            FOREIGN KEY (submitted_by) REFERENCES users(id)
        )
    """)

    # ------------------------------------------------------
    #  Table ratings (notation entre joueurs après un match)
    # ------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user    INTEGER NOT NULL,
            to_user      INTEGER NOT NULL,
            match_id     INTEGER NOT NULL,
            fairplay     INTEGER NOT NULL CHECK (fairplay     BETWEEN 1 AND 5),
            punctuality  INTEGER NOT NULL CHECK (punctuality  BETWEEN 1 AND 5),
            teamspirit   INTEGER NOT NULL CHECK (teamspirit   BETWEEN 1 AND 5),
            created_at   TEXT NOT NULL DEFAULT (datetime('now')),
            -- Un joueur ne peut pas noter le même joueur deux fois pour le même match
            UNIQUE (from_user, to_user, match_id),
            FOREIGN KEY (from_user) REFERENCES users(id),
            FOREIGN KEY (to_user)   REFERENCES users(id),
            FOREIGN KEY (match_id)  REFERENCES matches(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()
