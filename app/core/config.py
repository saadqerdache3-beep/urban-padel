"""
============================================================
 app/core/config.py
============================================================
 Configuration centrale de l'application Urban Padel.

 Toutes les constantes "métier" et techniques sont ici afin
 que l'on puisse modifier facilement le comportement du système
 sans toucher au code.

 Bonnes pratiques :
  - Les secrets (JWT_SECRET) DOIVENT venir d'une variable
    d'environnement en production. En développement on garde
    une valeur par défaut pour faciliter l'examen.
  - Les valeurs métier (créneaux, prix, règles Elo) reflètent
    SPECS.md. Toute modification de ces règles passe par ce
    fichier UNIQUEMENT.
============================================================
"""

import os
from pathlib import Path

# -----------------------------------------------------------
#  CHEMINS DE FICHIERS
# -----------------------------------------------------------
# BASE_DIR pointe vers la racine du projet "backend/"
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Fichier SQLite (créé automatiquement au premier lancement)
DATABASE_PATH = BASE_DIR / "urban_padel.db"

# -----------------------------------------------------------
#  AUTHENTIFICATION JWT
# -----------------------------------------------------------
# En PRODUCTION : utiliser os.environ['JWT_SECRET']
# En DEV/EXAMEN : valeur par défaut pour ne pas bloquer le démarrage
JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "urban-padel-secret-dev-only-change-in-production"
)
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24  # Token valable 24h (suffisant pour démo)

# -----------------------------------------------------------
#  RÈGLES MÉTIER — TERRAINS & TARIFS (cf. SPECS.md §3)
# -----------------------------------------------------------
# Liste des terrains du club (sera insérée au premier démarrage).
COURTS = [
    {"id": 1, "name": "Terrain 1",          "type": "Double", "capacity": 4, "price": 110},
    {"id": 2, "name": "Terrain 2",          "type": "Double", "capacity": 4, "price": 110},
    # Terrain individuel : format "Simple" 1v1 → 2 joueurs, chacun paie 125 MAD
    # (la séance complète vaut donc 250 MAD si les 2 places sont prises).
    {"id": 3, "name": "Terrain Individuel", "type": "Simple", "capacity": 2, "price": 125},
]

# Créneaux horaires fixes du club (sessions de 1h30)
SLOT_TIMES = [
    "08:00", "09:30", "11:00", "12:30", "14:00",
    "15:30", "17:00", "18:30", "20:00", "21:30",
]
SLOT_DURATION_MINUTES = 90

# -----------------------------------------------------------
#  RÈGLES MÉTIER — SYSTÈME ELO (cf. SPECS.md §4)
# -----------------------------------------------------------
ELO_MIN = 1.0
ELO_MAX = 10.0
ELO_GAIN_WIN = 0.15      # Variation après une victoire
ELO_LOSS = 0.10          # Variation après une défaite
ELO_TOLERANCE = 0.5      # Tolérance ±0.5 sur la borne supérieure d'un match

# Niveaux nommés (utilisés par le frontend pour afficher la catégorie)
ELO_LEVELS = [
    {"name": "Débutant",      "min": 1.0, "max": 2.5},
    {"name": "Intermédiaire", "min": 2.5, "max": 4.0},
    {"name": "Confirmé",      "min": 4.0, "max": 5.5},
    {"name": "Avancé",        "min": 5.5, "max": 7.0},
    {"name": "Expert",        "min": 7.0, "max": 10.0},
]

# -----------------------------------------------------------
#  RÈGLES MÉTIER — RÉSERVATIONS
# -----------------------------------------------------------
# Délai minimum avant le début pour annuler une réservation (en heures).
CANCEL_DEADLINE_HOURS = 5

# -----------------------------------------------------------
#  CORS — domaines autorisés à appeler l'API
# -----------------------------------------------------------
# En dev on accepte tout (le React peut tourner sur n'importe quel port).
# En prod on listerait les domaines précis.
CORS_ORIGINS = "*"
