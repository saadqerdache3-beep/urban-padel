// Urban Padel — Admin Dashboard Shell v3 — updated court names + payment KPIs

const ADMIN_NAV = [
  { id:'overview',  label:"Vue d'ensemble" },
  { id:'slots',     label:'Créneaux'       },
  { id:'bookings',  label:'Réservations'   },
  { id:'matches',   label:'Matchs'         },
  { id:'users',     label:'Utilisateurs'   },
];

// ── Shared admin primitives ───────────────────────────────
function KPICard({ label, value, sub, trend, accent }) {
  const C = UP_COLORS;
  const up   = trend && (trend.startsWith('+') || trend.includes('↑'));
  const down = trend && (trend.startsWith('-') || trend.includes('↓'));
  return (
    <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'22px 24px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:700, color:accent||C.secondary, lineHeight:1, marginBottom:4 }}>{value}</div>
      {sub   && <div style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>{sub}</div>}
      {trend && <div style={{ fontSize:12, fontWeight:700, color:down?'#9B3B3B':up?'#3D7A5F':C.textMuted }}>{trend}</div>}
    </div>
  );
}

function BarChart({ data, color, height=90 }) {
  const C = UP_COLORS;
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{ display:'flex', gap:6, alignItems:'flex-end', height }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{ width:'100%', background:color, opacity:0.7+(i/data.length*0.3), borderRadius:'4px 4px 0 0', height:`${d.value/max*100}%`, minHeight:d.value?4:0, transition:'height 500ms ease' }} />
          <span style={{ fontSize:9, color:C.textLight, whiteSpace:'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function AdminSearch({ value, onChange, placeholder }) {
  const C = UP_COLORS;
  return (
    <div style={{ position:'relative' }}>
      <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:C.textLight, fontSize:13, pointerEvents:'none' }}>⌕</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'Rechercher...'}
        style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px 10px 36px',
          fontSize:13, color:C.text, fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }} />
    </div>
  );
}

function TH({ children, style={} }) {
  return (
    <th style={{ textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:1.5, color:UP_COLORS.textMuted, textTransform:'uppercase',
      padding:'10px 16px', background:UP_COLORS.surfaceAlt, borderBottom:`1px solid ${UP_COLORS.border}`, ...style }}>
      {children}
    </th>
  );
}
function TD({ children, style={} }) {
  return <td style={{ padding:'13px 16px', fontSize:13, color:UP_COLORS.text, borderBottom:`1px solid ${UP_COLORS.border}`, verticalAlign:'middle', ...style }}>{children}</td>;
}

function ActionBtn({ label, onClick, danger }) {
  const C = UP_COLORS;
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?(danger?'#F4ECEC':C.primaryLight):'transparent', color:danger?'#9B3B3B':C.primary,
        border:'none', borderRadius:6, padding:'5px 10px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'background 150ms' }}>
      {label}
    </button>
  );
}

function AdminModal({ title, subtitle, onClose, children, width=520 }) {
  const C = UP_COLORS;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,43,74,0.55)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ background:C.secondary, padding:'22px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:4 }}>{subtitle||'Administration'}</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, color:'#fff', fontSize:16, cursor:'pointer', padding:'6px 10px', lineHeight:1 }}>Fermer</button>
        </div>
        <div style={{ padding:'24px 28px' }}>{children}</div>
      </div>
    </div>
  );
}

Object.assign(window, { KPICard, BarChart, AdminSearch, TH, TD, ActionBtn, AdminModal });

// ── Overview ─────────────────────────────────────────────
function AdminOverview() {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const { bookings, matches, users, overview } = useStore();

  // ── Helpers prix ──────────────────────────────────────
  // Pour un match : revenu = pricePlayer × nb joueurs inscrits
  // (cohérent pour Double ET pour le terrain Individuel à 2 joueurs).
  const matchRevenue = (m) => (m.pricePlayer || 0) * (m.playerIds?.length || 0);

  // Source de vérité primaire : `overview` envoyé par le backend.
  // Cela garantit que le Chiffre d'affaires affiché EST exactement celui
  // calculé par le serveur (matchs payés inclus). Sans backend overview
  // (ex. première frame), on retombe sur un calcul côté front.
  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid' && b.status !== 'cancelled');
  const paidMatches  = matches.filter(m => m.paymentStatus === 'paid' && m.status !== 'cancelled');
  const localRevenue = paidBookings.reduce((s,b)=>s+(b.total||0),0)
                     + paidMatches.reduce((s,m)=>s+matchRevenue(m),0);
  const localPaidCount = paidBookings.length + paidMatches.length;

  const revenue   = overview?.revenue?.paid ?? localRevenue;
  const paidCount = overview?.revenue?.paid_count ?? localPaidCount;
  const unpaidCount = overview?.revenue?.unpaid_count
    ?? (bookings.filter(b=>b.paymentStatus!=='paid' && b.status!=='cancelled').length
        + matches.filter(m=>m.paymentStatus!=='paid' && m.status!=='cancelled').length);

  // Réservations actives & annulations (toutes confondues)
  const active     = bookings.filter(b=>b.status==='scheduled').length
                   + matches.filter(m=>m.status==='scheduled').length;
  const cancelled  = bookings.filter(b=>b.status==='cancelled').length
                   + matches.filter(m=>m.status==='cancelled').length;
  const totalAll   = bookings.length + matches.length;
  const cancelRate = totalAll ? Math.round(cancelled/totalAll*100) : 0;

  const scheduled = matches.filter(m=>m.status==='scheduled');
  const avgFill   = scheduled.length ? Math.round(scheduled.reduce((s,m)=>s+m.playerIds.length/m.maxPlayers,0)/scheduled.length*100) : 0;

  // ─── DONNÉES DYNAMIQUES depuis l'overview backend ───
  // Avant : les graphes étaient codés en dur (440, 880, 660, … et 85%, 72%, 58%).
  // Maintenant : on lit `overview.revenue.last_7_days` et `overview.courts_fill`
  // qui sont calculés côté serveur à partir des paiements et créneaux réels.
  // Fallback côté front si l'overview n'est pas encore chargé.
  const revenueData = (overview?.revenue?.last_7_days && overview.revenue.last_7_days.length > 0)
    ? overview.revenue.last_7_days.map(d => ({ label: d.label, value: d.value || 0 }))
    : (() => {
        // Fallback : calcule localement les 7 derniers jours à partir du store.
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const days = ['L','M','M','J','V','S','D']; // Lundi..Dimanche (jour de semaine 1..7 mais Sunday=0)
        const dayLabel = (d) => { const wd = d.getDay(); return days[wd === 0 ? 6 : wd - 1]; };
        const arr = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today); d.setDate(today.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          let total = 0;
          paidBookings.forEach(b => { if (b.date === dStr) total += (b.total || 0); });
          paidMatches.forEach(m => { if (m.date === dStr) total += matchRevenue(m); });
          arr.push({ label: dayLabel(d), value: total });
        }
        return arr;
      })();

  const fillData = (overview?.courts_fill && overview.courts_fill.length > 0)
    ? overview.courts_fill.map(c => ({ label: c.label, value: c.rate || 0 }))
    : (() => {
        // Fallback : remplissage par terrain sur les 7 PROCHAINS jours.
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const maxDate = new Date(today); maxDate.setDate(today.getDate() + 6);
        const minStr = today.toISOString().split('T')[0];
        const maxStr = maxDate.toISOString().split('T')[0];
        const totalSlotsPerCourt = 10 * 7; // 10 créneaux × 7 jours
        return (window.COURTS_DB || []).map(c => {
          const occupied = new Set();
          bookings.forEach(b => {
            if (b.courtId === c.id && b.status === 'scheduled' && b.date >= minStr && b.date <= maxStr) {
              occupied.add(`${b.date}|${b.time}`);
            }
          });
          matches.forEach(m => {
            if (m.courtId === c.id && m.status === 'scheduled' && m.date >= minStr && m.date <= maxStr) {
              occupied.add(`${m.date}|${m.startTime}`);
            }
          });
          return {
            label: c.type === 'Simple' ? 'Indiv.' : c.name,
            value: Math.round(occupied.size / totalSlotsPerCourt * 100),
          };
        });
      })();

  // Tendance dynamique du CA semaine vs semaine précédente
  const revenueTrendPct = overview?.revenue?.trend_pct;
  const trendLabel = (revenueTrendPct === undefined || revenueTrendPct === null)
    ? '—'
    : (revenueTrendPct > 0 ? `+${revenueTrendPct}%` : `${revenueTrendPct}%`);

  const revenue7dTotal = revenueData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div style={{ padding: isMobile ? '16px 16px 32px' : '40px 48px', maxWidth:1100 }}>
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Administration</div>
        <h1 style={{ fontSize:30, fontWeight:700, color:C.secondary, margin:'0 0 4px', letterSpacing:'-0.5px' }}>Tableau de bord</h1>
        <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>Vue d'ensemble de l'activité Urban Padel Marrakech.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:12, marginBottom:12 }}>
        <KPICard label="Chiffre d'affaires" value={`${revenue.toLocaleString()} MAD`} sub="Encaissé (matchs + réservations payés)" trend={`${paidCount} session(s) payée(s)`} />
        <KPICard label="Sessions actives" value={active} sub={`${totalAll} au total`} trend="Réservations + matchs planifiés" />
        <KPICard label="Taux de remplissage" value={`${avgFill}%`} sub="Matchs planifiés" trend={trendLabel === '—' ? null : `${trendLabel} CA vs sem. passée`} />
        <KPICard label="Taux d'annulation" value={`${cancelRate}%`} sub={`${cancelled} annulation(s)`} trend={cancelRate>15?'↑ Attention':'+0%'} accent={cancelRate>15?'#9B3B3B':undefined} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <KPICard label="Joueurs inscrits" value={users.filter(u=>!u.archived && u.role==='player').length} sub="Comptes actifs" />
        <KPICard label="Matchs planifiés" value={scheduled.length} sub="Semaine en cours" />
        <KPICard label="Paiements reçus" value={paidCount} sub={`${unpaidCount} en attente`} accent="#3D7A5F" />
        <KPICard label="Revenu / session" value={`${paidCount ? Math.round(revenue/paidCount) : 0} MAD`} sub="Moyenne (payées)" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap:14, marginBottom:20 }}>
        <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'24px 28px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:4 }}>Revenus — 7 derniers jours</div>
              <div style={{ fontSize:22, fontWeight:700, color:C.secondary }}>{revenue7dTotal.toLocaleString()} MAD</div>
            </div>
            {trendLabel !== '—' && (
              <span style={{
                fontSize:12, fontWeight:700,
                color: revenueTrendPct >= 0 ? '#3D7A5F' : '#9B3B3B',
                background: revenueTrendPct >= 0 ? '#EDF4F0' : '#F4ECEC',
                borderRadius:8, padding:'4px 10px'
              }}>{trendLabel}</span>
            )}
          </div>
          {revenue7dTotal === 0 ? (
            <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', color:C.textMuted, fontSize:13 }}>
              Aucun revenu sur les 7 derniers jours.
            </div>
          ) : (
            <BarChart data={revenueData} color={C.primary} height={100} />
          )}
        </div>
        <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'24px 28px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:16 }}>Taux de remplissage par terrain</div>
          {fillData.length === 0 ? (
            <div style={{ color:C.textMuted, fontSize:13, padding:'20px 0', textAlign:'center' }}>Aucune donnée.</div>
          ) : fillData.map(d => (
            <div key={d.label} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.secondary }}>{d.label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.primary }}>{d.value}%</span>
              </div>
              <div style={{ height:7, borderRadius:4, background:C.surfaceAlt }}>
                <div style={{ height:'100%', borderRadius:4, background:C.primary, width:`${Math.min(100, d.value)}%`, transition:'width 600ms ease' }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize:11, color:C.textLight, marginTop:8 }}>Sur les 7 derniers jours, créneaux occupés / disponibles.</div>
        </div>
      </div>

      {/* Payment status summary */}
      <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'24px 28px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:16 }}>Statuts de paiement</div>
        <div style={{ display:'flex', gap:32 }}>
          {[
            { label:'Payé',    value:paidCount,   color:'#3D7A5F' },
            { label:'Impayé',  value:unpaidCount,  color:'#9B3B3B' },
            { label:'Annulé',  value:cancelled,    color:C.borderStrong },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:s.color, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:C.secondary }}>{s.value}</div>
                <div style={{ fontSize:12, color:C.textMuted }}>{s.label}</div>
              </div>
            </div>
          ))}
          <div style={{ flex:1, display:'flex', alignItems:'center', marginLeft:20 }}>
            <div style={{ width:'100%', height:10, borderRadius:5, overflow:'hidden', display:'flex' }}>
              {totalAll > 0 && [
                { val:paidCount,   color:'#3D7A5F' },
                { val:unpaidCount,  color:'#9B3B3B' },
                { val:cancelled,    color:C.borderStrong },
              ].map((s,i) => (
                <div key={i} style={{ background:s.color, width:`${s.val/totalAll*100}%`, transition:'width 500ms' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Shell ───────────────────────────────────────────
function AdminDashboard({ user, onNav, onLogout }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const [section, setSection] = React.useState('overview');

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', background:C.background }}>
      {/* Sidebar */}
      <div style={{ width: isMobile ? 200 : 220, background:'#fff', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding: isMobile ? '16px 12px 12px' : '24px 20px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>Administration</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <AvatarCircle initials={user.initials||'AU'} size={36} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.secondary }}>{user.full_name||user.name}</div>
              <div style={{ fontSize:11, color:C.textMuted }}>Administrateur</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'12px 10px' }}>
          {ADMIN_NAV.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => setSection(item.id)} style={{
                display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
                background: active ? C.primaryLight : 'transparent',
                color: active ? C.primary : C.textMuted,
                border:'none', borderRadius:10, padding:'11px 14px', fontSize:13,
                fontWeight: active ? 700 : 500, cursor:'pointer', fontFamily:'inherit',
                marginBottom:2, transition:'all 150ms'
              }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:active?C.primary:C.border, flexShrink:0 }} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:'16px 10px', borderTop:`1px solid ${C.border}` }}>
          <button onClick={onLogout} style={{ display:'block', width:'100%', textAlign:'left', background:'transparent', border:'none', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#9B3B3B', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:'auto' }}>
        {section === 'overview'  && <AdminOverview />}
        {section === 'slots'     && <AdminSlots />}
        {section === 'bookings'  && <AdminBookings />}
        {section === 'matches'   && <AdminMatchesPanel />}
        {section === 'users'     && <AdminUsers />}
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard, AdminOverview });
