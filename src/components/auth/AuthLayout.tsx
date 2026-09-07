import { ReactNode, CSSProperties, useState, useEffect } from 'react'
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

export function AuthLayout({ children, hero, stats = defaultStats }: AuthLayoutProps) {
  const { profile } = useAuth()
  const logoLink = profile ? '/dashboard' : '/'

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  /* ── styles calculés selon breakpoint ── */
  const rootStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isDesktop ? 'row' : 'column',
    width: '100%',
    height: '100svh',
    maxHeight: '100svh',
    overflow: 'hidden',
    background: 'linear-gradient(135deg,#020617 0%,#0f172a 100%)',
  }

  const rightStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    flexGrow: 0,
    width: isDesktop ? '55%' : '100%',
    height: isDesktop ? '100svh' : '100%',
    flex: isDesktop ? 'none' : '1 1 auto',
    overflow: 'hidden',
    background: isDesktop
      ? 'linear-gradient(160deg,#0d1526 0%,#0a1020 100%)'
      : 'transparent',
    borderLeft: isDesktop ? '1px solid rgba(255,255,255,0.04)' : 'none',
  }

  const rightContentStyle: CSSProperties = {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch' as never,
    padding: 'clamp(1.25rem,4vw,2.5rem)',
    minHeight: 0,
  }

  return (
    <div style={rootStyle}>

      {/* ══ PANNEAU GAUCHE — desktop only ══ */}
      {isDesktop && (
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          flexGrow: 0,
          width: '45%',
          height: '100svh',
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 25%',
        }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,rgba(2,6,23,.88) 0%,rgba(15,23,42,.6) 50%,rgba(2,6,23,.4) 100%)' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(2,6,23,.95) 0%,transparent 50%)' }} />
          <div style={{ position:'absolute', top:'-100px', left:'-100px', width:'450px', height:'450px', background:'radial-gradient(circle,rgba(59,130,246,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'5%', right:'-80px', width:'350px', height:'350px', background:'radial-gradient(circle,rgba(74,222,128,.07) 0%,transparent 70%)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', height:'100%', padding:'clamp(2rem,3vw,3.5rem)', overflow:'hidden' }}>

            <Link to={logoLink} style={{ display:'flex', alignItems:'center', gap:'.75rem', textDecoration:'none', marginBottom:'2.5rem', width:'fit-content', flexShrink:0 }}>
              <img src="/logo-h5.png" alt="League H5" style={{ width:'2.5rem', height:'2.5rem', objectFit:'contain' }} />
              <span style={{ color:'#f8fafc', fontWeight:900, fontSize:'1.2rem', letterSpacing:'.02em' }}>League H5</span>
            </Link>

            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', minHeight:0, overflow:'hidden' }}>
              <div style={{ marginBottom:'1.25rem' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'.5rem', padding:'.35rem .875rem', borderRadius:'999px', background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.3)', color:'#93c5fd', fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#60a5fa', boxShadow:'0 0 6px #60a5fa', flexShrink:0 }} className="animate-pulse" />
                  Saison en cours
                </span>
              </div>

              <h1 style={{ fontWeight:900, lineHeight:1.05, letterSpacing:'-.025em', marginBottom:'1rem', fontSize:'clamp(2rem,3.2vw,3.5rem)' }}>
                <span style={{ color:'#f8fafc', display:'block' }}>La ligue</span>
                <span style={{ display:'block', marginTop:'.1em', background:'linear-gradient(100deg,#60a5fa 0%,#a5b4fc 50%,#4ade80 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  interne H5
                </span>
              </h1>

              <p style={{ color:'#94a3b8', lineHeight:1.65, fontWeight:400, marginBottom:'2rem', fontSize:'clamp(.875rem,1.05vw,1rem)', maxWidth:'34ch' }}>
                Suivez les matchs, classements et statistiques de votre ligue de football à 5.
              </p>

              <div style={{ display:'flex', flexWrap:'wrap', gap:'1.25rem 2.5rem' }}>
                {stats.map((stat, idx) => (
                  <div key={idx}>
                    <p style={{ fontWeight:900, color:'#f8fafc', fontSize:'clamp(1.5rem,2.2vw,2.25rem)', lineHeight:1 }}>{stat.value}</p>
                    <p style={{ color:'#64748b', fontWeight:600, fontSize:'.7rem', marginTop:'.25rem', textTransform:'uppercase', letterSpacing:'.08em' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:'1.25rem', marginTop:'auto', flexShrink:0 }}>
              <p style={{ color:'#64748b', fontSize:'.78rem', fontStyle:'italic', lineHeight:1.6 }}>
                "Le football, c'est simple. Mais jouer simplement, c'est la chose la plus difficile."
              </p>
              <p style={{ color:'#475569', fontSize:'.72rem', marginTop:'.35rem', fontWeight:700 }}>— Johan Cruyff</p>
            </div>
          </div>

          {hero && <div style={{ position:'relative', zIndex:10, marginTop:'auto', marginBottom:'2rem', padding:'0 2rem', flexShrink:0 }}>{hero}</div>}
        </div>
      )}

      {/* ══ PANNEAU DROIT ══ */}
      <div style={rightStyle}>

        {/* Fond mobile — image + overlay */}
        {!isDesktop && (
          <>
            <div style={{ position:'absolute', inset:0, backgroundImage:`url(${bgImage})`, backgroundSize:'cover', backgroundPosition:'center', zIndex:0 }} />
            <div style={{ position:'absolute', inset:0, background:'rgba(2,6,23,.9)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', zIndex:1 }} />
          </>
        )}

        {/* Déco */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(59,130,246,.5),transparent)', zIndex:2 }} />

        {/* Contenu scrollable */}
        <div style={rightContentStyle}>

          {/* Logo mobile */}
          {!isDesktop && (
            <Link to={logoLink} style={{ display:'flex', alignItems:'center', gap:'.75rem', textDecoration:'none', marginBottom:'2rem', flexShrink:0 }}>
              <img src="/logo-h5.png" alt="League H5" style={{ width:'2.25rem', height:'2.25rem', objectFit:'contain' }} />
              <span style={{ color:'#f8fafc', fontWeight:900, fontSize:'1.1rem', letterSpacing:'.02em' }}>League H5</span>
            </Link>
          )}

          {/* Formulaire */}
          <div style={{ width:'100%', maxWidth:'460px' }}>
            {children}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position:'relative', zIndex:10, padding:'.75rem 1.5rem', textAlign:'center', flexShrink:0 }}>
          <p style={{ color:'#1e293b', fontSize:'.7rem', fontWeight:500 }}>© 2025 League H5 · Tous droits réservés</p>
        </div>
      </div>

    </div>
  )
}
