// ============================================================
//  app/AppStore.jsx — Store global v4 (connecté au backend)
// ============================================================
//  Cette version remplace les données mockées par de vraies
//  requêtes HTTP vers le backend Flask via window.Api.
//
//  PRINCIPE (Pattern Adaptateur) :
//  L'interface publique de AppStore reste la MÊME que la v3.
//  Les vues continuent d'appeler AppStore.createMatch(...),
//  AppStore.joinMatch(...), etc. — elles ignorent que c'est
//  désormais un appel HTTP.
// ============================================================

let COURTS_DB = [
  { id:1, name:'Terrain 1',          type:'Double', capacity:4, priceSession:440, pricePlayer:110 },
  { id:2, name:'Terrain 2',          type:'Double', capacity:4, priceSession:440, pricePlayer:110 },
  // Terrain Individuel : 1v1 → 2 joueurs, chacun paie 125 MAD (250 MAD séance).
  { id:3, name:'Terrain Individuel', type:'Simple', capacity:2, priceSession:250, pricePlayer:125 },
];

const ELO_LEVELS = [
  { id:'all',    label:'Tous niveaux',   min:1.0, max:10.0 },
  { id:'debut',  label:'Débutant',       min:1.0, max:2.5  },
  { id:'inter',  label:'Intermédiaire',  min:2.5, max:4.0  },
  { id:'conf',   label:'Confirmé',       min:4.0, max:5.5  },
  { id:'avan',   label:'Avancé',         min:5.5, max:7.0  },
  { id:'expert', label:'Expert / Élite', min:7.0, max:10.0 },
];

function eloCompatible(playerElo, matchLevel) {
  if (matchLevel === 'Tous niveaux') return true;
  const lvl = ELO_LEVELS.find(l => l.label === matchLevel);
  if (!lvl) return true;
  return playerElo >= lvl.min && playerElo <= lvl.max + 0.5;
}
window.eloCompatible = eloCompatible;
window.ELO_LEVELS = ELO_LEVELS;

const NOW = () => new Date();
function slotIsFuture(dateStr, startTime) {
  return new Date(dateStr + 'T' + startTime + ':00').getTime() > NOW().getTime();
}
window.slotIsFuture = slotIsFuture;

function getAvailableSlotTimes(dateStr) {
  const ALL = ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30'];
  return ALL.filter(t => slotIsFuture(dateStr, t));
}
window.getAvailableSlotTimes = getAvailableSlotTimes;

// ── Conversions niveau Elo (label ↔ plage numérique) ──────────
function levelLabelFromRange(min, max) {
  if (min <= 1.0 && max >= 10.0) return 'Tous niveaux';
  const mid = (min + max) / 2;
  const lvl = ELO_LEVELS.find(l => l.id !== 'all' && mid >= l.min && mid < l.max);
  return lvl ? lvl.label : 'Confirmé';
}
function levelRangeFromLabel(label) {
  const lvl = ELO_LEVELS.find(l => l.label === label);
  return lvl ? { min: lvl.min, max: lvl.max } : { min: 1.0, max: 10.0 };
}

// ── Adaptateurs : DTO backend → format attendu par les vues ──
function adaptUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.full_name,
    full_name: u.full_name,
    email: u.email,
    initials: u.initials,
    role: u.role,
    elo: u.elo,
    stats: u.stats || { played:0, wins:0, losses:0 },
    ratings: u.ratings || { fairplay:null, punctuality:null, teamspirit:null, count:0 },
    archived: !!u.archived,
  };
}

function adaptMatch(m) {
  if (!m) return null;
  const dateStr = m.date;
  const startTime = m.start_time;
  const endTime = m.end_time;
  const players = (m.players || []).map(adaptUser);
  return {
    id: m.id,
    courtId: m.court_id,
    court: m.court ? m.court.name : '',
    type: m.type,
    level: levelLabelFromRange(m.level_min, m.level_max),
    levelMin: m.level_min,
    levelMax: m.level_max,
    date: dateStr,
    dateStr,
    time: `${startTime} → ${endTime}`,
    startTime,
    endTime,
    slotISO: new Date(dateStr + 'T' + startTime).toISOString(),
    status: m.status,
    visibility: m.visibility,
    createdBy: m.created_by,
    creator: adaptUser(m.creator),
    playerIds: (m.players || []).map(p => p.id),
    players,
    // Capacité / complétude : on fait confiance au backend en priorité,
    // avec un repli sur la longueur de la liste des joueurs.
    maxPlayers: typeof m.max_players === 'number'
      ? m.max_players
      : (m.court ? m.court.capacity : 4),
    isFull: typeof m.is_full === 'boolean'
      ? m.is_full
      : ((m.players || []).length >= (m.court?.capacity || 4)),
    sets: m.result ? m.result.sets : [],
    result: m.result,
    // ratedBy : IDs des joueurs ayant déjà émis ≥1 notation pour ce match.
    // C'est désormais la BASE pour décider d'afficher / masquer le bouton
    // "Évaluer les joueurs" (avant : tableau vide en dur → bouton toujours là).
    ratedBy: Array.isArray(m.rated_by) ? m.rated_by : [],
    // slotInPast : calculé par le serveur (horloge fiable). Sert à savoir
    // si le créneau est dépassé donc si le score peut être saisi.
    slotInPast: typeof m.slot_in_past === 'boolean'
      ? m.slot_in_past
      : (new Date(dateStr + 'T' + startTime + ':00').getTime() <= Date.now()),
    pricePlayer: m.court ? m.court.price : 110,
    paymentStatus: m.payment_status,
    note: m.note || '',
    shareLink: m.share_link,
  };
}

function adaptBooking(b) {
  if (!b) return null;
  return {
    id: b.id,
    userId: b.user_id,
    matchId: null,
    courtId: b.court_id,
    court: b.court ? b.court.name : '',
    type: b.court ? b.court.type : '',
    date: b.date,
    dateStr: b.date,
    time: b.start_time,
    slotISO: new Date(b.date + 'T' + b.start_time).toISOString(),
    status: b.status,
    shareLink: b.share_link,
    total: b.total,
    paymentStatus: b.payment_status,
    user: adaptUser(b.user),
  };
}

// ============================================================
//  STORE : état + listeners (pattern observable)
// ============================================================
function createAppStore() {
  let state = {
    users:       [],
    matches:     [],
    bookings:    [],
    courts:      COURTS_DB,
    currentUser: null,   // utilisateur connecté (rafraîchi après chaque action)
    overview:    null,   // KPIs admin (chiffre d'affaires, paiements, remplissage…)
    notifications: [],   // notifications dérivées (cf. recomputeNotifications)
    // ratingsReceived : compte de notations REÇUES connues — sert à détecter
    // une nouvelle notation entrante côté joueur (notif "vous avez été évalué").
    lastRatingsCount: 0,
    loading:     false,
    lastUpdate:  Date.now(),
  };

  const listeners = new Set();
  const notify = () => { state = { ...state, lastUpdate: Date.now() }; listeners.forEach(l => l({ ...state })); };
  const set = patch => { state = { ...state, ...patch }; notify(); };

  async function reloadMatches() {
    // Pour un JOUEUR : on charge à la fois la liste publique (matchs ouverts à
    // rejoindre) ET ses propres matchs (ceux qu'il a créés ou rejoints, qu'ils
    // soient privés / passés / terminés). On fusionne les deux pour que le
    // profil et le tableau de bord voient TOUT son historique.
    //
    // Pour un ADMIN : la liste publique côté backend renvoie déjà tous les matchs.
    const r = await Api.listMatches();
    if (!r.ok) return r;

    let merged = (r.matches || []).map(adaptMatch);

    // Ne fait l'appel "mine" que pour les non-admins (pour les admins c'est inclus).
    if (state.currentUser && state.currentUser.role !== 'admin') {
      try {
        const r2 = await Api.listMyMatches();
        if (r2.ok && Array.isArray(r2.matches)) {
          const myList = r2.matches.map(adaptMatch);
          // Fusion par id (évite les doublons : un match public où je joue
          // apparaît dans les DEUX listes).
          const seen = new Set(merged.map(m => m.id));
          for (const m of myList) {
            if (!seen.has(m.id)) {
              merged.push(m);
              seen.add(m.id);
            }
          }
        }
      } catch {}
    }

    set({ matches: merged });
    return r;
  }

  async function reloadBookings() {
    const r = await Api.listBookings();
    if (r.ok) set({ bookings: r.bookings.map(adaptBooking) });
    return r;
  }

  async function reloadCourts() {
    const r = await Api.listCourts();
    if (r.ok) {
      COURTS_DB = r.courts.map(c => ({
        id: c.id, name: c.name, type: c.type, capacity: c.capacity,
        // Prix séance = prix par joueur × capacité (cohérent pour TOUS les terrains).
        // - Terrain Double      : 110 × 4 = 440 MAD (4 joueurs).
        // - Terrain Individuel  : 125 × 2 = 250 MAD (2 joueurs en 1v1, 125/joueur).
        priceSession: c.price * c.capacity,
        pricePlayer:  c.price,
      }));
      window.COURTS_DB = COURTS_DB;
      set({ courts: COURTS_DB });
    }
    return r;
  }

  async function reloadUsers() {
    // Liste publique des joueurs (utile pour afficher les avatars dans les matchs).
    // Si l'utilisateur est admin, on charge la liste admin (avec emails).
    const isAdmin = state.currentUser?.role === 'admin';
    const r = isAdmin ? await Api.adminListUsers() : null;
    if (r && r.ok) set({ users: r.users.map(adaptUser) });
    return r;
  }

  async function reloadCurrentUser() {
    // Recharge l'utilisateur connecté pour récupérer les Elo / stats / notations à jour.
    // IMPORTANT : on passe par adaptUser() pour homogénéiser le format
    //   (ex. `name` au lieu de `full_name`) avec celui utilisé partout dans l'app.
    //   Avant : on stockait l'objet brut du backend → le PassportView/DashboardView
    //   tombaient sur `me.name` qui valait undefined.
    const r = await Api.me();
    if (r.ok && r.user) set({ currentUser: adaptUser(r.user) });
    return r;
  }

  // Tableau de bord admin : KPIs centralisés (revenus, paiements, etc.)
  async function reloadOverview() {
    const r = await Api.adminOverview();
    if (r.ok && r.overview) set({ overview: r.overview });
    return r;
  }

  // ── Notifications dérivées ─────────────────────────────
  // Au lieu d'un tableau hardcodé dans le DashboardView, on calcule
  // dynamiquement des notifications à partir de l'état :
  //   - réservations à venir / impayées
  //   - matchs à venir / sans score / à évaluer / impayés
  //   - notations reçues (réputation mise à jour)
  function recomputeNotifications() {
    const u = state.currentUser;
    if (!u) { set({ notifications: [], lastRatingsCount: 0 }); return; }
    const now = new Date();
    const list = [];

    // ── Détection d'une nouvelle notation reçue ─────────────
    // On compare le nombre actuel de notations reçues au dernier nombre vu.
    // Si ça a augmenté, on émet une notif "Votre réputation a évolué".
    const currentRatingsCount = u.ratings?.count || 0;
    const previousRatingsCount = state.lastRatingsCount || 0;
    if (currentRatingsCount > previousRatingsCount && previousRatingsCount > 0) {
      const delta = currentRatingsCount - previousRatingsCount;
      list.push({
        id: `rating-received-${currentRatingsCount}`,
        type: 'reputation',
        msg: `Vous avez reçu ${delta} nouvelle${delta>1?'s':''} évaluation${delta>1?'s':''}. Votre réputation a été mise à jour.`,
        time: 'Nouveau',
        unread: true,
      });
    }

    // Réservations à venir
    state.bookings
      .filter(b => b.userId === u.id && b.status === 'scheduled')
      .forEach(b => {
        const slot = new Date(b.slotISO);
        const hours = (slot - now) / 3600000;
        if (hours > 0 && hours < 48) {
          list.push({
            id: `booking-soon-${b.id}`,
            type: 'booking',
            msg: `Votre réservation ${b.court} le ${b.date} à ${b.time} approche.`,
            time: hours < 24 ? `Dans ${Math.round(hours)}h` : 'Demain',
            unread: hours < 24,
          });
        }
        if (b.paymentStatus !== 'paid' && hours < 0) {
          list.push({
            id: `booking-unpaid-${b.id}`,
            type: 'payment',
            msg: `Paiement en attente pour ${b.court} (${b.date}).`,
            time: 'À régler',
            unread: true,
          });
        }
      });

    // Matchs où je suis inscrit
    state.matches
      .filter(m => m.playerIds.includes(u.id))
      .forEach(m => {
        const slot = new Date(m.slotISO);
        const hours = (slot - now) / 3600000;
        // À venir
        if (m.status === 'scheduled' && hours > 0 && hours < 24) {
          list.push({
            id: `match-soon-${m.id}`,
            type: 'match',
            msg: `Match ${m.court} prévu le ${m.date} à ${m.startTime}.`,
            time: `Dans ${Math.round(hours)}h`,
            unread: hours < 12,
          });
        }
        // Match terminé (créneau passé) ET complet, sans score saisi
        // → le joueur peut/doit saisir le résultat.
        if (m.status === 'scheduled' && m.slotInPast && m.isFull) {
          list.push({
            id: `match-toscore-${m.id}`,
            type: 'score',
            msg: `Saisissez le score du match ${m.court} (${m.date}).`,
            time: 'Action requise',
            unread: true,
          });
        }
        // Match terminé avec score, mais je n'ai pas encore noté mes partenaires
        if (m.status === 'completed'
            && m.sets && m.sets.length > 0
            && Array.isArray(m.ratedBy) && !m.ratedBy.includes(u.id)
            && m.playerIds.length > 1) {
          list.push({
            id: `match-rate-${m.id}`,
            type: 'rate',
            msg: `Évaluez vos partenaires du match ${m.court} (${m.date}).`,
            time: 'À faire',
            unread: true,
          });
        }
        // Match terminé impayé
        if (m.status === 'completed' && m.paymentStatus !== 'paid') {
          list.push({
            id: `match-unpaid-${m.id}`,
            type: 'payment',
            msg: `Paiement en attente pour le match ${m.court} (${m.date}).`,
            time: 'À régler',
            unread: false,
          });
        }
      });

    // Tri : non lus en premier, puis par récence (id qui contient un timestamp ou simple stable)
    list.sort((a,b) => (b.unread?1:0) - (a.unread?1:0));
    set({ notifications: list, lastRatingsCount: currentRatingsCount });
  }

  // refreshAll : LE point d'entrée pour tout réactualiser à fond.
  // À appeler après toute action qui peut impacter plusieurs zones
  // (création / annulation / score / notation / paiement).
  // Pour un admin on rafraîchit AUSSI le KPI overview (chiffre d'affaires,
  // paiements, taux de remplissage) afin que tout se synchronise d'un seul tenant.
  async function refreshAll() {
    const tasks = [
      reloadMatches(),
      reloadBookings(),
      reloadCurrentUser(),
      reloadUsers(),
    ];
    if (state.currentUser?.role === 'admin') {
      tasks.push(reloadOverview());
    }
    await Promise.all(tasks);
    recomputeNotifications();
  }

  async function bootstrap() {
    await reloadCourts();
    await Promise.all([reloadMatches(), reloadBookings(), reloadCurrentUser()]);
    if (state.currentUser?.role === 'admin') {
      await Promise.all([reloadUsers(), reloadOverview()]);
    }
    recomputeNotifications();
  }

  return {
    getState:  () => state,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    getCourts: () => COURTS_DB,

    bootstrap,
    refreshAll,
    reloadMatches,
    reloadBookings,
    reloadCurrentUser,
    reloadUsers,
    reloadOverview,
    recomputeNotifications,

    // Permet aux vues de définir l'utilisateur courant après login
    // (avant que le bootstrap ne tourne).
    // On adapte (full_name → name, etc.) si nécessaire pour rester cohérent.
    setCurrentUser(u) {
      // Si u contient déjà la forme adaptée (avec `name`), on ne touche pas.
      // Sinon on l'adapte ; cela couvre les deux flows (login / restore session).
      const adapted = u && !u.name && u.full_name ? adaptUser(u) : u;
      set({ currentUser: adapted });
      recomputeNotifications();
    },

    isSlotAvailable(courtId, dateStr, startTime) {
      if (!slotIsFuture(dateStr, startTime)) return false;
      const usedB = state.bookings.some(b =>
        b.status === 'scheduled' && b.courtId === courtId
        && b.dateStr === dateStr && b.time === startTime);
      const usedM = state.matches.some(m =>
        m.status === 'scheduled' && m.courtId === courtId
        && m.dateStr === dateStr && m.startTime === startTime);
      return !usedB && !usedM;
    },

    getAvailableCourtSlots(dateStr) {
      const result = {};
      const self = this;
      COURTS_DB.forEach(c => {
        result[c.id] = getAvailableSlotTimes(dateStr).filter(t =>
          self.isSlotAvailable(c.id, dateStr, t)
        );
      });
      return result;
    },

    getAvailableCourts(dateStr, startTime) {
      if (!slotIsFuture(dateStr, startTime)) return [];
      const self = this;
      return COURTS_DB.filter(c => self.isSlotAvailable(c.id, dateStr, startTime));
    },

    getActiveMatches() {
      return state.matches.filter(m =>
        m.status === 'scheduled' && slotIsFuture(m.dateStr, m.startTime)
      );
    },

    // ===== Actions mutantes : appellent le backend, PUIS refreshAll() =====
    // PRINCIPE : toute modification dans la base impacte plusieurs vues
    // (passport, dashboard, profil, notifications, admin). On ne se contente
    // donc plus de recharger la table directement modifiée — on synchronise
    // l'ENSEMBLE de l'état pour que toutes les vues abonnées se redessinent.

    async createMatch(userId, courtId, court, type, level, dateStr, dateLabel, startTime, note, visibility) {
      const range = levelRangeFromLabel(level);
      const r = await Api.createMatch({
        court_id: courtId,
        date: dateStr,
        start_time: startTime,
        level_min: range.min,
        level_max: range.max,
        visibility: visibility || 'public',
        note: note || '',
      });
      if (!r.ok) return { ok: false, error: r.message || 'Erreur création match.' };
      await refreshAll();
      return { ok: true, match: adaptMatch(r.match), shareLink: r.match.share_link };
    },

    // Modification d'un match existant (créateur ou admin).
    // payload est un objet partiel { courtId?, dateStr?, startTime?, level?, visibility?, note? }
    async updateMatch(matchId, payload) {
      const body = {};
      if (payload.courtId   != null) body.court_id   = payload.courtId;
      if (payload.dateStr   != null) body.date       = payload.dateStr;
      if (payload.startTime != null) body.start_time = payload.startTime;
      if (payload.level     != null) {
        const range = levelRangeFromLabel(payload.level);
        body.level_min = range.min;
        body.level_max = range.max;
      }
      if (payload.visibility != null) body.visibility = payload.visibility;
      if (payload.note       != null) body.note       = payload.note;
      const r = await Api.updateMatch(matchId, body);
      if (!r.ok) return { ok: false, error: r.message || 'Erreur modification match.' };
      await refreshAll();
      return { ok: true, match: adaptMatch(r.match) };
    },

    async createBooking(userId, courtId, court, type, dateStr, dateLabel, startTime) {
      const r = await Api.createBooking(courtId, dateStr, startTime);
      if (!r.ok) return { ok: false, error: r.message || 'Erreur création réservation.' };
      await refreshAll();
      return { ok: true, booking: adaptBooking(r.booking), shareLink: r.booking.share_link };
    },

    // Modification d'une réservation existante.
    // payload : { courtId?, dateStr?, startTime? }
    async updateBooking(bookingId, payload) {
      const body = {};
      if (payload.courtId   != null) body.court_id   = payload.courtId;
      if (payload.dateStr   != null) body.date       = payload.dateStr;
      if (payload.startTime != null) body.start_time = payload.startTime;
      const r = await Api.updateBooking(bookingId, body);
      if (!r.ok) return { ok: false, error: r.message || 'Erreur modification réservation.' };
      await refreshAll();
      return { ok: true, booking: adaptBooking(r.booking) };
    },

    // Création d'une réservation par un admin POUR un autre utilisateur.
    async adminCreateBookingFor(targetUserId, courtId, dateStr, startTime) {
      const r = await Api.adminCreateBooking({
        user_id: targetUserId,
        court_id: courtId,
        date: dateStr,
        start_time: startTime,
      });
      if (!r.ok) return { ok: false, error: r.message || 'Erreur création réservation.' };
      await refreshAll();
      return { ok: true, booking: adaptBooking(r.booking) };
    },

    async joinMatch(userId, matchId) {
      const r = await Api.joinMatch(matchId);
      if (!r.ok) return { ok: false, error: r.message || 'Impossible de rejoindre ce match.' };
      await refreshAll();
      return { ok: true };
    },

    async leaveMatch(userId, matchId) {
      const r = await Api.leaveMatch(matchId);
      if (r.ok) await refreshAll();
      return r;
    },

    async cancelMatch(matchId) {
      const r = await Api.cancelMatch(matchId);
      if (r.ok) await refreshAll();
      return r;
    },

    async cancelBooking(bookingId) {
      const r = await Api.cancelBooking(bookingId);
      if (r.ok) { await refreshAll(); return true; }
      return false;
    },

    async setMatchPaymentStatus(matchId, paymentStatus) {
      const r = await Api.setMatchPayment(matchId, paymentStatus);
      if (r.ok) await refreshAll();
      return r;
    },

    async setBookingPaymentStatus(bookingId, paymentStatus) {
      const r = await Api.setBookingPayment(bookingId, paymentStatus);
      if (r.ok) await refreshAll();
      return r;
    },

    async submitResult(matchId, sets) {
      const r = await Api.submitResult(matchId, sets);
      // submitResult modifie : statut match + Elo joueurs + stats joueurs.
      // refreshAll garantit que passport, dashboard, profils, classements
      // et notifications reflètent ces changements immédiatement.
      if (r.ok) await refreshAll();
      return r;
    },

    async ratePlayer(fromUserId, toUserId, matchId, fairplay, punctuality, teamspirit) {
      const r = await Api.ratePlayer(matchId, { to_user: toUserId, fairplay, punctuality, teamspirit });
      // ratePlayer impacte : ratings du joueur noté (sa réputation),
      // ratedBy du match (boutons "à évaluer" → masqués),
      // notifications du noté (notif "réputation mise à jour" la prochaine fois
      // qu'il rafraîchit). Un refreshAll synchronise tout en un coup.
      if (r.ok) await refreshAll();
      return r;
    },

    async updateUser(userId, payload) {
      const r = await Api.adminUpdateUser(userId, payload);
      if (r.ok) await refreshAll();
      return r;
    },

    // Création d'un compte par un admin (joueur ou autre admin).
    // Après succès on rafraîchit la liste pour que la table de l'admin
    // affiche immédiatement le nouvel utilisateur.
    async createUser(payload) {
      const r = await Api.adminCreateUser(payload);
      if (r.ok) await refreshAll();
      return r;
    },

    async archiveUser(userId, archived = true) {
      const r = await Api.adminArchiveUser(userId, archived);
      if (r.ok) await refreshAll();
      return r;
    },

    async loadUsers() {
      const r = await Api.adminListUsers();
      if (r.ok) set({ users: r.users.map(adaptUser) });
      return r;
    },

    async loadAdminOverview() {
      const r = await Api.adminOverview();
      if (r.ok && r.overview) set({ overview: r.overview });
      return r;
    },
  };
}

window.AppStore = createAppStore();
window.COURTS_DB = window.AppStore.getCourts();

function useStore() {
  const [s, setS] = React.useState(AppStore.getState());
  React.useEffect(() => AppStore.subscribe(setS), []);
  return s;
}
window.useStore = useStore;
