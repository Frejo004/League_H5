import { Send } from 'lucide-react'
import { clsx } from 'clsx'
import { useTransfers } from '@/hooks/useTransfers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TransferStatusBadge } from '@/components/ui/StatusBadges'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Player, Team, Transfer as TransferType } from '@/types/database'

// Type for transfers with joined data
type TransferWithRelations = TransferType & {
  player?: Player
  from_team?: Team
  to_team?: Team
}

export function TabTransferts({ teamId }: { teamId: string }) {
  const { data: transfers, isLoading, approveAsHomeCaptain, approveAsAwayCaptain, rejectTransfer } = useTransfers(teamId)

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  // Split transfers into outgoing (from our team) and incoming (to our team)
  const outgoingTransfers = (transfers as unknown as TransferWithRelations[] ?? []).filter(t => t.from_team_id === teamId)
  const incomingTransfers = (transfers as unknown as TransferWithRelations[] ?? []).filter(t => t.to_team_id === teamId)

  return (
    <div className="space-y-6">
      {/* Outgoing Transfers (from our team) */}
            {outgoingTransfers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-red-500/30 to-transparent" />
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">
                    DEMANDES SORTANTES ({outgoingTransfers.length})
                  </p>
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-red-500/30 to-transparent" />
                </div>
                <Card className="rounded-3xl overflow-hidden">
            {outgoingTransfers.map((transfer, i) => (
              <div
                key={transfer.id}
                className={clsx(
                  'p-4 flex flex-col gap-3',
                  i < outgoingTransfers.length - 1 && 'border-b border-surface-border'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ backgroundColor: transfer.from_team?.color || '#6b7280' }}>
                      {transfer.player?.first_name?.[0]}{transfer.player?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-text-primary uppercase tracking-tight truncate">
                        {transfer.player?.first_name} {transfer.player?.last_name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {transfer.from_team?.name} → {transfer.to_team?.name}
                      </p>
                      {transfer.reason && (
                        <p className="text-xs text-text-secondary mt-1 italic">"{transfer.reason}"</p>
                      )}
                    </div>
                  </div>
                  <TransferStatusBadge status={transfer.status} />
                </div>

                {transfer.status === 'player_requested' && (
                  <div className="flex gap-2 justify-end">
                     <button
                       onClick={() => rejectTransfer.mutate(transfer.id)}
                       disabled={rejectTransfer.isPending}
                       className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                     >
                       Refuser
                     </button>
                     <Button
                       size="sm"
                       onClick={() => approveAsHomeCaptain.mutate(transfer.id)}
                       disabled={approveAsHomeCaptain.isPending}
                       loading={approveAsHomeCaptain.isPending ? 'Approbation…' : undefined}
                     >
                       Approuver
                     </Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Incoming Transfers (to our team) */}
            {incomingTransfers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-emerald-500/30 to-transparent" />
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                    DEMANDES ENTRANTES ({incomingTransfers.length})
                  </p>
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-emerald-500/30 to-transparent" />
                </div>
                <Card className="rounded-3xl overflow-hidden">
            {incomingTransfers.map((transfer, i) => (
              <div
                key={transfer.id}
                className={clsx(
                  'p-4 flex flex-col gap-3',
                  i < incomingTransfers.length - 1 && 'border-b border-surface-border'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ backgroundColor: transfer.from_team?.color || '#6b7280' }}>
                      {transfer.player?.first_name?.[0]}{transfer.player?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-text-primary uppercase tracking-tight truncate">
                        {transfer.player?.first_name} {transfer.player?.last_name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {transfer.from_team?.name} → {transfer.to_team?.name}
                      </p>
                      {transfer.reason && (
                        <p className="text-xs text-text-secondary mt-1 italic">"{transfer.reason}"</p>
                      )}
                    </div>
                  </div>
                  <TransferStatusBadge status={transfer.status} />
                </div>

                {transfer.status === 'admin_approved' && (
                  <div className="flex gap-2 justify-end">
                     <button
                       onClick={() => rejectTransfer.mutate(transfer.id)}
                       disabled={rejectTransfer.isPending}
                       className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                     >
                       Refuser
                     </button>
                     <Button
                       size="sm"
                       onClick={() => approveAsAwayCaptain.mutate(transfer.id)}
                       disabled={approveAsAwayCaptain.isPending}
                       loading={approveAsAwayCaptain.isPending ? 'Finalisation…' : undefined}
                     >
                       Finaliser le transfert
                     </Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {outgoingTransfers.length === 0 && incomingTransfers.length === 0 && (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<Send size={20} />}
            title="Aucune demande de transfert"
            className="py-10"
          />
        </Card>
      )}
    </div>
  )
}
