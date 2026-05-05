// Urban Padel — Match List View v5
// - Expired matches auto-filtered
// - ELO compatibility check
// - Share link (no code)
// - Visibility badge

function MatchListView({ onNav, user }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const { matches, users } = useStore();
  const [filterDay,   setFilterDay]   = React.useState(null);
  const [filterLevel, setFilterLevel] = React.useState(null);
  const [filterType,  setFilterType]  = React.useState(null);
  const [search,      setSearch]      = React.useState('');
  const [detailId,    setDetailId]    = React.useState(null);

  if (detailId !== null) {
    return <MatchDetailView matchId={detailId} currentUser={user} onBack={() => setDetailId(null)} />;
  }

  const LEVELS     = ['Débutant','Intermédiaire','Confirmé','Avancé','Expert / Élite'];
  const DAY_LABELS = ['Demain','Après-demain','Dans 3 jours','Dans 4 jours','Dans 5 jours'];

  // Only show non-expired, non-cancelled scheduled matches + completed ones
  const now = new Date().getTime();
  const activeMatches = matches.filter(m => {
    if (m.status === 'cancelled') return false;
    if (m.status === 'completed') return false; // completed shown only in dashboard/passport
    // Hide past scheduled matches
    const slotMs = new Date(m.dateStr + 'T' + m.startTime + ':00').getTime();
    if (slotMs <= now) return false;
    // Hide private matches from non-members
    if (m.visibility === 'private' && (!user || !m.playerIds.includes(user.id))) return false;
    return true;
  });

  const filtered = activeMatches.filter(m => {
    if (filterDay   !== null && m.date !== DAY_LABELS[filterDay]) return false;
    if (filterLevel && m.level !== filterLevel) return false;
    if (filterType  && m.type  !== filterType)  return false;
    if (search && ![m.court, m.date, m.level].some(s => s.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  // BUG corrigé : on cherchait dans state.users qui peut être vide
  // pour un joueur (cf. AppStore — users n'est rempli qu'en mode admin).
  // On donne la priorité aux joueurs déjà inclus dans le DTO match.players.
  const getUser = (m, id) => {
    if (id == null) return null;
    const fromMatch = (m.players || []).find(p => p && p.id === id);
    if (fromMatch) return fromMatch;
    const fromUsers = users.find(u => u.id === id);
    if (fromUsers) return fromUsers;
    if (user && user.id === id) return user;
    return null;
  };
  const userElo = user?.elo || 0;

  const FilterPill = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{
      background: active ? C.secondary : '#fff', color: active ? '#fff' : C.textMuted,
      border:`1px solid ${active ? C.secondary : C.border}`,
      borderRadius:20, padding:'7px 14px', fontSize:12, fontWeight: active ? 700 : 500,
      cursor:'pointer', fontFamily:'inherit', transition:'all 150ms', whiteSpace:'nowrap'
    }}>{label}</button>
  );

  const activeCount = [filterDay !== null, filterLevel, filterType].filter(Boolean).length;

  return (
    <ScrollView>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 48px 64px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:32 }}>
          <div>
            <SectionLabel>Matchs ouverts</SectionLabel>
            <h1 style={{ fontSize:36, fontWeight:700, color:C.secondary, margin:'10px 0 8px', letterSpacing:'-0.5px' }}>Rejoignez un match.</h1>
            <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>Filtrez par niveau, créneau ou format. Mis à jour en temps réel.</p>
          </div>
          <BtnPrimary onClick={() => { if(!user){onNav('login');return;} onNav('create-match'); }} style={{ fontSize:13, padding:'11px 22px', flexShrink:0 }}>
            + Créer un match
          </BtnPrimary>
        </div>

        {/* Filter panel */}
        <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'16px 20px', marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ position:'relative', marginBottom:14 }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:C.textLight, fontSize:13, pointerEvents:'none' }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un terrain, un niveau..."
              style={{ width:'100%', boxSizing:'border-box', background:C.background, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px 10px 36px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginRight:4, flexShrink:0 }}>Jour</span>
              <FilterPill label="Tous" active={filterDay===null} onClick={() => setFilterDay(null)} />
              {DAY_LABELS.map((d,i) => <FilterPill key={i} label={d} active={filterDay===i} onClick={() => setFilterDay(filterDay===i?null:i)} />)}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginRight:4, flexShrink:0 }}>Niveau</span>
              <FilterPill label="Tous" active={!filterLevel} onClick={() => setFilterLevel(null)} />
              {LEVELS.map(l => <FilterPill key={l} label={l} active={filterLevel===l} onClick={() => setFilterLevel(filterLevel===l?null:l)} />)}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginRight:4, flexShrink:0 }}>Format</span>
              <FilterPill label="Tous"   active={!filterType}           onClick={() => setFilterType(null)} />
              <FilterPill label="Double" active={filterType==='Double'} onClick={() => setFilterType(filterType==='Double'?null:'Double')} />
              <FilterPill label="Simple" active={filterType==='Simple'} onClick={() => setFilterType(filterType==='Simple'?null:'Simple')} />
            </div>
          </div>
          {activeCount > 0 && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
              <button onClick={() => { setFilterDay(null); setFilterLevel(null); setFilterType(null); setSearch(''); }}
                style={{ background:'transparent', border:'none', color:'#9B3B3B', fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:'pointer', padding:0 }}>
                Réinitialiser les filtres ({activeCount})
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize:13, color:C.textMuted, marginBottom:16 }}>
          {filtered.length} match{filtered.length!==1?'s':''} disponible{filtered.length!==1?'s':''}
        </div>

        {/* Match cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(m => {
            const isFull = m.playerIds.length >= m.maxPlayers;
            const isIn   = user && m.playerIds.includes(user.id);
            const slots  = m.maxPlayers - m.playerIds.length;
            const compatible = !user || eloCompatible(userElo, m.level);
            return (
              <div key={m.id} onClick={() => setDetailId(m.id)}
                style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'20px 24px', display:'flex', alignItems:'center', gap:20, boxShadow:'0 2px 12px rgba(0,0,0,0.04)', cursor:'pointer', transition:'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor=C.primary; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor=C.border; }}>

                {/* Date pill */}
                <div style={{ width:52, height:52, borderRadius:12, background:C.secondary, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.7)', letterSpacing:0.5 }}>{m.date.slice(0,3).toUpperCase()}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#fff', marginTop:1 }}>{m.time.slice(0,5)}</span>
                </div>

                {/* Info */}
                <div style={{ flex:2 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:15, fontWeight:700, color:C.secondary }}>{m.court}</span>
                    <Chip variant="primary">{m.type}</Chip>
                    <Chip variant="default">{m.level}</Chip>
                    {isFull ? <Chip variant="danger">Complet</Chip> : <Chip variant="scheduled">Planifié</Chip>}
                    {isIn && <Chip variant="success">Inscrit</Chip>}
                    {m.visibility === 'private' && <Chip variant="private">Privé</Chip>}
                  </div>
                  <div style={{ fontSize:13, color:C.textMuted, marginBottom:8 }}>{m.date} · {m.time}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {m.playerIds.map(id => {
                      const u = getUser(m, id);
                      return u ? (
                        <div key={id} style={{ display:'flex', alignItems:'center', gap:4, background:C.surfaceAlt, borderRadius:20, padding:'3px 10px 3px 3px' }}>
                          <AvatarCircle initials={u.initials} size={20} />
                          <span style={{ fontSize:11, fontWeight:700, color:C.textMuted }}>Elo {Number(u.elo||0).toFixed(1)}</span>
                        </div>
                      ) : null;
                    })}
                    {slots > 0 && (
                      <span style={{ fontSize:11, color:C.textLight }}>{slots} place{slots>1?'s':''} libre{slots>1?'s':''}</span>
                    )}
                  </div>
                  {user && !compatible && !isIn && (
                    <div style={{ marginTop:6, fontSize:11, color:C.danger, fontWeight:600 }}>
                      Votre Elo ({userElo.toFixed(1)}) n'est pas compatible avec ce niveau
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }} onClick={e => e.stopPropagation()}>
                  {!isFull && !isIn && (
                    compatible ? (
                      <BtnPrimary onClick={() => { if(!user){onNav('login');return;} AppStore.joinMatch(user.id,m.id); }} style={{ fontSize:13, padding:'10px 18px' }}>Rejoindre</BtnPrimary>
                    ) : (
                      <div style={{ fontSize:11, color:C.textLight, textAlign:'right', maxWidth:100 }}>Niveau incompatible</div>
                    )
                  )}
                  {isIn && <Chip variant="success">Inscrit ✓</Chip>}
                  <span style={{ fontSize:11, color:C.textLight }}>Voir le détail →</span>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ background:C.surfaceAlt, borderRadius:16, padding:'48px', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>◉</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.secondary, marginBottom:8 }}>Aucun match disponible</div>
              <div style={{ fontSize:14, color:C.textMuted, marginBottom:16 }}>
                {activeCount > 0 ? 'Aucun match ne correspond à vos filtres.' : 'Aucun match ouvert pour le moment.'}
              </div>
              {activeCount > 0 && (
                <button onClick={() => { setFilterDay(null); setFilterLevel(null); setFilterType(null); setSearch(''); }}
                  style={{ background:'transparent', border:'none', color:C.primary, fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Réinitialiser les filtres
                </button>
              )}
              {!activeCount && user && (
                <BtnPrimary onClick={() => onNav('create-match')} style={{ fontSize:13, padding:'11px 22px' }}>Créer le premier match</BtnPrimary>
              )}
            </div>
          )}
        </div>
      </div>
    </ScrollView>
  );
}

Object.assign(window, { MatchListView });
