import { Crown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { usePlayersByTeam, usePlayers } from '@/hooks/usePlayers'
import { InviteButton } from '@/components/ui/InviteButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Navigate } from 'react-router-dom'
import type { Team } from '@/types/database'

function TeamInvitePanel({ teamId }: { teamId: string }) {
  const { data: players, isLoading } = usePlayersByTeam(teamId)

  if (isLoading) return <div className="flex justify-center py-6"><LoadingSpinner /></div>

  const pending  = (players ?? []).filter(p => !p.user_id)
  const linked   = (players ?? []).filter(p => !!p.user_id)

  return (
    <div className="space-y-4">

      {/* Joueurs sans compte */}
      {pending.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-surface-border bg-surface-raised">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              En attente d'inscription ({pending.length})
            </p>
          </div>
          {pending.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-3 hover:bg-surface-raised transition-colors
                          ${i < pending.length - 1 ? 'border-b border-surface-border/50' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-surface-raised flex items-center justify-center
                                text-slate-400 text-xs font-bold shrink-0">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {p.first_name} {p.last_name}
                  </p>
                  {p.jersey_number && (
                    <p className="text-[10px] text-slate-500">#{p.jersey_number}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 ml-3">
                <InviteButton
                  playerId={p.id}
                  playerName={`${p.first_name} ${p.last_name}`}
                  hasAccount={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Joueurs avec compte */}
      {linked.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-surface-border bg-surface-raised">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Comptes liés ({linked.length})
            </p>
          </div>
          {linked.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-3
                          ${i < linked.length - 1 ? 'border-b border-surface-border/50' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center
                                text-white text-xs font-bold shrink-0">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <p className="text-sm font-medium text-white truncate">
                  {p.first_name} {p.last_name}
                </p>
              </div>
              <InviteButton
                playerId={p.id}
                playerName={`${p.first_name} ${p.last_name}`}
                hasAccount={true}
              />
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && linked.length === 0 && (
        <div className="card">
          <div className="empty-state py-6">
            <p className="text-slate-500 text-sm">Aucun joueur dans cette équipe.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function CaptainPage() {
  const { profile, isCaptain } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: teams } = useTeams(season?.id)
  // Charge les joueurs de la saison pour trouver le player lié au profil courant
  const { data: allPlayers } = usePlayers(season?.id)

  // Redirige si pas capitaine
  if (!isCaptain) return <Navigate to="/" replace />

  // Trouve l'équipe dont l'utilisateur est capitaine.
  // Double vérification :
  //   1. captain_id === profile.id  (cas normal : joueur avec compte)
  //   2. captain_player_id === player.id où player.user_id === profile.id
  //      (cas où le capitaine a été désigné par player_id avant d'avoir un compte)
  const myPlayer = (allPlayers ?? []).find(p => p.user_id === profile?.id)

  type TeamWithCaptainPlayer = Team & { captain_player_id: string | null }

  const myTeam = (teams ?? []).find(t => {
    const team = t as unknown as TeamWithCaptainPlayer
    return (
      team.captain_id === profile?.id ||
      (myPlayer && team.captain_player_id === myPlayer.id)
    )
  })

  // Typage étendu pour accéder aux champs non présents dans le type Team de base
  const myTeamTyped = myTeam as unknown as TeamWithCaptainPlayer | undefined

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Crown size={18} className="text-amber-400" />
        <h1 className="page-title">Espace capitaine</h1>
      </div>

      {!season ? (
        <div className="card">
          <div className="empty-state py-6">
            <p className="text-slate-400 text-sm">Aucune saison active.</p>
          </div>
        </div>
      ) : !myTeam ? (
        <div className="card">
          <div className="empty-state py-8">
            <Crown size={28} className="text-slate-600 mb-2" />
            <p className="text-slate-300 font-medium">Aucune équipe assignée</p>
            <p className="text-slate-500 text-sm mt-1">
              L'administrateur doit vous assigner comme capitaine d'une équipe.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Team info */}
          <div className="card flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: myTeamTyped?.color ?? '#16a34a' }}
            >
              {myTeam.name[0]}
            </div>
            <div>
              <p className="font-semibold text-white">{myTeam.name}</p>
              <p className="text-xs text-slate-500">{season.name}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Crown size={13} className="text-amber-400" />
              <span className="text-xs text-amber-400 font-semibold">Capitaine</span>
            </div>
          </div>

          {/* Info box */}
          <div className="card bg-primary-600/8 border-primary-600/20">
            <p className="text-sm text-slate-300 leading-relaxed">
              Génère un lien d'invitation pour chaque joueur de ton équipe.
              Le joueur recevra un lien unique pour créer son compte et rejoindre la ligue.
              Les liens expirent après <strong className="text-white">7 jours</strong>.
            </p>
          </div>

          {/* Invite panel */}
          <TeamInvitePanel teamId={myTeam.id} />
        </>
      )}
    </div>
  )
}
