"""
============================================================
 app/services/admin_service.py
============================================================
 Logique métier de l'espace ADMIN.

 - KPIs du tableau de bord (revenus, remplissage, paiements).
 - Liste des utilisateurs avec stats agrégées.
============================================================
"""

import datetime as dt
import re
from app.core.database import get_connection
from app.core.security import hash_password
from app.repositories import user_repository
from app.models import user_public, user_admin
from app.core.errors import NotFound, ValidationError, EmailAlreadyUsed


def get_overview():
    """
    KPIs du tableau de bord admin :
      - Nombre de joueurs actifs / archivés
      - Réservations totales / scheduled / paid / unpaid
      - Matchs totaux / scheduled / completed / paid / unpaid
      - Revenu total encaissé (bookings + matchs payés)
      - Revenu en attente (bookings + matchs non payés non annulés)
      - Remplissage du jour
    """
    cur = get_connection().cursor()

    # Joueurs (actifs)
    cur.execute("SELECT COUNT(*) AS n FROM users WHERE role = 'player' AND archived = 0")
    nb_players = cur.fetchone()["n"]

    # Réservations
    cur.execute("""
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) AS scheduled,
          SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
          SUM(CASE WHEN payment_status='paid'   AND status<>'cancelled' THEN total ELSE 0 END) AS revenue_paid,
          SUM(CASE WHEN payment_status='unpaid' AND status<>'cancelled' THEN total ELSE 0 END) AS revenue_pending,
          SUM(CASE WHEN payment_status='paid'   AND status<>'cancelled' THEN 1 ELSE 0 END) AS paid_count,
          SUM(CASE WHEN payment_status='unpaid' AND status<>'cancelled' THEN 1 ELSE 0 END) AS unpaid_count
        FROM bookings
    """)
    b = cur.fetchone()

    # Matchs : on calcule aussi le revenu (prix par joueur × joueurs inscrits).
    # Cela suit la même logique métier que la création (price = pricePlayer pour les terrains).
    cur.execute("""
        SELECT
          m.id, m.status, m.payment_status, c.price, c.type, c.capacity,
          (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) AS nb_players
        FROM matches m
        LEFT JOIN courts c ON c.id = m.court_id
    """)
    match_rows = cur.fetchall()

    m_total = len(match_rows)
    m_scheduled = sum(1 for r in match_rows if r["status"] == "scheduled")
    m_completed = sum(1 for r in match_rows if r["status"] == "completed")
    m_cancelled = sum(1 for r in match_rows if r["status"] == "cancelled")

    def match_amount(r):
        """
        Montant facturé d'un match :
        Prix par joueur × nombre de joueurs inscrits.
        - Terrain Double      : price (par joueur) × nb_players
        - Terrain Individuel  : price (par joueur) × nb_players (max 2 → 250 MAD)
        Cette logique uniforme évite que le revenu d'un match Simple
        avec 2 joueurs soit sous-évalué.
        """
        return (r["price"] or 0) * (r["nb_players"] or 0)

    m_revenue_paid    = sum(match_amount(r) for r in match_rows
                            if r["payment_status"] == "paid"   and r["status"] != "cancelled")
    m_revenue_pending = sum(match_amount(r) for r in match_rows
                            if r["payment_status"] == "unpaid" and r["status"] != "cancelled")
    m_paid_count   = sum(1 for r in match_rows
                         if r["payment_status"] == "paid"   and r["status"] != "cancelled")
    m_unpaid_count = sum(1 for r in match_rows
                         if r["payment_status"] == "unpaid" and r["status"] != "cancelled")

    # Remplissage du jour
    today = dt.date.today().strftime("%Y-%m-%d")
    cur.execute("""
        SELECT COUNT(DISTINCT court_id || '|' || start_time) AS occupied FROM (
            SELECT court_id, start_time FROM bookings
              WHERE date = ? AND status='scheduled'
            UNION
            SELECT court_id, start_time FROM matches
              WHERE date = ? AND status='scheduled'
        )
    """, (today, today))
    occupied_today = cur.fetchone()["occupied"]

    from app.core.config import SLOT_TIMES, COURTS
    total_slots_today = len(SLOT_TIMES) * len(COURTS)

    revenue_paid    = (b["revenue_paid"]    or 0) + m_revenue_paid
    revenue_pending = (b["revenue_pending"] or 0) + m_revenue_pending
    paid_count_total   = (b["paid_count"]   or 0) + m_paid_count
    unpaid_count_total = (b["unpaid_count"] or 0) + m_unpaid_count

    # ─── Revenus jour-par-jour sur les 7 derniers jours (incluant aujourd'hui) ───
    # Les graphes du tableau de bord se basent sur ce tableau pour être DYNAMIQUES.
    # On agrège les bookings payés + les matchs payés par date.
    today_d = dt.date.today()
    last_7_days = [(today_d - dt.timedelta(days=6 - i)) for i in range(7)]
    last_7_strs = [d.strftime("%Y-%m-%d") for d in last_7_days]
    weekday_labels_fr = ["L", "M", "M", "J", "V", "S", "D"]  # Lundi..Dimanche

    # Bookings payés par jour
    cur.execute("""
        SELECT date, SUM(total) AS revenue
        FROM bookings
        WHERE payment_status = 'paid' AND status <> 'cancelled'
              AND date >= ? AND date <= ?
        GROUP BY date
    """, (last_7_strs[0], last_7_strs[-1]))
    bookings_by_date = {r["date"]: (r["revenue"] or 0) for r in cur.fetchall()}

    # Matchs payés par jour (calcul = price * nb_players, cohérent avec match_amount)
    cur.execute("""
        SELECT m.date,
               SUM((SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) * c.price) AS revenue
        FROM matches m
        LEFT JOIN courts c ON c.id = m.court_id
        WHERE m.payment_status = 'paid' AND m.status <> 'cancelled'
              AND m.date >= ? AND m.date <= ?
        GROUP BY m.date
    """, (last_7_strs[0], last_7_strs[-1]))
    matches_by_date = {r["date"]: (r["revenue"] or 0) for r in cur.fetchall()}

    revenue_7d = []
    for i, d_str in enumerate(last_7_strs):
        # Le label du jour = jour de la semaine (L M M J V S D)
        d_obj = last_7_days[i]
        revenue_7d.append({
            "date":  d_str,
            "label": weekday_labels_fr[d_obj.weekday()],
            "value": (bookings_by_date.get(d_str, 0) or 0) + (matches_by_date.get(d_str, 0) or 0),
        })

    # ─── Comparaison semaine actuelle / semaine précédente (delta % du CA) ───
    seven_days_ago      = (today_d - dt.timedelta(days=6)).strftime("%Y-%m-%d")
    fourteen_days_ago   = (today_d - dt.timedelta(days=13)).strftime("%Y-%m-%d")
    eight_days_ago      = (today_d - dt.timedelta(days=7)).strftime("%Y-%m-%d")

    cur.execute("""
        SELECT COALESCE(SUM(total), 0) AS rev FROM bookings
        WHERE payment_status='paid' AND status<>'cancelled'
              AND date >= ? AND date <= ?
    """, (fourteen_days_ago, eight_days_ago))
    prev_bookings_revenue = cur.fetchone()["rev"] or 0

    cur.execute("""
        SELECT COALESCE(SUM(
                 (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) * c.price
               ), 0) AS rev
        FROM matches m LEFT JOIN courts c ON c.id = m.court_id
        WHERE m.payment_status='paid' AND m.status<>'cancelled'
              AND m.date >= ? AND m.date <= ?
    """, (fourteen_days_ago, eight_days_ago))
    prev_matches_revenue = cur.fetchone()["rev"] or 0

    revenue_7d_total = sum(d["value"] for d in revenue_7d)
    revenue_prev_7d_total = (prev_bookings_revenue + prev_matches_revenue)
    if revenue_prev_7d_total > 0:
        revenue_trend_pct = round(
            (revenue_7d_total - revenue_prev_7d_total) / revenue_prev_7d_total * 100
        )
    elif revenue_7d_total > 0:
        revenue_trend_pct = 100  # passage de 0 à quelque chose
    else:
        revenue_trend_pct = 0

    # ─── Taux de remplissage par terrain (sur les 7 PROCHAINS jours) ───
    # Plutôt que regarder le passé (déjà figé), on mesure le remplissage à venir
    # — c'est ce qui aide à anticiper la demande. On compte les créneaux déjà
    # réservés / réservés via match sur la fenêtre [aujourd'hui, +7 jours].
    next_7_start = today_d.strftime("%Y-%m-%d")
    next_7_end   = (today_d + dt.timedelta(days=6)).strftime("%Y-%m-%d")
    courts_fill = []
    for c_def in COURTS:
        cur.execute("""
            SELECT COUNT(DISTINCT date || '|' || start_time) AS n FROM (
                SELECT date, start_time FROM bookings
                    WHERE court_id = ? AND status='scheduled'
                          AND date >= ? AND date <= ?
                UNION
                SELECT date, start_time FROM matches
                    WHERE court_id = ? AND status='scheduled'
                          AND date >= ? AND date <= ?
            )
        """, (c_def["id"], next_7_start, next_7_end,
              c_def["id"], next_7_start, next_7_end))
        occupied = cur.fetchone()["n"] or 0
        total_slots = len(SLOT_TIMES) * 7  # 7 jours
        rate = round(occupied / total_slots * 100) if total_slots else 0
        courts_fill.append({
            "court_id": c_def["id"],
            "name":     c_def["name"],
            # Label court pour le graphe ("Indiv." pour Terrain Individuel)
            "label":    "Indiv." if c_def["type"] == "Simple" else c_def["name"],
            "rate":     rate,
            "occupied": occupied,
            "total":    total_slots,
        })

    return {
        "players":   nb_players,
        "bookings": {
            "total":     b["total"]     or 0,
            "scheduled": b["scheduled"] or 0,
            "completed": b["completed"] or 0,
            "cancelled": b["cancelled"] or 0,
            "paid":      b["paid_count"]   or 0,
            "unpaid":    b["unpaid_count"] or 0,
        },
        "matches": {
            "total":     m_total,
            "scheduled": m_scheduled,
            "completed": m_completed,
            "cancelled": m_cancelled,
            "paid":      m_paid_count,
            "unpaid":    m_unpaid_count,
        },
        "revenue": {
            "paid":           revenue_paid,
            "pending":        revenue_pending,
            "bookings_paid":  b["revenue_paid"] or 0,
            "matches_paid":   m_revenue_paid,
            "paid_count":     paid_count_total,
            "unpaid_count":   unpaid_count_total,
            # Données pour le graphe "Revenus 7 derniers jours"
            "last_7_days":     revenue_7d,
            "last_7_total":    revenue_7d_total,
            "previous_7_total": revenue_prev_7d_total,
            "trend_pct":       revenue_trend_pct,
        },
        "today_fill": {
            "occupied": occupied_today,
            "total":    total_slots_today,
            "rate":     round(occupied_today / total_slots_today, 2) if total_slots_today else 0,
        },
        # Taux de remplissage 7 jours par terrain (utilisé par le dashboard)
        "courts_fill": courts_fill,
    }


def list_users():
    """
    Liste TOUS les utilisateurs (joueurs + admins) avec leurs stats.
    Avant : seuls les joueurs étaient listés, ce qui rendait le filtre
    "Admins" du panneau toujours vide et empêchait de retrouver l'admin
    dans state.users (utilisé pour résoudre les avatars dans les tables).
    """
    rows = user_repository.list_all()
    return [user_admin(r) for r in rows]


def update_user(user_id: int, full_name: str, email: str, role: str, elo: float):
    if user_repository.find_by_id(user_id) is None:
        raise NotFound("Utilisateur introuvable.")
    if role not in ("player", "admin"):
        raise ValidationError("Rôle invalide.")
    elo = max(1.0, min(10.0, float(elo)))
    user_repository.admin_update(user_id, full_name.strip(), email.strip().lower(), role, elo)
    return user_admin(user_repository.find_by_id(user_id))


def set_user_archived(user_id: int, archived: bool):
    """
    Archive (ou désarchive) un utilisateur.
    Politique : on n'efface jamais un compte — l'archivage le
    désactive tout en préservant son historique.
    """
    row = user_repository.find_by_id(user_id)
    if row is None:
        raise NotFound("Utilisateur introuvable.")
    if row["role"] == "admin":
        raise ValidationError("Impossible d'archiver un compte administrateur.")
    user_repository.set_archived(user_id, bool(archived))
    return user_admin(user_repository.find_by_id(user_id))


_EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def create_user(full_name: str, email: str, password: str,
                role: str = "player", elo: float = 3.0):
    """
    Création d'un compte par un administrateur.

    Différence avec auth_service.register :
      - L'admin peut choisir le rôle (player/admin) et l'Elo de départ.
      - Pas de génération de token (l'admin n'est pas en train de se connecter
        en tant que ce nouvel utilisateur).

    Étapes :
      1. Validation des champs.
      2. Vérifier que l'email est libre.
      3. Hasher le mot de passe.
      4. Insérer en DB et retourner la version admin (avec email).
    """
    full_name = (full_name or "").strip()
    email = (email or "").strip().lower()
    password = password or ""

    if not full_name:
        raise ValidationError("Le nom complet est requis.")
    if not _EMAIL_REGEX.match(email):
        raise ValidationError("Adresse email invalide.")
    if len(password) < 6:
        raise ValidationError("Le mot de passe doit contenir au moins 6 caractères.")
    if role not in ("player", "admin"):
        raise ValidationError("Rôle invalide.")

    if user_repository.find_by_email(email) is not None:
        raise EmailAlreadyUsed()

    # Bornage défensif de l'Elo (1.0 — 10.0)
    try:
        elo = float(elo)
    except (TypeError, ValueError):
        elo = 3.0
    elo = max(1.0, min(10.0, elo))

    user_id = user_repository.create(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        elo=elo,
    )
    return user_admin(user_repository.find_by_id(user_id))
