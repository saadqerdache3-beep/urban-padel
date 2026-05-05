// Urban Padel — Create Match View v3
// - Public/private toggle
// - Share link (no code)
// - Time filtering (past slots hidden)
// - ELO enforcement

const CM_MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const CM_DAYS   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const cmEnd = s => { const [h,m]=s.split(':').map(Number); const t=h*60+m+90; return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; };

function cmGetDay(offset) {
  const d = new Date(); d.setDate(d.getDate()+offset);
  const wd = d.getDay();
  const iso = d.toISOString().split('T')[0];
  return { day:d.getDate(), month:CM_MONTHS[d.getMonth()], monthShort:CM_MONTHS[d.getMonth()].slice(0,3).toUpperCase(), weekday:CM_DAYS[wd===0?6:wd-1], dateStr:iso };
}

const CM_ELO_LEVELS = [
  { id:'all',    label:'Tous niveaux',   range:'1.0 — 10.0', min:1.0, max:10.0 },
  { id:'debut',  label:'Débutant',       range:'1.0 — 2.5',  min:1.0, max:2.5  },
  { id:'inter',  label:'Intermédiaire',  range:'2.5 — 4.0',  min:2.5, max:4.0  },
  { id:'conf',   label:'Confirmé',       range:'4.0 — 5.5',  min:4.0, max:5.5  },
  { id:'avan',   label:'Avancé',         range:'5.5 — 7.0',  min:5.5, max:7.0  },
  { id:'expert', label:'Expert / Élite', range:'7.0 — 10.0', min:7.0, max:10.0 },
];

function CreateMatchView({ onNav, user }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const [step, setStep]         = React.useState(1);
  const [openDay, setOpenDay]   = React.useState(null);
  const [selDay, setSelDay]     = React.useState(null);
  const [selSlot, setSelSlot]   = React.useState(null);
  const [selCourt, setSelCourt] = React.useState(null);
  const [selLevel, setSelLevel] = React.useState('conf');
  const [visibility, setVisibility] = React.useState('public');
  const [note, setNote]         = React.useState('');
  const [result, setResult]     = React.useState(null);
  const [copied, setCopied]     = React.useState(false);

  const { bookedSlots } = useStore();
  const selDateInfo = selDay !== null ? cmGetDay(selDay) : null;

  // Check if user's ELO is compatible with chosen level
  const selectedLevelObj = CM_ELO_LEVELS.find(l => l.id === selLevel);
  const userElo = user?.elo || 0;
  const canCreateAtLevel = selLevel === 'all' || !user || eloCompatible(userElo, selectedLevelObj?.label || 'Tous niveaux');

  const handlePublish = async () => {
    if (!user) { onNav('login'); return; }
    if (!selDateInfo || !selSlot || !selCourt) return;
    const lv = CM_ELO_LEVELS.find(l => l.id === selLevel);
    const res = await AppStore.createMatch(
      user.id, selCourt.id, selCourt.name, selCourt.type,
      lv?.label || 'Tous niveaux',
      selDateInfo.dateStr,
      `${selDateInfo.weekday} ${selDateInfo.day} ${selDateInfo.month}`,
      selSlot, note, visibility
    );
    setResult(res);
    if (res.ok) setStep(5);
  };

  const handleCopy = () => {
    if (result?.shareLink) {
      navigator.clipboard?.writeText(result.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const STEPS = [['Créneau',1],['Terrain',2],['Niveau',3],['Publication',4]];

  return (
    <ScrollView>
      <div style={{ maxWidth:860, margin:'0 auto', padding: isMobile ? '16px 16px 40px' : '48px 40px 64px' }}>
        <div style={{ marginBottom:32 }}>
          <SectionLabel>Créer un match</SectionLabel>
          <h1 style={{ fontSize:36, fontWeight:700, color:C.secondary, margin:'10px 0 8px', letterSpacing:'-0.5px' }}>
            {step===5 ? 'Match publié !' : 'Publiez votre match.'}
          </h1>
          {step<5 && <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>Choisissez un créneau libre, un terrain, définissez le niveau et publiez.</p>}
        </div>

        {/* Stepper */}
        {step<5 && (
          <div style={{ display:'flex', alignItems:'center', marginBottom:36 }}>
            {STEPS.map(([label,n],i)=>(
              <React.Fragment key={n}>
                {i>0 && <div style={{ flex:1, height:1, background:step>i?C.primary:C.border, margin:'0 8px', transition:'background 300ms' }} />}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:step>=n?C.primary:C.surfaceAlt, color:step>=n?'#fff':C.textMuted, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{n}</div>
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
                const d = cmGetDay(i);
                const availCourts = AppStore.getAvailableCourtSlots(d.dateStr);
                const availTimes = getAvailableSlotTimes(d.dateStr);
                const avail = availTimes.some(t => COURTS_DB.some(c => availCourts[c.id]?.includes(t)));
                const isOpen = openDay===i;
                const countFree = availTimes.filter(t => COURTS_DB.some(c => availCourts[c.id]?.includes(t))).length;
                return (
                  <div key={i} style={{ background:'#fff', borderRadius:16, border:`1px solid ${isOpen?C.primary:C.border}`, overflow:'hidden', boxShadow:isOpen?`0 0 0 1px ${C.primary}`:'0 2px 12px rgba(0,0,0,0.04)', opacity:avail?1:0.5 }}>
                    <div style={{ display:'flex', alignItems:'center', padding:'18px 24px', gap:18, cursor:avail?'pointer':'default' }} onClick={() => avail && setOpenDay(isOpen?null:i)}>
                      <div style={{ width:56, height:56, borderRadius:12, background:isOpen?C.primary:C.secondary, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ color:'#fff', fontSize:20, fontWeight:700, lineHeight:1 }}>{String(d.day).padStart(2,'0')}</span>
                        <span style={{ color:'rgba(255,255,255,0.6)', fontSize:9, letterSpacing:1.5, marginTop:2 }}>{d.monthShort}</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:16, fontWeight:700, color:C.secondary }}>{d.weekday} {d.day} {d.month}</div>
                        <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>
                          {avail ? `${countFree} créneau${countFree>1?'x':''} disponible${countFree>1?'s':''}` : 'Aucun créneau disponible'}
                        </div>
                      </div>
                      {avail && <span style={{ fontSize:13, fontWeight:600, color:isOpen?C.primary:C.textMuted }}>{isOpen?'Masquer ↑':'Voir →'}</span>}
                    </div>
                    {isOpen && (
                      <div style={{ padding:'0 24px 20px', borderTop:`1px solid ${C.border}` }}>
                        <div style={{ paddingTop:16, display:'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(5,1fr)', gap:8 }}>
                          {getAvailableSlotTimes(d.dateStr).map(t => {
                            const hasAvail = COURTS_DB.some(c => availCourts[c.id]?.includes(t));
                            return (
                              <button key={t} disabled={!hasAvail} onClick={() => { setSelDay(i); setSelSlot(t); setStep(2); }}
                                style={{ background:hasAvail?C.background:'#f5f5f5', border:`1px solid ${hasAvail?C.border:'transparent'}`, borderRadius:10, padding:'11px 8px', fontSize:12, fontWeight:600, color:hasAvail?C.text:C.textLight, cursor:hasAvail?'pointer':'not-allowed', fontFamily:'inherit', textAlign:'center', opacity:hasAvail?1:0.45 }}
                                onMouseEnter={e=>hasAvail&&(e.currentTarget.style.borderColor=C.primary,e.currentTarget.style.background=C.primaryLight,e.currentTarget.style.color=C.primary)}
                                onMouseLeave={e=>hasAvail&&(e.currentTarget.style.borderColor=C.border,e.currentTarget.style.background=C.background,e.currentTarget.style.color=C.text)}>
                                {t}<br /><span style={{ fontWeight:400, opacity:0.65 }}>{cmEnd(t)}</span>
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
              <BtnGhost onClick={()=>setStep(1)} style={{ padding:'6px 0' }}>Retour</BtnGhost>
              <Chip variant="dark">{selDateInfo.weekday} {selDateInfo.day} {selDateInfo.month}</Chip>
              <Chip variant="primary">{selSlot} → {cmEnd(selSlot)}</Chip>
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:C.secondary, marginBottom:18 }}>Terrain disponible</div>
            {AppStore.getAvailableCourts(selDateInfo.dateStr, selSlot).map(court => (
              <div key={court.id} style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'24px 28px', display:'flex', alignItems:'center', gap:24, marginBottom:12, boxShadow:'0 2px 12px rgba(0,0,0,0.04)', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ flex:2 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:17, fontWeight:700, color:C.secondary }}>{court.name}</span>
                    <Chip variant="primary">{court.type}</Chip>
                  </div>
                  <div style={{ fontSize:12, color:C.textLight }}>{court.capacity} joueurs max · Outdoor · {court.pricePlayer} MAD/joueur</div>
                </div>
                <BtnPrimary onClick={()=>{ setSelCourt(court); setStep(3); }} style={{ fontSize:13, padding:'10px 20px' }}>Sélectionner</BtnPrimary>
              </div>
            ))}
            {AppStore.getAvailableCourts(selDateInfo.dateStr, selSlot).length===0 && (
              <div style={{ background:C.surfaceAlt, borderRadius:14, padding:'28px', textAlign:'center' }}>
                <TextMuted>Aucun terrain disponible pour ce créneau.</TextMuted>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Niveau + visibilité */}
        {step===3 && (
          <div style={{ maxWidth:600 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
              <BtnGhost onClick={()=>setStep(2)} style={{ padding:'6px 0' }}>Retour</BtnGhost>
            </div>

            {/* Visibility toggle */}
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.secondary, marginBottom:8 }}>Visibilité du match</div>
              <p style={{ fontSize:14, color:C.textMuted, margin:'0 0 16px' }}>Un match public est visible de tous. Un match privé n'est accessible que via le lien de partage.</p>
              <div style={{ display:'flex', gap:12 }}>
                {[['public','🌐 Public','Visible dans la liste des matchs'],['private','🔒 Privé','Accessible uniquement via le lien']].map(([val, label, desc]) => (
                  <div key={val} onClick={() => setVisibility(val)}
                    style={{ flex:1, background: visibility===val ? (val==='public'?'#EEF7F0':'#F0F0F8') : '#fff', borderRadius:14, border:`2px solid ${visibility===val?(val==='public'?'#3D7A5F':'#5558A0'):C.border}`, padding:'18px 20px', cursor:'pointer', transition:'all 200ms' }}>
                    <div style={{ fontSize:15, fontWeight:700, color: visibility===val?(val==='public'?'#3D7A5F':'#5558A0'):C.secondary, marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:12, color:C.textMuted }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level */}
            <div style={{ fontSize:15, fontWeight:700, color:C.secondary, marginBottom:8 }}>Niveau requis</div>
            <p style={{ fontSize:14, color:C.textMuted, margin:'0 0 16px' }}>Les joueurs doivent correspondre à ce niveau pour rejoindre votre match.</p>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:24 }}>
              {CM_ELO_LEVELS.map(lv => {
                const sel = selLevel===lv.id;
                const compatible = lv.id === 'all' || !user || eloCompatible(userElo, lv.label);
                return (
                  <div key={lv.id} onClick={() => compatible && setSelLevel(lv.id)}
                    style={{ background:sel?C.secondary:'#fff', borderRadius:14, border:`2px solid ${sel?C.secondary:compatible?C.border:'#f0f0f0'}`, padding:'18px 20px', cursor:compatible?'pointer':'not-allowed', transition:'all 200ms', opacity:compatible?1:0.45 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:sel?'#fff':C.secondary }}>{lv.label}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:sel?C.primary:C.textMuted, background:sel?'rgba(198,93,59,0.2)':C.surfaceAlt, borderRadius:5, padding:'2px 7px' }}>Elo {lv.range}</span>
                    </div>
                    {!compatible && <div style={{ fontSize:11, color:C.danger }}>Votre Elo ({userElo.toFixed(1)}) incompatible</div>}
                  </div>
                );
              })}
            </div>

            {!canCreateAtLevel && (
              <div style={{ background:C.dangerBg, borderRadius:12, padding:'14px 18px', marginBottom:16, fontSize:13, color:C.danger }}>
                Votre score Elo ({userElo.toFixed(1)}) n'est pas compatible avec ce niveau.
              </div>
            )}

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.text, display:'block', marginBottom:6 }}>Message aux joueurs <span style={{ fontWeight:400, color:C.textMuted }}>(optionnel)</span></label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex : Match amical, venez avec bonne humeur !" rows={3}
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none', resize:'vertical' }} />
            </div>
            <BtnPrimary onClick={()=>setStep(4)} disabled={!canCreateAtLevel} style={{ fontSize:14, padding:'13px 32px' }}>Continuer →</BtnPrimary>
          </div>
        )}

        {/* STEP 4 — Récap */}
        {step===4 && selCourt && selDateInfo && selSlot && (
          <div style={{ maxWidth:560 }}>
            <div style={{ fontSize:18, fontWeight:700, color:C.secondary, marginBottom:18 }}>Récapitulatif</div>
            <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ background:C.secondary, padding:'22px 28px' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>Votre match</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{selCourt.name}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:4 }}>{selDateInfo.weekday} {selDateInfo.day} {selDateInfo.month} · {selSlot} → {cmEnd(selSlot)}</div>
              </div>
              <div style={{ padding:'22px 28px' }}>
                {[
                  ['Format', selCourt.type],
                  ['Niveau', CM_ELO_LEVELS.find(l=>l.id===selLevel)?.label],
                  ['Places', `${selCourt.capacity - 1} à remplir`],
                  ['Tarif', `${selCourt.pricePlayer} MAD/joueur`],
                  ['Visibilité', visibility === 'public' ? '🌐 Public' : '🔒 Privé'],
                  ...(note ? [['Message', note]] : []),
                ].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ color:C.textMuted }}>{k}</span>
                    <span style={{ fontWeight:600, color:C.text, textAlign:'right', maxWidth:280 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display:'flex', gap:12, marginTop:20 }}>
                  <BtnGhost onClick={()=>setStep(3)}>Modifier</BtnGhost>
                  <BtnPrimary onClick={handlePublish} style={{ flex:1, padding:'13px', fontSize:14 }}>Publier le match</BtnPrimary>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Succès */}
        {step===5 && result?.ok && result.match && (
          <div style={{ maxWidth:560 }}>
            <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.07)' }}>
              <div style={{ background:C.secondary, padding:'24px 28px' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:6 }}>Match publié</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{result.match.court}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:4 }}>{result.match.date} · {result.match.time}</div>
              </div>
              <div style={{ padding:'24px 28px' }}>
                {/* Share link */}
                <div style={{ background:C.primaryLight, borderRadius:12, padding:'16px 18px', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:C.primary, textTransform:'uppercase' }}>Lien d'invitation</div>
                    <VisibilityBadge visibility={visibility} />
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <div style={{ flex:1, background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:C.secondary, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{result.shareLink}</div>
                    <button onClick={handleCopy} style={{ background: copied ? '#3D7A5F' : C.primary, border:'none', borderRadius:8, color:'#fff', padding:'10px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'background 200ms' }}>
                      {copied ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                  <div style={{ fontSize:11, color:C.primary, marginTop:6, fontWeight:500 }}>Partagez ce lien — les joueurs rejoignent directement votre match.</div>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <BtnOutline onClick={()=>onNav('matches')} style={{ flex:1, padding:'11px', fontSize:13 }}>Voir les matchs</BtnOutline>
                  <BtnPrimary onClick={()=>onNav('dashboard')} style={{ flex:1, padding:'12px', fontSize:13 }}>Tableau de bord</BtnPrimary>
                </div>
              </div>
            </div>
          </div>
        )}
        {step===5 && result && !result.ok && (
          <div style={{ background:'#F4ECEC', borderRadius:12, padding:'18px', color:'#9B3B3B', fontSize:14 }}>{result.error}</div>
        )}
      </div>
    </ScrollView>
  );
}

Object.assign(window, { CreateMatchView });
