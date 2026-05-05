"""
============================================================
 app/repositories/court_repository.py
============================================================
 Accès SQL pour la table `courts` (terrains du club).

 Les terrains sont fixes (3 terrains, créés au seed).
 On ne fait que lire ici.
============================================================
"""

from app.core.database import get_connection


def list_all():
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM courts ORDER BY id ASC")
    return cur.fetchall()


def find_by_id(court_id: int):
    cur = get_connection().cursor()
    cur.execute("SELECT * FROM courts WHERE id = ?", (court_id,))
    return cur.fetchone()


def insert_if_missing(court_id: int, name: str, court_type: str,
                      capacity: int, price: int):
    """Idempotent : utilisé au démarrage pour s'assurer que les terrains existent."""
    conn = get_connection()
    conn.execute(
        """
        INSERT OR IGNORE INTO courts (id, name, type, capacity, price)
        VALUES (?, ?, ?, ?, ?)
        """,
        (court_id, name, court_type, capacity, price),
    )
    conn.commit()
