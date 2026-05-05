// ============================================================
//  app/api.js — Couche d'appel HTTP vers le backend Flask
// ============================================================
//  Rôle :
//   - Centraliser TOUS les appels fetch() vers /api/...
//   - Gérer automatiquement le token JWT (lecture localStorage)
//   - Renvoyer un format uniforme { ok, ...data } ou { ok:false, error, message }
//
//  Avantage architectural :
//   Aucune autre vue n'a à connaître `fetch` ou les URLs.
//   Si demain on change le backend, on ne touche QUE ce fichier.
// ============================================================

const API_BASE = '/api'; // Le frontend est servi par le même Flask → URLs relatives

// --- Gestion du token JWT (persistance via localStorage) ---
const TOKEN_KEY = 'up_token';
function getToken()   { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)  { if (t) localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// --- Helper bas niveau : envoie une requête HTTP au backend ---
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // Erreur réseau (serveur arrêté, etc.)
    return { ok: false, error: 'NETWORK', message: 'Serveur injoignable.' };
  }

  let data;
  try { data = await res.json(); }
  catch { data = { ok: false, error: 'PARSE_ERROR', message: 'Réponse invalide.' }; }

  // Si le serveur renvoie 401 → token expiré ou invalide, on le purge.
  if (res.status === 401) clearToken();

  return data;
}

// ============================================================
//  API publique — les méthodes utilisées partout dans l'app
// ============================================================
window.Api = {
  // ---------- AUTH ----------
  async login(email, password) {
    const r = await request('POST', '/auth/login', { email, password });
    if (r.ok && r.token) setToken(r.token);
    return r;
  },

  async register(full_name, email, password, elo) {
    const r = await request('POST', '/auth/register', { full_name, email, password, elo });
    if (r.ok && r.token) setToken(r.token);
    return r;
  },

  async me() { return request('GET', '/auth/me'); },

  logout() { clearToken(); },

  // ---------- COURTS / SLOTS ----------
  listCourts()         { return request('GET', '/courts'); },
  getDaySlots(date)    { return request('GET', `/slots?date=${encodeURIComponent(date)}`); },
  getWeekSlots(start)  {
    const q = start ? `?start=${encodeURIComponent(start)}` : '';
    return request('GET', '/slots/week' + q);
  },

  // ---------- BOOKINGS ----------
  listBookings()             { return request('GET', '/bookings'); },
  createBooking(court_id, date, start_time) {
    return request('POST', '/bookings', { court_id, date, start_time });
  },
  updateBooking(id, payload) { return request('PATCH', `/bookings/${id}`, payload); },
  cancelBooking(id)          { return request('PATCH', `/bookings/${id}/cancel`); },
  setBookingPayment(id, payment_status) {
    return request('PATCH', `/bookings/${id}/payment`, { payment_status });
  },
  // Création par un admin pour un autre utilisateur
  adminCreateBooking(payload) { return request('POST', '/admin/bookings', payload); },

  // ---------- MATCHES ----------
  listMatches()              { return request('GET', '/matches'); },
  listMyMatches()            { return request('GET', '/matches/mine'); },
  getMatch(id)               { return request('GET', `/matches/${id}`); },
  createMatch(payload)       { return request('POST', '/matches', payload); },
  updateMatch(id, payload)   { return request('PATCH', `/matches/${id}`, payload); },
  joinMatch(id)              { return request('POST', `/matches/${id}/join`); },
  leaveMatch(id)             { return request('DELETE', `/matches/${id}/leave`); },
  cancelMatch(id)            { return request('PATCH', `/matches/${id}/cancel`); },
  submitResult(id, sets)     { return request('POST', `/matches/${id}/result`, { sets }); },
  ratePlayer(id, payload)    { return request('POST', `/matches/${id}/rate`, payload); },
  setMatchPayment(id, payment_status) {
    return request('PATCH', `/matches/${id}/payment`, { payment_status });
  },

  // ---------- ADMIN ----------
  adminOverview()                  { return request('GET', '/admin/overview'); },
  adminListUsers()                 { return request('GET', '/admin/users'); },
  adminCreateUser(payload)         { return request('POST', '/admin/users', payload); },
  adminUpdateUser(id, payload)     { return request('PATCH', `/admin/users/${id}`, payload); },
  adminArchiveUser(id, archived)   { return request('PATCH', `/admin/users/${id}/archive`, { archived }); },

  // ---------- ELO ----------
  eloLevels()                      { return request('GET', '/elo/levels'); },
};
