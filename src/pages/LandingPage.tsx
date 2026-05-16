/**
 * LandingPage — Page d'accueil publique
 * Présentée aux visiteurs non connectés avant le login
 */

import { Link } from 'react-router-dom'
import {
  Trophy, Calendar, Target, Users, BarChart2,
  MessageCircle, Radio, Star, ArrowRight, Zap,
  Shield, BookOpen,
} from 'lucide-react'
import bgImage from '@/assets/leagueH5-bg_bg.jpg'

import { useLandingStats } from '@/hooks/useLandingStats'
import { useCountUp } from '@/hooks/useCountUp'

// ─────────────────────────────────────────────────────────────────────────────
// Composants internes
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: typeof Trophy
  title: string
  desc: string
  color: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-5 group
                 hover:-translate-y-1.5 transition-all duration-500"
      style={{ 
        background: 'rgba(22, 28, 45, 0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 0% 0%, ${color}15 0%, transparent 70%)` }}
      />
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundColor: color + '15', border: `1px solid ${color}30` }}
      >
        <Icon size={19} style={{ color }} />
      </div>
      <h3 className="text-[13px] font-black text-white mb-1.5 uppercase tracking-wide">{title}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">{desc}</p>
    </div>
  )
}

function StatPill({ value, label, isLoading }: { value: string | number; label: string; isLoading?: boolean }) {
  const numericValue = typeof value === 'number' ? value : parseInt(String(value)) || 0
  const isNumeric = !isNaN(numericValue) && typeof value !== 'string' || (typeof value === 'string' && value.includes('+'))
  const animatedValue = useCountUp(numericValue)
  const displayValue = isNumeric ? (typeof value === 'string' && value.includes('+') ? `${animatedValue}+` : animatedValue) : value

  return (
    <div className="text-center px-4 py-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm group hover:bg-white/[0.05] transition-all duration-500">
      {isLoading ? (
        <div className="h-9 w-12 bg-white/5 rounded mx-auto animate-pulse" />
      ) : (
        <p className="text-3xl font-black text-white tabular-nums tracking-tighter group-hover:scale-110 transition-transform duration-500">
          {displayValue}
        </p>
      )}
      <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-widest">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const { data: stats, isLoading } = useLandingStats()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0D1117' }}
    >
      {/* ── Header minimal ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#C8F135' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#0D1117" strokeWidth="1.5" fill="#C8F135"/>
              <path d="M12 2C12 2 9 6 9 12C9 18 12 22 12 22" stroke="#0D1117" strokeWidth="1.2"/>
              <path d="M2 12H22" stroke="#0D1117" strokeWidth="1.2"/>
              <path d="M4.5 6.5L12 9L19.5 6.5" stroke="#0D1117" strokeWidth="1"/>
              <path d="M4.5 17.5L12 15L19.5 17.5" stroke="#0D1117" strokeWidth="1"/>
            </svg>
          </div>
          <span
            className="text-lg font-black text-white tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            LEAGUE <span style={{ color: '#C8F135' }}>H5</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/rules-public"
            className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <BookOpen size={14} />
            Règlement
          </Link>
          <Link
            to="/auth/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                       bg-primary-600 hover:bg-primary-500 transition-colors"
          >
            Se connecter
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden flex-1 flex flex-col">
        {/* Background image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D1117]/80 via-[#0D1117]/60 to-[#0D1117]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117]/60 via-transparent to-[#0D1117]/60" />
        </div>

        {/* Glow accent */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,241,53,0.08) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-20 lg:py-32 flex-1">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C8F135]/10 border border-[#C8F135]/30 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] animate-pulse" />
            <span className="text-[11px] font-bold text-[#C8F135] uppercase tracking-widest">
              {isLoading ? 'Chargement...' : `${stats?.seasonName ?? 'Saison'} en cours`}
            </span>
          </div>

          {/* Titre */}
          <h1
            className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-none mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            HIGH FIVE
            <br />
            <span style={{ color: '#C8F135' }}>LIGUE</span>
          </h1>

          <p className="text-slate-300 text-base lg:text-lg max-w-lg leading-relaxed mb-8">
            La ligue de football H5 interne. Matchs, classements, statistiques
            et messagerie — tout en temps réel.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/auth/login"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-bold
                         text-[#0D1117] bg-[#C8F135] hover:bg-[#d4f53f] transition-all
                         hover:-translate-y-0.5 shadow-lg shadow-[#C8F135]/20"
            >
              Accéder à la ligue
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/rules-public"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-semibold
                         text-white border border-white/20 hover:border-white/40 hover:bg-white/5
                         transition-all"
            >
              <BookOpen size={16} />
              Voir le règlement
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 py-12 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill value={stats?.teams ?? 0} label="Équipes" isLoading={isLoading} />
          <StatPill value={stats?.players ? `${stats.players}+` : 0} label="Joueurs" isLoading={isLoading} />
          <StatPill value="2×20'" label="Format match" />
          <StatPill value="🔴" label="Live disponible" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-12 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2">Tout ce qu'il vous faut</h2>
            <p className="text-slate-500 text-sm">Une plateforme complète pour gérer votre ligue</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FeatureCard
              icon={Radio}
              title="Live en direct"
              desc="Suivez les matchs en temps réel avec chrono, buts et réactions"
              color="#ef4444"
            />
            <FeatureCard
              icon={Trophy}
              title="Classement"
              desc="Classement général, domicile, extérieur avec forme des équipes"
              color="#f59e0b"
            />
            <FeatureCard
              icon={Target}
              title="Statistiques"
              desc="Buteurs, passeurs, MVP, fair-play et performances individuelles"
              color="#f97316"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Messagerie"
              desc="Chat par équipe, canaux globaux et messages directs"
              color="#3b82f6"
            />
            <FeatureCard
              icon={Calendar}
              title="Calendrier"
              desc="Tous les matchs programmés avec notifications avant le coup d'envoi"
              color="#8b5cf6"
            />
            <FeatureCard
              icon={Users}
              title="Équipes"
              desc="Profils d'équipes, compositions et historique des résultats"
              color="#06b6d4"
            />
            <FeatureCard
              icon={Star}
              title="Vote MVP"
              desc="Élisez l'homme du match après chaque rencontre"
              color="#fbbf24"
            />
            <FeatureCard
              icon={Shield}
              title="Fair-play"
              desc="Suivi des cartons et classement disciplinaire de la saison"
              color="#22c55e"
            />
          </div>
        </div>
      </section>

      {/* ── Valeurs ── */}
      <section
        className="px-6 py-8 border-t border-amber-500/20"
        style={{ background: 'var(--card-bg, linear-gradient(135deg, #1a1200 0%, #0D1117 100%))' }}
      >
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {['RESPECT', 'FAIR-PLAY', 'DISCIPLINE', 'PASSION'].map((v, i) => (
              <span key={v} className="flex items-center gap-3">
                <span
                  className="text-sm font-black text-amber-400 tracking-widest"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {v}
                </span>
                {i < 3 && <span className="text-amber-700 font-black">•</span>}
              </span>
            ))}
          </div>
          <Link
            to="/auth/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                       text-[#0D1117] bg-[#C8F135] hover:bg-[#d4f53f] transition-colors shrink-0"
          >
            Rejoindre la ligue
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-4 border-t border-white/[0.04] text-center">
        <p className="text-xs text-slate-700">© 2026 League H5 · Unis pour le football, ensemble pour la victoire !</p>
      </footer>
    </div>
  )
}
