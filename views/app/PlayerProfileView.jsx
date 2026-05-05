// Urban Padel — Player Profile View (public overlay)
function PlayerProfileView({ userId, onClose, onRate, matchId }) {
  const C = UP_COLORS;
  const { users, matches } = useStore();
  const [fetched, setFetched] = React.useState(null);

  // 1) Cherche dans le store (cas admin)
  let u = users.find(x => x.id === userId);

  // 2) Sinon, cherche dans les matchs déjà chargés (DTO match.players)
  if (!u) {
    for (const m of matches) {
      const p = (m.players || []).find(p => p && p.id === userId);
      if (p) { u = p; break; }
    }
  }

  // 3) Sinon, on récupère le profil public via l'API
  React.useEffect(() => {
    if (u) return; // déjà disponible
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('up_token')||''}` }
        });
        const data = await res.json();
        if (!cancelled && data?.ok && data?.user) setFetched(data.user);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [userId, u]);

  const target = u || fetched;
  if (!target) return null;
  // Normalisation : selon la source (store / match.players / API publique),
  // les champs varient — on harmonise pour le rendu.
  const name     = target.name || target.full_name || '—';
  const initials = target.initials || '?';
  const elo      = Number(target.elo || 0);
  const stats    = target.stats || { played:0, wins:0, losses:0 };
  const ratings  = target.ratings || { fairplay:0, punctuality:0, teamspirit:0, count:0 };
  const email    = target.email || ''; // peut être absent en mode public

  const cat = e => e < 2.5 ? 'Débutant' : e < 4.0 ? 'Intermédiaire' : e < 5.5 ? 'Confirmé' : e < 7.0 ? 'Avancé' : e < 8.5 ? 'Expert' : 'Élite';
  const winRate = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;

  // Match history for this user — on inclut tous ses matchs (pas seulement
  // les complétés avec score), pour que les matchs créés/animés à venir
  // apparaissent aussi quand on consulte le profil d'un autre joueur.
  const history = matches
    .filter(m => m.playerIds && m.playerIds.includes(userId))
    .slice()
    .sort((a, b) => new Date(b.slotISO).getTime() - new Date(a.slotISO).getTime())
    .slice(0, 5)
    .map(m => {
      const hasScore = m.status === 'completed' && Array.isArray(m.sets) && m.sets.length > 0;
      let won = false;
      if (hasScore) {
        const half = Math.floor(m.playerIds.length / 2);
        const t1 = m.playerIds.slice(0, half);
        const t1w = m.sets.filter(s => s.t1 > s.t2).length;
        const t2w = m.sets.filter(s => s.t2 > s.t1).length;
        const isT1 = t1.includes(userId);
        won = isT1 ? t1w > t2w : t2w > t1w;
      }
      return {
        date: m.date,
        status: m.status,
        slotInPast: m.slotInPast,
        hasScore,
        won,
        sets: m.sets || [],
        court: m.court,
      };
    });

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,43,74,0.55)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:C.secondary, padding:'28px 28px 24px', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, color:'#fff', fontSize:16, cursor:'pointer', padding:'6px 10px', lineHeight:1 }}>✕</button>
          <div style={{ display:'flex', gap:18, alignItems:'center' }}>
            <AvatarCircle initials={initials} size={72} />
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>Profil joueur</div>
              <div style={{ fontSize:26, fontWeight:700, color:'#fff', letterSpacing:'-0.3px' }}>{name}</div>
              {email && <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{email}</div>}
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <Chip variant="primary">{cat(elo)}</Chip>
                <span style={{ background:C.secondary, border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'4px 10px', fontSize:11, fontWeight:700, color:'#fff' }}>Elo {elo.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              [stats.played, 'Matchs'],
              [stats.wins, 'Victoires'],
              [`${winRate}%`, 'Win rate'],
            ].map(([v,l]) => (
              <div key={l} style={{ background:C.surfaceAlt, borderRadius:12, padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:700, color:C.primary }}>{v}</div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Reputation */}
          <div style={{ background:'#fff', borderRadius:14, border:`1px solid ${C.border}`, padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase' }}>Réputation</span>
              <span style={{ fontSize:12, color:C.textMuted }}>{ratings.count || 0} évaluations</span>
            </div>
            {[['fairplay','Fair-play',ratings.fairplay],
              ['punctuality','Ponctualité',ratings.punctuality],
              ['teamspirit',"Esprit d'équipe",ratings.teamspirit]].map(([k,label,val]) => (
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.secondary }}>{Number(val||0).toFixed(1)}<span style={{ fontSize:11, color:C.textMuted, fontWeight:400 }}>/5</span></span>
                </div>
                <div style={{ height:6, borderRadius:3, background:C.surfaceAlt }}>
                  <div style={{ height:'100%', borderRadius:3, background:C.primary, width:`${(val||0)/5*100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recent history */}
          {history.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:10 }}>Derniers matchs</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {history.map((h, i) => {
                  let badge;
                  if (h.status === 'cancelled') badge = <Chip variant="danger">Annulé</Chip>;
                  else if (h.hasScore) badge = <Chip variant={h.won ? 'success' : 'danger'}>{h.won ? 'Victoire' : 'Défaite'}</Chip>;
                  else if (h.status === 'completed') badge = <Chip variant="warning">Score à saisir</Chip>;
                  else if (h.slotInPast) badge = <Chip variant="warning">Terminé</Chip>;
                  else badge = <Chip variant="scheduled">Planifié</Chip>;
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:C.surfaceAlt, borderRadius:10, opacity: h.status === 'cancelled' ? 0.55 : 1 }}>
                      {badge}
                      <span style={{ flex:1, fontSize:12, color:C.textMuted }}>{h.court} · {h.date}</span>
                      {h.hasScore && (
                        <span style={{ fontSize:13, fontWeight:700, color:C.secondary }}>{h.sets.map(s => `${s.t1}–${s.t2}`).join('  ')}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rate button if in same match */}
          {onRate && (
            <BtnPrimary onClick={onRate} style={{ width:'100%', padding:'13px', fontSize:14 }}>
              Évaluer {name.split(' ')[0]}
            </BtnPrimary>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlayerProfileView });
