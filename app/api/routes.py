"""
============================================================
 app/api/routes.py
============================================================
 Définition des routes Flask (blueprints).

 La couche `api/` est volontairement TRÈS FINE :
  - Mappe chaque URL → contrôleur.
  - Applique les décorateurs d'auth/role.
  - Convertit le retour en JSON via `jsonify_response()`.

 Pour ajouter une fonctionnalité, le chemin est :
   1. Service  (logique)
   2. Contrôleur (orchestration)
   3. Route ici  (URL + HTTP method)
============================================================
"""

from flask import Blueprint, jsonify
from app.api.middleware import auth_required, admin_required

# Import des contrôleurs
from app.controllers import (
    auth_controller, user_controller, booking_controller,
    slot_controller, court_controller, match_controller, admin_controller,
)


# Un seul blueprint sous le préfixe /api pour tout regrouper.
api_bp = Blueprint("api", __name__, url_prefix="/api")


def _ok(payload):
    """Réponse standard succès : { ok: true, ...payload }."""
    body = {"ok": True}
    if isinstance(payload, dict):
        body.update(payload)
    else:
        body["data"] = payload
    return jsonify(body), 200


# =============================================================
#  AUTH
# =============================================================
@api_bp.route("/auth/register", methods=["POST"])
def register():
    return _ok(auth_controller.register())


@api_bp.route("/auth/login", methods=["POST"])
def login():
    return _ok(auth_controller.login())


@api_bp.route("/auth/me", methods=["GET"])
@auth_required
def me(current_user):
    return _ok(auth_controller.me(current_user))


# =============================================================
#  USERS
# =============================================================
@api_bp.route("/users/me", methods=["GET"])
@auth_required
def get_me(current_user):
    return _ok(user_controller.get_me(current_user))


@api_bp.route("/users/me", methods=["PATCH"])
@auth_required
def update_me(current_user):
    return _ok(user_controller.update_me(current_user))


@api_bp.route("/users/<int:user_id>", methods=["GET"])
@auth_required
def get_public_profile(current_user, user_id):
    return _ok(user_controller.get_public_profile(user_id))


# =============================================================
#  COURTS
# =============================================================
@api_bp.route("/courts", methods=["GET"])
@auth_required
def list_courts(current_user):
    return _ok(court_controller.list_courts(current_user))


# =============================================================
#  SLOTS
# =============================================================
@api_bp.route("/slots", methods=["GET"])
@auth_required
def get_slots_day(current_user):
    return _ok(slot_controller.get_day(current_user))


@api_bp.route("/slots/week", methods=["GET"])
@admin_required
def get_slots_week(current_user):
    return _ok(slot_controller.get_week(current_user))


# =============================================================
#  BOOKINGS
# =============================================================
@api_bp.route("/bookings", methods=["GET"])
@auth_required
def list_bookings(current_user):
    return _ok(booking_controller.list_bookings(current_user))


@api_bp.route("/bookings", methods=["POST"])
@auth_required
def create_booking(current_user):
    return _ok(booking_controller.create_booking(current_user))


@api_bp.route("/bookings/<int:booking_id>", methods=["GET"])
@auth_required
def get_booking(current_user, booking_id):
    return _ok(booking_controller.get_booking(current_user, booking_id))


@api_bp.route("/bookings/<int:booking_id>/cancel", methods=["PATCH"])
@auth_required
def cancel_booking(current_user, booking_id):
    return _ok(booking_controller.cancel_booking(current_user, booking_id))


@api_bp.route("/bookings/<int:booking_id>", methods=["PATCH"])
@auth_required
def update_booking(current_user, booking_id):
    return _ok(booking_controller.update_booking(current_user, booking_id))


@api_bp.route("/bookings/<int:booking_id>/payment", methods=["PATCH"])
@admin_required
def set_booking_payment(current_user, booking_id):
    return _ok(booking_controller.set_payment(current_user, booking_id))


@api_bp.route("/admin/bookings", methods=["POST"])
@admin_required
def admin_create_booking(current_user):
    return _ok(booking_controller.admin_create_booking(current_user))


# =============================================================
#  MATCHES
# =============================================================
@api_bp.route("/matches", methods=["GET"])
@auth_required
def list_matches(current_user):
    return _ok(match_controller.list_matches(current_user))


@api_bp.route("/matches/mine", methods=["GET"])
@auth_required
def list_my_matches(current_user):
    return _ok(match_controller.list_my_matches(current_user))


@api_bp.route("/matches", methods=["POST"])
@auth_required
def create_match(current_user):
    return _ok(match_controller.create_match(current_user))


@api_bp.route("/matches/<int:match_id>", methods=["GET"])
@auth_required
def get_match(current_user, match_id):
    return _ok(match_controller.get_match(current_user, match_id))


@api_bp.route("/matches/<int:match_id>/join", methods=["POST"])
@auth_required
def join_match(current_user, match_id):
    return _ok(match_controller.join_match(current_user, match_id))


@api_bp.route("/matches/<int:match_id>/leave", methods=["DELETE"])
@auth_required
def leave_match(current_user, match_id):
    return _ok(match_controller.leave_match(current_user, match_id))


@api_bp.route("/matches/<int:match_id>/cancel", methods=["PATCH"])
@auth_required
def cancel_match(current_user, match_id):
    return _ok(match_controller.cancel_match(current_user, match_id))


@api_bp.route("/matches/<int:match_id>", methods=["PATCH"])
@auth_required
def update_match(current_user, match_id):
    return _ok(match_controller.update_match(current_user, match_id))


@api_bp.route("/matches/<int:match_id>/result", methods=["POST"])
@auth_required
def submit_result(current_user, match_id):
    return _ok(match_controller.submit_result(current_user, match_id))


@api_bp.route("/matches/<int:match_id>/rate", methods=["POST"])
@auth_required
def rate_player(current_user, match_id):
    return _ok(match_controller.rate_player(current_user, match_id))


@api_bp.route("/matches/<int:match_id>/payment", methods=["PATCH"])
@admin_required
def set_match_payment(current_user, match_id):
    return _ok(match_controller.set_payment(current_user, match_id))


# =============================================================
#  ELO LEVELS (utilitaire pour le front)
# =============================================================
@api_bp.route("/elo/levels", methods=["GET"])
def elo_levels():
    return _ok(match_controller.levels_catalog())


# =============================================================
#  ADMIN
# =============================================================
@api_bp.route("/admin/overview", methods=["GET"])
@admin_required
def admin_overview(current_user):
    return _ok(admin_controller.overview(current_user))


@api_bp.route("/admin/users", methods=["GET"])
@admin_required
def admin_list_users(current_user):
    return _ok(admin_controller.list_users(current_user))


@api_bp.route("/admin/users", methods=["POST"])
@admin_required
def admin_create_user(current_user):
    return _ok(admin_controller.create_user(current_user))


@api_bp.route("/admin/users/<int:user_id>", methods=["PATCH"])
@admin_required
def admin_update_user(current_user, user_id):
    return _ok(admin_controller.update_user(current_user, user_id))


@api_bp.route("/admin/users/<int:user_id>/archive", methods=["PATCH"])
@admin_required
def admin_archive_user(current_user, user_id):
    return _ok(admin_controller.set_user_archived(current_user, user_id))
