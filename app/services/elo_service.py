"""
============================================================
 app/services/elo_service.py
============================================================
 Logique du système Elo (cf. SPECS §4).

 Ce service est volontairement court et "pur" :
  - Aucun appel base de données ici (fonctions pures).
  - Facile à tester unitairement.
  - Réutilisé par match_service quand un score est soumis.
============================================================
"""

from app.core.config import (
    ELO_MIN, ELO_MAX, ELO_GAIN_WIN, ELO_LOSS, ELO_TOLERANCE, ELO_LEVELS,
)


def clamp(value: float) -> float:
    """Borne une valeur Elo entre 1.0 et 10.0."""
    return max(ELO_MIN, min(ELO_MAX, round(value, 2)))


def apply_win(current: float) -> float:
    """Variation après une victoire : +0.15."""
    return clamp(current + ELO_GAIN_WIN)


def apply_loss(current: float) -> float:
    """Variation après une défaite : -0.10."""
    return clamp(current - ELO_LOSS)


def is_compatible(player_elo: float, level_min: float, level_max: float) -> bool:
    """
    Vérifie qu'un joueur peut rejoindre / créer un match donné.

    Règles :
      - Borne basse stricte : player_elo >= level_min
      - Borne haute tolérante : player_elo <= level_max + 0.5
        → Un joueur avec un Elo légèrement supérieur peut quand
          même jouer (sinon trop restrictif sur les hauts niveaux).
    """
    return (player_elo >= level_min) and (player_elo <= level_max + ELO_TOLERANCE)


def level_name_for(elo: float) -> str:
    """Retourne 'Débutant' / 'Intermédiaire' / etc. pour un Elo."""
    for lvl in ELO_LEVELS:
        if lvl["min"] <= elo < lvl["max"]:
            return lvl["name"]
    return ELO_LEVELS[-1]["name"]  # cas elo == 10.0


def levels_catalog():
    """Retourne le catalogue complet des niveaux (utilisé par l'API)."""
    return ELO_LEVELS
