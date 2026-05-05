// Urban Padel — Score Entry Modal
function ScoreModal({ match, onSubmit, onClose }) {
  const C = UP_COLORS;
  const [sets, setSets] = React.useState([
    { t1: '', t2: '' },
    { t1: '', t2: '' },
  ]);
  const [error, setError] = React.useState('');

  const t1wins = sets.filter(s => Number(s.t1) > Number(s.t2) && s.t1 !== '' && s.t2 !== '').length;
  const t2wins = sets.filter(s => Number(s.t2) > Number(s.t1) && s.t1 !== '' && s.t2 !== '').length;
  const needsDecider = t1wins === 1 && t2wins === 1;
  const visibleSets = needsDecider ? 3 : 2;

  const setScore = (i, team, val) => {
    const next = sets.map((s, idx) => idx === i ? { ...s, [team]: val.replace(/\D/,'') } : s);
    if (i < 2) {
      // reset set 3 if sets 1&2 change
      next[2] = { t1: '', t2: '' };
    }
    setSets(next);
    setError('');
  };

  const validate = () => {
    const active = sets.slice(0, visibleSets);
    for (let i = 0; i < active.length; i++) {
      const { t1, t2 } = active[i];
      if (t1 === '' || t2 === '') return `Entrez le score du set ${i + 1}.`;
      const a = Number(t1), b = Number(t2);
      if (a === b) return `Set ${i + 1} : pas d'égalité possible.`;
      if (i < 2) {
        // normal set: winner must reach 6 (or 7 for tiebreak)
        const winner = Math.max(a, b), loser = Math.min(a, b);
        if (winner < 6) return `Set ${i + 1} : le vainqueur doit atteindre au moins 6.`;
        if (winner === 6 && loser > 4) return `Set ${i + 1} : score invalide (6-${loser}).`;
        if (winner === 7 && loser !== 5 && loser !== 6) return `Set ${i + 1} : 7 n'est valide qu'en 7-5 ou 7-6.`;
        if (winner > 7) return `Set ${i + 1} : score invalide.`;
      }
    }
    const finalSets = active.map(s => ({ t1: Number(s.t1), t2: Number(s.t2) }));
    const fw = finalSets.filter(s => s.t1 > s.t2).length;
    const lw = finalSets.filter(s => s.t2 > s.t1).length;
    if (fw === lw) return 'Il doit y avoir un vainqueur.';
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { setError(err); return; }
    const active = sets.slice(0, visibleSets).map(s => ({ t1: Number(s.t1), t2: Number(s.t2) }));
    onSubmit(active);
  };

  const team1 = match.playerIds.slice(0, Math.floor(match.playerIds.length / 2));
  const team2 = match.playerIds.slice(Math.floor(match.playerIds.length / 2));
  const { users } = useStore();
  // Cherche d'abord dans le match (toujours peuplé par le backend),
  // puis dans la liste users (admin uniquement).
  const getName = id => {
    const fromMatch = (match.players || []).find(p => p && p.id === id);
    const u = fromMatch || users.find(x => x.id === id);
    return (u?.name || u?.full_name || '').split(' ')[0] || `J${id}`;
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,43,74,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480, boxShadow:'0 24px 64px rgba(0,0,0,0.18)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:C.secondary, padding:'24px 28px' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>Saisir le résultat</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{match.court}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginTop:4 }}>{match.date} · {match.time}</div>
        </div>

        <div style={{ padding:'24px 28px' }}>
          {/* Teams legend */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', marginBottom:24 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:6 }}>Équipe 1</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.secondary }}>{team1.map(getName).join(' / ')}</div>
            </div>
            <div style={{ fontSize:18, color:C.border, fontWeight:700 }}>vs</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:6 }}>Équipe 2</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.secondary }}>{team2.map(getName).join(' / ')}</div>
            </div>
          </div>

          {/* Sets */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[0,1,2].slice(0, visibleSets).map(i => (
              <div key={i} style={{ background: i===2 ? C.primaryLight : C.surfaceAlt, borderRadius:12, padding:'16px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color: i===2 ? C.primary : C.textMuted, textTransform:'uppercase', marginBottom:12 }}>
                  {i < 2 ? `Set ${i+1}` : 'Set décisif'}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 32px 1fr', gap:8, alignItems:'center' }}>
                  <input value={sets[i].t1} onChange={e => setScore(i,'t1',e.target.value)} placeholder="0"
                    style={{ textAlign:'center', fontSize:28, fontWeight:700, color:C.secondary, background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }} />
                  <div style={{ textAlign:'center', fontSize:16, color:C.border, fontWeight:700 }}>—</div>
                  <input value={sets[i].t2} onChange={e => setScore(i,'t2',e.target.value)} placeholder="0"
                    style={{ textAlign:'center', fontSize:28, fontWeight:700, color:C.secondary, background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }} />
                </div>
              </div>
            ))}
          </div>

          {needsDecider && (
            <div style={{ marginTop:8, fontSize:12, color:C.primary, fontWeight:600 }}>
              ↳ 1 set partout — saisissez le set décisif
            </div>
          )}

          {error && (
            <div style={{ background:'#F4ECEC', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#9B3B3B', marginTop:12 }}>{error}</div>
          )}

          <div style={{ display:'flex', gap:12, marginTop:20 }}>
            <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:14, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Annuler</button>
            <BtnPrimary onClick={handleSubmit} style={{ flex:2, padding:'12px', fontSize:14 }}>Valider le résultat</BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScoreModal });
