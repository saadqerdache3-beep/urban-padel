// Urban Padel — Admin Réservations v3 — payment + édition + nouvelle réservation
function AdminBookings() {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const { bookings, users } = useStore();
  const [search, setSearch]             = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterCourt,  setFilterCourt]  = React.useState('');
  const [modal, setModal]               = React.useState(null);
  const [editBooking, setEditBooking]   = React.useState(null);
  const [createOpen,  setCreateOpen]    = React.useState(false);
  const [busy, setBusy]                 = React.useState(false);
  const [feedback, setFeedback]         = React.useState(null);

  const getUser = id => users.find(u => u.id === id);

  const filtered = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterCourt  && !b.court?.includes(filterCourt)) return false;
    const u = getUser(b.userId);
    if (search && ![(u?.name||''), b.court||'', b.shareLink||'', b.date||''].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCancel = id => {
    if (window.confirm('Annuler cette réservation ?')) AppStore.cancelBooking(id);
  };

  const handleTogglePayment = (bookingId, current) => {
    AppStore.setBookingPaymentStatus(bookingId, current === 'paid' ? 'unpaid' : 'paid');
  };

  const handleSaveEdit = async () => {
    if (!editBooking) return;
    setBusy(true);
    const r = await AppStore.updateBooking(editBooking.id, {
      courtId: editBooking.courtId,
      dateStr: editBooking.dateStr,
      startTime: editBooking.startTime,
    });
    setBusy(false);
    if (r.ok) {
      setEditBooking(null);
      setFeedback({ type:'ok', msg:'Réservation modifiée.' });
    } else {
      setFeedback({ type:'err', msg: r.error || 'Échec de la modification.' });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const statusChip = s => {
    if (s==='scheduled') return <Chip variant="scheduled">Planifié</Chip>;
    if (s==='cancelled') return <Chip variant="danger">Annulé</Chip>;
    if (s==='completed') return <Chip variant="warning">Terminé</Chip>;
    return <Chip variant="success">Validé</Chip>;
  };

  const courts = ['Terrain 1','Terrain 2','Terrain Individuel'];

  return (
    <div style={{ padding: isMobile ? '16px 16px 32px' : '40px 48px', maxWidth:1100 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Administration</div>
          <h1 style={{ fontSize:28, fontWeight:700, color:C.secondary, margin:'0 0 4px', letterSpacing:'-0.5px' }}>Gestion des réservations</h1>
          <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>{bookings.length} réservation(s) au total</p>
        </div>
        <BtnPrimary onClick={() => setCreateOpen(true)} style={{ fontSize:13, padding:'11px 22px' }}>+ Nouvelle réservation</BtnPrimary>
      </div>

      {/* Feedback flottant */}
      {feedback && (
        <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background: feedback.type==='ok' ? '#EDF4F0' : '#F4ECEC', color: feedback.type==='ok' ? '#3D7A5F' : '#9B3B3B', fontSize:13, fontWeight:600 }}>
          {feedback.msg}
        </div>
      )}

      {/* KPIs — revenu compte les paiements valides (status != cancelled) */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        <KPICard label="Planifiées" value={bookings.filter(b=>b.status==='scheduled').length} accent={C.secondary} />
        <KPICard label="Terminées"  value={bookings.filter(b=>b.status==='completed').length} accent="#A0763A" />
        <KPICard label="Annulées"   value={bookings.filter(b=>b.status==='cancelled').length} accent="#9B3B3B" />
        <KPICard label="Payées"     value={bookings.filter(b=>b.paymentStatus==='paid' && b.status!=='cancelled').length} accent="#3D7A5F" />
        <KPICard label="Revenus encaissés" value={`${bookings.filter(b=>b.paymentStatus==='paid' && b.status!=='cancelled').reduce((s,b)=>s+(b.total||0),0)} MAD`} sub="Réservations payées (hors annulées)" accent={C.primary} />
      </div>

      {/* Filters */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:20 }}>
        <AdminSearch value={search} onChange={setSearch} placeholder="Joueur, terrain, lien..." />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="">Tous les statuts</option>
          <option value="scheduled">Planifié</option>
          <option value="completed">Terminé</option>
          <option value="cancelled">Annulé</option>
        </select>
        <select value={filterCourt} onChange={e=>setFilterCourt(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="">Tous les terrains</option>
          {courts.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ fontSize:13, color:C.textMuted, marginBottom:14 }}>{filtered.length} résultat(s)</div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr><TH>Joueur</TH><TH>Terrain</TH><TH>Date & Heure</TH><TH>Lien</TH><TH>Total</TH><TH>Statut</TH><TH>Paiement</TH><TH>Actions</TH></tr>
          </thead>
          <tbody>
            {filtered.map((b,i) => {
              const u = getUser(b.userId);
              const hours = (new Date(b.slotISO)-new Date())/3600000;
              const cancellable = b.status==='scheduled' && hours>=5;
              const editable    = b.status==='scheduled' && hours>=5;
              return (
                <tr key={b.id} style={{ background:i%2===0?'#fff':'#FAFBFC' }}>
                  <TD>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {u && <AvatarCircle initials={u.initials} size={28} />}
                      <div>
                        <div style={{ fontWeight:600, color:C.secondary }}>{u?.name||`Joueur ${b.userId}`}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{u?.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD><div style={{ fontWeight:600, color:C.secondary }}>{b.court}</div><div style={{ fontSize:11, color:C.textMuted }}>{b.type}</div></TD>
                  <TD><div style={{ fontWeight:600 }}>{b.date}</div><div style={{ fontSize:12, color:C.textMuted, fontFamily:'monospace' }}>{b.time}</div></TD>
                  <TD>
                    <span style={{ fontFamily:'monospace', fontSize:11, color:C.secondary, wordBreak:'break-all' }}>
                      {b.shareLink ? b.shareLink.replace('https://saadqerd.pythonanywhere.com','') : '—'}
                    </span>
                  </TD>
                  <TD style={{ fontWeight:700 }}>{b.total||'—'} MAD</TD>
                  <TD>{statusChip(b.status)}</TD>
                  <TD>
                    <PaymentBadge
                      status={b.paymentStatus || 'unpaid'}
                      onToggle={() => handleTogglePayment(b.id, b.paymentStatus || 'unpaid')}
                      small
                    />
                  </TD>
                  <TD>
                    <div style={{ display:'flex', gap:4 }}>
                      <ActionBtn label="Détail" onClick={() => setModal(b)} />
                      {editable    && <ActionBtn label="Modifier" onClick={() => setEditBooking({...b})} />}
                      {cancellable && <ActionBtn label="Annuler"  onClick={() => handleCancel(b.id)} danger />}
                    </div>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0 && <div style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:14 }}>Aucune réservation trouvée.</div>}
      </div>

      {/* Detail modal */}
      {modal && (
        <AdminModal title="Détail de la réservation" onClose={() => setModal(null)}>
          {(() => {
            const u = getUser(modal.userId);
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: modal.paymentStatus==='paid'?'#EDF4F0':'#F4ECEC', borderRadius:10, padding:'12px 16px' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.text }}>Statut de paiement</div>
                    <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>Paiement sur place après la session</div>
                  </div>
                  <PaymentBadge
                    status={modal.paymentStatus || 'unpaid'}
                    onToggle={() => {
                      const newStatus = (modal.paymentStatus||'unpaid') === 'paid' ? 'unpaid' : 'paid';
                      AppStore.setBookingPaymentStatus(modal.id, newStatus);
                      setModal(m => ({ ...m, paymentStatus: newStatus }));
                    }}
                  />
                </div>
                <div style={{ background:C.surfaceAlt, borderRadius:10, padding:'14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    {u && <AvatarCircle initials={u.initials} size={44} />}
                    <div>
                      <div style={{ fontWeight:700, color:C.secondary }}>{u?.name}</div>
                      <div style={{ fontSize:12, color:C.textMuted }}>{u?.email}</div>
                      <div style={{ fontSize:11, color:C.textMuted }}>Elo {u?.elo}</div>
                    </div>
                  </div>
                </div>
                {[
                  ['Terrain', modal.court],
                  ['Date', modal.date],
                  ['Horaire', modal.time],
                  ['Total', `${modal.total||0} MAD`],
                  ['Statut', modal.status],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ color:C.textMuted }}>{k}</span>
                    <span style={{ fontWeight:700, color:C.secondary }}>{v}</span>
                  </div>
                ))}
                {modal.shareLink && (
                  <div style={{ background:C.surfaceAlt, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Lien de partage</div>
                    <div style={{ fontSize:12, color:C.secondary, fontFamily:'monospace', wordBreak:'break-all' }}>{modal.shareLink}</div>
                  </div>
                )}
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  {modal.status === 'scheduled' && (
                    <BtnPrimary onClick={() => { setEditBooking({...modal}); setModal(null); }} style={{ flex:1, padding:'12px' }}>
                      Modifier
                    </BtnPrimary>
                  )}
                  <button onClick={()=>setModal(null)} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Fermer</button>
                </div>
              </div>
            );
          })()}
        </AdminModal>
      )}

      {/* Edit modal */}
      {editBooking && (
        <AdminModal title="Modifier la réservation" subtitle="Édition" onClose={() => setEditBooking(null)}>
          <BookingEditForm
            booking={editBooking}
            onChange={setEditBooking}
            onCancel={() => setEditBooking(null)}
            onSave={handleSaveEdit}
            busy={busy}
          />
        </AdminModal>
      )}

      {/* Create modal */}
      {createOpen && (
        <AdminModal title="Nouvelle réservation" subtitle="Création" onClose={() => setCreateOpen(false)} width={620}>
          <BookingCreateForm
            onCancel={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              setFeedback({ type:'ok', msg:'Réservation créée.' });
              setTimeout(() => setFeedback(null), 4000);
            }}
          />
        </AdminModal>
      )}
    </div>
  );
}

// ── Formulaire d'édition d'une réservation ────────────────
function BookingEditForm({ booking, onChange, onCancel, onSave, busy }) {
  const C = UP_COLORS;
  const TIMES = ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30'];
  const courts = (window.COURTS_DB || []);
  const set = (k, v) => onChange({ ...booking, [k]: v });
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Terrain</div>
        <select value={booking.courtId} onChange={e => set('courtId', Number(e.target.value))}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type}) — {c.priceSession} MAD</option>)}
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Date</div>
          <input type="date" value={booking.dateStr || booking.date} onChange={e => set('dateStr', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Heure de début</div>
          <select value={booking.startTime || (booking.time||'').slice(0,5)} onChange={e => set('startTime', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ background:C.surfaceAlt, borderRadius:8, padding:'10px 12px', fontSize:12, color:C.textMuted }}>
        Le tarif total sera recalculé automatiquement selon le terrain choisi.
      </div>
      <div style={{ display:'flex', gap:12, marginTop:4 }}>
        <button onClick={onCancel} disabled={busy} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Annuler</button>
        <BtnPrimary onClick={onSave} disabled={busy} style={{ flex:2, padding:'12px' }}>{busy ? 'Enregistrement…' : 'Enregistrer'}</BtnPrimary>
      </div>
    </div>
  );
}

// ── Formulaire de création d'une réservation par l'admin ─────
// L'admin choisit le client (parmi les joueurs non archivés), le terrain,
// la date et l'heure. Le total est calculé serveur-side.
function BookingCreateForm({ onCancel, onCreated }) {
  const C = UP_COLORS;
  const TIMES = ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30'];
  const courts = (window.COURTS_DB || []);
  const { users } = useStore();
  const eligibleUsers = users.filter(u => !u.archived && u.role === 'player');

  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate()+1);
    return d.toISOString().split('T')[0];
  })();
  const [form, setForm] = React.useState({
    userId:    eligibleUsers[0]?.id || null,
    courtId:   courts[0]?.id || 1,
    dateStr:   tomorrow,
    startTime: '18:30',
  });
  const [busy, setBusy]   = React.useState(false);
  const [error, setError] = React.useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.userId) { setError('Sélectionnez un joueur.'); return; }
    setBusy(true); setError('');
    const r = await AppStore.adminCreateBookingFor(
      Number(form.userId), Number(form.courtId), form.dateStr, form.startTime
    );
    setBusy(false);
    if (!r.ok) { setError(r.error || 'Erreur création réservation.'); return; }
    onCreated && onCreated(r);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Joueur</div>
        <select value={form.userId || ''} onChange={e => set('userId', Number(e.target.value))}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          {eligibleUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name || u.full_name} — {u.email || `Elo ${u.elo}`}</option>
          ))}
        </select>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Terrain</div>
        <select value={form.courtId} onChange={e => set('courtId', Number(e.target.value))}
          style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type}) — {c.priceSession} MAD</option>)}
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
      {error && (
        <div style={{ background:'#F4ECEC', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#9B3B3B' }}>{error}</div>
      )}
      <div style={{ display:'flex', gap:12, marginTop:4 }}>
        <button onClick={onCancel} disabled={busy} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Annuler</button>
        <BtnPrimary onClick={handleCreate} disabled={busy} style={{ flex:2, padding:'12px' }}>{busy ? 'Création…' : 'Créer la réservation'}</BtnPrimary>
      </div>
    </div>
  );
}

Object.assign(window, { AdminBookings, BookingEditForm, BookingCreateForm });
