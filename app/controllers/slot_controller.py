"""
============================================================
 app/controllers/slot_controller.py
============================================================
"""

from flask import request
import datetime as dt
from app.services import slot_service


def get_day(current_user):
    """GET /api/slots?date=YYYY-MM-DD (défaut : aujourd'hui)."""
    date = request.args.get("date") or dt.date.today().strftime("%Y-%m-%d")
    return {"date": date, "data": slot_service.get_available_slots(date)}


def get_week(current_user):
    """GET /api/slots/week?start=YYYY-MM-DD (défaut : semaine en cours)."""
    start = request.args.get("start")
    return {"week": slot_service.get_week_overview(start)}
