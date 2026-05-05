// Urban Padel — Auth Views — Responsive
function LoginView({ onNav, onLogin }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async () => {
    setError(''); setBusy(true);
    const r = await Api.login(email, password);
    setBusy(false);
    if (r.ok) {
      AppStore.setCurrentUser(r.user);
      await AppStore.bootstrap();
      onLogin(r.user);
    } else {
      setError(r.message || 'Email ou mot de passe incorrect.');
    }
  };

  return (
    <ScrollView>
      <div style={{ minHeight:'calc(100vh - 60px)', display:'flex', alignItems:'center',
        justifyContent:'center', padding: isMobile ? '24px 20px' : '48px 24px',
        background:C.background }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary,
              textTransform:'uppercase', marginBottom:12 }}>Urban Padel Marrakech</div>
            <h1 style={{ fontSize: isMobile ? 26 : 32, fontWeight:700, color:C.secondary,
              margin:'0 0 8px', letterSpacing:'-0.5px' }}>Bon retour</h1>
            <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>Connectez-vous à votre compte joueur.</p>
          </div>
          <div style={{ background:'#fff', borderRadius:20, padding: isMobile ? '28px 24px' : '40px',
            boxShadow:'0 4px 32px rgba(0,0,0,0.08)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Input label="Adresse email" type="email" placeholder="vous@exemple.ma"
                value={email} onChange={e => setEmail(e.target.value)} />
              <Input label="Mot de passe" type="password" placeholder="Votre mot de passe"
                value={password} onChange={e => setPassword(e.target.value)} />
              {error && (
                <div style={{ padding:'12px 14px', background:C.dangerBg, borderRadius:10,
                  fontSize:13, color:C.danger, fontWeight:600 }}>{error}</div>
              )}
              <BtnPrimary onClick={handleSubmit} disabled={busy}
                style={{ width:'100%', padding:'14px', fontSize:15, marginTop:4 }}>
                {busy ? 'Connexion…' : 'Se connecter'}
              </BtnPrimary>
            </div>
            <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.textMuted }}>
              Pas encore membre ?{' '}
              <button onClick={() => onNav('register')} style={{ background:'none', border:'none',
                color:C.primary, fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                Créer un compte
              </button>
            </div>
          </div>
        </div>
      </div>
    </ScrollView>
  );
}

function RegisterView({ onNav, onLogin }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async () => {
    setError(''); setBusy(true);
    const r = await Api.register(name, email, password, 1.0);
    setBusy(false);
    if (r.ok) {
      AppStore.setCurrentUser(r.user);
      await AppStore.bootstrap();
      onLogin(r.user);
    } else {
      setError(r.message || "Erreur lors de l'inscription.");
    }
  };

  return (
    <ScrollView>
      <div style={{ minHeight:'calc(100vh - 60px)', display:'flex', alignItems:'center',
        justifyContent:'center', padding: isMobile ? '24px 20px' : '48px 24px',
        background:C.background }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary,
              textTransform:'uppercase', marginBottom:12 }}>Urban Padel Marrakech</div>
            <h1 style={{ fontSize: isMobile ? 26 : 32, fontWeight:700, color:C.secondary,
              margin:'0 0 8px', letterSpacing:'-0.5px' }}>Rejoignez le club</h1>
            <p style={{ fontSize:14, color:C.textMuted, margin:0 }}>Créez votre compte joueur gratuitement.</p>
          </div>
          <div style={{ background:'#fff', borderRadius:20, padding: isMobile ? '28px 24px' : '40px',
            boxShadow:'0 4px 32px rgba(0,0,0,0.08)', border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Input label="Nom complet" placeholder="Prénom Nom"
                value={name} onChange={e => setName(e.target.value)} />
              <Input label="Adresse email" type="email" placeholder="vous@exemple.ma"
                value={email} onChange={e => setEmail(e.target.value)} />
              <Input label="Mot de passe" type="password" placeholder="Min. 6 caractères"
                value={password} onChange={e => setPassword(e.target.value)} />
              {error && (
                <div style={{ padding:'12px 14px', background:C.dangerBg, borderRadius:10,
                  fontSize:13, color:C.danger, fontWeight:600 }}>{error}</div>
              )}
              <BtnPrimary onClick={handleSubmit} disabled={busy}
                style={{ width:'100%', padding:'14px', fontSize:15, marginTop:4 }}>
                {busy ? 'Création…' : 'Créer mon compte'}
              </BtnPrimary>
            </div>
            <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.textMuted }}>
              Déjà membre ?{' '}
              <button onClick={() => onNav('login')} style={{ background:'none', border:'none',
                color:C.primary, fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                Se connecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </ScrollView>
  );
}
Object.assign(window, { LoginView, RegisterView });
