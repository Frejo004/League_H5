/**
 * RulesPage — Règlement de la High Five Ligue
 * Reproduit fidèlement le document officiel de la ligue
 */

import {
  Calendar, Coins, MapPin, Clock, Megaphone, Trophy,
  Swords, BarChart2, ShieldCheck, Users, Handshake,
  Check, Star, Footprints, Crown,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Données
// ─────────────────────────────────────────────────────────────────────────────

const TEAMS = [
  {
    rank: 1,
    name: 'CODE LOCK FC',
    color: '#e11d48',
    initials: 'CL',
    players: ['Armel', 'Giovanni', 'Marcel', 'Mounzir', 'Emery', 'Halil'],
  },
  {
    rank: 2,
    name: 'FAGEP FC',
    color: '#f59e0b',
    initials: 'FA',
    players: ['Elisée', 'Primous', 'Gabriel', 'Ange Calvias', 'Brunel Famous', 'Fréjus'],
  },
  {
    rank: 3,
    name: 'SCAB-W FC',
    color: '#16a34a',
    initials: 'SW',
    players: ['Rhetice', 'Sahid', 'Warris', 'Clément Akouègnon', 'Bhrayane', 'Silvinoh'],
  },
  {
    rank: 4,
    name: 'STAR-J FC',
    color: '#f59e0b',
    initials: 'SJ',
    players: ['Jean-Marie', 'Steven Romain', 'Sergio', 'Tobi', 'Raoul R7', 'Augustin'],
  },
  {
    rank: 5,
    name: 'BASTON FC',
    color: '#7c3aed',
    initials: 'BA',
    players: ['Fred', '23Nov', 'Wifak', 'Emile', 'Arsène', 'Breton'],
  },
]

const POINTS = [
  { result: 'Victoire', points: '3 points', color: '#16a34a', bg: 'bg-green-500' },
  { result: 'Match nul', points: '1 point',  color: '#f59e0b', bg: 'bg-amber-500' },
  { result: 'Défaite',  points: '0 point',  color: '#ef4444', bg: 'bg-red-500' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, color = '#f59e0b' }: {
  icon: typeof Trophy
  title: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <h2 className="text-sm font-black text-white uppercase tracking-wider">{title}</h2>
    </div>
  )
}

function InfoBadge({ icon: Icon, label, value, color }: {
  icon: typeof Calendar
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '20' }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm font-black text-white leading-tight">{value}</p>
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: typeof TEAMS[0] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: team.color + '40', background: `linear-gradient(135deg, ${team.color}12 0%, #0f1420 70%)` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: team.color + '30' }}
      >
        {/* Numéro */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
          style={{ backgroundColor: team.color }}
        >
          {team.rank}
        </div>
        {/* Logo */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg"
          style={{ backgroundColor: team.color }}
        >
          {team.initials}
        </div>
        {/* Nom */}
        <div className="min-w-0">
          <p className="text-sm font-black text-white leading-tight truncate">{team.name}</p>
        </div>
      </div>

      {/* Joueurs */}
      <div className="px-4 py-3 space-y-1.5">
        {team.players.map((player, i) => (
          <div key={player} className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold tabular-nums w-4 shrink-0"
              style={{ color: team.color + 'aa' }}
            >
              {i + 1}.
            </span>
            <span className="text-xs text-slate-300 font-medium">{player}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function RulesPage() {
  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/30 p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #1a1200 0%, #0f1420 50%, #0a0d1a 100%)',
        }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 70%)',
          }}
        />
        {/* Barre dorée */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <div className="relative">
          {/* Badge ligue */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
            <Trophy size={12} className="text-amber-400" />
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Ligue officielle</span>
          </div>

          <h1
            className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '-0.02em' }}
          >
            HIGH FIVE <span className="text-amber-400">LIGUE</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium mb-6">
            Règlement officiel & organisation
          </p>

          {/* Infos clés */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            <InfoBadge icon={Calendar} label="Début de la ligue" value="Mai 2026" color="#f59e0b" />
            <InfoBadge icon={Coins}    label="Cotisation mensuelle" value="1 000F par joueur" color="#16a34a" />
            <InfoBadge icon={MapPin}   label="Terrain" value="2 séances mensuelles" color="#3b82f6" />
            <InfoBadge icon={Clock}    label="Durée chaque samedi" value="1h30 de jeu" color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Colonne gauche */}
        <div className="space-y-4">

          {/* Cotisation */}
          <div className="card border-amber-500/20 bg-amber-500/[0.03]">
            <SectionTitle icon={Megaphone} title="Point clé — Cotisation" color="#f59e0b" />
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              La tenue des matchs dépend directement de la cotisation mensuelle de chaque joueur.
            </p>
            <div className="space-y-2.5">
              {[
                'Chaque joueur doit verser une cotisation de 1 000F par mois.',
                'Cette contribution permet d\'assurer la location du terrain (2 séances mensuelles).',
                'En l\'absence de cotisation, les matchs ne pourront pas être organisés.',
                'Le respect de cet engagement est indispensable pour garantir la continuité et la stabilité de la ligue.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={9} className="text-amber-400" />
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Récompenses */}
          <div className="card">
            <SectionTitle icon={Trophy} title="Récompenses" color="#f59e0b" />
            <p className="text-xs text-slate-400 mb-4">Des distinctions seront attribuées en fin de saison :</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Trophy,     label: 'Équipe Championne',  color: '#f59e0b' },
                { icon: Star,       label: 'Deuxième Place',     color: '#94a3b8' },
                { icon: Footprints, label: 'Meilleur Buteur',    color: '#f97316' },
                { icon: Crown,      label: 'Meilleur Joueur',    color: '#a78bfa' },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: color + '20' }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 leading-tight">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-3 leading-relaxed italic">
              Une cotisation complémentaire par équipe sera définie afin de financer ces récompenses.
            </p>
          </div>

          {/* Engagement */}
          <div className="card border-primary-600/20 bg-primary-600/[0.03]">
            <SectionTitle icon={Handshake} title="Engagement" color="#3b82f6" />
            <p className="text-xs text-slate-300 leading-relaxed">
              La réussite de la ligue repose sur le sérieux, l'implication et le respect des engagements de chaque joueur.
            </p>
          </div>
        </div>

        {/* Colonne centrale + droite — équipes */}
        <div className="lg:col-span-2 space-y-4">

          {/* Équipes participantes */}
          <div className="card">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <div className="flex items-center gap-2 px-4">
                <Users size={14} className="text-amber-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Équipes participantes</h2>
              </div>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEAMS.map(team => <TeamCard key={team.rank} team={team} />)}
            </div>
          </div>

          {/* Grille règles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Format des matchs */}
            <div className="card">
              <SectionTitle icon={Swords} title="Format des matchs" color="#3b82f6" />
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-600/10 border border-primary-600/20">
                  <Clock size={18} className="text-primary-400 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-white">2 périodes de 20 minutes</p>
                    <p className="text-xs text-slate-400">5 minutes de pause</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Organisation prévue pour couvrir 1h30 de jeu chaque samedi.
                </p>
              </div>
            </div>

            {/* Système de points */}
            <div className="card">
              <SectionTitle icon={BarChart2} title="Système de points" color="#16a34a" />
              <div className="space-y-2">
                {POINTS.map(({ result, points, color, bg }) => (
                  <div
                    key={result}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={clsx('w-3 h-3 rounded-sm shrink-0', bg)} />
                      <span className="text-sm font-semibold text-white">{result}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color }}>{points}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Règlement */}
            <div className="card">
              <SectionTitle icon={ShieldCheck} title="Règlement" color="#8b5cf6" />
              <div className="space-y-2.5">
                {[
                  'Application des règles générales du football.',
                  'Remplacements illimités (type basketball).',
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={9} className="text-violet-400" />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Organisation des équipes */}
            <div className="card">
              <SectionTitle icon={Users} title="Organisation des équipes" color="#f97316" />
              <p className="text-xs text-slate-400 mb-3">Chaque équipe devra :</p>
              <div className="space-y-2.5">
                {[
                  'Choisir un nom',
                  'Désigner un capitaine',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0">
                      <Check size={9} className="text-orange-400" />
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer valeurs ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 py-5 px-6"
        style={{ background: 'linear-gradient(135deg, #1a1200 0%, #0f1420 100%)' }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {['RESPECT', 'FAIR-PLAY', 'DISCIPLINE', 'PASSION'].map((value, i) => (
              <span key={value} className="flex items-center gap-3">
                <span className="text-sm font-black text-amber-400 tracking-widest"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {value}
                </span>
                {i < 3 && <span className="text-amber-600 font-black">•</span>}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 italic text-center sm:text-right">
            Unis pour le football, ensemble pour la victoire !
          </p>
        </div>
      </div>
    </div>
  )
}
