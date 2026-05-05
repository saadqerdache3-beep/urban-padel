// Urban Padel — Admin Matchs v3 — payment KPIs cohérents + édition + nouveau match
function AdminMatchesPanel() {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const { matches, users, currentUser } = useStore();
  const [search, setSearch]             = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterType,   setFilterType]   = React.useState('');
  const [filterLevel,  setFilterLevel]  = React.useState('');
  const [detailMatch,  setDetailMatch]  = React.useState(null);
  const [editMatch,    setEditMatch]    = React.useState(null); // forme { ...match }
  const [createOpen,   setCreateOpen]   = React.useState(false);
  const [busy,         setBusy]         = React.useState(false);
  const [feedback,     setFeedback]     = React.useState(null);

  const getUser = id => users.find(u => u.id === id);
  const LEVELS  = ['Tous niveaux','Débutant','Intermédiaire','Confirmé','Avancé','Expert / Élite'];

  const filtered = matches.filter(m => {
    if (m.status === 'cancelled') return false;
    if (filterStatus && m.status !== filterStatus) return false;
    if (filterType   && m.type   !== filterType)   return false;
    if (filterLevel  && m.level  !== filterLevel)  return false;
    if (search && ![m.court, m.date, m.level, m.type].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusChip = (s) =>
    s==='scheduled' ? <Chip variant="scheduled">Planifié</Chip> :
    s==='completed' ? <Chip variant="warning">Terminé</Chip> :
    <Chip variant="danger">Annulé</Chip>;

  const handleTogglePayment = (matchId, current) => {
    AppStore.setMatchPaymentStatus(matchId, current === 'paid' ? 'unpaid' : 'paid');
  };

  const handleSaveEdit = async () => {
    if (!editMatch) return;
    setBusy(true);
    const r = await AppStore.updateMatch(editMatch.id, {
      courtId: editMatch.courtId,
      dateStr: editMatch.dateStr,
      startTime: editMatch.startTime,
      level: editMatch.level,
      visibility: editMatch.visibility,
      note: editMatch.note,
    });
    setBusy(false);
    if (r.ok) {
      setEditMatch(null);
      setFeedback({ type:'ok', msg:'Match modifié.' });
    } else {
      setFeedback({ type:'err', msg: r.error || 'Échec de la modification.' });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // KPIs cohérents : on compte les matchs PAYÉS (toutes statuses non annulées)
  // afin d'éviter l'incohérence où un match "scheduled" marqué payé n'apparaissait pas.
  const activeMatches    = matches.filter(m => m.status !== 'cancelled');
  const completedMatches = matches.filter(m => m.status === 'completed');
  const paidCount   = activeMatches.filter(m => m.paymentStatus === 'paid').length;
  const unpaidCount = activeMatches.filter(m => m.paymentStatus !== 'paid').length;

  return (
    <div style={{ padding: isMobile ? '16px 16px 32px' : '40px 48px', maxWidth:1100 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Administration</div>
          <h1 style={{ fontSize:28, fontWeight:700, color:C.secondary, margin:'0 0 4px', letterSpacing:'-0.5px' }}>Gestion des matchs</h1>
          <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>{activeMatches.length} match(s) actif(s)</p>
        </div>
        {/* Bouton "+ Nouveau match" : ouvre le flux de création (réutilise CreateMatchView en mode admin) */}
        <BtnPrimary onClick={() => setCreateOpen(true)} style={{ fontSize:13, padding:'11px 22px' }}>+ Nouveau match</BtnPrimary>
      </div>

      {/* Feedback flottant */}
      {feedback && (
        <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background: feedback.type==='ok' ? '#EDF4F0' : '#F4ECEC', color: feedback.type==='ok' ? '#3D7A5F' : '#9B3B3B', fontSize:13, fontWeight:600 }}>
          {feedback.msg}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        <KPICard label="Planifiés"     value={matches.filter(m=>m.status==='scheduled').length} accent={C.secondary} />
        <KPICard label="Terminés"      value={completedMatches.length} accent="#A0763A" />
        <KPICard label="Avec résultat" value={matches.filter(m=>m.sets&&m.sets.length>0).length} accent={C.primary} />
        <KPICard label="Payés"         value={paidCount}   accent="#3D7A5F" sub="Tous matchs actifs" />
        <KPICard label="Impayés"       value={unpaidCount} accent="#9B3B3B" sub="Tous matchs actifs" />
      </div>

      {/* Filters */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:12, marginBottom:20 }}>
        <AdminSearch value={search} onChange={setSearch} placeholder="Terrain, niveau, format..." />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="">Tous les statuts</option>
          <option value="scheduled">Planifié</option>
          <option value="completed">Terminé</option>
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="">Tous formats</option>
          <option value="Double">Double</option>
          <option value="Simple">Simple</option>
        </select>
        <select value={filterLevel} onChange={e=>setFilterLevel(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="">Tous niveaux</option>
          {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div style={{ fontSize:13, color:C.textMuted, marginBottom:14 }}>{filtered.length} résultat(s)</div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr><TH>Terrain</TH><TH>Date & Heure</TH><TH>Format / Niveau</TH><TH>Joueurs</TH><TH>Score</TH><TH>Statut</TH><TH>Paiement</TH><TH>Actions</TH></tr>
          </thead>
          <tbody>
            {filtered.map((m,i) => (
              <tr key={m.id} style={{ background:i%2===0?'#fff':'#FAFBFC' }}>
                <TD>
                  <div style={{ fontWeight:600, color:C.secondary }}>{m.court}</div>
                  {m.visibility === 'private' && <div style={{ fontSize:10, color:'#5558A0', marginTop:2, fontWeight:700, letterSpacing:0.5 }}>PRIVÉ</div>}
                </TD>
                <TD><div style={{ fontWeight:600 }}>{m.date}</div><div style={{ fontSize:12, color:C.textMuted, fontFamily:'monospace' }}>{m.time}</div></TD>
                <TD><div style={{ display:'flex', gap:6, flexWrap:'wrap' }}><Chip variant="primary">{m.type}</Chip><Chip variant="default">{m.level}</Chip></div></TD>
                <TD>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    {m.playerIds.map(id=>{const u=getUser(id);return u?(<AvatarCircle key={id} initials={u.initials} size={24}/>):null;})}
                    <span style={{ fontSize:12, color:C.textMuted, marginLeft:4 }}>{m.playerIds.length}/{m.maxPlayers}</span>
                  </div>
                </TD>
                <TD>
                  {m.sets&&m.sets.length>0 ? (
                    <div style={{ display:'flex', gap:4 }}>{m.sets.map((s,j)=><span key={j} style={{ fontSize:12, fontWeight:700, background:C.surfaceAlt, borderRadius:5, padding:'2px 6px' }}>{s.t1}–{s.t2}</span>)}</div>
                  ) : <span style={{ color:C.textLight, fontSize:12 }}>—</span>}
                </TD>
                <TD>{statusChip(m.status)}</TD>
                <TD>
                  <PaymentBadge
                    status={m.paymentStatus || 'unpaid'}
                    onToggle={() => handleTogglePayment(m.id, m.paymentStatus || 'unpaid')}
                    small
                  />
                </TD>
                <TD>
                  <div style={{ display:'flex', gap:4 }}>
                    <ActionBtn label="Détail" onClick={() => setDetailMatch(m)} />
                    {m.status==='scheduled' && (
                      <ActionBtn label="Modifier" onClick={() => setEditMatch({...m})} />
                    )}
                    {m.status==='scheduled' && (
                      <ActionBtn label="Annuler" onClick={() => { if(window.confirm('Annuler ce match ?')) AppStore.cancelMatch(m.id); }} danger />
                    )}
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:14 }}>Aucun match trouvé.</div>}
      </div>

      {/* Detail modal */}
      {detailMatch && (
        <AdminModal title="Détail du match" onClose={() => setDetailMatch(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: detailMatch.paymentStatus==='paid'?'#EDF4F0':'#F4ECEC', borderRadius:10, padding:'12px 16px' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.text }}>Statut de paiement</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>Modifiable à tout moment</div>
              </div>
              <PaymentBadge
                status={detailMatch.paymentStatus || 'unpaid'}
                onToggle={() => {
                  const newStatus = (detailMatch.paymentStatus||'unpaid') === 'paid' ? 'unpaid' : 'paid';
                  AppStore.setMatchPaymentStatus(detailMatch.id, newStatus);
                  setDetailMatch(m => ({ ...m, paymentStatus: newStatus }));
                }}
              />
            </div>
            {[
              ['Terrain', detailMatch.court],
              ['Date', detailMatch.date],
              ['Horaire', detailMatch.time],
              ['Format', detailMatch.type],
              ['Niveau', detailMatch.level],
              ['Visibilité', detailMatch.visibility === 'private' ? 'Privé' : 'Public'],
              ['Statut', detailMatch.status],
              ['Places', `${detailMatch.playerIds.length}/${detailMatch.maxPlayers}`],
              ['Tarif', `${detailMatch.pricePlayer} MAD/joueur`],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ color:C.textMuted }}>{k}</span>
                <span style={{ fontWeight:700, color:C.secondary }}>{v}</span>
              </div>
            ))}

            {detailMatch.shareLink && (
              <div style={{ background:C.surfaceAlt, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Lien de partage</div>
                <div style={{ fontSize:12, color:C.secondary, fontFamily:'monospace', wordBreak:'break-all' }}>{detailMatch.shareLink}</div>
              </div>
            )}

            <div style={{ marginTop:4 }}>
              <div style={{ fontSize:12, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Joueurs inscrits</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {detailMatch.playerIds.map(id => {
                  const u = getUser(id) || (detailMatch.players||[]).find(p=>p.id===id);
                  return u ? (
                    <div key={id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:C.surfaceAlt, borderRadius:8 }}>
                      <AvatarCircle initials={u.initials} size={32} />
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{u.name||u.full_name}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>Elo {u.elo}{u.email?` · ${u.email}`:''}</div>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {detailMatch.sets && detailMatch.sets.length > 0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Résultat</div>
                <div style={{ display:'flex', gap:8 }}>
                  {detailMatch.sets.map((s,i) => (
                    <span key={i} style={{ fontSize:18, fontWeight:700, color:C.secondary, background:C.surfaceAlt, borderRadius:8, padding:'6px 12px' }}>{s.t1}–{s.t2}</span>
                  ))}
                </div>
              </div>
            )}

            {detailMatch.note && (
              <div style={{ background:C.surfaceAlt, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Message</div>
                <div style={{ fontSize:13, color:C.text }}>{detailMatch.note}</div>
              </div>
            )}

            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              {detailMatch.status === 'scheduled' && (
                <BtnPrimary onClick={() => { setEditMatch({...detailMatch}); setDetailMatch(null); }} style={{ flex:1, padding:'12px' }}>
                  Modifier
                </BtnPrimary>
              )}
              <button onClick={() => setDetailMatch(null)} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Fermer</button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Edit modal */}
      {editMatch && (
        <AdminModal title="Modifier le match" subtitle="Édition" onClose={() => setEditMatch(null)}>
          <MatchEditForm
            match={editMatch}
            onChange={setEditMatch}
            onCancel={() => setEditMatch(null)}
            onSave={handleSaveEdit}
            busy={busy}
          />
        </AdminModal>
      )}

      {/* Create modal — interface admin pour créer un nouveau match.
          On garde un dialogue dédié plutôt que de rediriger pour ne pas
          sortir du contexte admin. */}
      {createOpen && (
        <AdminModal title="Nouveau match" subtitle="Création" onClose={() => setCreateOpen(false)} width={620}>
          <MatchCreateForm
            onCancel={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              setFeedback({ type:'ok', msg:'Match créé.' });
              setTimeout(() => setFeedback(null), 4000);
            }}
          />
        </AdminModal>
      )}
    </div>
  );
}

// ── Formulaire d'édition d'un match ───────────────────────
// Champs modifiables : terrain, date, heure, niveau, visibilité, note.
// Tarif et capacité sont DÉRIVÉS du terrain choisi côté serveur.
function MatchEditForm({ match, onChange, onCancel, onSave, busy }) {
  const C = UP_COLORS;
  const TIMES = ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30'];
  const LEVELS = ['Tous niveaux','Débutant','Intermédiaire','Confirmé','Avancé','Expert / Élite'];
  const courts = (window.COURTS_DB || []);
  const set = (k, v) => onChange({ ...match, [k]: v });
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Terrain</div>
        <select value={match.courtId} onChange={e => set('courtId', Number(e.target.value))}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Date</div>
          <input type="date" value={match.dateStr || match.date} onChange={e => set('dateStr', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Heure de début</div>
          <select value={match.startTime} onChange={e => set('startTime', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Niveau requis</div>
        <select value={match.level} onChange={e => set('level', e.target.value)}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Visibilité</div>
        <div style={{ display:'flex', gap:8 }}>
          {['public','private'].map(v => (
            <button key={v} type="button" onClick={() => set('visibility', v)}
              style={{ flex:1, background: match.visibility===v ? C.primaryLight : '#fff', border:`1px solid ${match.visibility===v?C.primary:C.border}`, color: match.visibility===v?C.primary:C.textMuted, borderRadius:8, padding:'10px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {v==='public'?'🌐 Public':'🔒 Privé'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Message (optionnel)</div>
        <textarea value={match.note || ''} onChange={e => set('note', e.target.value)} rows={3}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none', resize:'vertical' }} />
      </div>
      <div style={{ display:'flex', gap:12, marginTop:4 }}>
        <button onClick={onCancel} disabled={busy} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Annuler</button>
        <BtnPrimary onClick={onSave} disabled={busy} style={{ flex:2, padding:'12px' }}>{busy ? 'Enregistrement…' : 'Enregistrer'}</BtnPrimary>
      </div>
    </div>
  );
}

Object.assign(window, { AdminMatchesPanel, MatchEditForm });

// ── Formulaire de création d'un match (depuis l'espace admin) ─────────
// Utilise l'utilisateur connecté (admin) comme créateur. L'admin reste
// libre de modifier ses paramètres ensuite via le formulaire d'édition.
function MatchCreateForm({ onCancel, onCreated }) {
  const C = UP_COLORS;
  const TIMES = ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30'];
  const LEVELS = ['Tous niveaux','Débutant','Intermédiaire','Confirmé','Avancé','Expert / Élite'];
  const courts = (window.COURTS_DB || []);
  const { currentUser } = useStore();

  // Date par défaut : demain (créneau futur garanti)
  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate()+1);
    return d.toISOString().split('T')[0];
  })();

  const [form, setForm] = React.useState({
    courtId:   courts[0]?.id || 1,
    dateStr:   tomorrow,
    startTime: '18:30',
    level:     'Tous niveaux',
    visibility:'public',
    note:      '',
  });
  const [busy, setBusy]   = React.useState(false);
  const [error, setError] = React.useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!currentUser) { setError('Vous devez être connecté.'); return; }
    setBusy(true); setError('');
    const court = courts.find(c => c.id === Number(form.courtId));
    const r = await AppStore.createMatch(
      currentUser.id, Number(form.courtId),
      court?.name || '', court?.type || 'Double',
      form.level,
      form.dateStr, form.dateStr,
      form.startTime,
      form.note, form.visibility,
    );
    setBusy(false);
    if (!r.ok) { setError(r.error || 'Erreur création match.'); return; }
    onCreated && onCreated(r);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Terrain</div>
        <select value={form.courtId} onChange={e => set('courtId', Number(e.target.value))}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Date</div>
          <input type="date" value={form.dateStr} onChange={e => set('dateStr', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Heure de début</div>
          <select value={form.startTime} onChange={e => set('startTime', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Niveau requis</div>
        <select value={form.level} onChange={e => set('level', e.target.value)}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Visibilité</div>
        <div style={{ display:'flex', gap:8 }}>
          {['public','private'].map(v => (
            <button key={v} type="button" onClick={() => set('visibility', v)}
              style={{ flex:1, background: form.visibility===v ? C.primaryLight : '#fff', border:`1px solid ${form.visibility===v?C.primary:C.border}`, color: form.visibility===v?C.primary:C.textMuted, borderRadius:8, padding:'10px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {v==='public'?'🌐 Public':'🔒 Privé'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Message (optionnel)</div>
        <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none', resize:'vertical' }} />
      </div>
      {error && (
        <div style={{ background:'#F4ECEC', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#9B3B3B' }}>{error}</div>
      )}
      <div style={{ display:'flex', gap:12, marginTop:4 }}>
        <button onClick={onCancel} disabled={busy} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Annuler</button>
        <BtnPrimary onClick={handleCreate} disabled={busy} style={{ flex:2, padding:'12px' }}>{busy ? 'Création…' : 'Créer le match'}</BtnPrimary>
      </div>
    </div>
  );
}

Object.assign(window, { MatchCreateForm });
