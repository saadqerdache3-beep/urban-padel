// Urban Padel — Dashboard View — Responsive
function DashboardView({ user, onNav, onLogout }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const px = isMobile ? '16px' : '48px';
  const { bookings, matches, users, currentUser, notifications } = useStore();
  const [tab, setTab]           = React.useState('bookings');
  const [cancelError, setCancelError] = React.useState(null);
  const [copiedId, setCopiedId] = React.useState(null);

  const myBookings = bookings.filter(b => b.userId === user.id);
  // currentUser est la source la plus fraîche (rafraîchie après chaque
  // match/notation). On retombe sur users[] puis sur la prop `user`.
  const me = (currentUser && currentUser.id === user.id)
    ? currentUser
    : users.find(u => u.id === user.id) || user;

  const hoursUntil = iso => (new Date(iso) - new Date()) / 3600000;

  const handleCancel = async (bookingId) => {
    const ok = await AppStore.cancelBooking(bookingId);
    if (!ok) setCancelError(bookingId);
    else setCancelError(null);
  };

  const handleCopy = (link, id) => {
    navigator.clipboard?.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusChip = s => {
    if (s === 'scheduled') return <Chip variant="scheduled">Planifié</Chip>;
    if (s === 'cancelled')  return <Chip variant="danger">Annulé</Chip>;
    if (s === 'completed')  return <Chip variant="warning">Terminé</Chip>;
    return <Chip variant="success">Validé</Chip>;
  };

  // Tous les matchs où je suis inscrit, triés par date la plus récente d'abord.
  // On affiche : matchs à venir (scheduled), terminés (completed), et annulés.
  // C'est l'historique COMPLET du joueur, pas seulement les matchs avec score saisi.
  const myMatches = matches
    .filter(m => m.playerIds.includes(user.id))
    .slice()
    .sort((a, b) => {
      // Dernier d'abord : on compare slotISO
      const ta = new Date(a.slotISO).getTime();
      const tb = new Date(b.slotISO).getTime();
      return tb - ta;
    });

  const TABS = [
    { id:'bookings', label:'Réservations' },
    { id:'matches',  label:'Matchs'       },
    { id:'notifs',   label:'Notifications' },
    { id:'settings', label:'Paramètres'   },
  ];

  return (
    <ScrollView>
      {/* Profile hero */}
      <div style={{ background:C.secondary, padding: isMobile ? '24px 0 0' : '40px 0 0' }}>
        <div style={{ maxWidth:920, margin:'0 auto', padding:`0 ${px}` }}>
          <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 14 : 22, paddingBottom: isMobile ? 0 : 28, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <AvatarCircle initials={me.initials} size={isMobile ? 52 : 72} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:C.primary, textTransform:'uppercase', marginBottom:4 }}>Tableau de bord</div>
              <h1 style={{ fontSize: isMobile ? 20 : 28, fontWeight:700, color:'#fff', margin:'0 0 2px', letterSpacing:'-0.3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{me.name || me.full_name}</h1>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{me.email}</div>
            </div>
            {!isMobile && (
              <div style={{ display:'flex', gap:36, paddingLeft:32, borderLeft:'1px solid rgba(255,255,255,0.08)' }}>
                {[
                  [me.elo?.toFixed(1) || '—', 'Elo'],
                  [me.stats?.played ?? '—', 'Matchs'],
                  [me.stats?.played > 0 ? `${Math.round(me.stats.wins/me.stats.played*100)}%` : '—', 'Victoires'],
                ].map(([v,l]) => (
                  <div key={l} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:700, color:'#fff', lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:4 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
            {!isMobile && (
              <button onClick={() => onNav('passport')} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, color:'rgba(255,255,255,0.72)', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer', padding:'10px 18px', flexShrink:0 }}>
                Mon Passport
              </button>
            )}
          </div>
          {/* Stats mini ligne mobile */}
          {isMobile && (
            <div style={{ display:'flex', gap:0, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:12 }}>
              {[
                [me.elo?.toFixed(1)||'—','Elo'],
                [me.stats?.played??'—','Matchs'],
                [me.stats?.played>0?`${Math.round(me.stats.wins/me.stats.played*100)}%`:'—','Wins'],
              ].map(([v,l],i) => (
                <div key={l} style={{ flex:1, textAlign:'center', paddingBottom:12,
                  borderRight: i<2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', overflowX: isMobile ? 'auto' : 'visible', marginTop: isMobile ? 4 : 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit',
                fontSize:13, fontWeight:tab===t.id?700:500,
                color:tab===t.id?'#fff':'rgba(255,255,255,0.5)',
                padding: isMobile ? '10px 16px' : '12px 22px',
                borderBottom:tab===t.id?`2px solid ${C.primary}`:'2px solid transparent',
                transition:'color 150ms', whiteSpace:'nowrap', flexShrink:0
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:920, margin:'0 auto', padding: isMobile ? '20px 16px 40px' : '32px 48px 64px' }}>

        {/* Réservations */}
        {tab === 'bookings' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
              <BtnPrimary onClick={() => onNav('booking')} style={{ fontSize:13, padding:'11px 22px' }}>Nouvelle réservation</BtnPrimary>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {myBookings.length === 0 && (
                <div style={{ background:C.surfaceAlt, borderRadius:16, padding:'40px', textAlign:'center' }}>
                  <TextMuted>Aucune réservation pour l'instant.</TextMuted>
                </div>
              )}
              {myBookings.map(b => {
                const h = hoursUntil(b.slotISO);
                const cancellable = b.status === 'scheduled' && h >= 5;
                const tooLate     = b.status === 'scheduled' && h < 5 && h > 0;
                return (
                  <div key={b.id} style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'20px 24px', opacity:b.status==='cancelled'?0.55:1, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                      <div style={{ flex:2 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:15, fontWeight:700, color:C.secondary }}>{b.court}</span>
                          <Chip variant="primary">{b.type}</Chip>
                          {statusChip(b.status)}
                          {b.paymentStatus === 'paid'
                            ? <Chip variant="success">Payé</Chip>
                            : b.status === 'completed' ? <Chip variant="danger">Impayé</Chip> : null}
                        </div>
                        <div style={{ fontSize:13, color:C.textMuted, marginBottom:8 }}>{b.date} · {b.time}</div>
                        {/* Share link */}
                        {b.shareLink && b.status === 'scheduled' && (
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <span style={{ fontSize:11, color:C.textLight }}>Lien :</span>
                            <span style={{ fontSize:11, color:C.secondary, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:240 }}>{b.shareLink}</span>
                            <button onClick={() => handleCopy(b.shareLink, b.id)}
                              style={{ background: copiedId===b.id ? '#EDF4F0' : C.primaryLight, border:'none', borderRadius:5, padding:'3px 8px', fontSize:11, fontWeight:700, color: copiedId===b.id?'#3D7A5F':C.primary, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, transition:'all 200ms' }}>
                              {copiedId===b.id ? 'Copié' : 'Copier'}
                            </button>
                          </div>
                        )}
                        <div style={{ marginTop:6 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:C.secondary }}>{b.total} MAD</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end', flexShrink:0 }}>
                        {cancellable && (
                          <button onClick={() => handleCancel(b.id)} style={{ background:'#F4ECEC', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:700, color:'#9B3B3B', cursor:'pointer', fontFamily:'inherit' }}>
                            Annuler
                          </button>
                        )}
                        {tooLate && b.status === 'scheduled' && (
                          <div style={{ fontSize:11, color:'#A0763A', background:'#F6F0E6', borderRadius:8, padding:'6px 10px', fontWeight:600 }}>
                            Annulation impossible — moins de 5h
                          </div>
                        )}
                        {cancelError === b.id && (
                          <div style={{ fontSize:11, color:'#9B3B3B' }}>Annulation non disponible.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Matchs */}
        {tab === 'matches' && (
          <div>
            {myMatches.length === 0 ? (
              <div style={{ background:C.surfaceAlt, borderRadius:16, padding:'40px', textAlign:'center' }}>
                <TextMuted>Aucun match pour l'instant.</TextMuted>
                <div style={{ marginTop:12 }}><BtnGhost primary onClick={() => onNav('matches')}>Trouver un match</BtnGhost></div>
              </div>
            ) : (
              <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }}>
                {myMatches.map((m, i) => {
                  // Détermine le résultat seulement si le match est terminé avec un score
                  const hasScore = m.status === 'completed' && Array.isArray(m.sets) && m.sets.length > 0;
                  let won = false, eloChange = '—';
                  if (hasScore) {
                    const half2 = Math.floor(m.playerIds.length / 2);
                    const t1    = m.playerIds.slice(0, half2);
                    const t1w   = m.sets.filter(s => s.t1 > s.t2).length;
                    const t2w   = m.sets.filter(s => s.t2 > s.t1).length;
                    won = t1.includes(user.id) ? t1w > t2w : t2w > t1w;
                    eloChange = won ? '+0.15' : '−0.10';
                  }

                  // Statut de ce match (pour l'utilisateur)
                  let statusBadge;
                  if (m.status === 'cancelled') {
                    statusBadge = <Chip variant="danger">Annulé</Chip>;
                  } else if (m.status === 'completed' && hasScore) {
                    statusBadge = <Chip variant={won ? 'success' : 'danger'}>{won ? 'Victoire' : 'Défaite'}</Chip>;
                  } else if (m.status === 'completed') {
                    statusBadge = <Chip variant="warning">Score à saisir</Chip>;
                  } else if (m.slotInPast) {
                    statusBadge = <Chip variant="warning">À évaluer</Chip>;
                  } else {
                    statusBadge = <Chip variant="scheduled">Planifié</Chip>;
                  }

                  return (
                    <div key={m.id} style={{ display:'flex', alignItems:'center', padding:'16px 24px', borderBottom: i < myMatches.length - 1 ? `1px solid ${C.border}` : 'none', gap:14, opacity: m.status === 'cancelled' ? 0.55 : 1 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.secondary, minWidth:140 }}>{m.date} · {m.startTime}</span>
                      {statusBadge}
                      {hasScore && (
                        <span style={{ fontSize:13, fontWeight:700, color: won ? '#3D7A5F' : '#9B3B3B', minWidth:70 }}>{eloChange} Elo</span>
                      )}
                      <span style={{ flex:1, fontSize:12, color:C.textMuted }}>{m.court}{m.createdBy === user.id ? ' · Créé par vous' : ''}</span>
                      {hasScore ? (
                        <div style={{ display:'flex', gap:6 }}>
                          {m.sets.map((s, j) => (
                            <span key={j} style={{ fontSize:13, fontWeight:700, color:C.secondary, background:C.surfaceAlt, borderRadius:6, padding:'2px 8px' }}>{s.t1}–{s.t2}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize:12, color:C.textLight }}>{m.playerIds.length}/{m.maxPlayers} joueurs</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notifications — dérivées dynamiquement de l'état réel
             (réservations à venir, matchs sans score, évaluations à
             faire, paiements en attente). Plus de données fictives. */}
        {tab === 'notifs' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(!notifications || notifications.length === 0) ? (
              <div style={{ background:C.surfaceAlt, borderRadius:16, padding:'40px', textAlign:'center' }}>
                <TextMuted>Aucune notification pour l'instant.</TextMuted>
                <div style={{ fontSize:12, color:C.textLight, marginTop:6 }}>Vous serez notifié pour vos réservations, matchs à venir et évaluations à faire.</div>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ background:n.unread?'#fff':C.surfaceAlt, borderRadius:14, border:`1px solid ${n.unread?C.border:'transparent'}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:14, boxShadow:n.unread?'0 2px 12px rgba(0,0,0,0.04)':'none' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:n.unread?C.primary:'transparent', flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, color:C.text, fontWeight:n.unread?600:400 }}>{n.msg}</span>
                <span style={{ fontSize:12, color:C.textLight, whiteSpace:'nowrap' }}>{n.time}</span>
              </div>
            ))}
          </div>
        )}

        {/* Paramètres */}
        {tab === 'settings' && (
          <div style={{ maxWidth:480 }}>
            <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${C.border}`, padding:'32px', boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:16, fontWeight:700, color:C.secondary, marginBottom:22 }}>Informations du compte</div>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <Input label="Nom complet" value={me.name || me.full_name} disabled />
                <Input label="Adresse email" value={me.email} disabled />
                <Input label="Nouveau mot de passe" type="password" placeholder="Laisser vide pour ne pas modifier" />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:24, paddingTop:24, borderTop:`1px solid ${C.border}` }}>
                <button onClick={onLogout} style={{ background:'transparent', border:'none', color:'#9B3B3B', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer', padding:0 }}>Se déconnecter</button>
                <BtnPrimary style={{ padding:'11px 24px', fontSize:13 }}>Enregistrer</BtnPrimary>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollView>
  );
}

Object.assign(window, { DashboardView });
