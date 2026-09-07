import { ReactNode, CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import bgImage from '@/assets/leagueH5-bg_login.jpg'

interface AuthLayoutProps {
  children: ReactNode
  hero?: ReactNode
  stats?: Array<{ value: string; label: string }>
}

const defaultStats = [
  { value: '5v5',  label: 'Format' },
  { value: '100%', label: 'Compétitif' },
  { value: '⚡',   label: 'Temps réel' },
]

/* ─── styles partagés ─── */
const S = {
  root: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg,#020617 0%,#0f172a 100%)',
  } as CSSProperties,

  left: {
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    flexGrow: 0,
    width: '45%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundSize: 'cover',
    backgroundPosition: 'center 25%',
  } as CSSProperties,

  right: {
    position: 'relative',
    flexShrink: 0,
    flexGrow: 0,
    width: '55%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(160deg,#0d1526 0%,#0a1020 100%)',
    borderLeft: '1px solid rgba(255,255,255,0.04)',
  } as CSSProperties,

  rightContent: {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(1.5rem,4vw,3rem)',
    overflowY: 'auto',
  } as CSSProperties,

  formInner: {
    width: '100%',
    maxWidth: '460px',
  } as CSSProperties,
}

export function AuthLayout({ children, hero, stats = defaultStats }: AuthLayoutProps) {
  const { profile } = useAuth()
  const logoLink = profile ? '/dashboard' : '/'

  /* ── Responsive : mobile = colonne, desktop = ligne ── */
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  return (
    <>
      {/* Inject responsive rule once */}
      <style>{`
        @media(max-width:1023px){
          .al-root{flex-direction:column!important}
          .al-left{display:none!important}
          .al-right{width:100%!important;min-width:0!important}
        }
        @media(min-width:1024px){
          .al-root{flex-direction:row!important}
          .al-left{display:flex!important}
          .al-right{width:55%!important}
        }
      `}</style>

      <div className="al-root" style={S.root}>

        {/* ══ PANNEAU GAUCHE ══ */}
        <div
          className="al-left"
          style={{ ...S.left, backgroundImage: `url(${bgImage})` }}
        >
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,rgba(2,6,23,.88) 0%,rgba(15,23,42,.6) 50%,rgba(2,6,23,.4) 100%)' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(2,6,23,.95) 0%,transparent 50%)' }} />
          <div style={{ position:'absolute', top:'-100px', left:'-100px', width:'450px', height:'450px', background:'radial-gradient(circle,rgba(59,130,246,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'5%', right:'-80px', width:'350px', height:'350px', background:'radial-gradient(circle,rgba(74,222,128,.07) 0%,transparent 70%)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', height:'100%', padding:'clamp(2rem,3vw,3.5rem)' }}>

            {/* Logo */}
            <Link to={logoLink} style={{ display:'flex', alignItems:'center', gap:'.75rem', textDecoration:'none', marginBottom:'3rem', width:'fit-content' }}>
              <img src="/logo-h5.png" alt="League H5" style={{ width:'2.5rem', height:'2.5rem', objectFit:'contain' }} />
              <span style={{ color:'#f8fafc', fontWeight:900, fontSize:'1.2rem', letterSpacing:'.02em' }}>League H5</span>
            </Link>

            {/* Centre */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>

              {/* Badge */}
              <div style={{ marginBottom:'1.5rem' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'.5rem', padding:'.375rem 1rem', borderRadius:'999px', background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.3)', color:'#93c5fd', fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#60a5fa', boxShadow:'0 0 6px #60a5fa', flexShrink:0, animation:'pulse 2s infinite' }} />
                  Saison en cours
                </span>
              </div>

              {/* Titre */}
              <h1 style={{ fontWeight:900, lineHeight:1.05, letterSpacing:'-.025em', marginBottom:'1.25rem', fontSize:'clamp(2.25rem,3.2vw,3.75rem)' }}>
                <span style={{ color:'#f8fafc', display:'block' }}>La ligue</span>
                <span style={{ display:'block', marginTop:'.1em', background:'linear-gradient(100deg,#60a5fa 0%,#a5b4fc 50%,#4ade80 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  interne H5
                </span>
              </h1>

              {/* Description */}
              <p style={{ color:'#94a3b8', lineHeight:1.7, fontWeight:400, marginBottom:'2.5rem', fontSize:'clamp(.875rem,1.05vw,1rem)', maxWidth:'34ch' }}>
                Suivez les matchs, classements et statistiques de votre ligue de football à 5.
              </p>

              {/* Stats */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'1.5rem 3rem' }}>
                {stats.map((stat, idx) => (
                  <div key={idx}>
                    <p style={{ fontWeight:900, color:'#f8fafc', fontSize:'clamp(1.5rem,2.2vw,2.25rem)', lineHeight:1 }}>{stat.value}</p>
                    <p style={{ color:'#64748b', fontWeight:600, fontSize:'.7rem', marginTop:'.3rem', textTransform:'uppercase', letterSpacing:'.08em' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Citation */}
            <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:'1.5rem', marginTop:'auto' }}>
              <p style={{ color:'#64748b', fontSize:'.8rem', fontStyle:'italic', lineHeight:1.65 }}>
                "Le football, c'est simple. Mais jouer simplement, c'est la chose la plus difficile."
              </p>
              <p style={{ color:'#475569', fontSize:'.75rem', marginTop:'.4rem', fontWeight:700 }}>— Johan Cruyff</p>
            </div>
          </div>

          {hero && <div style={{ position:'relative', zIndex:10, marginTop:'auto', marginBottom:'2.5rem', padding:'0 2.5rem' }}>{hero}</div>}
        </div>

        {/* ══ PANNEAU DROIT ══ */}
        <div className="al-right" style={S.right}>

          {/* Fond mobile (image) */}
          <div style={{ position:'absolute', inset:0, backgroundImage:`url(${bgImage})`, backgroundSize:'cover', backgroundPosition:'center', zIndex:0 }} className="lg:hidden" />
          <div style={{ position:'absolute', inset:0, background:'rgba(2,6,23,.9)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', zIndex:1 }} className="lg:hidden" />

          {/* Ligne lumineuse top */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent 0%,rgba(59,130,246,.5) 50%,transparent 100%)', zIndex:2 }} />
          {/* Glow */}
          <div style={{ position:'absolute', top:'-150px', left:'50%', transform:'translateX(-50%)', width:'600px', height:'600px', background:'radial-gradient(circle,rgba(59,130,246,.06) 0%,transparent 60%)', pointerEvents:'none', zIndex:2 }} />

          {/* Contenu */}
          <div style={S.rightContent}>

            {/* Logo mobile */}
            <Link to={logoLink} className="lg:hidden" style={{ display:'flex', alignItems:'center', gap:'.75rem', textDecoration:'none', marginBottom:'2.5rem' }}>
              <img src="/logo-h5.png" alt="League H5" style={{ width:'2.5rem', height:'2.5rem', objectFit:'contain' }} />
              <span style={{ color:'#f8fafc', fontWeight:900, fontSize:'1.2rem', letterSpacing:'.02em' }}>League H5</span>
            </Link>

            {/* Formulaire */}
            <div style={S.formInner}>
              {children}
            </div>
          </div>

          {/* Footer */}
          <div style={{ position:'relative', zIndex:10, padding:'1rem 1.5rem', textAlign:'center' }}>
            <p style={{ color:'#1e293b', fontSize:'.7rem', fontWeight:500 }}>© 2025 League H5 · Tous droits réservés</p>
          </div>
        </div>

      </div>
    </>
  )
}
