"""
============================================================
 app/controllers/court_controller.py
============================================================
"""

from app.repositories import court_repository
from app.models import court_from_row


def list_courts(current_user):
    """Public au sein de l'app : tous les terrains du club."""
    rows = court_repository.list_all()
    return {"courts": [court_from_row(r) for r in rows]}
