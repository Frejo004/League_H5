import { useState } from 'react'
import { Link2, Copy, Check, RefreshCw, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePlayerInvite, useCreateInvite, useRevokeInvite } from '@/hooks/usePlayerInvites'
import { LoadingSpinner } from './LoadingSpinner'

interface InviteButtonProps {
  playerId: string
  playerName: string
  /** Whether the player already has a linked account */
  hasAccount: boolean
}

export function InviteButton({ playerId, playerName, hasAccount }: InviteButtonProps) {
  const { user } = useAuth()
  const { data: invite, isLoading } = usePlayerInvite(playerId)
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)

  if (hasAccount) {
    return (
      <span className="text-xs text-primary-400 flex items-center gap-1">
        <Check size={12} />
        Compte lié
      </span>
    )
  }

  const inviteUrl = invite?.token
    ? `${window.location.origin}/auth/join?token=${invite.token}`
    : null

  const isExpired = invite?.expires_at
    ? new Date(invite.expires_at) < new Date()
    : false

  async function handleGenerate() {
    if (!user) return
    await createInvite.mutateAsync({ playerId, createdBy: user.id })
    setShowLink(true)
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <LoadingSpinner size="sm" />

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {!invite || isExpired ? (
          <button
            onClick={handleGenerate}
            disabled={createInvite.isPending}
            className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            title={`Générer un lien pour ${playerName}`}
          >
            {createInvite.isPending ? <LoadingSpinner size="sm" /> : <Link2 size={13} />}
            {isExpired ? 'Renouveler le lien' : 'Générer un lien'}
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowLink(!showLink)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Link2 size={13} />
              {showLink ? 'Masquer' : 'Voir le lien'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={createInvite.isPending}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
              title="Regénérer"
            >
              <RefreshCw size={12} />
            </button>
            <button
              onClick={() => revokeInvite.mutate(playerId)}
              disabled={revokeInvite.isPending}
              className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
              title="Révoquer"
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>

      {showLink && inviteUrl && !isExpired && (
        <div className="flex items-center gap-1.5 bg-surface rounded-lg px-2 py-1.5 border border-surface-border">
          <span className="text-xs text-slate-400 truncate flex-1 font-mono" style={{ maxWidth: 200 }}>
            {inviteUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 text-slate-400 hover:text-primary-400 transition-colors"
            title="Copier"
          >
            {copied ? <Check size={13} className="text-primary-400" /> : <Copy size={13} />}
          </button>
        </div>
      )}

      {invite && !isExpired && (
        <p className="text-xs text-slate-600">
          Expire le {new Date(invite.expires_at).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </div>
  )
}
