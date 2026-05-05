"""
============================================================
 app/models/__init__.py
============================================================
 Modèles : représentations Python des entités métier.

 Rôle :
  - Définir la STRUCTURE des données (champs, types).
  - Convertir les lignes SQLite (sqlite3.Row) en dictionnaires
    propres à renvoyer au frontend en JSON.

 Note : on n'utilise pas de classes complexes ici (pas
 d'ORM). Des fonctions `from_row(...)` suffisent et sont
 plus faciles à comprendre/défendre à l'oral.
============================================================
"""

from app.models.user    import user_from_row, user_public, user_safe, user_admin
from app.models.court   import court_from_row
from app.models.booking import booking_from_row
from app.models.match   import match_from_row, match_player_from_row, match_result_from_row
from app.models.rating  import rating_from_row

__all__ = [
    "user_from_row", "user_public", "user_safe", "user_admin",
    "court_from_row",
    "booking_from_row",
    "match_from_row", "match_player_from_row", "match_result_from_row",
    "rating_from_row",
]
