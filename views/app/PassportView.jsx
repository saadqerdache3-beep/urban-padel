// Urban Padel — Passport View — Responsive
function PassportView({ user, onNav }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const px = isMobile ? '16px' : '48px';
  const { users, matches, currentUser } = useStore();
  const [viewProfile, setViewProfile] = React.useState(null);

  if (!user) return (
    <div style={{ minHeight:'calc(100vh - 76px)', background:C.background, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:C.primaryLight, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:28, color:C.primary }}>★</span>
      </div>
      <h2 style={{ fontSize:22, fontWeight:700, color:C.secondary, margin:0 }}>Connectez-vous pour voir votre Passport</h2>
      <TextMuted>Votre profil joueur, score Elo et historique sont accessibles après connexion.</TextMuted>
      <BtnPrimary onClick={() => onNav('login')} style={{ marginTop:8 }}>Se connecter</BtnPrimary>
    </div>
  );

  // Priorité au currentUser du store (rafraîchi après chaque match/notation)
  // → la page Passport reflète immédiatement les changements d'Elo,
  //   de stats et de réputation, sans nécessiter un refresh manuel.
  const me = (currentUser && currentUser.id === user.id)
    ? currentUser
    : users.find(u => u.id === user.id) || user;
  const elo = me.elo || 4.2;
  const cat = elo < 2.5?'Débutant':elo < 4.0?'Intermédiaire':elo < 5.5?'Confirmé':elo < 7.0?'Avancé':elo < 8.5?'Expert':'Élite';
  const eloRatio = (elo - 1) / 9;
  const stats = me.stats || { played:0, wins:0, losses:0 };
  const ratings = me.ratings || { fairplay:0, punctuality:0, teamspirit:0, count:0 };
  const winRate = stats.played > 0 ? Math.round(stats.wins/stats.played*100) : 0;

  // Historique COMPLET du joueur : matchs planifiés (à venir), terminés (avec
  // ou sans score), et annulés. Avant on filtrait sur completed && sets.length>0
  // ce qui masquait les matchs créés/animés tant que le score n'était pas saisi.
  const history = matches
    .filter(m => m.playerIds.includes(user.id))
    .slice()
    .sort((a, b) => new Date(b.slotISO).getTime() - new Date(a.slotISO).getTime())
    .map(m => {
      const hasScore = m.status === 'completed' && Array.isArray(m.sets) && m.sets.length > 0;
      let won = false, eloChange = '—';
      if (hasScore) {
        const half = Math.floor(m.playerIds.length / 2);
        const t1 = m.playerIds.slice(0, half);
        const t1w = m.sets.filter(s => s.t1 > s.t2).length;
        const t2w = m.sets.filter(s => s.t2 > s.t1).length;
        won = t1.includes(user.id) ? t1w > t2w : t2w > t1w;
        eloChange = won ? '+0.15' : '−0.10';
      }
      return {
        id: m.id,
        date: m.date,
        time: m.startTime,
        status: m.status,
        slotInPast: m.slotInPast,
        hasScore,
        won,
        sets: m.sets || [],
        court: m.court,
        eloChange,
        playerCount: m.playerIds.length,
        maxPlayers: m.maxPlayers,
        isCreator: m.createdBy === user.id,
      };
    });

  return (
    <ScrollView>
      {/* Hero */}
      <div style={{ background:C.secondary }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding: isMobile ? '24px 16px 16px' : '48px 48px 36px' }}>
          <div style={{ display:'flex', gap: isMobile ? 14 : 24, alignItems:'center' }}>
            <AvatarCircle initials={me.initials || user.initials} size={isMobile ? 52 : 88} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>Padel Passport</div>
              <h1 style={{ fontSize: isMobile ? 20 : 34, fontWeight:700, color:'#fff', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{me.name || me.full_name}</h1>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:10 }}>{me.email}</div>
              <div style={{ display:'flex', gap:8 }}>
                <Chip variant="primary">{cat}</Chip>
                <Chip variant="dark">Public</Chip>
              </div>
            </div>
            {!isMobile && (
              <div style={{ display:'flex', gap:32, paddingLeft:32, borderLeft:'1px solid rgba(255,255,255,0.1)' }}>
                {[[stats.played,'Matchs'],[stats.wins,'Victoires'],[`${winRate}%`,'Win rate']].map(([v,l]) => (
                  <div key={l} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:28, fontWeight:700, color:'#fff', lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:5 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isMobile && (
            <div style={{ display:'flex', gap:0, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
              {[[stats.played,'Matchs'],[stats.wins,'Victoires'],[`${winRate}%`,'Win rate']].map(([v,l],i) => (
                <div key={l} style={{ flex:1, textAlign:'center', borderRight:i<2?'1px solid rgba(255,255,255,0.08)':'none', paddingBottom:4 }}>
                  <div style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding: isMobile ? '16px 16px 40px' : '28px 48px 64px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Elo + Réputation */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
          {/* Elo */}
          <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'24px 28px', boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <SectionLabel>Score Elo</SectionLabel>
              <span style={{ fontSize:12, fontWeight:700, color:'#3D7A5F', background:'#EDF4F0', padding:'3px 10px', borderRadius:8 }}>+0.42 ce mois</span>
            </div>
            <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:18 }}>
              <div style={{ background:C.secondary, borderRadius:12, padding:'14px 20px' }}>
                <span style={{ fontSize:28, fontWeight:700, color:'#fff' }}>{Number(elo).toFixed(1)}</span>
              </div>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:C.secondary }}>{cat}</div>
                <div style={{ fontSize:12, color:C.textMuted }}>Échelle 1.0 — 10.0</div>
              </div>
            </div>
            <div style={{ position:'relative', height:10, borderRadius:5, background:C.surfaceAlt, overflow:'hidden', marginBottom:4 }}>
              <div style={{ position:'absolute', inset:0, background:`linear-gradient(to right, ${C.border}, ${C.primaryLight}, ${C.primary})`, borderRadius:5 }} />
            </div>
            <div style={{ position:'relative', height:20, marginTop:-2 }}>
              <div style={{ position:'absolute', width:18, height:18, borderRadius:'50%', background:C.secondary, border:'2px solid white', boxShadow:'0 2px 6px rgba(0,0,0,0.2)', top:0, left:`${eloRatio*100}%`, transform:'translateX(-50%)' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.textLight, marginTop:8 }}>
              <span>1.0 Débutant</span><span>10.0 Élite</span>
            </div>
          </div>

          {/* Réputation */}
          <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'24px 28px', boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <SectionLabel>Réputation</SectionLabel>
              <span style={{ fontSize:12, color:C.textMuted }}>{ratings.count} évaluations</span>
            </div>
            {ratings.count === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <TextMuted>Aucune évaluation pour l'instant.</TextMuted>
                <div style={{ fontSize:12, color:C.textLight, marginTop:6 }}>Jouez des matchs pour recevoir des évaluations.</div>
              </div>
            ) : (
              [['fairplay','Fair-play',ratings.fairplay],['punctuality','Ponctualité',ratings.punctuality],['teamspirit',"Esprit d'équipe",ratings.teamspirit]].map(([k,label,val]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:C.secondary }}>{Number(val).toFixed(1)}<span style={{ fontSize:11, color:C.textMuted }}>/5</span></span>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:C.surfaceAlt }}>
                    <div style={{ height:'100%', borderRadius:3, background:C.primary, width:`${val/5*100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
          {[[stats.played,'Matchs joués'],[stats.wins,'Victoires'],[stats.losses,'Défaites'],[`${winRate}%`,'Taux de victoire']].map(([v,l]) => (
            <div key={l} style={{ background:'#fff', borderRadius:14, border:`1px solid ${C.border}`, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:28, fontWeight:700, color:C.primary, lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginTop:6 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Match history */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:12 }}>Historique des matchs</div>
          {history.length === 0 ? (
            <div style={{ background:C.surfaceAlt, borderRadius:14, padding:'32px', textAlign:'center' }}>
              <div style={{ fontSize:13, color:C.textMuted, marginBottom:8 }}>Aucun match pour l'instant.</div>
              <div style={{ fontSize:12, color:C.textLight }}>Créez ou rejoignez un match pour démarrer votre passport.</div>
              <div style={{ marginTop:14 }}><BtnGhost primary onClick={() => onNav('matches')}>Trouver un match</BtnGhost></div>
            </div>
          ) : (
            <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }}>
              {history.map((h, i) => {
                // Badge de statut du match
                let badge;
                if (h.status === 'cancelled') {
                  badge = <Chip variant="danger">Annulé</Chip>;
                } else if (h.hasScore) {
                  badge = <Chip variant={h.won ? 'success' : 'danger'}>{h.won ? 'Victoire' : 'Défaite'}</Chip>;
                } else if (h.status === 'completed') {
                  badge = <Chip variant="warning">Score à saisir</Chip>;
                } else if (h.slotInPast) {
                  badge = <Chip variant="warning">À évaluer</Chip>;
                } else {
                  badge = <Chip variant="scheduled">Planifié</Chip>;
                }

                return (
                  <div key={h.id || i} style={{ display:'flex', alignItems:'center', padding:'14px 24px', borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : 'none', gap:14, opacity: h.status === 'cancelled' ? 0.55 : 1 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:C.secondary, flex:1 }}>{h.court} · {h.date}{h.time ? ' · ' + h.time : ''}{h.isCreator ? ' · Créé par vous' : ''}</span>
                    {badge}
                    {h.hasScore && (
                      <span style={{ fontSize:13, fontWeight:700, color: h.won ? '#3D7A5F' : '#9B3B3B', minWidth:70, textAlign:'right' }}>{h.eloChange} Elo</span>
                    )}
                    {h.hasScore ? (
                      <div style={{ display:'flex', gap:6 }}>
                        {h.sets.map((s, j) => (
                          <span key={j} style={{ fontSize:12, fontWeight:700, color:C.secondary, background:C.surfaceAlt, borderRadius:5, padding:'2px 6px' }}>{s.t1}–{s.t2}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize:12, color:C.textLight, minWidth:90, textAlign:'right' }}>{h.playerCount}/{h.maxPlayers} joueurs</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      {viewProfile && <PlayerProfileView userId={viewProfile} onClose={() => setViewProfile(null)} />}
    </ScrollView>
  );
}

Object.assign(window, { PassportView });
