// Urban Padel — Landing View — Responsive
function LandingView({ onNav, user }) {
  const C = UP_COLORS;
  const isMobile = useIsMobile();
  const px = isMobile ? '20px' : '48px';
  const maxW = 1080;

  const go = (dest) => {
    if (!user) { onNav('login'); return; }
    onNav(dest);
  };

  return (
    <ScrollView>
      {/* ── HERO ── */}
      <section style={{ background:'#fff', padding: isMobile ? '32px 0 0' : '80px 0 0' }}>
        <div style={{ maxWidth:maxW, margin:'0 auto', padding:`0 ${px}` }}>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 28 : 64, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:C.primaryLight, borderRadius:20, padding:'6px 14px', marginBottom:20 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.primary, display:'inline-block' }} />
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase' }}>Club de padel · Marrakech</span>
              </div>
              <h1 style={{ fontSize: isMobile ? 36 : 52, fontWeight:700, color:C.secondary, lineHeight:1.08, letterSpacing:'-1px', margin:'0 0 16px' }}>
                Réservez.<br />Jouez.<br /><span style={{ color:C.primary }}>Progressez.</span>
              </h1>
              <p style={{ fontSize: isMobile ? 14 : 16, color:C.textMuted, lineHeight:1.7, margin:'0 0 24px' }}>
                Sessions de 1h30 sur 3 terrains extérieurs premium. Réservation en quelques clics, matchs ouverts et votre Padel Passport pour mesurer chaque progrès.
              </p>
              <div style={{ display:'flex', gap:10, marginBottom:28, flexWrap:'wrap' }}>
                <BtnPrimary onClick={() => go('booking')} style={{ padding: isMobile ? '12px 20px' : '14px 28px', fontSize: isMobile ? 14 : 15, flex: isMobile ? 1 : 'none' }}>Réserver un terrain</BtnPrimary>
                <BtnOutline onClick={() => go('matches')} style={{ padding: isMobile ? '10px 20px' : '12px 26px', fontSize: isMobile ? 14 : 15, flex: isMobile ? 1 : 'none' }}>Trouver un match</BtnOutline>
              </div>
              <div style={{ display:'flex', gap:0, paddingTop:24, borderTop:`1px solid ${C.border}` }}>
                {[['3','Terrains'],['1h30','Session'],['110 MAD','/ joueur']].map(([v,l],i) => (
                  <div key={v} style={{ flex:1, paddingRight:i<2?16:0, borderRight:i<2?`1px solid ${C.border}`:'none', paddingLeft:i>0?16:0 }}>
                    <div style={{ fontSize: isMobile ? 20 : 26, fontWeight:700, color:C.secondary, lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dark card — masquée sur très petit écran, visible sinon */}
            {!isMobile && (
              <div>
                <div style={{ background:C.secondary, borderRadius:20, padding:'40px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'rgba(198,93,59,0.08)' }} />
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:C.primary, textTransform:'uppercase', marginBottom:12 }}>Urban Padel</div>
                  <div style={{ fontSize:44, fontWeight:700, color:'#fff', lineHeight:1, marginBottom:16 }}>Marrakech</div>
                  <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:32 }}>
                    Deux courts doubles et un terrain individuel pensés pour la performance.
                  </div>
                  {[
                    ['Terrain 1', 'Double', '110 MAD / joueur'],
                    ['Terrain 2', 'Double', '110 MAD / joueur'],
                    ['Terrain Individuel', 'Simple', '125 MAD / joueur'],
                  ].map(([name,type,price]) => (
                    <div key={name} style={{ display:'flex', alignItems:'center', padding:'12px 0', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:C.primary, marginRight:12, flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:600, color:'#fff', flex:1 }}>{name}</span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)', background:'rgba(255,255,255,0.07)', borderRadius:6, padding:'3px 8px', marginRight:8 }}>{type}</span>
                      <span style={{ fontSize:11, color:C.primary, fontWeight:700 }}>{price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ height:40, background:`linear-gradient(to bottom, #fff, ${C.background})`, marginTop:40 }} />
      </section>

      {/* ── AUTH BANNER ── */}
      {!user && (
        <section style={{ background:C.primaryLight, borderTop:`1px solid rgba(198,93,59,0.15)`, borderBottom:`1px solid rgba(198,93,59,0.15)` }}>
          <div style={{ maxWidth:maxW, margin:'0 auto', padding:`16px ${px}`, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.secondary }}>Accès réservé aux membres</div>
              <div style={{ fontSize:13, color:C.textMuted, marginTop:2 }}>Créez un compte gratuit pour réserver et rejoindre des matchs.</div>
            </div>
            <div style={{ display:'flex', gap:10, flexShrink:0 }}>
              <button onClick={() => onNav('login')} style={{ background:'transparent', border:`1.5px solid ${C.primary}`, borderRadius:8, color:C.primary, fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer', padding:'9px 16px' }}>Connexion</button>
              <BtnPrimary onClick={() => onNav('register')} style={{ padding:'9px 16px', fontSize:13 }}>Créer un compte</BtnPrimary>
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section style={{ background:C.background, padding: isMobile ? '48px 0' : '80px 0' }}>
        <div style={{ maxWidth:maxW, margin:'0 auto', padding:`0 ${px}` }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <SectionLabel>Comment ça marche</SectionLabel>
            <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight:700, color:C.secondary, margin:'12px 0 0', letterSpacing:'-0.5px' }}>Jouer en 4 étapes.</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12 }}>
            {[
              ['01','Créneau','Choisissez parmi les prochains jours. Sessions 1h30.'],
              ['02','Terrain','Double ou individuel, selon votre format.'],
              ['03','Partage','Lien unique pour inviter vos partenaires.'],
              ['04','Progression','Score Elo, réputation, historique.'],
            ].map(([num,title,desc]) => (
              <div key={num} style={{ background:'#fff', borderRadius:14, padding: isMobile ? '20px 16px' : '28px 24px', boxShadow:'0 2px 20px rgba(0,0,0,0.05)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:10, right:14, fontSize:36, fontWeight:800, color:C.primary, opacity:0.07, lineHeight:1 }}>{num}</div>
                <div style={{ width:32, height:32, borderRadius:10, background:C.primaryLight, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.primary }}>{num}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:C.secondary, marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ background:'#fff', padding: isMobile ? '48px 0' : '80px 0' }}>
        <div style={{ maxWidth:maxW, margin:'0 auto', padding:`0 ${px}` }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <SectionLabel>Tarifs</SectionLabel>
            <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight:700, color:C.secondary, margin:'12px 0 0', letterSpacing:'-0.5px' }}>Simple et transparent.</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:16 }}>
            {[
              { name:'Terrain 1', type:'Double', cap:'4 joueurs', price:'110', unit:'par joueur', total:'440 MAD / séance', icon:'▣' },
              { name:'Terrain 2', type:'Double', cap:'4 joueurs', price:'110', unit:'par joueur', total:'440 MAD / séance', icon:'▣' },
              { name:'Terrain Individuel', type:'Simple', cap:'2 joueurs', price:'125', unit:'par joueur', total:'250 MAD / séance', icon:'◈' },
            ].map(t => (
              <div key={t.name} style={{ background:C.background, borderRadius:16, padding:'28px 24px', border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:17, fontWeight:700, color:C.secondary }}>{t.name}</div>
                    <div style={{ fontSize:13, color:C.textMuted, marginTop:3 }}>{t.cap}</div>
                  </div>
                  <span style={{ fontSize:24 }}>{t.icon}</span>
                </div>
                <div style={{ fontSize:36, fontWeight:700, color:C.primary, lineHeight:1 }}>{t.price} <span style={{ fontSize:14, fontWeight:600, color:C.textMuted }}>MAD</span></div>
                <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>{t.unit}</div>
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, fontSize:12, color:C.textMuted }}>{t.total}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ELO ── */}
      <section style={{ background:C.secondary, padding: isMobile ? '48px 0' : '80px 0' }}>
        <div style={{ maxWidth:maxW, margin:'0 auto', padding:`0 ${px}` }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.primary, textTransform:'uppercase', marginBottom:12 }}>Système de progression</div>
            <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight:700, color:'#fff', margin:'0 0 16px', letterSpacing:'-0.5px' }}>Votre Padel Passport.</h2>
            <p style={{ fontSize: isMobile ? 13 : 15, color:'rgba(255,255,255,0.6)', lineHeight:1.7, maxWidth:560, margin:'0 auto' }}>
              Un score Elo évolue après chaque match. Victoire → +0,15. Défaite → −0,10. Plus votre Elo progresse, plus vos adversaires sont compétitifs.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap:10 }}>
            {[
              ['Débutant','1.0 — 2.5'],['Intermédiaire','2.5 — 4.0'],['Confirmé','4.0 — 5.5'],
              ['Avancé','5.5 — 7.0'],['Expert / Élite','7.0+'],
            ].map(([lvl,range]) => (
              <div key={lvl} style={{ background:'rgba(255,255,255,0.07)', borderRadius:12, padding:isMobile?'14px':' 20px 18px', textAlign:'center', border:'1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight:700, color:'#fff', marginBottom:6 }}>{lvl}</div>
                <div style={{ fontSize:11, color:C.primary, fontWeight:700 }}>{range}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background:'#fff', padding: isMobile ? '48px 0' : '80px 0' }}>
        <div style={{ maxWidth:maxW, margin:'0 auto', padding:`0 ${px}`, textAlign:'center' }}>
          <h2 style={{ fontSize: isMobile ? 26 : 40, fontWeight:700, color:C.secondary, margin:'0 0 16px', letterSpacing:'-0.5px' }}>
            Prêt à jouer ?
          </h2>
          <p style={{ fontSize:15, color:C.textMuted, lineHeight:1.7, marginBottom:28 }}>
            Rejoignez la communauté Urban Padel Marrakech.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <BtnPrimary onClick={() => go('booking')} style={{ padding:'14px 32px', fontSize:15 }}>Réserver un terrain</BtnPrimary>
            <BtnOutline onClick={() => go('matches')} style={{ padding:'12px 28px', fontSize:15 }}>Rejoindre un match</BtnOutline>
          </div>
        </div>
      </section>

      <div style={{ height:16, background:C.background }} />
    </ScrollView>
  );
}
Object.assign(window, { LandingView });
