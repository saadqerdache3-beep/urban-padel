# Urban Padel — Corrections appliquées

Ce document liste précisément ce qui a été corrigé suite aux problèmes
remontés ("saisie du résultat trop tôt", "non-rafraîchissement des notations,
du tableau de bord admin, du statut payé", "fonctionnalités modifier match
et modifier réservation manquantes").

## 1. Saisie du résultat & évaluation des joueurs

**Problème :** le bouton "Saisir le résultat" apparaissait dès qu'on était
inscrit dans un match, même si le match n'était pas complet ni terminé.
"Évaluer les joueurs" ne disparaissait jamais après évaluation.

**Corrections :**
- `app/services/match_service.py` — `submit_result()` refuse désormais
  la saisie si le match n'est pas complet ou si le créneau n'est pas
  encore passé.
- `app/services/match_service.py` — `_hydrate()` ajoute trois champs au
  DTO d'un match : `rated_by` (IDs des joueurs ayant déjà évalué),
  `slot_in_past` (créneau dépassé selon l'horloge serveur), `is_full`
  (capacité atteinte) et `max_players`.
- `app/repositories/match_repository.py` — nouvelle fonction
  `list_raters(match_id)`.
- `views/app/MatchDetailView.jsx` — `canResult` n'est `true` que si :
  joueur du match + match complet + créneau passé + statut planifié +
  pas de score. `canRate` n'apparaît qu'après saisie effective du score.
  Une bannière explicite indique pourquoi la saisie est encore bloquée
  ("Le match doit être complet (X/4)" ou "Disponible après le créneau").
- `views/app/AppStore.jsx` — `adaptMatch` lit `ratedBy` depuis le backend
  (au lieu d'un tableau vide en dur). Conséquence : la confirmation
  "✓ Vous avez évalué ce match" s'affiche bien, et la notification
  "Évaluez vos partenaires" disparaît automatiquement après évaluation.

## 2. Réactivité globale (passport, notifications, dashboard admin)

**Problème :** quand quelqu'un évalue un joueur, sa réputation ne se
mettait pas à jour dans son passeport ni dans les notifications. De
même, marquer un match payé ne se reflétait pas dans le chiffre
d'affaires admin.

**Corrections :**
- `views/app/AppStore.jsx` — `reloadCurrentUser()` passe désormais
  par `adaptUser()` (avant : objet brut → champs `name`, `archived`
  bool incohérents avec le reste du store).
- `views/app/AppStore.jsx` — `refreshAll()` recharge également
  l'overview admin (KPIs financiers) en plus des matchs/réservations/
  utilisateurs/notifications. Toute action mutante (création,
  annulation, paiement, score, notation, modification, archivage…)
  passe par `refreshAll()` → toutes les vues abonnées se redessinent.
- `views/app/AppStore.jsx` — `recomputeNotifications()` ajoute une
  notification "Vous avez reçu N nouvelles évaluations" quand
  `currentUser.ratings.count` augmente (compteur `lastRatingsCount`
  conservé en état). La notif "score à saisir" est désormais émise
  quand le match est complet + passé sans score (au lieu de l'ancienne
  condition incohérente status==='completed' + sans sets).
- `app/services/admin_service.py` — `get_overview()` inclut désormais
  les **matchs payés** dans le revenu encaissé et les compteurs
  `paid_count`/`unpaid_count`. Avant, seules les réservations étaient
  comptabilisées → un match marqué payé n'apparaissait nulle part.
- `app/services/admin_service.py` — `list_users()` retourne tous
  les utilisateurs (joueurs + admins) au lieu des joueurs seuls.
  Conséquence : les avatars admin s'affichent dans les tables
  Réservations/Matchs, et le filtre "Admins" du panneau Utilisateurs
  fonctionne.
- `app/models/user.py` — nouvelle fonction `user_admin()` qui expose
  email + role aux admins (sans le password_hash). Utilisée dans
  `list_users()` et `update_user()`.

## 3. Modifier un match / Modifier une réservation

**Problème :** ces fonctionnalités étaient absentes.

**Backend ajouté :**
- `app/services/match_service.py` — `update_match(...)` : valide le
  créneau (futur, libre), revalide la compatibilité Elo des joueurs
  déjà inscrits avec la nouvelle plage de niveau, vérifie que la
  capacité du nouveau terrain accueille les inscrits, met à jour
  les champs court/date/heure/level/visibility/note.
- `app/services/booking_service.py` — `update_booking(...)` :
  re-vérifie le créneau, recalcule le total côté serveur, met à
  jour court/date/heure.
- `app/services/booking_service.py` — `admin_create_booking_for(...)`
  pour qu'un admin réserve un terrain au nom d'un client.
- `app/repositories/booking_repository.py` — `update_fields()` et
  `find_conflict_excluding()` (exclut l'élément en cours d'édition
  du test de conflit).
- `app/repositories/match_repository.py` — `update_match_fields()`.
- `app/api/routes.py` — nouvelles routes :
  - `PATCH /api/matches/<id>` (créateur ou admin)
  - `PATCH /api/bookings/<id>` (propriétaire ou admin)
  - `POST  /api/admin/bookings` (admin → réservation pour un autre)

**Frontend ajouté :**
- `views/app/Api.jsx` — `Api.updateMatch`, `Api.updateBooking`,
  `Api.adminCreateBooking`.
- `views/app/AppStore.jsx` — `AppStore.updateMatch(id, payload)`,
  `AppStore.updateBooking(id, payload)`,
  `AppStore.adminCreateBookingFor(...)`. Toutes appellent `refreshAll()`
  après succès.
- `views/app/AdminMatches.jsx` — bouton "+ Nouveau match", action
  "Modifier" sur chaque ligne avec modale d'édition (terrain, date,
  heure, niveau, visibilité, note).
- `views/app/AdminBookings.jsx` — bouton "+ Nouvelle réservation"
  (sélection du client par l'admin), action "Modifier" sur chaque
  ligne avec modale d'édition (terrain, date, heure).

## 4. Cohérence des KPIs

**Problème :** dans `AdminMatches`, le compteur "Payés" filtrait sur
`status === 'completed'`, donc un match planifié marqué payé n'était
pas compté.

**Correction :** filtre élargi à tous les matchs non-annulés ; même
règle qu'au niveau du backend `get_overview()`.

## 5. Compatibilité ascendante

- Pas de migration de schéma SQLite : tous les nouveaux champs côté
  matchs (`rated_by`, `slot_in_past`, `is_full`, `max_players`) sont
  calculés à la volée par le service, pas stockés.
- Les anciens clients (avant ce déploiement) continuent de fonctionner :
  `adaptMatch` retombe sur un calcul local quand le champ serveur n'est
  pas présent.

## Comptes de démo (inchangés)

- Admin   : `admin@urbanpadel.ma` / `admin123`
- Joueurs : `youssef@demo.ma`, `sara@demo.ma`, `karim@demo.ma`,
            `amine@demo.ma` — tous avec le mot de passe `demo123`.

## Lancement

```bash
pip install -r requirements.txt
python seed.py        # initialise la base avec les comptes de démo
python main.py        # serveur de dev sur http://localhost:5000
```

---

# Itération suivante — Corrections additionnelles

## 5. Affichage des matchs dans le profil joueur

**Problème :** lorsqu'on créait ou animait un match, il n'apparaissait pas
dans la partie "Matchs" du profil ni du tableau de bord. Aucun match ne
s'affichait tant qu'un score n'avait pas été saisi.

**Causes :**
- `Api.listMatches()` côté joueur ne retourne que les **matchs publics futurs**
  (logique normale pour la liste de découverte). Les matchs privés, passés
  ou simplement créés/rejoints n'étaient donc pas dans le store côté joueur.
- Les filtres de PassportView, DashboardView et PlayerProfileView restreignaient
  l'historique à `status === 'completed' && sets.length > 0`, ce qui masquait
  tous les matchs planifiés ou terminés sans score saisi.

**Corrections :**
- `views/app/AppStore.jsx` — `reloadMatches()` fusionne maintenant la liste
  publique avec `/matches/mine` pour les non-admins (déduplication par id).
  Le store contient donc TOUS les matchs où le joueur figure.
- `views/app/DashboardView.jsx` — l'onglet "Matchs" affiche tous les matchs
  du joueur (planifiés, terminés avec/sans score, annulés) avec un badge
  contextuel ("Planifié", "Score à saisir", "À évaluer", "Victoire/Défaite",
  "Annulé"). Tri par date la plus récente d'abord. Indication "Créé par vous"
  pour les matchs dont l'utilisateur est créateur.
- `views/app/PassportView.jsx` — l'historique inclut maintenant les matchs
  à venir et terminés sans score, avec les mêmes badges.
- `views/app/PlayerProfileView.jsx` — la liste "Derniers matchs" du profil
  public d'un joueur affiche également ses 5 derniers matchs (tous statuts).

## 6. Ajout d'un utilisateur depuis l'espace administrateur

**Problème :** la modal "Ajouter un joueur" affichait uniquement un message
indiquant de passer par l'inscription publique — il n'y avait pas de
formulaire fonctionnel.

**Corrections :**
- `app/services/admin_service.py` — nouvelle fonction `create_user(full_name,
  email, password, role, elo)` qui valide les champs (email, password ≥ 6
  caractères, rôle valide, Elo borné 1.0-10.0), vérifie l'unicité de l'email,
  hashe le mot de passe et insère l'utilisateur en base.
- `app/controllers/admin_controller.py` — nouvelle fonction `create_user`.
- `app/api/routes.py` — nouvelle route `POST /api/admin/users` (admin requis).
- `views/app/Api.jsx` — nouvelle méthode `Api.adminCreateUser(payload)`.
- `views/app/AppStore.jsx` — nouvelle action `AppStore.createUser(payload)`
  qui appelle l'API puis lance `refreshAll()` pour rafraîchir la liste.
- `views/app/AdminUsers.jsx` — la modal devient un VRAI formulaire avec :
  nom complet, email, mot de passe (visible pour permettre à l'admin de le
  communiquer), rôle (joueur/admin), Elo de départ. Validation côté front
  (email regex, mot de passe ≥ 6) avec un message d'erreur clair sous le
  formulaire en cas d'échec backend (ex : email déjà utilisé).

**Test bout-en-bout :** un utilisateur créé via cette modal peut se connecter
immédiatement avec le mot de passe choisi et créer/rejoindre des matchs.

## 7. Tableau de bord — indicateurs et graphes dynamiques

**Problème :** le graphe "Revenus 7 derniers jours" affichait des valeurs
codées en dur (440, 880, 660, 1100, 880, 1320, 440 MAD) et le panneau
"Taux de remplissage par terrain" affichait également des pourcentages
fixes (85%, 72%, 58%) — ces graphes ne reflétaient donc pas l'activité
réelle. Le badge "+12%" et "+5% vs sem. passée" étaient également figés.

**Corrections backend :** `app/services/admin_service.py` enrichit la
réponse de `get_overview()` avec :
- `revenue.last_7_days` : tableau de 7 entrées `{date, label, value}` où
  `value` agrège les bookings payés + les matchs payés ce jour-là.
- `revenue.last_7_total` et `revenue.previous_7_total` : totaux pour
  comparer la semaine en cours à la précédente.
- `revenue.trend_pct` : variation en % (semaine actuelle vs précédente).
  Cas particulier : passage de 0 à >0 → renvoie 100%.
- `courts_fill` : tableau `{court_id, name, label, rate, occupied, total}`
  pour chaque terrain, calculant le **taux de remplissage sur les 7
  prochains jours** (10 créneaux × 7 jours = 70 créneaux possibles).

**Corrections frontend :** `views/app/AdminDashboard.jsx` lit ces nouvelles
valeurs depuis `overview` (avec un fallback complet en cas de première frame
sans overview chargé). Le badge "+12%" devient `trend_pct` réel coloré en
vert/rouge selon le sens. Les barres "Terrain 1 / 2 / Indiv." reflètent
les vrais créneaux occupés. Si aucun revenu sur la semaine, on affiche
"Aucun revenu sur les 7 derniers jours" plutôt qu'un graphe vide.

## 8. Terrain Individuel — 2 joueurs à 125 MAD chacun

**Problème :** le terrain individuel était configuré comme un terrain solo
(`capacity: 1, price: 125`). Or un match individuel = 1v1 avec 2 joueurs,
chacun payant 125 MAD (250 MAD la séance).

**Corrections :**
- `app/core/config.py` — `Terrain Individuel` passe à `capacity: 2`
  (toujours `type: 'Simple'`, `price: 125` par joueur).
- `app/core/database.py` — migration auto au démarrage :
  `UPDATE courts SET capacity = 2 WHERE name = 'Terrain Individuel' AND capacity < 2`
  pour les bases existantes.
- `app/services/booking_service.py` — `create_booking()` et `update_booking()`
  utilisent désormais `total = price × capacity` pour TOUS les terrains
  (avant : Simple = price, Double = price × capacity). Un terrain individuel
  réservé en booking direct vaut donc 250 MAD (125 × 2).
- `app/services/admin_service.py` — `match_amount()` uniformise le calcul :
  `price × nb_players` quel que soit le type de terrain.
- `app/services/match_service.py` — `create_match()` et `join_match()`
  attribuent désormais `team = 1 ou 2` également pour les terrains Simple
  (1v1) — l'équilibrage automatique fonctionne pour les deux types.
- `seed.py` — la réservation Sara sur le Terrain Individuel passe de 125 à
  250 MAD pour rester cohérente avec la nouvelle règle.
- `views/app/AppStore.jsx` — `priceSession = price × capacity` uniformisé
  côté front (et la valeur initiale de COURTS_DB pour le terrain individuel
  passe à `capacity: 2, priceSession: 250`).

**Test bout-en-bout :** Karim (Elo 5.5) crée un match sur le Terrain
Individuel → capacity = 2, 1 joueur. Amine (Elo 6.8) rejoint → 2/2,
is_full = true. Sara (Elo 3.0) tente de rejoindre → MATCH_FULL. Une fois
le match marqué payé, le revenu remonté par /api/admin/overview est
bien de 250 MAD (= 125 × 2).
