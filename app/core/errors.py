"""
============================================================
 app/core/errors.py
============================================================
 Erreurs métier centralisées.

 Chaque erreur métier (Elo incompatible, créneau passé, etc.)
 est représentée par une classe dédiée. Un seul handler dans
 l'API se charge ensuite de les transformer en réponses JSON
 propres :  { "ok": false, "error": "...", "message": "..." }

 Avantage : la couche service n'a JAMAIS à manipuler des
 codes HTTP. Elle lève des exceptions métier, et c'est tout.
============================================================
"""


class AppError(Exception):
    """
    Erreur de base. Toutes les erreurs métier en héritent.

    Attributs :
      - code        : identifiant machine (ex: 'ELO_INCOMPATIBLE')
      - message     : message lisible pour l'utilisateur (français)
      - http_status : code HTTP à renvoyer (défaut : 400)
    """
    code = "APP_ERROR"
    message = "Une erreur est survenue."
    http_status = 400

    def __init__(self, message=None):
        # Permet de personnaliser le message au moment de lever l'erreur.
        if message:
            self.message = message
        super().__init__(self.message)


# -----------------------------------------------------------
#  Erreurs d'authentification & autorisation
# -----------------------------------------------------------
class Unauthorized(AppError):
    code = "UNAUTHORIZED"
    message = "Authentification requise."
    http_status = 401


class Forbidden(AppError):
    code = "FORBIDDEN"
    message = "Accès refusé."
    http_status = 403


class InvalidCredentials(AppError):
    code = "INVALID_CREDENTIALS"
    message = "Email ou mot de passe incorrect."
    http_status = 401


class EmailAlreadyUsed(AppError):
    code = "EMAIL_ALREADY_USED"
    message = "Cette adresse email est déjà utilisée."
    http_status = 409


class AccountArchived(AppError):
    code = "ACCOUNT_ARCHIVED"
    message = "Ce compte a été archivé. Contactez l'administrateur."
    http_status = 403


# -----------------------------------------------------------
#  Erreurs de ressource
# -----------------------------------------------------------
class NotFound(AppError):
    code = "NOT_FOUND"
    message = "Ressource introuvable."
    http_status = 404


class ValidationError(AppError):
    code = "VALIDATION_ERROR"
    message = "Données invalides."
    http_status = 400


# -----------------------------------------------------------
#  Erreurs métier — créneaux & réservations
# -----------------------------------------------------------
class SlotInPast(AppError):
    code = "SLOT_IN_PAST"
    message = "Ce créneau est déjà passé."
    http_status = 400


class SlotUnavailable(AppError):
    code = "SLOT_UNAVAILABLE"
    message = "Ce créneau n'est plus disponible."
    http_status = 409


class CancelTooLate(AppError):
    code = "CANCEL_TOO_LATE"
    message = "Annulation impossible : moins de 5h avant le début."
    http_status = 400


# -----------------------------------------------------------
#  Erreurs métier — matchs
# -----------------------------------------------------------
class EloIncompatible(AppError):
    code = "ELO_INCOMPATIBLE"
    message = "Votre niveau Elo n'est pas compatible avec ce match."
    http_status = 400


class MatchFull(AppError):
    code = "MATCH_FULL"
    message = "Ce match est complet."
    http_status = 409


class AlreadyJoined(AppError):
    code = "ALREADY_JOINED"
    message = "Vous avez déjà rejoint ce match."
    http_status = 409


class NotInMatch(AppError):
    code = "NOT_IN_MATCH"
    message = "Vous ne participez pas à ce match."
    http_status = 400


class MatchAlreadyCompleted(AppError):
    code = "MATCH_ALREADY_COMPLETED"
    message = "Ce match est déjà terminé."
    http_status = 400


class AlreadyRated(AppError):
    code = "ALREADY_RATED"
    message = "Vous avez déjà noté ce joueur pour ce match."
    http_status = 409
