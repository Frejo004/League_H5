import { useState } from 'react'
import { Users, Pencil } from 'lucide-react'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PlayerRow } from '@/components/captain/PlayerRow'
import { PlayerStatsDrawer } from '@/components/captain/PlayerStatsDrawer'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Player } from '@/types/database'

export function TabJoueurs({ teamId, teamColor, seasonId, readonly = false }: { teamId: string; teamColor: string; seasonId: string; readonly?: boolean }) {
  const { data: players, isLoading } = usePlayersByTeam(teamId)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  const pending = (players ?? []).filter(p => !p.user_id)
  const linked = (players ?? []).filter(p => !!p.user_id)

  if (pending.length === 0 && linked.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState
          icon={<Users />}
          title="Aucun joueur dans cette équipe"
          description="Invitez des joueurs pour commencer à construire votre équipe."
          className="py-6"
        />
      </Card>
    )
  }

  return (
    <>
      {/* Drawer stats joueur */}
      {selectedPlayer && (
        <PlayerStatsDrawer
          player={selectedPlayer}
          seasonId={seasonId}
          teamColor={teamColor}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      <div className="space-y-6">
        {/* Info — capitaine seulement */}
        {!readonly && (
          <Card className="p-4 bg-primary-500/5 border-primary-500/20">
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              <span className="text-primary-400 font-black">TIP :</span> Cliquez sur un joueur pour voir ses statistiques détaillées. Utilisez l'icône <Pencil size={10} className="inline mx-1" /> pour mettre à jour les numéros de maillot et les positions.
            </p>
          </Card>
        )}

        {/* Joueurs sans compte */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                En attente ({pending.length})
              </p>
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
            </div>
            <Card className="rounded-3xl overflow-hidden">
              {pending.map((p, i) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isLast={i === pending.length - 1}
                  teamColor={teamColor}
                  onViewStats={setSelectedPlayer}
                  readonly={readonly}
                />
              ))}
            </Card>
          </div>
        )}

        {/* Joueurs avec compte */}
        {linked.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                Comptes liés ({linked.length})
              </p>
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
            </div>
            <Card className="rounded-3xl overflow-hidden">
              {linked.map((p, i) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isLast={i === linked.length - 1}
                  teamColor={teamColor}
                  onViewStats={setSelectedPlayer}
                  readonly={readonly}
                />
              ))}
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
