// Urban Padel — Admin Créneaux v2 — Weekly Calendar View
// Courts: Terrain 1, Terrain 2, Terrain Individuel

const AS_COURTS = [
  { id:1, name:'Terrain 1',          type:'Double', price:440 },
  { id:2, name:'Terrain 2',          type:'Double', price:440 },
  { id:3, name:'Terrain Individuel', type:'Simple', price:125 },
];
const AS_SLOT_TIMES = ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30'];
const asSlotEnd = s => { const [h,m]=s.split(':').map(Number); const t=h*60+m+90; return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`; };

const AS_DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const AS_MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

function asGetWeekDays(weekOffset) {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      day: d.getDate(),
      month: d.getMonth(),
      weekday: AS_DAYS_FR[i],
      isToday: d.toISOString().split('T')[0] === today.toISOString().split('T')[0],
      isPast: d < new Date(today.toISOString().split('T')[0]),
    };
  });
}

function asWeekLabel(days) {
  const first = days[0]; const last = days[6];
  return `Du ${first.day} ${AS_MONTHS_FR[first.month]} au ${last.day} ${AS_MONTHS_FR[last.month]} ${new Date(first.date).getFullYear()}`;
}

// Generate realistic initial slots
function asInitSlots(weekOffset) {
  const days = asGetWeekDays(weekOffset);
  const slots = [];
  let id = 1;
  days.forEach(day => {
    AS_COURTS.forEach(court => {
      AS_SLOT_TIMES.forEach(time => {
        const isPast = new Date(day.date + 'T' + time) < new Date();
        const r = Math.random();
        let status = 'available';
        if (isPast) status = 'available';
        else if (r < 0.18) status = 'booked';
        else if (r < 0.25) status = 'match';
        else if (r < 0.28) status = 'unavailable';
        slots.push({ id: id++, courtId: court.id, courtName: court.name, courtType: court.type, date: day.date, startTime: time, endTime: asSlotEnd(time), status, price: court.price });
      });
    });
  });
  return slots;
}

const AS_STATUS_CONFIG = {
  available:   { label:'Libre',          color:'#3D7A5F', bg:'#EDF4F0', border:'#C3DDD2' },
  booked:      { label:'Réservé',        color:'#A0763A', bg:'#F6F0E6', border:'#DDC8A0' },
  match:       { label:'Match',          color:'#C65D3B', bg:'#F5E8E3', border:'#E0B9AA' },
  unavailable: { label:'Non disponible', color:'#9B3B3B', bg:'#F4ECEC', border:'#DDB8B8' },
};

function AdminSlots() {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [slots, setSlots]           = React.useState(() => asInitSlots(0));
  const [filterCourt, setFilterCourt] = React.useState('all');
  const [modal, setModal]           = React.useState(null); // null | 'create' | slot object
  const [form, setForm]             = React.useState({});
  const [hoverSlot, setHoverSlot]   = React.useState(null);

  const days = asGetWeekDays(weekOffset);

  // When week changes, regenerate slots for that week merged with current
  React.useEffect(() => {
    const newSlots = asInitSlots(weekOffset);
    setSlots(newSlots);
  }, [weekOffset]);

  const today = new Date().toISOString().split('T')[0];

  const getSlot = (courtId, date, time) =>
    slots.find(s => s.courtId === courtId && s.date === date && s.startTime === time);

  const handleSlotClick = (slot) => {
    if (!slot) return;
    if (slot.status === 'available') {
      // Create new slot modal
      setForm({ courtId: String(slot.courtId), date: slot.date, startTime: slot.startTime, status: 'booked' });
      setModal('create');
    } else {
      setForm({ ...slot, courtId: String(slot.courtId) });
      setModal(slot);
    }
  };

  const handleClickEmpty = (courtId, date, time) => {
    setForm({ courtId: String(courtId), date, startTime: time, status: 'booked' });
    setModal('create');
  };

  const handleSave = () => {
    const court = AS_COURTS.find(c => c.id === Number(form.courtId));
    if (!court || !form.date || !form.startTime) return;
    if (modal === 'create') {
      setSlots(s => [...s.filter(x => !(x.courtId === Number(form.courtId) && x.date === form.date && x.startTime === form.startTime)),
        { id: Date.now(), courtId: court.id, courtName: court.name, courtType: court.type, date: form.date, startTime: form.startTime, endTime: asSlotEnd(form.startTime), status: form.status || 'available', price: court.price }
      ]);
    } else {
      setSlots(s => s.map(x => x.id === modal.id ? { ...x, status: form.status, courtId: Number(form.courtId), courtName: court.name, courtType: court.type } : x));
    }
    setModal(null);
  };

  // Au lieu de "supprimer" un créneau (action destructive), on l'annule —
  // c'est-à-dire on le remet à "Libre". Le sens métier est plus clair.
  const handleCancelSlot = (id) => {
    if (!window.confirm('Annuler ce créneau ? Il redeviendra disponible à la réservation.')) return;
    setSlots(s => s.map(x => x.id === id ? { ...x, status: 'available' } : x));
    setModal(null);
  };

  const handleStatusCycle = (slot) => {
    const statuses = ['available','booked','match','unavailable'];
    const next = statuses[(statuses.indexOf(slot.status) + 1) % statuses.length];
    setSlots(s => s.map(x => x.id === slot.id ? { ...x, status: next } : x));
  };

  const courtsToShow = filterCourt === 'all' ? AS_COURTS : AS_COURTS.filter(c => c.id === Number(filterCourt));

  const SlotCell = ({ courtId, date, time, isPast }) => {
    const slot = getSlot(courtId, date, time);
    const cfg = slot ? AS_STATUS_CONFIG[slot.status] : null;
    const isEmpty = !slot;
    const isHovered = hoverSlot === `${courtId}-${date}-${time}`;

    if (isPast && (!slot || slot.status === 'available')) {
      return (
        <div style={{ padding:'6px 8px', borderRadius:6, background:'#F7F8FA', border:'1px solid #E2E6EA', minHeight:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:10, color:C.textLight }}>—</span>
        </div>
      );
    }

    return (
      <div
        onClick={() => isEmpty ? handleClickEmpty(courtId, date, time) : handleSlotClick(slot)}
        onMouseEnter={() => setHoverSlot(`${courtId}-${date}-${time}`)}
        onMouseLeave={() => setHoverSlot(null)}
        style={{
          padding:'6px 8px', borderRadius:6, minHeight:36, cursor:'pointer', transition:'all 150ms',
          background: isHovered ? (cfg ? cfg.border : C.primaryLight) : (cfg ? cfg.bg : '#fff'),
          border: `1px solid ${cfg ? cfg.border : (isHovered ? C.primary : C.border)}`,
          display:'flex', flexDirection:'column', gap:2,
        }}>
        {cfg ? (
          <>
            <span style={{ fontSize:10, fontWeight:700, color:cfg.color, lineHeight:1.2 }}>{cfg.label}</span>
          </>
        ) : (
          <span style={{ fontSize:10, color: isHovered ? C.primary : C.textLight, fontWeight: isHovered ? 700 : 400 }}>{isHovered ? '+ Créer' : 'Libre'}</span>
        )}
      </div>
    );
  };

  // Legend + KPIs
  const statusCounts = slots.reduce((acc, s) => { acc[s.status] = (acc[s.status]||0)+1; return acc; }, {});

  return (
    <div style={{ padding:'32px 40px', maxWidth:1200 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:6 }}>Administration</div>
          <h1 style={{ fontSize:26, fontWeight:700, color:C.secondary, margin:'0 0 4px', letterSpacing:'-0.5px' }}>Gestion des créneaux</h1>
          <p style={{ fontSize:13, color:C.textMuted, margin:0 }}>Vue calendrier hebdomadaire — cliquez sur un créneau pour le modifier.</p>
        </div>
        <BtnPrimary onClick={() => { setForm({ courtId:'1', date:today, startTime:'08:00', status:'booked' }); setModal('create'); }} style={{ fontSize:13, padding:'11px 22px' }}>+ Nouveau créneau</BtnPrimary>
      </div>

      {/* Controls row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {/* Week label */}
        <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'9px 16px', fontSize:14, fontWeight:700, color:C.secondary }}>
          {asWeekLabel(days)}
        </div>
        {/* Court filter */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:C.textMuted, fontWeight:600 }}>Terrain :</span>
          <select value={filterCourt} onChange={e => setFilterCourt(e.target.value)}
            style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
            <option value="all">Tous les terrains</option>
            {AS_COURTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex:1 }} />
        {/* Nav buttons */}
        <button onClick={() => setWeekOffset(w => w-1)}
          style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, color:C.textMuted, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
          ‹ Précédente
        </button>
        <button onClick={() => setWeekOffset(0)}
          style={{ background: weekOffset===0 ? C.primaryLight : '#fff', border:`1px solid ${weekOffset===0?C.primary:C.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, color: weekOffset===0?C.primary:C.textMuted, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
          Aujourd'hui
        </button>
        <button onClick={() => setWeekOffset(w => w+1)}
          style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, color:C.textMuted, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
          Suivante ›
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.05)' }}>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:`80px repeat(7, 1fr)`, borderBottom:`1px solid ${C.border}`, background:C.surfaceAlt }}>
          <div style={{ padding:'12px 10px', fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:1 }}>Heure</div>
          {days.map(d => (
            <div key={d.date} style={{ padding:'12px 8px', textAlign:'center', borderLeft:`1px solid ${C.border}`, background: d.isToday ? C.primaryLight : 'transparent' }}>
              <div style={{ fontSize:12, fontWeight:700, color: d.isToday ? C.primary : C.textMuted }}>{d.weekday}</div>
              <div style={{ fontSize:14, fontWeight:700, color: d.isToday ? C.primary : C.secondary }}>{d.day} {AS_MONTHS_FR[d.month]}</div>
            </div>
          ))}
        </div>

        {/* Time rows */}
        <div style={{ overflowY:'auto', maxHeight:520 }}>
          {AS_SLOT_TIMES.map(time => (
            <div key={time} style={{ display:'grid', gridTemplateColumns:`80px repeat(7, 1fr)`, borderBottom:`1px solid ${C.border}` }}>
              <div style={{ padding:'8px 10px', fontSize:12, fontWeight:700, color:C.textMuted, display:'flex', alignItems:'flex-start', borderRight:`1px solid ${C.border}`, background:C.surfaceAlt }}>
                {time}
              </div>
              {days.map(d => {
                const isPast = new Date(d.date + 'T' + time) < new Date();
                return (
                  <div key={d.date} style={{ padding:'4px', borderLeft:`1px solid ${C.border}`, background: d.isToday ? 'rgba(198,93,59,0.02)' : 'transparent' }}>
                    {/* Show all courts or filtered */}
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {courtsToShow.map(court => (
                        <SlotCell key={court.id} courtId={court.id} date={d.date} time={time} isPast={isPast} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display:'flex', alignItems:'center', gap:20, padding:'12px 16px', borderTop:`1px solid ${C.border}`, background:C.surfaceAlt, flexWrap:'wrap' }}>
          {Object.entries(AS_STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.color }} />
              <span style={{ fontSize:12, fontWeight:600, color:C.textMuted }}>{cfg.label}</span>
              <span style={{ fontSize:12, color:C.textLight }}>({statusCounts[key]||0})</span>
            </div>
          ))}
          <span style={{ flex:1, textAlign:'right', fontSize:11, color:C.textLight }}>Cliquez sur un créneau libre pour le créer.</span>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <AdminModal title={modal==='create' ? 'Nouveau créneau' : 'Modifier le créneau'} onClose={() => setModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Terrain</div>
              <select value={form.courtId||'1'} onChange={e=>setForm(f=>({...f,courtId:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
                {AS_COURTS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Date</div>
              <input type="date" value={form.date||''} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Heure de début</div>
              <select value={form.startTime||'08:00'} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
                {AS_SLOT_TIMES.map(t=><option key={t} value={t}>{t} → {asSlotEnd(t)}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>Statut</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {Object.entries(AS_STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} onClick={() => setForm(f=>({...f,status:key}))}
                    style={{ padding:'10px 14px', borderRadius:10, cursor:'pointer', border:`2px solid ${form.status===key ? cfg.color : C.border}`, background: form.status===key ? cfg.bg : '#fff', transition:'all 150ms' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color }} />
                      <span style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              {modal !== 'create' && modal.status !== 'available' && (
                <button onClick={() => handleCancelSlot(modal.id)}
                  style={{ flex:1, background:'#F4ECEC', border:'none', borderRadius:10, padding:'12px', fontSize:13, color:'#9B3B3B', fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>
                  Annuler le créneau
                </button>
              )}
              <button onClick={() => setModal(null)}
                style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:13, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>
                Fermer
              </button>
              <BtnPrimary onClick={handleSave} style={{ flex:2, padding:'12px', fontSize:13 }}>
                {modal==='create' ? 'Créer' : 'Enregistrer'}
              </BtnPrimary>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

Object.assign(window, { AdminSlots });
