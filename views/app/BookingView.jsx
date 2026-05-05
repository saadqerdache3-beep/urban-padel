// Urban Padel — Booking View v4
// - Auth required
// - Past slots filtered (today's past times hidden)
// - Share link
// - Correct court names + prices

const BV_MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const BV_DAYS   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const bvEnd = s => { const [h,m]=s.split(':').map(Number); const t=h*60+m+90; return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; };

function bvGetDay(offset) {
  const d = new Date(); d.setDate(d.getDate()+offset);
  const wd = d.getDay();
  const iso = d.toISOString().split('T')[0];
  return { day:d.getDate(), month:BV_MONTHS[d.getMonth()], monthShort:BV_MONTHS[d.getMonth()].slice(0,3).toUpperCase(), weekday:BV_DAYS[wd===0?6:wd-1], dateStr:iso };
}

function BookingView({ onNav, user }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();

  // Redirect if not logged in
  if (!user) {
    return (
      <div style={{ minHeight:'calc(100vh - 76px)', background:C.background, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:40 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:C.primaryLight, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:28, color:C.primary, fontWeight:700 }}>UP</span>
        </div>
        <h2 style={{ fontSize:22, fontWeight:700, color:C.secondary, margin:0, textAlign:'center' }}>Connexion requise</h2>
        <TextMuted>Connectez-vous pour réserver un terrain.</TextMuted>
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <BtnOutline onClick={() => onNav('register')} style={{ padding:'11px 24px', fontSize:13 }}>Créer un compte</BtnOutline>
          <BtnPrimary onClick={() => onNav('login')} style={{ padding:'12px 24px', fontSize:13 }}>Se connecter</BtnPrimary>
        </div>
      </div>
    );
  }

  const [step, setStep]         = React.useState(1);
  const [openDay, setOpenDay]   = React.useState(null);
  const [selDay, setSelDay]     = React.useState(null);
  const [selSlot, setSelSlot]   = React.useState(null);
  const [selCourt, setSelCourt] = React.useState(null);
  const [result, setResult]     = React.useState(null);
  const [copied, setCopied]     = React.useState(false);

  const { bookedSlots } = useStore();
  const isAvail = (courtId, dateStr, time) => AppStore.isSlotAvailable(courtId, dateStr, time);
  const selDateInfo = selDay !== null ? bvGetDay(selDay) : null;

  const handleConfirm = async () => {
    if (!selDateInfo || !selSlot || !selCourt) return;
    const res = await AppStore.createBooking(user.id, selCourt.id, selCourt.name, selCourt.type, selDateInfo.dateStr, `${selDateInfo.weekday} ${selDateInfo.day} ${selDateInfo.month}`, selSlot);
    setResult(res);
    if (res.ok) setStep(4);
  };

  const handleCopy = () => {
    if (result?.booking?.shareLink) {
      navigator.clipboard?.writeText(result.booking.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ScrollView>
      <div style={{ maxWidth:860, margin:'0 auto', padding: isMobile ? '16px 16px 40px' : '48px 40px 64px' }}>
        <div style={{ marginBottom:32 }}>
          <SectionLabel>Réservation</SectionLabel>
          <h1 style={{ fontSize:36, fontWeight:700, color:C.secondary, margin:'10px 0 8px', letterSpacing:'-0.5px' }}>
            {step === 4 ? 'Réservation confirmée.' : 'Réservez votre session.'}
          </h1>
          {step !== 4 && <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>Choisissez votre créneau et votre terrain. Paiement sur place.</p>}
        </div>

        {step < 4 && (
          <div style={{ display:'flex', alignItems:'center', marginBottom:36 }}>
            {[['Créneau',1],['Terrain',2],['Confirmation',3]].map(([label,n],i)=>(
              <React.Fragment key={n}>
                {i>0 && <div style={{ flex:1, height:1, background:step>i?C.primary:C.border, margin:'0 8px', transition:'background 300ms' }} />}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:step>=n?C.primary:C.surfaceAlt, color:step>=n?'#fff':C.textMuted, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>{n}</div>
                  <span style={{ fontSize:13, fontWeight:step===n?700:500, color:step===n?C.secondary:C.textMuted }}>{label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* STEP 1 — Créneau */}
        {step===1 && (
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.secondary, marginBottom:18 }}>Choisissez votre créneau</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[0,1,2,3,4].map(i => {
                const d = bvGetDay(i);
                const isOpen = openDay===i;
                const availCourts = AppStore.getAvailableCourtSlots(d.dateStr);
                const availTimes = getAvailableSlotTimes(d.dateStr);
                const anyAvail = availTimes.some(t => COURTS_DB.some(c => availCourts[c.id]?.includes(t)));
                const countFree = availTimes.filter(t => COURTS_DB.some(c => availCourts[c.id]?.includes(t))).length;
                return (
                  <div key={i} style={{ background:'#fff', borderRadius:16, border:`1px solid ${isOpen?C.primary:C.border}`, overflow:'hidden', boxShadow:isOpen?`0 0 0 1px ${C.primary}`:'0 2px 12px rgba(0,0,0,0.04)', opacity:anyAvail?1:0.5 }}>
                    <div style={{ display:'flex', alignItems:'center', padding:'18px 24px', gap:18, cursor:'pointer' }} onClick={() => anyAvail && setOpenDay(isOpen?null:i)}>
                      <div style={{ width:56, height:56, borderRadius:12, background:isOpen?C.primary:C.secondary, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 200ms' }}>
                        <span style={{ color:'#fff', fontSize:20, fontWeight:700, lineHeight:1 }}>{String(d.day).padStart(2,'0')}</span>
                        <span style={{ color:'rgba(255,255,255,0.6)', fontSize:9, letterSpacing:1.5, marginTop:2 }}>{d.monthShort}</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:16, fontWeight:700, color:C.secondary }}>{d.weekday} {d.day} {d.month}</div>
                        <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>
                          {anyAvail ? `${countFree} créneau${countFree>1?'x':''} disponible${countFree>1?'s':''}` : 'Aucun créneau disponible'}
                        </div>
                      </div>
                      {anyAvail && <span style={{ fontSize:13, fontWeight:600, color:isOpen?C.primary:C.textMuted }}>{isOpen?'Masquer':'Voir les créneaux'}</span>}
                    </div>
                    {isOpen && (
                      <div style={{ padding:'0 24px 20px', borderTop:`1px solid ${C.border}` }}>
                        <div style={{ paddingTop:16, display:'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(5,1fr)', gap:8 }}>
                          {availTimes.map(t => {
                            const hasAvailCourt = COURTS_DB.some(c => availCourts[c.id]?.includes(t));
                            return (
                              <button key={t} disabled={!hasAvailCourt} onClick={() => { setSelDay(i); setSelSlot(t); setStep(2); }}
                                style={{ background:hasAvailCourt?C.background:'#f5f5f5', border:`1px solid ${hasAvailCourt?C.border:'transparent'}`, borderRadius:10, padding:'11px 8px', fontSize:12, fontWeight:600, color:hasAvailCourt?C.text:C.textLight, cursor:hasAvailCourt?'pointer':'not-allowed', fontFamily:'inherit', transition:'all 150ms', textAlign:'center', opacity:hasAvailCourt?1:0.45 }}
                                onMouseEnter={e=>hasAvailCourt&&(e.currentTarget.style.borderColor=C.primary,e.currentTarget.style.background=C.primaryLight,e.currentTarget.style.color=C.primary)}
                                onMouseLeave={e=>hasAvailCourt&&(e.currentTarget.style.borderColor=C.border,e.currentTarget.style.background=C.background,e.currentTarget.style.color=C.text)}>
                                {t}<br /><span style={{ fontWeight:400, opacity:0.65 }}>{bvEnd(t)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — Terrain */}
        {step===2 && selDateInfo && selSlot && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
              <BtnGhost onClick={() => setStep(1)} style={{ padding:'6px 0' }}>Retour</BtnGhost>
              <Chip variant="dark">{selDateInfo.weekday} {selDateInfo.day} {selDateInfo.month}</Chip>
              <Chip variant="primary">{selSlot} → {bvEnd(selSlot)}</Chip>
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:C.secondary, marginBottom:18 }}>Terrains disponibles</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {COURTS_DB.map(court => {
                const avail = isAvail(court.id, selDateInfo.dateStr, selSlot);
                return (
                  <div key={court.id} style={{ background:'#fff', borderRadius:16, border:`1px solid ${avail?C.border:'#f0f0f0'}`, padding:'24px 28px', display:'flex', alignItems:'center', gap:24, boxShadow:'0 2px 12px rgba(0,0,0,0.04)', opacity:avail?1:0.5 }}>
                    <div style={{ flex:2 }}>
                      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontSize:17, fontWeight:700, color:C.secondary }}>{court.name}</span>
                        <Chip variant="primary">{court.type}</Chip>
                        {!avail && <Chip variant="danger">Indisponible</Chip>}
                      </div>
                      <div style={{ fontSize:12, color:C.textLight }}>
                        {court.type === 'Simple' ? '1 joueur · individuel' : `${court.capacity} joueurs max`} · Outdoor
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                      <div style={{ fontSize:22, fontWeight:700, color:C.secondary }}>
                        {court.pricePlayer} MAD
                        <span style={{ fontSize:13, fontWeight:400, color:C.textMuted }}>
                          {court.type === 'Simple' ? ' / 1 personne' : ' / joueur'}
                        </span>
                      </div>
                      {court.type === 'Double' && <div style={{ fontSize:12, color:C.textMuted }}>{court.priceSession} MAD total · 1h30</div>}
                      {court.type === 'Simple' && <div style={{ fontSize:12, color:C.textMuted }}>Tarif individuel · 1h30</div>}
                      {avail && <BtnPrimary onClick={() => { setSelCourt(court); setStep(3); }} style={{ marginTop:6, fontSize:13, padding:'10px 20px' }}>Sélectionner</BtnPrimary>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3 — Confirmation */}
        {step===3 && selCourt && selDateInfo && selSlot && (
          <div style={{ maxWidth:560 }}>
            <div style={{ fontSize:18, fontWeight:700, color:C.secondary, marginBottom:18 }}>Confirmation</div>
            <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ background:C.secondary, padding:'22px 28px' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>Votre session</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{selCourt.name}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:4 }}>{selDateInfo.weekday} {selDateInfo.day} {selDateInfo.month} · {selSlot} → {bvEnd(selSlot)}</div>
              </div>
              <div style={{ padding:'24px 28px' }}>
                {[
                  ['Terrain', `${selCourt.name} · ${selCourt.type}`],
                  ['Format', selCourt.type === 'Simple' ? 'Individuel (1 joueur)' : `${selCourt.capacity} joueurs max`],
                  ['Durée', 'Session 1h30'],
                  ['Paiement', 'Sur place'],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ color:C.textMuted }}>{k}</span><span style={{ fontWeight:600, color:C.text }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop:16, marginBottom:16 }}>
                  <div style={{ fontSize:12, color:C.textMuted, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                    {selCourt.type === 'Simple' ? 'Total (1 personne)' : 'Total session'}
                  </div>
                  <div style={{ fontSize:30, fontWeight:700, color:C.secondary }}>{selCourt.priceSession} MAD</div>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <BtnGhost onClick={() => setStep(2)}>Modifier</BtnGhost>
                  <BtnPrimary onClick={handleConfirm} style={{ flex:1, padding:'13px', fontSize:14 }}>Confirmer la réservation</BtnPrimary>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Succès */}
        {step===4 && result?.ok && result.booking && (
          <div style={{ maxWidth:560 }}>
            <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.07)' }}>
              <div style={{ background:'#3D7A5F', padding:'24px 28px' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', marginBottom:6 }}>Réservation confirmée</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{result.booking.court}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginTop:4 }}>{result.booking.date} · {result.booking.time} → {bvEnd(result.booking.time)}</div>
              </div>
              <div style={{ padding:'24px 28px' }}>
                <div style={{ background:C.surfaceAlt, borderRadius:12, padding:'16px 18px', marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Lien de partage</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <div style={{ flex:1, background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:C.secondary, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{result.booking.shareLink}</div>
                    <button onClick={handleCopy} style={{ background: copied ? '#3D7A5F' : C.primary, border:'none', borderRadius:8, color:'#fff', padding:'10px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'background 200ms' }}>
                      {copied ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:6 }}>Partagez ce lien pour inviter vos partenaires.</div>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <BtnOutline onClick={() => { setStep(1); setSelDay(null); setSelSlot(null); setSelCourt(null); setResult(null); }} style={{ flex:1, padding:'11px', fontSize:13 }}>Nouvelle réservation</BtnOutline>
                  <BtnPrimary onClick={() => onNav('dashboard')} style={{ flex:1, padding:'12px', fontSize:13 }}>Tableau de bord</BtnPrimary>
                </div>
              </div>
            </div>
          </div>
        )}
        {step===4 && result && !result.ok && (
          <div style={{ background:'#F4ECEC', borderRadius:12, padding:'18px', color:'#9B3B3B', fontSize:14 }}>{result.error}</div>
        )}
      </div>
    </ScrollView>
  );
}

Object.assign(window, { BookingView });
