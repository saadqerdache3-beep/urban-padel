# Urban Padel — Application complète (Backend + Frontend)

Plateforme de réservation et gestion d'un club de padel à Marrakech.
**Le frontend React et le backend Python sont servis par un seul processus** :
un seul `python main.py` lance toute l'application.

---

## 1. Démarrage rapide

```bash
# 1) Installer les dépendances Python
pip install -r requirements.txt

# 2) Initialiser la base avec les données de démonstration
python seed.py

# 3) Lancer l'application (frontend + backend ensemble)
python main.py
```

Puis ouvrez votre navigateur sur :

```
http://localhost:5000
```

🎉 **C'est tout.** Vous voyez votre interface Urban Padel, entièrement
fonctionnelle, avec une vraie persistance en base SQLite.

### Comptes de démonstration créés par `seed.py`

| Email                  | Mot de passe | Rôle    | Elo |
|------------------------|--------------|---------|-----|
| admin@urbanpadel.ma    | `admin123`   | admin   | 7.2 |
| youssef@demo.ma        | `demo123`    | player  | 4.2 |
| sara@demo.ma           | `demo123`    | player  | 3.0 |
| karim@demo.ma          | `demo123`    | player  | 5.5 |
| amine@demo.ma          | `demo123`    | player  | 6.8 |

---

## 2. Architecture — MVC en couches

```
backend/
├── main.py              ← point d'entrée : lance le serveur (frontend + API)
├── seed.py              ← initialise la base avec données de démo
├── requirements.txt
├── urban_padel.db       ← base SQLite (créée automatiquement)
├── views/               ← FRONTEND React (servi par Flask sur '/')
│   ├── index.html       ← page principale
│   ├── colors_and_type.css
│   ├── assets/
│   └── app/
│       ├── Api.jsx          ← couche d'appel HTTP vers l'API
│       ├── AppStore.jsx     ← store global, utilise Api en interne
│       ├── AuthViews.jsx    ← Login + Register
│       ├── BookingView.jsx, MatchListView.jsx, CreateMatchView.jsx, …
│       └── Admin*.jsx       ← vues administrateur
└── app/                 ← BACKEND Python
    ├── core/            ← configuration, base, sécurité, erreurs
    │   ├── config.py
    │   ├── database.py
    │   ├── security.py    (bcrypt + JWT)
    │   └── errors.py      (erreurs métier)
    ├── models/          ← structures de données (sérialisation)
    │   └── user.py, court.py, booking.py, match.py, rating.py
    ├── repositories/    ← accès à la base (CRUD pur)
    │   └── user_repository.py, court_repository.py, …
    ├── services/        ← LOGIQUE MÉTIER (cœur de l'application)
    │   └── auth_service.py, booking_service.py, match_service.py, …
    ├── controllers/     ← orchestrent service ↔ HTTP
    │   └── auth_controller.py, booking_controller.py, …
    └── api/             ← couche HTTP (Flask)
        ├── server.py        (factory + sert frontend + handlers d'erreurs)
        ├── routes.py        (URLs → contrôleurs)
        └── middleware.py    (@auth_required, @admin_required)
```

### Comment frontend et backend communiquent

```
Navigateur
    │
    │ http://localhost:5000/
    ▼
┌─────────────────────────────────────────┐
│  Flask (main.py → app/api/server.py)    │
│                                         │
│  GET /            → views/index.html    │
│  GET /app/*.jsx   → fichiers JSX        │  ← Frontend statique
│  GET /api/...     → blueprint API       │  ← API REST
└─────────────────────────────────────────┘
                 ▲                ▲
                 │                │
              fetch('/api/...')   │
                 │                │
        Le frontend appelle l'API par URL relative
        → pas de problème de CORS, pas de port séparé
```

### Dans le frontend, le flux est :

```
Vue (BookingView.jsx)
  → appelle AppStore.createBooking(...)   (interface stable)
    → appelle Api.createBooking(...)      (couche HTTP)
      → fetch('POST /api/bookings', ...)  (requête réseau)

Backend Flask
  → routes.py      (mappe URL → controller)
  → controller     (lit request, appelle service)
  → service        (logique métier : validation, règles)
  → repository     (SQL pur)
  → SQLite
```

### Règle d'or

| Couche       | A le droit de…                                       | N'a PAS le droit de…              |
|--------------|------------------------------------------------------|-----------------------------------|
| api          | Définir des routes, appliquer des décorateurs       | Contenir de la logique métier     |
| controllers  | Lire `request`, appeler des services                 | Faire des `if` métier, du SQL     |
| services     | Tout ce qui est logique métier (validation, règles)  | Connaître Flask                   |
| repositories | Faire du SQL                                         | Avoir des règles métier           |
| models       | Convertir des lignes SQL en dict                     | Faire des requêtes                |
| core         | Configuration, sécurité, erreurs                     | Avoir des dépendances applicatives|

---

## 3. Endpoints API

Toutes les routes sont préfixées par `/api`.
Toutes les routes (sauf `/auth/login`, `/auth/register`, `/health`, `/elo/levels`)
nécessitent un en-tête `Authorization: Bearer <token>`.

### Authentification

| Méthode | Route                  | Accès    | Description                      |
|---------|------------------------|----------|----------------------------------|
| POST    | `/api/auth/register`   | public   | Création de compte               |
| POST    | `/api/auth/login`      | public   | Connexion (retourne un JWT)      |
| GET     | `/api/auth/me`         | connecté | Profil de l'utilisateur connecté |

### Utilisateurs

| Méthode | Route                  | Accès    | Description                |
|---------|------------------------|----------|----------------------------|
| GET     | `/api/users/me`        | connecté | Profil personnel           |
| PATCH   | `/api/users/me`        | connecté | Mise à jour de son profil  |
| GET     | `/api/users/<id>`      | connecté | Profil public d'un joueur  |

### Terrains & créneaux

| Méthode | Route                          | Accès    | Description                          |
|---------|--------------------------------|----------|--------------------------------------|
| GET     | `/api/courts`                  | connecté | Liste des terrains du club           |
| GET     | `/api/slots?date=YYYY-MM-DD`   | connecté | Créneaux disponibles d'une journée   |
| GET     | `/api/slots/week?start=...`    | admin    | Vue calendrier hebdomadaire          |

### Réservations

| Méthode | Route                                  | Accès    | Description                       |
|---------|----------------------------------------|----------|-----------------------------------|
| GET     | `/api/bookings`                        | connecté | Joueur : ses résa / Admin : toutes|
| POST    | `/api/bookings`                        | connecté | Créer une réservation             |
| GET     | `/api/bookings/<id>`                   | connecté | Détail d'une réservation          |
| PATCH   | `/api/bookings/<id>/cancel`            | connecté | Annuler                           |
| PATCH   | `/api/bookings/<id>/payment`           | admin    | Marquer payé / impayé             |

### Matchs

| Méthode | Route                                  | Accès    | Description                             |
|---------|----------------------------------------|----------|-----------------------------------------|
| GET     | `/api/matches`                         | connecté | Joueur : matchs publics futurs / Admin : tous |
| GET     | `/api/matches/mine`                    | connecté | Mes matchs (auxquels je participe)      |
| POST    | `/api/matches`                         | connecté | Créer un match                          |
| GET     | `/api/matches/<id>`                    | connecté | Détail d'un match                       |
| POST    | `/api/matches/<id>/join`               | connecté | Rejoindre un match                      |
| DELETE  | `/api/matches/<id>/leave`              | connecté | Quitter un match                        |
| PATCH   | `/api/matches/<id>/cancel`             | connecté | Annuler (créateur ou admin)             |
| POST    | `/api/matches/<id>/result`             | connecté | Soumettre le score (déclenche calcul Elo) |
| POST    | `/api/matches/<id>/rate`               | connecté | Noter un autre joueur                   |
| PATCH   | `/api/matches/<id>/payment`            | admin    | Marquer payé / impayé                   |

### Admin

| Méthode | Route                          | Accès | Description                  |
|---------|--------------------------------|-------|------------------------------|
| GET     | `/api/admin/overview`          | admin | KPIs du tableau de bord      |
| GET     | `/api/admin/users`             | admin | Liste des joueurs            |
| PATCH   | `/api/admin/users/<id>`        | admin | Modifier un compte joueur    |

### Utilitaires

| Méthode | Route                | Description                          |
|---------|----------------------|--------------------------------------|
| GET     | `/api/health`        | Vérification que le serveur tourne   |
| GET     | `/api/elo/levels`    | Catalogue des niveaux Elo            |

---

## 4. Format des réponses

### Succès

```json
{
  "ok": true,
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1Ni..."
}
```

### Erreur

```json
{
  "ok": false,
  "error": "ELO_INCOMPATIBLE",
  "message": "Votre niveau Elo n'est pas compatible avec ce match."
}
```

### Codes d'erreur

| Code                        | HTTP | Signification                                    |
|-----------------------------|------|--------------------------------------------------|
| `UNAUTHORIZED`              | 401  | Token absent / expiré / invalide                 |
| `FORBIDDEN`                 | 403  | Authentifié mais pas le bon rôle                 |
| `INVALID_CREDENTIALS`       | 401  | Email ou mot de passe incorrect                  |
| `EMAIL_ALREADY_USED`        | 409  | Email déjà inscrit                               |
| `NOT_FOUND`                 | 404  | Ressource inexistante                            |
| `VALIDATION_ERROR`          | 400  | Données envoyées invalides                       |
| `SLOT_IN_PAST`              | 400  | Le créneau est dans le passé                     |
| `SLOT_UNAVAILABLE`          | 409  | Le créneau est déjà pris                         |
| `CANCEL_TOO_LATE`           | 400  | Annulation refusée (< 5h avant le début)         |
| `ELO_INCOMPATIBLE`          | 400  | Elo du joueur non compatible avec le match       |
| `MATCH_FULL`                | 409  | Match complet                                    |
| `ALREADY_JOINED`            | 409  | Joueur déjà inscrit dans ce match                |
| `NOT_IN_MATCH`              | 400  | Joueur ne participe pas à ce match               |
| `MATCH_ALREADY_COMPLETED`   | 400  | Match déjà terminé                               |
| `ALREADY_RATED`             | 409  | Joueur déjà noté pour ce match                   |

---

## 5. Règles métier importantes (cf. SPECS.md)

### Système Elo
- Échelle 1.0 → 10.0 (5 niveaux : Débutant / Intermédiaire / Confirmé / Avancé / Expert)
- **Victoire** : +0.15 Elo
- **Défaite** : −0.10 Elo
- **Plancher** : 1.0 / **Plafond** : 10.0
- **Tolérance** : ±0.5 sur la borne supérieure d'un match

### Réservations
- Un créneau passé ne peut jamais être réservé.
- Pas de double-réservation possible (vérification serveur sur `find_conflict`).
- **Annulation impossible si moins de 5h avant le début** (sauf admin).
- Prix calculé côté serveur : Double = `prix × capacité`, Simple = `prix`.

### Matchs
- Un joueur ne peut pas créer un match d'un niveau supérieur à son Elo.
- Un joueur ne peut pas rejoindre un match si son Elo est incompatible.
- Capacité respectée (4 pour Double, 1 pour Simple).
- Équipes équilibrées automatiquement (1/1 puis 2/2 sur un Double).
- **Lien de partage** généré à la création : `https://urbanpadel.ma/join/match/<id>`
- **Visibilité** : `public` (visible dans la liste) ou `private` (uniquement via lien).

### Paiements
- **Paiement toujours sur place** (jamais en ligne).
- Statut par défaut : `unpaid`.
- Seul l'admin peut basculer `paid` ↔ `unpaid` après la session.

---

## 6. Sécurité

| Aspect            | Implémentation                                                   |
|-------------------|------------------------------------------------------------------|
| Mots de passe     | Hashés avec **bcrypt** (salt automatique)                        |
| Sessions          | **JWT** (HS256) signés avec `JWT_SECRET`, expiration 24h         |
| Auth              | Décorateur `@auth_required` (tous les services)                  |
| Rôles             | Décorateur `@admin_required` (routes /admin/* et /payment)       |
| SQL injection     | Toutes les requêtes utilisent **paramètres préparés** (`?`)      |
| Foreign keys      | Activées (`PRAGMA foreign_keys = ON`)                            |
| CORS              | Activé via `flask-cors`                                          |

> **Production** : changer `JWT_SECRET` via la variable d'environnement.
> Voir `app/core/config.py`.

---

## 7. Schéma de la base de données

```
users               (id, full_name, email, password_hash, role, elo,
                     played, wins, losses, ratings_*, created_at)

courts              (id, name, type, capacity, price)

bookings            (id, user_id, court_id, date, start_time, end_time,
                     status, total, payment_status, share_link, created_at)

matches             (id, court_id, created_by, level_min, level_max, type,
                     date, start_time, end_time, status, visibility,
                     note, payment_status, share_link, created_at)

match_players       (match_id, user_id, team, joined_at)
                    PRIMARY KEY (match_id, user_id)

match_results       (match_id, sets [JSON], winner_team, submitted_by, submitted_at)

ratings             (id, from_user, to_user, match_id,
                     fairplay, punctuality, teamspirit, created_at)
                    UNIQUE (from_user, to_user, match_id)
```

---

## 8. Comment ajouter une fonctionnalité

Exemple : ajouter une route `GET /api/matches/popular` (top 5 des matchs avec
le plus de joueurs).

1. **Service** — ajouter la logique dans `app/services/match_service.py` :
   ```python
   def list_popular_matches(limit=5):
       rows = match_repository.list_popular(limit)
       return [_hydrate(r) for r in rows]
   ```

2. **Repository** — ajouter la requête SQL dans
   `app/repositories/match_repository.py` :
   ```python
   def list_popular(limit=5):
       cur = get_connection().cursor()
       cur.execute("""
           SELECT m.*, COUNT(mp.user_id) AS nb FROM matches m
           LEFT JOIN match_players mp ON mp.match_id = m.id
           WHERE m.status = 'scheduled'
           GROUP BY m.id ORDER BY nb DESC LIMIT ?
       """, (limit,))
       return cur.fetchall()
   ```

3. **Contrôleur** — ajouter dans `app/controllers/match_controller.py` :
   ```python
   def list_popular(current_user):
       return {"matches": match_service.list_popular_matches()}
   ```

4. **Route** — ajouter dans `app/api/routes.py` :
   ```python
   @api_bp.route("/matches/popular", methods=["GET"])
   @auth_required
   def matches_popular(current_user):
       return _ok(match_controller.list_popular(current_user))
   ```

C'est tout. Aucune autre couche n'a besoin d'être modifiée.

---

## 9. Frontend React (livré et déjà connecté)

Le frontend est dans `views/` et s'appuie sur deux fichiers clés :

- **`views/app/Api.jsx`** — couche d'appels HTTP. Centralise tout
  ce qui parle au backend (`fetch`, gestion du token JWT en
  `localStorage`, headers). Aucune autre vue ne fait de `fetch`.

- **`views/app/AppStore.jsx`** — store global. Garde une interface
  identique à la version mockée (`createMatch`, `joinMatch`,
  `cancelBooking`…) mais chaque méthode appelle désormais `Api`.
  C'est le **pattern Adaptateur**. Les vues ne savent même pas
  qu'elles sont connectées à un vrai backend.

Le token JWT est stocké dans `localStorage`. Au démarrage de l'app
(voir `index.html`), un `Api.me()` est lancé : si le token est
toujours valide, l'utilisateur est reconnecté automatiquement.

### Ajouter une nouvelle action côté frontend

Exemple : ajouter un bouton "Voir les matchs populaires".

1. Ajouter la méthode dans `Api.jsx` :
   ```js
   listPopular() { return request('GET', '/matches/popular'); }
   ```

2. L'utiliser dans la vue :
   ```jsx
   const [popular, setPopular] = React.useState([]);
   React.useEffect(() => {
     Api.listPopular().then(r => { if (r.ok) setPopular(r.matches); });
   }, []);
   ```

C'est tout. Le token est ajouté automatiquement par `Api.jsx`.

---

## 10. Préparation à l'examen — questions probables

> **Q : Pourquoi 4 couches de séparation ? C'est pas trop ?**
> Chaque couche a une responsabilité unique (Single Responsibility).
> Si on veut changer la base SQLite → MySQL, on ne touche QUE les repositories.
> Si on ajoute une auth Google, on ne touche QUE le service.
> Si on passe à FastAPI, on ne touche QUE la couche `api/`.
> Le code est testable par couche.

> **Q : Pourquoi pas un ORM comme SQLAlchemy ?**
> Pédagogiquement, voir le SQL en clair est plus formateur. Pas de "magie".
> Pour un projet de cette taille, l'ORM ajoute plus de complexité qu'il n'en
> retire.

> **Q : Pourquoi JWT et pas des sessions Flask ?**
> JWT est *stateless* : aucun stockage côté serveur. Performant et compatible
> avec un frontend découplé (React). Les sessions Flask nécessitent un cookie
> et un magasin côté serveur.

> **Q : Comment empêcher les double-réservations ?**
> La méthode `booking_repository.find_conflict()` vérifie qu'aucune
> réservation NI aucun match n'occupe le même `(court_id, date, start_time)`
> avant l'insert.

> **Q : Que se passe-t-il si deux clients réservent le même créneau au même
> instant ?**
> SQLite sérialise les écritures (verrou de fichier). Le second `INSERT`
> attendra la fin du premier, puis le `find_conflict` du second renverra True
> et lèvera `SlotUnavailable`. Pour PostgreSQL on ajouterait une contrainte
> `UNIQUE(court_id, date, start_time) WHERE status='scheduled'`.

> **Q : Comment fonctionne la mise à jour de l'Elo ?**
> Voir `match_service.submit_result` :
> 1. On valide la structure des sets.
> 2. On compte les sets gagnés par chaque équipe.
> 3. Pour chaque joueur, on appelle `elo_service.apply_win` ou `apply_loss`.
> 4. On met à jour stats (played/wins/losses) + Elo en base.
> 5. Le statut du match passe à `completed`.

> **Q : Pourquoi stocker les sets en JSON ?**
> Le nombre de sets varie (2 à 5). Plutôt que créer une table `sets` séparée
> pour quelques entrées par match, on stocke en JSON dans la colonne `sets`
> de `match_results`. Lecture simple, pas de jointure supplémentaire.

> **Q : Comment avez-vous connecté le frontend mocké au backend ?**
> J'ai utilisé le **pattern Adaptateur**. Le frontend appelait déjà
> `AppStore.createMatch(...)`, `AppStore.joinMatch(...)`, etc.
> J'ai gardé exactement la même interface publique pour `AppStore`,
> mais en interne, chaque méthode appelle maintenant la couche `Api`
> (`Api.createMatch(...)`) qui fait un `fetch()` vers le backend Flask.
> **Résultat** : les vues (BookingView, MatchListView…) n'ont pas été
> modifiées. Seul `AppStore.jsx` a été réécrit. C'est une démonstration
> directe de l'utilité du **principe d'inversion de dépendance** : les
> vues dépendent d'une **abstraction** (l'interface `AppStore`), pas
> d'une implémentation (mock ou HTTP).

> **Q : Pourquoi un fichier `Api.jsx` séparé d'`AppStore.jsx` ?**
> **Séparation des responsabilités** : `Api.jsx` ne s'occupe QUE du
> protocole HTTP (fetch, headers, gestion du token). `AppStore.jsx`
> s'occupe de l'état global et des conversions de données (DTO backend
> → format attendu par les vues). Si demain on remplace `fetch` par
> `axios`, on ne touche QUE `Api.jsx`.

---

## 11. Variables d'environnement (production)

```bash
export JWT_SECRET="<une-longue-chaine-aléatoire>"
export FLASK_DEBUG=0
python main.py
```

En production réelle, utiliser **gunicorn** :
```bash
gunicorn -w 4 -b 0.0.0.0:5000 'app.api.server:create_app()'
```

---

*Urban Padel Royal — Marrakech*
*Backend Python / Flask / SQLite — Architecture MVC en couches*
