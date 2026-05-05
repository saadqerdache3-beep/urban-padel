// Urban Padel — Rating Modal
// Rate each other player in the match on 3 criteria
function RatingModal({ match, currentUserId, onClose }) {
  const C = UP_COLORS;
  const { users } = useStore();

  // Source de vérité prioritaire : match.players (DTO backend, à jour).
  // Fallback : users du store (cas admin) ou rien si non disponible.
  const getUser = id => {
    const fromMatch = (match.players || []).find(p => p && p.id === id);
    if (fromMatch) return fromMatch;
    return users.find(u => u.id === id);
  };

  const otherIds = match.playerIds.filter(id => id !== currentUserId);
  const otherUsers = otherIds.map(getUser).filter(Boolean);

  const [idx, setIdx] = React.useState(0);
  const [ratings, setRatings] = React.useState({});
  const [done, setDone] = React.useState(false);

  const current = otherUsers[idx];
  const myRating = ratings[current?.id] || { fairplay: 0, punctuality: 0, teamspirit: 0 };

  const setR = (key, val) => setRatings(r => ({ ...r, [current.id]: { ...myRating, [key]: val } }));

  const allSet = () => {
    const r = ratings[current?.id];
    return r && r.fairplay > 0 && r.punctuality > 0 && r.teamspirit > 0;
  };

  const handleNext = () => {
    if (!allSet()) return;
    const r = ratings[current.id];
    AppStore.ratePlayer(currentUserId, current.id, match.id, r.fairplay, r.punctuality, r.teamspirit);
    if (idx < otherUsers.length - 1) {
      setIdx(i => i+1);
    } else {
      setDone(true);
    }
  };

  const StarInput = ({ value, onChange }) => (
    <div style={{ display:'flex', gap:6 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          background:'none', border:'none', cursor:'pointer', padding:0,
          fontSize:28, color: n <= value ? C.gold : C.border, lineHeight:1,
          transition:'color 150ms, transform 100ms',
        }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.2)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        >★</button>
      ))}
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,43,74,0.6)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:440, boxShadow:'0 24px 64px rgba(0,0,0,0.18)', overflow:'hidden' }}>
        <div style={{ background:C.secondary, padding:'22px 28px' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>
            Évaluation · {idx+1}/{otherUsers.length}
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>Évaluez vos partenaires</div>
        </div>

        {done ? (
          <div style={{ padding:'40px 28px', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:C.primaryLight, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <span style={{ fontSize:28, color:C.primary }}>★</span>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:C.secondary, marginBottom:8 }}>Merci pour vos évaluations !</div>
            <div style={{ fontSize:14, color:C.textMuted, marginBottom:24 }}>Vos notes ont été prises en compte dans les profils des joueurs.</div>
            <BtnPrimary onClick={onClose} style={{ width:'100%', padding:'13px' }}>Fermer</BtnPrimary>
          </div>
        ) : current ? (
          <div style={{ padding:'24px 28px' }}>
            {/* Player */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, padding:'16px', background:C.surfaceAlt, borderRadius:12 }}>
              <AvatarCircle initials={current.initials} size={52} />
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:C.secondary }}>{current.name}</div>
                <EloBadge elo={current.elo.toFixed(1)} small />
              </div>
            </div>

            {/* Criteria */}
            {[['fairplay','Fair-play','Respect des règles et de l\'adversaire'],
              ['punctuality','Ponctualité','Arrivée à l\'heure, prêt à jouer'],
              ['teamspirit','Esprit d\'équipe','Communication, soutien, attitude']].map(([key, label, desc]) => (
              <div key={key} style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.secondary, marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:11, color:C.textMuted, marginBottom:8 }}>{desc}</div>
                <StarInput value={myRating[key]} onChange={v => setR(key, v)} />
              </div>
            ))}

            {!allSet() && (
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:12 }}>Évaluez les 3 critères pour continuer.</div>
            )}

            <div style={{ display:'flex', gap:12, marginTop:4 }}>
              <button onClick={onClose} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 16px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Passer</button>
              <BtnPrimary onClick={handleNext} disabled={!allSet()} style={{ flex:1, padding:'12px', fontSize:14 }}>
                {idx < otherUsers.length - 1 ? 'Joueur suivant →' : 'Terminer les évaluations'}
              </BtnPrimary>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

Object.assign(window, { RatingModal });
