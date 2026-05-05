"""
============================================================
 app/controllers/booking_controller.py
============================================================
"""

from flask import request
from app.services import booking_service


def list_bookings(current_user):
    """Joueur : ses réservations. Admin : toutes les réservations."""
    if current_user["role"] == "admin":
        return {"bookings": booking_service.list_all_bookings()}
    return {"bookings": booking_service.list_user_bookings(current_user["id"])}


def create_booking(current_user):
    data = request.get_json(silent=True) or {}
    return {"booking": booking_service.create_booking(
        user_id=current_user["id"],
        court_id=int(data.get("court_id")),
        date=data.get("date"),
        start_time=data.get("start_time"),
    )}


def get_booking(current_user, booking_id):
    return {"booking": booking_service.get_booking(booking_id)}


def cancel_booking(current_user, booking_id):
    return {"booking": booking_service.cancel_booking(
        booking_id=booking_id,
        user_id=current_user["id"],
        is_admin=(current_user["role"] == "admin"),
    )}


def update_booking(current_user, booking_id):
    """
    PATCH /api/bookings/<id> — modification par le propriétaire
    ou par un admin (changement de terrain, date, heure).
    """
    data = request.get_json(silent=True) or {}
    return {"booking": booking_service.update_booking(
        booking_id=booking_id,
        user_id=current_user["id"],
        is_admin=(current_user["role"] == "admin"),
        court_id=data.get("court_id"),
        date=data.get("date"),
        start_time=data.get("start_time"),
    )}


def admin_create_booking(current_user):
    """
    POST /api/admin/bookings — l'admin crée une réservation
    POUR un autre utilisateur (le payload contient `user_id`).
    """
    data = request.get_json(silent=True) or {}
    target_user_id = int(data.get("user_id"))
    return {"booking": booking_service.admin_create_booking_for(
        user_id=target_user_id,
        court_id=int(data.get("court_id")),
        date=data.get("date"),
        start_time=data.get("start_time"),
    )}


def set_payment(current_user, booking_id):
    """Admin uniquement (vérifié par décorateur)."""
    data = request.get_json(silent=True) or {}
    return {"booking": booking_service.set_payment(
        booking_id=booking_id,
        payment_status=data.get("payment_status"),
    )}
