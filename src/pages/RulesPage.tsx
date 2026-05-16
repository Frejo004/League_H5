/**
 * RulesPage — Règlement de la High Five Ligue
 * Les équipes et joueurs sont chargés dynamiquement depuis la DB.
 */

import {
  Calendar, Coins, MapPin, Clock, Megaphone, Trophy,
  Swords, BarChart2, ShieldCheck, Users, Handshake,
  Check, Star, Footprints, Crown, Scale, AlertTriangle,
  UserCheck, ShieldAlert, BookOpen, Info, X, LayoutGrid, ArrowRight
} from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActiveSeason } from '@/hooks/useSeasons'

// ─────────────────────────────────────────────────────────────────────────────
// Hook — équipes + joueurs de la saison active
// ─────────────────────────────────────────────────────────────────────────────

interface TeamWithPlayers {
  id: string
  name: string
  color: string
  logo_url: string | null
  players: Array<{ id: string; first_name: string; last_name: string; jersey_number: number | null }>
}

function useTeamsWithPlayers(seasonId?: string) {
  return useQuery({
    queryKey: ['rules-teams', seasonId],
    enabled: !!seasonId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TeamWithPlayers[]> => {
      const { data: teams, error: teamsErr } = await supabase
        .from('teams')
        .select('id, name, color, logo_url')
        .eq('season_id', seasonId!)
        .order('name', { ascending: true })
      if (teamsErr) throw teamsErr

      const { data: players, error: playersErr } = await supabase
        .from('players')
        .select('id, team_id, first_name, last_name, jersey_number')
        .in('team_id', (teams ?? []).map(t => t.id))
        .eq('is_active', true)
        .order('jersey_number', { ascending: true })
      if (playersErr) throw playersErr

      return (teams ?? []).map(team => ({
        ...team,
        players: (players ?? []).filter(p => p.team_id === team.id),
      }))
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Données statiques
// ─────────────────────────────────────────────────────────────────────────────

const POINTS = [
  { result: 'Victoire', points: '3 points', color: '#16a34a', bg: 'bg-green-500' },
  { result: 'Match nul', points: '1 point', color: '#f59e0b', bg: 'bg-amber-500' },
  { result: 'Défaite', points: '0 point', color: '#ef4444', bg: 'bg-red-500' },
]

const SANCTIONS = [
  { niveau: 'Mineur', infraction: 'Protestation légère, parole déplacée', immediate: 'Avertissement verbal', supp: '-' },
  { niveau: 'Moyen', infraction: 'Protestation répétée, contestation forte, insulte légère', immediate: 'Carton Jaune', supp: '-' },
  { niveau: 'Grave', infraction: 'Insulte, menace, geste agressif', immediate: 'Carton Rouge', supp: '1 match de suspension' },
  { niveau: 'Très grave', infraction: 'Violence physique, insulte raciste/sexiste, crachat', immediate: 'Carton Rouge', supp: '2 à 3 matchs + possible exclusion' },
  { niveau: 'Arbitrage', infraction: 'Refus d’arbitrer sans raison valable', immediate: '-', supp: '1 match de suspension capitaine + pénalité' },
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
      <h2 className="text-sm font-black text-white uppercase tracking-wider leading-none">{title}</h2>
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

function TeamCard({ team, rank }: { team: TeamWithPlayers; rank: number }) {
  const initials = team.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

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
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
          style={{ backgroundColor: team.color }}
        >
          {rank}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg overflow-hidden"
          style={{ backgroundColor: team.color }}
        >
          {team.logo_url
            ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
            : initials
          }
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-white leading-tight truncate">{team.name}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            {team.players.length} joueur{team.players.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Joueurs */}
      <div className="px-4 py-3 space-y-1.5">
        {team.players.length === 0 ? (
          <p className="text-xs text-slate-600 italic">Aucun joueur enregistré</p>
        ) : (
          team.players.map((player, i) => (
            <div key={player.id} className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold tabular-nums w-5 shrink-0 text-right"
                style={{ color: team.color + 'aa' }}
              >
                {player.jersey_number ?? i + 1}.
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {player.first_name} {player.last_name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function RulesPage() {
  const { data: season } = useActiveSeason()
  const { data: teams = [], isLoading: teamsLoading } = useTeamsWithPlayers(season?.id)
  const [activeTab, setActiveTab] = useState<'ligue' | 'arbitrage'>('ligue')

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/30 p-6 text-center"
        style={{ background: 'var(--card-bg, linear-gradient(135deg, #1a1200 0%, #0f1420 50%, #0a0d1a 100%))' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 70%)' }}
        />
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-amber-500 to-transparent" />

        <div className="relative">
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
            {season && <span className="text-amber-500/70 ml-2">— {season.name}</span>}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            <InfoBadge icon={Calendar} label="Début de la ligue" value="Mai 2026" color="#f59e0b" />
            <InfoBadge icon={Coins} label="Cotisation mensuelle" value="1 000F par joueur" color="#16a34a" />
            <InfoBadge icon={MapPin} label="Terrain" value="2 séances mensuelles" color="#3b82f6" />
            <InfoBadge icon={Clock} label="Durée chaque samedi" value="1h30 de jeu" color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex gap-2 p-1.5 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/[0.08] sticky top-20 z-30 shadow-2xl mx-1 sm:mx-0">
        <button
          onClick={() => setActiveTab('ligue')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-400",
            activeTab === 'ligue'
              ? "bg-[#C8F135] text-black shadow-[0_0_25px_rgba(200,241,53,0.3)] scale-[1.01]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Trophy size={14} />
          Règlement Ligue
        </button>
        <button
          onClick={() => setActiveTab('arbitrage')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-400",
            activeTab === 'arbitrage'
              ? "bg-blue-600 text-white shadow-[0_0_25px_rgba(37,99,235,0.3)] scale-[1.01]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Scale size={14} />
          Arbitrage & Sanctions
        </button>
      </div>

      {activeTab === 'ligue' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                  "Cette contribution permet d'assurer la location du terrain (2 séances mensuelles).",
                  "En l'absence de cotisation, les matchs ne pourront pas être organisés.",
                  "Le respect de cet engagement est indispensable pour garantir la continuité et la stabilité de la ligue.",
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
                  { icon: Trophy, label: 'Équipe Championne', color: '#f59e0b' },
                  { icon: Star, label: 'Deuxième Place', color: '#94a3b8' },
                  { icon: Footprints, label: 'Meilleur Buteur', color: '#f97316' },
                  { icon: Crown, label: 'Meilleur Joueur', color: '#a78bfa' },
                ].map(({ icon: Icon, label, color }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
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
          </div>

          {/* Colonne centrale + droite */}
          <div className="lg:col-span-2 space-y-4">
            {/* Équipes participantes */}
            <div className="card">
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <div className="flex items-center gap-2 px-4">
                  <Users size={14} className="text-amber-400" />
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Équipes participantes</h2>
                  {teams.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-500/60 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {teams.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {teamsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] h-40 animate-pulse" />
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                    Aucune équipe enregistrée pour cette saison
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teams.map((team, i) => (
                    <TeamCard key={team.id} team={team} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>

            {/* Grille règles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="card">
                <SectionTitle icon={BarChart2} title="Système de points" color="#16a34a" />
                <div className="space-y-2">
                  {POINTS.map(({ result, points, color, bg }) => (
                    <div key={result} className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <div className={clsx('w-3 h-3 rounded-sm shrink-0', bg)} />
                        <span className="text-sm font-semibold text-white">{result}</span>
                      </div>
                      <span className="text-sm font-black" style={{ color }}>{points}</span>
                    </div>
                  ))}
                </div>
              </div>

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

              <div className="card">
                <SectionTitle icon={Users} title="Organisation des équipes" color="#f97316" />
                <p className="text-xs text-slate-400 mb-3">Chaque équipe devra :</p>
                <div className="space-y-2.5">
                  {['Choisir un nom', 'Désigner un capitaine'].map((item, i) => (
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
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Section 1: Consignes Arbitres */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card border-blue-500/20 bg-blue-500/[0.02]">
                <SectionTitle icon={ShieldCheck} title="1. Consignes pour les Arbitres" color="#3b82f6" />

                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <UserCheck size={16} className="text-blue-400" />
                      Rôle et attitude
                    </h3>
                    <ul className="space-y-2">
                      {[
                        'Rester neutre, calme et impartial.',
                        'Représenter l’organisation : comportement exemplaire.',
                        'Prendre les décisions avec autorité mais sans arrogance.',
                        'Collaboration : l’arbitre principal décide en cas de désaccord.'
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 mt-1.5 shrink-0" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BookOpen size={14} className="text-blue-400" />
                        Règles du jeu (Petits poteaux)
                      </h3>
                      <ul className="space-y-2">
                        {[
                          'Hors-jeu : Non appliqué (sauf abus flagrant).',
                          'Remplacements : Illimités et volants.',
                          'Touche/CF/Corner : Main ou pied (fluidité).',
                          'Durée : Respect strict du chronomètre.',
                          'Interdiction : Jeu dangereux, tacles, charges.',
                          'Gardien : Main interdite hors surface.'
                        ].map((text, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                            <Check size={10} className="text-blue-500 mt-0.5 shrink-0" />
                            {text}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Megaphone size={14} className="text-blue-400" />
                        Gestion du match
                      </h3>
                      <ul className="space-y-2">
                        {[
                          'Sifflet : Signal clairement les fautes.',
                          'Communication : Expliquer brièvement l’arrêt.',
                          'Avantage : Laisser jouer si bénéfique.',
                          'Appli : Noter buts, cartons, incidents.',
                          'Discipline : Zéro tolérance insultes/menaces.',
                          'Alerte : Appeler Fréjus en cas de problème grave.'
                        ].map((text, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                            <Check size={10} className="text-blue-500 mt-0.5 shrink-0" />
                            {text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card border-amber-500/20 bg-amber-500/[0.02]">
                <SectionTitle icon={AlertTriangle} title="Interdits" color="#f59e0b" />
                <ul className="space-y-3">
                  {[
                    'Ne discutez pas avec les joueurs pendant le match.',
                    'Ne tolérez pas les insultes ou gestes déplacés.',
                    'Zéro tolérance pour les contestations violentes.'
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                      <X size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-300 font-medium">{text}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card border-primary-500/20 bg-primary-500/[0.02]">
                <SectionTitle icon={Info} title="Aide Arbitrage" color="#3b82f6" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  En cas de doute sur une règle ou de litige persistant sur le terrain,
                  l'arbitre principal doit trancher immédiatement.
                  L'objectif est de maintenir la fluidité du jeu.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Barème de Sanctions */}
          <div className="card overflow-hidden border-red-500/20">
            <SectionTitle icon={ShieldAlert} title="2. Barème de Sanctions" color="#ef4444" />
            <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                    <th className="py-3 px-4">Niveau</th>
                    <th className="py-3 px-4">Infraction</th>
                    <th className="py-3 px-4">Immédiate</th>
                    <th className="py-3 px-4">Supp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {SANCTIONS.map((s, i) => (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <span className={clsx(
                          "px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider",
                          s.niveau === 'Mineur' ? "bg-slate-500/20 text-slate-400" :
                            s.niveau === 'Moyen' ? "bg-amber-500/20 text-amber-400" :
                              s.niveau === 'Grave' ? "bg-orange-500/20 text-orange-400" :
                                s.niveau === 'Très grave' ? "bg-red-500/20 text-red-400" :
                                  "bg-blue-500/20 text-blue-400"
                        )}>
                          {s.niveau}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-300 font-medium">{s.infraction}</td>
                      <td className="py-4 px-4 text-xs font-black text-white">{s.immediate}</td>
                      <td className="py-4 px-4 text-xs font-bold text-red-400/80 italic">{s.supp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <div className="w-1.5 h-full rounded-full bg-red-500 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <span className="text-white font-bold uppercase">2 Jaunes = Expulsion.</span> Un joueur qui reçoit 2 cartons jaunes dans le même match est expulsé (équivalent rouge).
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-full rounded-full bg-red-500 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <span className="text-white font-bold uppercase">Effet Suspension.</span> Le joueur suspendu ne peut ni jouer ni arbitrer pendant toute la durée.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-full rounded-full bg-red-500 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <span className="text-white font-bold uppercase">Capitaine Responsable.</span> Il répond du comportement et de la tenue de tous ses joueurs.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Organisation Arbitrage */}
          <div className="card border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <SectionTitle icon={LayoutGrid} title="Organisation Arbitrage" color="#3b82f6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-3">Principe de Rotation</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pour chaque match, les deux équipes qui ne jouent pas doivent fournir <span className="text-blue-400 font-bold">1 arbitre chacune</span>.
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <div className="flex-1 p-2 rounded-lg bg-white/5 border border-white/5 text-center">
                      Match <span className="text-white">A vs B</span>
                    </div>
                    <ArrowRight size={14} />
                    <div className="flex-1 p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-center text-blue-400">
                      Arbitres <span className="text-white">C & D</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    'Désignation : au plus tard 10 min avant le début.',
                    'Défaut : le capitaine sera commis d’office.',
                    'Contact : tout souci doit être signalé à Fréjus DASSI.'
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <Check size={12} className="text-blue-500 shrink-0" />
                      <p className="text-[11px] text-slate-400 font-medium">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                <div className="relative p-6 rounded-3xl border border-white/10 bg-black/20 backdrop-blur-md text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                    <Handshake size={24} className="text-blue-400" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Fair-Play Avant Tout</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    La réussite du tournoi repose sur votre collaboration et votre respect mutuel.
                    Merci pour votre disponibilité !
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer valeurs ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 py-5 px-6"
        style={{ background: 'var(--card-bg, linear-gradient(135deg, #1a1200 0%, #0f1420 100%))' }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-amber-500 to-transparent" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {['RESPECT', 'FAIR-PLAY', 'DISCIPLINE', 'PASSION'].map((value, i) => (
              <span key={value} className="flex items-center gap-3">
                <span
                  className="text-sm font-black text-amber-400 tracking-widest"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
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
