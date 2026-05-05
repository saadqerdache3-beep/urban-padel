// Urban Padel — Shared Components — Responsive v4

const UP_COLORS = {
  primary: '#C65D3B', primaryHover: '#B04E30', primaryLight: '#F5E8E3',
  primaryPressed: '#9A4128', secondary: '#1A2B4A', secondaryHover: '#243856',
  background: '#F7F8FA', surface: '#FFFFFF', surfaceAlt: '#F0F2F5',
  border: '#E2E6EA', borderStrong: '#C8CDD4', text: '#1A2B4A',
  textMuted: '#6B7890', textLight: '#9AA3B0',
  success: '#3D7A5F', successBg: '#EDF4F0',
  warning: '#A0763A', warningBg: '#F6F0E6',
  danger: '#9B3B3B', dangerBg: '#F4ECEC', gold: '#C8A84B',
};

// ── Hook responsive ─────────────────────────────────────────
function useIsMobile() {
  const [mob, setMob] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mob;
}
window.useIsMobile = useIsMobile;

// ── Header desktop + bottom tab bar mobile ──────────────────
function Header({ nav, user, onNav }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const navItems = user?.role === 'admin'
    ? [{ id:'admin', label:'Admin', icon:'⚙' }]
    : [
        { id:'landing',  label:'Accueil',     icon:'⌂' },
        { id:'booking',  label:'Réservation', icon:'▦' },
        { id:'matches',  label:'Matchs',      icon:'◉' },
        { id:'passport', label:'Passport',    icon:'★' },
      ];

  const go = (id) => {
    setMenuOpen(false);
    if (!user && ['booking','matches','passport','dashboard'].includes(id)) { onNav('login'); return; }
    onNav(id);
  };

  // ── MOBILE : barre basse ────────────────────────────────
  if (isMobile) {
    const mobileItems = user?.role === 'admin'
      ? [{ id:'admin', label:'Admin', icon:'⚙' }]
      : [
          { id:'landing',    label:'Accueil',   },
          { id:'matches',    label:'Matchs',    },
          { id:'booking',    label:'Réserver', },
          { id:'dashboard',  label:'Compte',  },
        ];

    return (
      <>
        {/* Top bar mobile — logo + actions rapides */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex',
          alignItems:'center', padding:'0 16px', height:60, flexShrink:0,
          boxShadow:'0 2px 8px rgba(0,0,0,0.05)', position:'sticky', top:0, zIndex:100 }}>
          <img src="assets/logo.png" alt="UP" style={{ height:42, cursor:'pointer' }}
            onClick={() => go('landing')} />
          <div style={{ flex:1 }} />
          {user ? (
            <AvatarCircle initials={user.initials} size={34} />
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => go('login')} style={{
                background:'transparent', border:`1.5px solid ${C.secondary}`, borderRadius:8,
                color:C.secondary, fontFamily:'inherit', fontSize:12, fontWeight:600,
                cursor:'pointer', padding:'6px 14px' }}>Connexion</button>
              <button onClick={() => go('register')} style={{
                background:C.primary, border:'none', borderRadius:8,
                color:'#fff', fontFamily:'inherit', fontSize:12, fontWeight:700,
                cursor:'pointer', padding:'6px 14px' }}>Joindre</button>
            </div>
          )}
        </div>
        {/* Bottom tab bar */}
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#fff',
          borderTop:`1px solid ${C.border}`, display:'flex', zIndex:200,
          boxShadow:'0 -4px 20px rgba(0,0,0,0.08)', paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
          {mobileItems.map(item => {
            const active = nav === item.id;
            return (
              <button key={item.id} onClick={() => go(item.id)} style={{
                flex:1, background:'transparent', border:'none', cursor:'pointer',
                fontFamily:'inherit', display:'flex', flexDirection:'column',
                alignItems:'center', gap:3, padding:'10px 4px 8px',
                color: active ? C.primary : C.textLight,
                transition:'color 150ms' }}>
                <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
                <span style={{ fontSize:10, fontWeight: active ? 700 : 500, letterSpacing:0.3 }}>
                  {item.label}
                </span>
                {active && <div style={{ width:20, height:2, borderRadius:2, background:C.primary }} />}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ── DESKTOP : barre haute classique ─────────────────────
  return (
    <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`,
      boxShadow:'0 2px 8px rgba(0,0,0,0.05)', display:'flex', alignItems:'center',
      padding:'0 28px', height:76, flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', marginRight:20, cursor:'pointer' }}
        onClick={() => go('landing')}>
        <img src="assets/logo.png" alt="UP" style={{ height:56 }} />
      </div>
      <div style={{ width:1, height:28, background:C.border, marginRight:16 }} />
      {navItems.map(item => (
        <button key={item.id} onClick={() => go(item.id)} style={{
          background:'transparent', border:'none', cursor:'pointer',
          color: nav === item.id ? C.primary : C.textMuted,
          fontFamily:'inherit', fontSize:13, fontWeight: nav === item.id ? 700 : 500,
          padding:'10px 15px',
          borderBottom: nav === item.id ? `2px solid ${C.primary}` : '2px solid transparent',
          transition:'color 150ms', whiteSpace:'nowrap' }}>
          {item.label}
        </button>
      ))}
      <div style={{ flex:1 }} />
      {user ? (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {user.role !== 'admin' && (
            <button onClick={() => go('dashboard')} style={{
              background:'transparent', border:'none',
              color: nav === 'dashboard' ? C.primary : C.textMuted,
              fontFamily:'inherit', fontSize:13, fontWeight: nav === 'dashboard' ? 700 : 500,
              cursor:'pointer', padding:'10px 14px',
              borderBottom: nav === 'dashboard' ? `2px solid ${C.primary}` : '2px solid transparent' }}>
              Tableau de bord
            </button>
          )}
          <AvatarCircle initials={user.initials} size={32} />
        </div>
      ) : (
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => go('login')} style={{
            background:'transparent', border:`1.5px solid ${C.secondary}`, borderRadius:8,
            color:C.secondary, fontFamily:'inherit', fontSize:13, fontWeight:600,
            cursor:'pointer', padding:'8px 18px' }}>Se connecter</button>
          <button onClick={() => go('register')} style={{
            background:C.primary, border:'none', borderRadius:8,
            color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:700,
            cursor:'pointer', padding:'8px 18px' }}>Réserver</button>
        </div>
      )}
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────
function Card({ children, selected, muted, dark, style={}, onClick }) {
  const base = {
    borderRadius: dark?12:muted?10:12, padding:0,
    cursor: onClick?'pointer':'default', transition:'border-color 150ms',
    ...(dark ? { background:UP_COLORS.secondary, boxShadow:'0 3px 16px rgba(0,0,0,0.12)' }
      : muted ? { background:UP_COLORS.surfaceAlt, border:`1px solid ${UP_COLORS.border}` }
      : selected ? { background:UP_COLORS.surface, border:`2px solid ${UP_COLORS.primary}`, boxShadow:'0 3px 16px rgba(0,0,0,0.08)' }
      : { background:UP_COLORS.surface, border:`1px solid ${UP_COLORS.border}`, boxShadow:'0 3px 16px rgba(0,0,0,0.08)' }),
    ...style,
  };
  return <div style={base} onClick={onClick}>{children}</div>;
}

// ── Buttons ──────────────────────────────────────────────
function BtnPrimary({ children, onClick, disabled, style={} }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: disabled?UP_COLORS.borderStrong:hov?UP_COLORS.primaryHover:UP_COLORS.primary,
        color: disabled?UP_COLORS.textLight:'#fff', border:'none', borderRadius:8,
        padding:'12px 24px', fontFamily:'inherit', fontSize:14, fontWeight:700,
        cursor: disabled?'default':'pointer', minHeight:44,
        transition:'background 150ms', ...style }}>
      {children}
    </button>
  );
}

function BtnOutline({ children, onClick, light, style={} }) {
  const [hov, setHov] = React.useState(false);
  const clr = light?'#fff':UP_COLORS.primary;
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov?UP_COLORS.primary:'transparent', color:hov?'#fff':clr,
        border:`2px solid ${hov?UP_COLORS.primary:clr}`, borderRadius:8,
        padding:'10px 22px', fontFamily:'inherit', fontSize:14, fontWeight:700,
        cursor:'pointer', minHeight:42, transition:'all 150ms', ...style }}>
      {children}
    </button>
  );
}

function BtnSecondary({ children, onClick, style={} }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov?UP_COLORS.secondaryHover:UP_COLORS.secondary, color:'#fff',
        border:'none', borderRadius:8, padding:'12px 24px', fontFamily:'inherit',
        fontSize:14, fontWeight:700, cursor:'pointer', minHeight:44,
        transition:'background 150ms', ...style }}>
      {children}
    </button>
  );
}

function BtnGhost({ children, onClick, primary, style={} }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'transparent', border:'none',
        color: hov||primary?UP_COLORS.primary:UP_COLORS.textMuted,
        fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer',
        padding:'6px 12px', transition:'color 150ms', ...style }}>
      {children}
    </button>
  );
}

// ── Chips ────────────────────────────────────────────────
function Chip({ children, variant='default' }) {
  const styles = {
    default:   { bg:UP_COLORS.surfaceAlt,  color:UP_COLORS.textMuted },
    primary:   { bg:UP_COLORS.primaryLight, color:UP_COLORS.primaryPressed },
    success:   { bg:UP_COLORS.successBg,   color:UP_COLORS.success },
    warning:   { bg:UP_COLORS.warningBg,   color:UP_COLORS.warning },
    danger:    { bg:UP_COLORS.dangerBg,    color:UP_COLORS.danger },
    dark:      { bg:UP_COLORS.secondary,   color:'#fff' },
    scheduled: { bg:'#EEF2F7',             color:UP_COLORS.secondary },
    paid:      { bg:'#EDF4F0',             color:'#3D7A5F' },
    unpaid:    { bg:'#F4ECEC',             color:'#9B3B3B' },
    private:   { bg:'#F0F0F8',             color:'#5558A0' },
  };
  const s = styles[variant]||styles.default;
  return (
    <span style={{ background:s.bg, color:s.color, borderRadius:10, padding:'4px 10px',
      fontSize:11, fontWeight:600, display:'inline-block', whiteSpace:'nowrap' }}>
      {children}
    </span>
  );
}

// ── Typography ───────────────────────────────────────────
function SectionLabel({ children, primary }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px',
      color: primary?UP_COLORS.primary:UP_COLORS.textMuted,
      textTransform:'uppercase', display:'block' }}>
      {children}
    </span>
  );
}

function Heading({ children, level='M', white }) {
  const sizes = { XL:36, L:26, M:18, S:15 };
  return (
    <div style={{ fontSize:sizes[level]||18, fontWeight:700,
      color: white?'#fff':UP_COLORS.secondary,
      letterSpacing:level==='XL'?'-0.5px':'normal', lineHeight:1.2 }}>
      {children}
    </div>
  );
}

function TextMuted({ children, size=13 }) {
  return <div style={{ fontSize:size, color:UP_COLORS.textMuted, lineHeight:1.5 }}>{children}</div>;
}

// ── Avatar ───────────────────────────────────────────────
function AvatarCircle({ initials='?', size=40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:UP_COLORS.primary,
      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:Math.max(10,size/3), fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  );
}

function EloBadge({ elo, small }) {
  return (
    <span style={{ background:UP_COLORS.secondary, color:'#fff',
      borderRadius:small?6:10, padding:small?'3px 10px':'10px 20px',
      fontSize:small?11:18, fontWeight:700, display:'inline-block' }}>
      Elo {elo}
    </span>
  );
}

function StarDisplay({ rating=0, max=5, size=16 }) {
  return (
    <span style={{ display:'inline-flex', gap:2 }}>
      {Array.from({length:max},(_,i) => (
        <span key={i} style={{ fontSize:size, color:i<Math.round(rating)?UP_COLORS.gold:UP_COLORS.borderStrong }}>★</span>
      ))}
    </span>
  );
}

function Input({ label, type='text', placeholder, value, onChange, disabled }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:UP_COLORS.text }}>{label}</label>}
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ background: disabled?UP_COLORS.surfaceAlt:UP_COLORS.surface,
          border:`${focus?1.5:1}px solid ${focus?UP_COLORS.primary:UP_COLORS.border}`,
          borderRadius:8, padding:'11px 14px', fontSize:16,
          color: disabled?UP_COLORS.textLight:UP_COLORS.text,
          fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box',
          transition:'border-color 150ms' }} />
    </div>
  );
}

function Separator() {
  return <div style={{ height:1, background:UP_COLORS.border, margin:'2px 0' }} />;
}

function BulletRow({ children, bold }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
      <span style={{ color:UP_COLORS.primary, fontSize:9, marginTop:4, flexShrink:0 }}>●</span>
      <span style={{ fontSize:13, color:UP_COLORS.text, fontWeight:bold?700:400 }}>{children}</span>
    </div>
  );
}

function Stepper({ current, total }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
      {Array.from({length:total},(_,i)=>i+1).map((n,i) => (
        <React.Fragment key={n}>
          {i>0 && <span style={{ color:UP_COLORS.borderStrong, fontSize:12 }}>—</span>}
          <span style={{ background:n===current?UP_COLORS.primary:UP_COLORS.surfaceAlt,
            color:n===current?'#fff':UP_COLORS.textMuted,
            borderRadius:14, padding:'5px 14px', fontSize:12, fontWeight:n===current?700:400 }}>
            Étape {n}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ScrollView avec padding mobile bas (pour la bottom tab bar)
function ScrollView({ children, style={} }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ overflowY:'auto', height:'100%',
      paddingBottom: isMobile ? 80 : 0,
      ...style }}>
      {children}
    </div>
  );
}

function PaymentBadge({ status, onToggle, small }) {
  const isPaid = status === 'paid';
  return (
    <button onClick={onToggle} title={isPaid?'Marquer comme impayé':'Marquer comme payé'}
      style={{ background:isPaid?'#EDF4F0':'#F4ECEC', color:isPaid?'#3D7A5F':'#9B3B3B',
        border:`1.5px solid ${isPaid?'#3D7A5F':'#C53030'}`, borderRadius:8,
        padding:small?'4px 10px':'6px 14px', fontSize:12, fontWeight:700,
        cursor:'pointer', fontFamily:'inherit', transition:'all 150ms', whiteSpace:'nowrap' }}>
      {isPaid?'Payé':'Impayé'}
    </button>
  );
}

function VisibilityBadge({ visibility }) {
  const isPrivate = visibility === 'private';
  return (
    <span style={{ background:isPrivate?'#F0F0F8':'#EEF7F0', color:isPrivate?'#5558A0':'#3D7A5F',
      borderRadius:8, padding:'3px 9px', fontSize:11, fontWeight:600 }}>
      {isPrivate?'Privé':'Public'}
    </span>
  );
}

Object.assign(window, {
  UP_COLORS, useIsMobile, Header, Card, BtnPrimary, BtnOutline, BtnSecondary, BtnGhost,
  Chip, SectionLabel, Heading, TextMuted, AvatarCircle, EloBadge, StarDisplay,
  Input, Separator, BulletRow, Stepper, ScrollView, PaymentBadge, VisibilityBadge,
});
