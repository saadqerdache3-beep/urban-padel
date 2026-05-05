// Urban Padel — Match Detail View v3
// - ELO enforcement on join
// - Share link display
// - Correct court names

function MatchDetailView({ matchId, currentUser, onBack }) {
  const C = UP_COLORS;
  const { matches, users } = useStore();
  const match = matches.find(m => m.id === matchId);

  const [showScore,   setShowScore]   = React.useState(false);
  const [showRating,  setShowRating]  = React.useState(false);
  const [viewProfile, setViewProfile] = React.useState(null);
  const [joinError,   setJoinError]   = React.useState('');
  const [copied,      setCopied]      = React.useState(false);

  if (!match) return null;

  const uid      = currentUser?.id;
  const isPlayer = uid && match.playerIds.includes(uid);
  const isFull   = (typeof match.isFull === 'boolean')
                   ? match.isFull
                   : (match.playerIds.length >= match.maxPlayers);
  const isDone   = match.status === 'completed';
  const hasResult= match.sets.length > 0;
  // ── Règles d'autorisation pour les actions de fin de match ────────────
  // (1) Saisie du résultat : autorisée UNIQUEMENT quand
  //       - je suis joueur du match
  //       - le match est COMPLET (tous les joueurs sont là)
  //       - le créneau est PASSÉ (le match a eu lieu)
  //       - le statut est encore 'scheduled' et aucun score n'a été saisi
  //     Avant : on autorisait dès `isPlayer && !hasResult`, ce qui permettait
  //     de saisir un score sur un match incomplet ou à venir → corrigé.
  const slotPast  = !!match.slotInPast
                    || (new Date(match.dateStr+'T'+match.startTime+':00').getTime() <= Date.now());
  const canResult = isPlayer && !hasResult && isFull && slotPast
                    && match.status === 'scheduled';
  // (2) Évaluation des partenaires : possible APRÈS la saisie du résultat,
  //     une seule fois par joueur (cf. ratedBy).
  const alreadyRated = Array.isArray(match.ratedBy) && match.ratedBy.includes(uid);
  const canRate   = isDone && hasResult && isPlayer && !alreadyRated
                    && match.playerIds.filter(id => id !== uid).length > 0;

  const userElo  = currentUser?.elo || 0;
  const compatible = !currentUser || eloCompatible(userElo, match.level);

  const half   = Math.floor(match.maxPlayers / 2);
  const team1  = match.playerIds.slice(0, half);
  const team2  = match.playerIds.slice(half);
  const t1wins = match.sets.filter(s => s.t1 > s.t2).length;
  const t2wins = match.sets.filter(s => s.t2 > s.t1).length;
  const team1Won = t1wins > t2wins;

  // ── Lookup d'utilisateur — robuste ────────────────────────
  // BUG corrigé : auparavant on cherchait uniquement dans state.users,
  // mais cette liste n'est peuplée QUE lorsqu'on est admin (via /admin/users).
  // Pour un joueur normal, state.users est vide → après avoir rejoint un
  // match, son propre profil n'apparaissait pas dans la grille.
  //
  // Nouvelle stratégie de fallback :
  //   1) match.players (déjà inclus dans le DTO du backend, à jour)
  //   2) state.users (cas admin)
  //   3) currentUser (au moins pour soi-même, même si rien n'est chargé)
  const getUser = id => {
    if (id == null) return null;
    const fromMatch = (match.players || []).find(p => p && p.id === id);
    if (fromMatch) return fromMatch;
    const fromUsers = users.find(u => u.id === id);
    if (fromUsers) return fromUsers;
    if (currentUser && currentUser.id === id) return currentUser;
    return null;
  };

  const handleJoin = async () => {
    if (!currentUser) { setJoinError('Connectez-vous pour rejoindre un match.'); return; }
    const res = await AppStore.joinMatch(uid, match.id);
    if (!res.ok) setJoinError(res.error || 'Impossible de rejoindre ce match.');
    else setJoinError('');
  };

  const handleLeave = async () => {
    if (window.confirm('Quitter ce match ?')) await AppStore.leaveMatch(uid, match.id);
  };

  const handleResult = async (sets) => {
    await AppStore.submitResult(match.id, sets);
    setShowScore(false);
    setShowRating(true);
  };

  const handleCopy = () => {
    if (match.shareLink) {
      navigator.clipboard?.writeText(match.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const PlayerCell = ({ playerId, teamWon }) => {
    const u = playerId ? getUser(playerId) : null;
    const isMe = playerId === uid;
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px', position:'relative', cursor: u ? 'pointer' : 'default' }}
        onClick={() => u && !isMe && setViewProfile(u.id)}>
        {teamWon && hasResult && (
          <div style={{ position:'absolute', top:10, right:10, background:C.primary, borderRadius:6, padding:'3px 8px', fontSize:9, fontWeight:700, color:'#fff', letterSpacing:1 }}>VAINQUEUR</div>
        )}
        {isMe && (
          <div style={{ position:'absolute', top:10, left:10, background:C.primaryLight, borderRadius:6, padding:'3px 8px', fontSize:9, fontWeight:700, color:C.primary }}>MOI</div>
        )}
        {u ? (
          <>
            <AvatarCircle initials={u.initials} size={64} />
            <div style={{ fontSize:15, fontWeight:700, color:C.secondary, marginTop:12, marginBottom:4 }}>{u.name}</div>
            <EloBadge elo={u.elo.toFixed(1)} small />
            {!isMe && (
              <button style={{ marginTop:8, background:'transparent', border:'none', color:C.primary, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Voir le profil →
              </button>
            )}
          </>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}
            onClick={e => { e.stopPropagation(); !isPlayer && !isFull && !isDone && handleJoin(); }}>
            <div style={{ width:64, height:64, borderRadius:'50%', border:`2px dashed ${!isPlayer && !isFull && !isDone && compatible ? C.primary : C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor: !isPlayer && !isFull && !isDone ? 'pointer' : 'default' }}>
              <span style={{ fontSize:22, color: !isPlayer && !isFull && !isDone && compatible ? C.primary : C.border }}>+</span>
            </div>
            <div style={{ fontSize:13, color:C.textLight, fontWeight:500 }}>
              {isDone ? 'Place vide' : isFull ? 'Complet' : 'Rejoindre'}
            </div>
            {!isPlayer && !isFull && !isDone && (
              <div style={{ fontSize:12, color:C.textMuted }}>{match.pricePlayer} MAD</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const t1Slots = Array.from({ length: half }, (_, i) => team1[i] || null);
  const t2Slots = Array.from({ length: half }, (_, i) => team2[i] || null);

  return (
    <ScrollView>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'48px 40px 64px' }}>

        <BtnGhost onClick={onBack} style={{ padding:'6px 0', marginBottom:24 }}>← Retour aux matchs</BtnGhost>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <SectionLabel>Détail du match</SectionLabel>
          <h1 style={{ fontSize:30, fontWeight:700, color:C.secondary, margin:'10px 0 8px', letterSpacing:'-0.5px' }}>{match.court}</h1>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <Chip variant="primary">{match.type}</Chip>
            <Chip variant="default">{match.level}</Chip>
            <Chip variant={isDone ? 'warning' : 'scheduled'}>{isDone ? 'Terminé' : 'Planifié'}</Chip>
            {match.visibility === 'private' && <Chip variant="private">🔒 Privé</Chip>}
            <span style={{ fontSize:13, color:C.textMuted }}>{match.date} · {match.time}</span>
          </div>
        </div>

        {/* Share link */}
        {match.shareLink && !isDone && (
          <div style={{ background:C.primaryLight, borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.primary, textTransform:'uppercase', marginBottom:4 }}>Lien d'invitation</div>
              <div style={{ fontSize:12, color:C.secondary, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{match.shareLink}</div>
            </div>
            <button onClick={handleCopy}
              style={{ background: copied ? '#3D7A5F' : C.primary, border:'none', borderRadius:8, color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'background 200ms', flexShrink:0 }}>
              {copied ? '✓ Copié' : 'Copier le lien'}
            </button>
          </div>
        )}

        {/* ELO warning */}
        {!isPlayer && !isDone && !isFull && currentUser && !compatible && (
          <div style={{ background:'#F4ECEC', borderRadius:12, padding:'14px 18px', marginBottom:20, fontSize:13, color:'#9B3B3B', fontWeight:600 }}>
            Votre score Elo ({userElo.toFixed(1)}) n'est pas compatible avec ce match ({match.level}).
          </div>
        )}

        {/* Join error */}
        {joinError && (
          <div style={{ background:'#F4ECEC', borderRadius:12, padding:'14px 18px', marginBottom:20, fontSize:13, color:'#9B3B3B' }}>
            {joinError}
          </div>
        )}

        {/* Score banner */}
        {hasResult && (
          <div style={{ background:C.secondary, borderRadius:16, padding:'18px 28px', marginBottom:20, display:'flex', alignItems:'center', gap:28 }}>
            <div style={{ flex:1, textAlign:'right' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:team1Won?C.primary:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginBottom:3 }}>{team1Won?'★ Vainqueurs':''}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>Équipe 1</div>
            </div>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              {match.sets.map((s,i) => (
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginBottom:4 }}>
                    {i<2?`Set ${i+1}`:'Décisif'}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:28, fontWeight:700, color:s.t1>s.t2?'#fff':'rgba(255,255,255,0.3)', lineHeight:1 }}>{s.t1}</span>
                    <span style={{ fontSize:14, color:'rgba(255,255,255,0.2)' }}>—</span>
                    <span style={{ fontSize:28, fontWeight:700, color:s.t2>s.t1?'#fff':'rgba(255,255,255,0.3)', lineHeight:1 }}>{s.t2}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:!team1Won?C.primary:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginBottom:3 }}>{!team1Won?'★ Vainqueurs':''}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>Équipe 2</div>
            </div>
          </div>
        )}

        {/* Court grid */}
        <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.07)', marginBottom:20 }}>
          <div style={{ display:'flex', borderBottom:`2px solid ${C.border}`, background:hasResult&&team1Won?'#FAFCFF':'#fff' }}>
            <div style={{ width:72, display:'flex', alignItems:'center', justifyContent:'center', borderRight:`1px solid ${C.border}`, padding:'12px 0', flexShrink:0 }}>
              <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontSize:10, fontWeight:700, letterSpacing:2, color:hasResult&&team1Won?C.primary:C.textMuted, textTransform:'uppercase' }}>Équipe 1</div>
            </div>
            {t1Slots.map((pid,i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width:1, background:C.border }} />}
                <PlayerCell playerId={pid} teamWon={hasResult && team1Won} />
              </React.Fragment>
            ))}
          </div>
          <div style={{ display:'flex', background:hasResult&&!team1Won?'#FAFCFF':'#fff' }}>
            <div style={{ width:72, display:'flex', alignItems:'center', justifyContent:'center', borderRight:`1px solid ${C.border}`, padding:'12px 0', flexShrink:0 }}>
              <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontSize:10, fontWeight:700, letterSpacing:2, color:hasResult&&!team1Won?C.primary:C.textMuted, textTransform:'uppercase' }}>Équipe 2</div>
            </div>
            {t2Slots.map((pid,i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width:1, background:C.border }} />}
                <PlayerCell playerId={pid} teamWon={hasResult && !team1Won} />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Info row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[['Terrain',match.court],['Horaire',match.time],['Niveau',match.level]].map(([k,v]) => (
            <div key={k} style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 18px' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:4 }}>{k}</div>
              <div style={{ fontSize:14, fontWeight:600, color:C.secondary }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Note */}
        {match.note && (
          <div style={{ background:C.surfaceAlt, borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:4 }}>Message de l'organisateur</div>
            <div style={{ fontSize:13, color:C.text }}>{match.note}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {!isDone && !isPlayer && !isFull && compatible && (
            <BtnPrimary onClick={handleJoin} style={{ flex:1, padding:'14px', fontSize:14 }}>Rejoindre ce match</BtnPrimary>
          )}
          {!isDone && !isPlayer && !isFull && !compatible && currentUser && (
            <div style={{ flex:1, padding:'13px', textAlign:'center', fontSize:13, color:C.textMuted, background:C.surfaceAlt, borderRadius:10 }}>
              Niveau Elo incompatible
            </div>
          )}
          {!isDone && isPlayer && (
            <button onClick={handleLeave} style={{ flex:1, padding:'13px', fontSize:14, fontWeight:700, color:'#9B3B3B', background:'#F4ECEC', border:'none', borderRadius:10, cursor:'pointer', fontFamily:'inherit' }}>
              Quitter le match
            </button>
          )}
          {canResult && (
            <BtnSecondary onClick={() => setShowScore(true)} style={{ flex:1, padding:'13px', fontSize:14 }}>
              Saisir le résultat
            </BtnSecondary>
          )}
          {/* Indicateurs explicatifs : pourquoi je ne peux pas (encore) saisir le score */}
          {!isDone && !hasResult && isPlayer && !canResult && match.status === 'scheduled' && (
            <div style={{ flex:1, padding:'13px', textAlign:'center', fontSize:13, color:C.textMuted, background:C.surfaceAlt, borderRadius:10 }}>
              {!isFull
                ? `Le match doit être complet (${match.playerIds.length}/${match.maxPlayers}) avant de saisir le score`
                : !slotPast
                  ? 'La saisie du score sera disponible après le créneau'
                  : 'Saisie du score indisponible'}
            </div>
          )}
          {canRate && (
            <BtnOutline onClick={() => setShowRating(true)} style={{ flex:1, padding:'12px', fontSize:14 }}>
              Évaluer les joueurs ★
            </BtnOutline>
          )}
          {isDone && alreadyRated && (
            <div style={{ flex:1, padding:'13px', textAlign:'center', fontSize:13, color:C.textMuted, background:C.surfaceAlt, borderRadius:10 }}>
              ✓ Vous avez évalué ce match
            </div>
          )}
        </div>

        {showScore   && <ScoreModal  match={match} onSubmit={handleResult} onClose={() => setShowScore(false)} />}
        {showRating  && <RatingModal match={match} currentUserId={uid} onClose={() => setShowRating(false)} />}
        {viewProfile !== null && <PlayerProfileView userId={viewProfile} onClose={() => setViewProfile(null)} matchId={match.id} />}
      </div>
    </ScrollView>
  );
}

Object.assign(window, { MatchDetailView });
