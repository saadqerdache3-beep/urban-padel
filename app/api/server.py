"""
============================================================
 app/api/server.py
============================================================
 Configuration de l'application Flask :
   - Création de l'app
   - Branchement des routes API (blueprint /api/*)
   - Service du frontend statique depuis ./views/
   - Gestion centralisée des erreurs
   - CORS
   - Fermeture propre de la connexion DB
============================================================
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from app.core.config import CORS_ORIGINS, BASE_DIR
from app.core.database import init_database, close_connection
from app.core.errors import AppError
from app.api.routes import api_bp


# Chemin absolu vers le dossier `views/` (frontend React)
VIEWS_DIR = os.path.join(BASE_DIR, "views")


def create_app():
    """
    Pattern "application factory" :
      - Permet de créer plusieurs instances (utile pour les tests).
      - Centralise la configuration au même endroit.
    """
    app = Flask(__name__, static_folder=None)

    # CORS — utile si on développe le front sur un autre port.
    # En production, Flask sert lui-même le frontend, donc CORS est inutile.
    CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}})

    # Initialise la base si elle n'existe pas (idempotent)
    init_database()

    # Branche les routes /api/*
    app.register_blueprint(api_bp)

    # Ferme la connexion SQLite à la fin de chaque requête
    app.teardown_appcontext(close_connection)

    # ---------------------------------------------------------
    #  GESTION CENTRALISÉE DES ERREURS
    # ---------------------------------------------------------
    @app.errorhandler(AppError)
    def handle_app_error(err):
        """
        Toutes les erreurs métier (Unauthorized, NotFound, EloIncompatible…)
        sont capturées ici et transformées en JSON propre :
            { "ok": false, "error": "CODE", "message": "..." }
        """
        return jsonify({
            "ok":      False,
            "error":   err.code,
            "message": err.message,
        }), err.http_status

    @app.errorhandler(405)
    def handle_405(_):
        return jsonify({
            "ok": False, "error": "METHOD_NOT_ALLOWED",
            "message": "Méthode HTTP non autorisée.",
        }), 405

    @app.errorhandler(500)
    def handle_500(err):
        import traceback; traceback.print_exc()
        return jsonify({
            "ok": False, "error": "SERVER_ERROR",
            "message": "Erreur interne du serveur.",
        }), 500

    # Route santé pour vérifier que l'API tourne
    @app.route("/api/health")
    def health():
        return jsonify({"ok": True, "service": "Urban Padel API", "status": "up"})

    # ---------------------------------------------------------
    #  SERVICE DU FRONTEND STATIQUE
    # ---------------------------------------------------------
    # Les fichiers du dossier `views/` (HTML, JSX, CSS, images)
    # sont servis directement par Flask. Cela permet de tout
    # lancer avec un seul `python main.py` — pas besoin d'un
    # serveur statique séparé.
    @app.route("/")
    def serve_index():
        return send_from_directory(VIEWS_DIR, "index.html")

    @app.route("/<path:path>")
    def serve_static(path):
        # Si le fichier existe dans views/, on le sert.
        full = os.path.join(VIEWS_DIR, path)
        if os.path.isfile(full):
            return send_from_directory(VIEWS_DIR, path)
        # Sinon : c'est probablement une route inconnue de l'API
        # (les routes /api/* ont été matchées plus haut). On
        # renvoie l'index pour laisser React gérer la navigation.
        return send_from_directory(VIEWS_DIR, "index.html")

    @app.errorhandler(404)
    def handle_404(_):
        # Si la requête commence par /api → JSON d'erreur.
        from flask import request
        if request.path.startswith("/api"):
            return jsonify({
                "ok": False, "error": "NOT_FOUND",
                "message": "Route introuvable.",
            }), 404
        # Sinon on renvoie le frontend (route React inconnue côté serveur)
        return send_from_directory(VIEWS_DIR, "index.html")

    return app
