// Urban Padel — Admin Utilisateurs
function AdminUsers() {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const { users } = useStore();
  const [search, setSearch]     = React.useState('');
  const [filterRole, setFilterRole] = React.useState('');
  const [filterLevel, setFilterLevel] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('active'); // active | archived | all
  const [sortBy, setSortBy]     = React.useState('name');
  const [detail, setDetail]     = React.useState(null);
  const [editUser, setEditUser] = React.useState(null);
  const [addModal, setAddModal] = React.useState(false);
  const [addForm, setAddForm]   = React.useState({
    name: '', email: '', password: '', elo: 3.0, role: 'player',
  });
  const [addError, setAddError] = React.useState(null);
  const [busy, setBusy]         = React.useState(false);
  const [feedback, setFeedback] = React.useState(null); // {type, msg}

  const cat = elo => elo < 2.5?'Débutant':elo < 4.0?'Intermédiaire':elo < 5.5?'Confirmé':elo < 7.0?'Avancé':elo < 8.5?'Expert':'Élite';
  const LEVELS = ['Débutant','Intermédiaire','Confirmé','Avancé','Expert','Élite'];

  // KPIs ne comptent QUE les utilisateurs actifs (non archivés) — sauf le total
  const activeUsers = users.filter(u => !u.archived);

  const filtered = users.filter(u => {
    if (filterStatus === 'active'   && u.archived) return false;
    if (filterStatus === 'archived' && !u.archived) return false;
    if (filterRole  && u.role !== filterRole) return false;
    if (filterLevel && cat(u.elo) !== filterLevel) return false;
    if (search && ![u.name||u.full_name||'', u.email||''].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b) => {
    if (sortBy==='elo')     return b.elo - a.elo;
    if (sortBy==='matches') return (b.stats?.played||0) - (a.stats?.played||0);
    return (a.name||a.full_name||'').localeCompare(b.name||b.full_name||'');
  });

  // ── Archivage : NE supprime PAS le compte, le désactive ────
  // L'historique (matchs joués, notations, Elo) reste intact.
  const handleArchive = async (u) => {
    if (!window.confirm(`Archiver "${u.name||u.full_name}" ?\n\nLe compte sera désactivé mais son historique de matchs et de notations sera préservé. Vous pourrez le réactiver à tout moment.`)) return;
    setBusy(true);
    const r = await AppStore.archiveUser(u.id, true);
    setBusy(false);
    if (r.ok) setFeedback({ type:'ok', msg:`${u.name||u.full_name} a été archivé.` });
    else setFeedback({ type:'err', msg: r.message || "Échec de l'archivage." });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRestore = async (u) => {
    setBusy(true);
    const r = await AppStore.archiveUser(u.id, false);
    setBusy(false);
    if (r.ok) setFeedback({ type:'ok', msg:`${u.name||u.full_name} a été réactivé.` });
    else setFeedback({ type:'err', msg: r.message || "Échec de la réactivation." });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Sauvegarde réelle des modifications via l'API admin
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setBusy(true);
    const r = await AppStore.updateUser(editUser.id, {
      full_name: editUser.name || editUser.full_name,
      email:     editUser.email,
      role:      editUser.role,
      elo:       Number(editUser.elo),
    });
    setBusy(false);
    if (r.ok) {
      setEditUser(null);
      setFeedback({ type:'ok', msg:'Modifications enregistrées.' });
    } else {
      setFeedback({ type:'err', msg: r.message || 'Échec de la sauvegarde.' });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // Création d'un nouvel utilisateur via l'API admin
  const resetAddForm = () => {
    setAddForm({ name:'', email:'', password:'', elo:3.0, role:'player' });
    setAddError(null);
  };

  const handleAddUser = async () => {
    setAddError(null);
    // Validation côté front pour donner un retour immédiat
    if (!addForm.name.trim())                 { setAddError('Le nom complet est requis.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addForm.email)) { setAddError('Adresse email invalide.'); return; }
    if (!addForm.password || addForm.password.length < 6) { setAddError('Le mot de passe doit contenir au moins 6 caractères.'); return; }

    setBusy(true);
    const r = await AppStore.createUser({
      full_name: addForm.name.trim(),
      email:     addForm.email.trim().toLowerCase(),
      password:  addForm.password,
      role:      addForm.role,
      elo:       Number(addForm.elo) || 3.0,
    });
    setBusy(false);
    if (r.ok) {
      setAddModal(false);
      resetAddForm();
      setFeedback({ type:'ok', msg:`${addForm.name} a été ajouté(e) avec succès.` });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setAddError(r.message || "Échec de la création de l'utilisateur.");
    }
  };

  const FieldLabel = ({children}) => <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:5 }}>{children}</div>;

  return (
    <div style={{ padding: isMobile ? '16px 16px 32px' : '40px 48px', maxWidth:1100, overflowX:'auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:8 }}>Administration</div>
          <h1 style={{ fontSize:28, fontWeight:700, color:C.secondary, margin:'0 0 4px', letterSpacing:'-0.5px' }}>Gestion des utilisateurs</h1>
          <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>{activeUsers.length} compte(s) actif(s) · {users.filter(u=>u.archived).length} archivé(s)</p>
        </div>
        <BtnPrimary onClick={()=>setAddModal(true)} style={{ fontSize:13, padding:'11px 22px' }}>+ Ajouter un joueur</BtnPrimary>
      </div>

      {/* Feedback flottant */}
      {feedback && (
        <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background: feedback.type==='ok' ? '#EDF4F0' : '#F4ECEC', color: feedback.type==='ok' ? '#3D7A5F' : '#9B3B3B', fontSize:13, fontWeight:600 }}>
          {feedback.msg}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        <KPICard label="Total joueurs" value={activeUsers.filter(u=>u.role==='player').length} accent={C.secondary} />
        <KPICard label="Admins" value={activeUsers.filter(u=>u.role==='admin').length} accent={C.primary} />
        <KPICard label="Elo moyen" value={(activeUsers.reduce((s,u)=>s+(u.elo||0),0)/Math.max(activeUsers.length,1)).toFixed(1)} sub="Comptes actifs" />
        <KPICard label="Matchs joués" value={users.reduce((s,u)=>s+(u.stats?.played||0),0)} sub="Cumulé (incl. archivés)" accent="#3D7A5F" />
      </div>

      {/* Filters */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr 1fr', gap:10, marginBottom:20 }}>
        <AdminSearch value={search} onChange={setSearch} placeholder="Nom, email..." />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="active">Actifs</option>
          <option value="archived">Archivés</option>
          <option value="all">Tous</option>
        </select>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="">Tous les rôles</option>
          <option value="player">Joueur</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filterLevel} onChange={e=>setFilterLevel(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="">Tous niveaux</option>
          {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
          <option value="name">Trier par nom</option>
          <option value="elo">Trier par Elo</option>
          <option value="matches">Trier par matchs</option>
        </select>
      </div>

      <div style={{ fontSize:13, color:C.textMuted, marginBottom:14 }}>{filtered.length} résultat(s)</div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr><TH>Joueur</TH><TH>Niveau</TH><TH>Elo</TH><TH>Matchs</TH><TH>Victoires</TH><TH>Réputation</TH><TH>Rôle</TH><TH>Statut</TH><TH>Actions</TH></tr>
          </thead>
          <tbody>
            {filtered.map((u,i) => {
              const winRate = u.stats?.played > 0 ? Math.round(u.stats.wins/u.stats.played*100) : 0;
              const avgRep = ((u.ratings?.fairplay||0)+(u.ratings?.punctuality||0)+(u.ratings?.teamspirit||0))/3;
              return (
                <tr key={u.id} style={{ background:i%2===0?'#fff':'#FAFBFC', opacity: u.archived ? 0.55 : 1 }}>
                  <TD>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <AvatarCircle initials={u.initials||'?'} size={34} />
                      <div>
                        <div style={{ fontWeight:700, color:C.secondary, fontSize:14 }}>{u.name||u.full_name}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{u.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD><Chip variant="primary">{cat(u.elo)}</Chip></TD>
                  <TD>
                    <div style={{ background:C.secondary, color:'#fff', borderRadius:8, padding:'4px 10px', fontSize:13, fontWeight:700, display:'inline-block' }}>{Number(u.elo).toFixed(1)}</div>
                  </TD>
                  <TD style={{ fontWeight:700 }}>{u.stats?.played||0}</TD>
                  <TD>
                    <div style={{ fontWeight:700, color:'#3D7A5F' }}>{u.stats?.wins||0}</div>
                    <div style={{ fontSize:11, color:C.textMuted }}>{winRate}% win rate</div>
                  </TD>
                  <TD>
                    <div style={{ display:'flex', gap:2 }}>
                      {[1,2,3,4,5].map(n=><span key={n} style={{ fontSize:14, color:n<=Math.round(avgRep)?C.gold:C.border }}>★</span>)}
                    </div>
                    <div style={{ fontSize:11, color:C.textMuted }}>{avgRep.toFixed(1)}/5 · {u.ratings?.count||0} avis</div>
                  </TD>
                  <TD>
                    <Chip variant={u.role==='admin'?'dark':'default'}>{u.role==='admin'?'Admin':'Joueur'}</Chip>
                  </TD>
                  <TD>
                    {u.archived
                      ? <Chip variant="danger">Archivé</Chip>
                      : <Chip variant="success">Actif</Chip>}
                  </TD>
                  <TD>
                    <div style={{ display:'flex', gap:4 }}>
                      <ActionBtn label="Profil" onClick={()=>setDetail(u)} />
                      {!u.archived && <ActionBtn label="Modifier" onClick={()=>setEditUser({...u})} />}
                      {u.role!=='admin' && !u.archived && (
                        <ActionBtn label="Archiver" onClick={()=>handleArchive(u)} danger />
                      )}
                      {u.archived && (
                        <ActionBtn label="Réactiver" onClick={()=>handleRestore(u)} />
                      )}
                    </div>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0 && <div style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:14 }}>Aucun utilisateur trouvé.</div>}
      </div>

      {/* Detail modal */}
      {detail && (
        <AdminModal title={detail.name||detail.full_name} subtitle="Profil joueur" onClose={()=>setDetail(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, background:C.surfaceAlt, borderRadius:12, padding:'16px' }}>
              <AvatarCircle initials={detail.initials||'?'} size={60} />
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:C.secondary }}>{detail.name||detail.full_name}</div>
                <div style={{ fontSize:13, color:C.textMuted }}>{detail.email}</div>
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <Chip variant="primary">{cat(detail.elo)}</Chip>
                  <span style={{ background:C.secondary, color:'#fff', borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:700 }}>Elo {Number(detail.elo).toFixed(1)}</span>
                  {detail.archived && <Chip variant="danger">Archivé</Chip>}
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['Matchs joués',detail.stats?.played||0],['Victoires',detail.stats?.wins||0],['Défaites',detail.stats?.losses||0],['Win rate',`${detail.stats?.played>0?Math.round(detail.stats.wins/detail.stats.played*100):0}%`]].map(([k,v])=>(
                <div key={k} style={{ background:C.background, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:4 }}>{k}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:C.primary }}>{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.textMuted, textTransform:'uppercase', marginBottom:10 }}>Réputation</div>
              {[['Fair-play',detail.ratings?.fairplay||0],['Ponctualité',detail.ratings?.punctuality||0],["Esprit d'équipe",detail.ratings?.teamspirit||0]].map(([l,v])=>(
                <div key={l} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:C.secondary }}>{Number(v).toFixed(1)}/5</span>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:C.surfaceAlt }}>
                    <div style={{ height:'100%', borderRadius:3, background:C.primary, width:`${v/5*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={()=>setDetail(null)} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:14, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Fermer</button>
              {!detail.archived && (
                <BtnPrimary onClick={()=>{setDetail(null);setEditUser({...detail});}} style={{ flex:2, padding:'12px', fontSize:14 }}>Modifier</BtnPrimary>
              )}
            </div>
          </div>
        </AdminModal>
      )}

      {/* Edit modal */}
      {editUser && (
        <AdminModal title="Modifier l'utilisateur" onClose={()=>setEditUser(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <FieldLabel>Nom complet</FieldLabel>
              <input type="text" value={editUser.name||editUser.full_name||''} onChange={e=>setEditUser(u=>({...u,name:e.target.value,full_name:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
            </div>
            <div>
              <FieldLabel>Adresse email</FieldLabel>
              <input type="email" value={editUser.email||''} onChange={e=>setEditUser(u=>({...u,email:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
            </div>
            <div>
              <FieldLabel>Score Elo</FieldLabel>
              <input type="number" step="0.1" min="1" max="10" value={editUser.elo||4.0} onChange={e=>setEditUser(u=>({...u,elo:Number(e.target.value)}))}
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
            </div>
            <div>
              <FieldLabel>Rôle</FieldLabel>
              <select value={editUser.role||'player'} onChange={e=>setEditUser(u=>({...u,role:e.target.value}))} style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
                <option value="player">Joueur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:4 }}>
              <button onClick={()=>setEditUser(null)} disabled={busy} style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:14, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Annuler</button>
              <BtnPrimary onClick={handleSaveEdit} disabled={busy} style={{ flex:2, padding:'12px', fontSize:14 }}>{busy ? 'Enregistrement…' : 'Enregistrer'}</BtnPrimary>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Add modal */}
      {addModal && (
        <AdminModal title="Ajouter un utilisateur" onClose={() => { setAddModal(false); resetAddForm(); }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:C.surfaceAlt, borderRadius:8, padding:'10px 12px', fontSize:12, color:C.textMuted }}>
              Le compte sera créé immédiatement avec le mot de passe choisi. Communiquez-le à l'utilisateur — il pourra se connecter dès maintenant.
            </div>
            <div>
              <FieldLabel>Nom complet *</FieldLabel>
              <input type="text" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Yassine Alaoui"
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
            </div>
            <div>
              <FieldLabel>Adresse email *</FieldLabel>
              <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="ex: yassine@exemple.ma"
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
            </div>
            <div>
              <FieldLabel>Mot de passe * <span style={{ fontWeight:400, color:C.textMuted }}>(min. 6 caractères)</span></FieldLabel>
              <input type="text" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mot de passe initial"
                style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <FieldLabel>Rôle</FieldLabel>
                <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color:C.text, fontFamily:'inherit', outline:'none' }}>
                  <option value="player">Joueur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div>
                <FieldLabel>Score Elo de départ</FieldLabel>
                <input type="number" step="0.1" min="1" max="10" value={addForm.elo}
                  onChange={e => setAddForm(f => ({ ...f, elo: e.target.value }))}
                  style={{ width:'100%', boxSizing:'border-box', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
              </div>
            </div>
            {addError && (
              <div style={{ padding:'10px 14px', borderRadius:8, background:'#F4ECEC', color:'#9B3B3B', fontSize:13, fontWeight:600 }}>
                {addError}
              </div>
            )}
            <div style={{ display:'flex', gap:12, marginTop:4 }}>
              <button onClick={() => { setAddModal(false); resetAddForm(); }} disabled={busy}
                style={{ flex:1, background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px', fontSize:14, color:C.textMuted, fontFamily:'inherit', cursor:'pointer', fontWeight:600 }}>Annuler</button>
              <BtnPrimary onClick={handleAddUser} disabled={busy} style={{ flex:2, padding:'12px', fontSize:14 }}>
                {busy ? 'Création…' : "Créer l'utilisateur"}
              </BtnPrimary>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

Object.assign(window, { AdminUsers });
