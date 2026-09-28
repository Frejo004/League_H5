import { Link } from 'react-router-dom'
import { Settings, Crown, Zap, Users, ChevronRight } from 'lucide-react'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import { useAuth } from '@/hooks/useAuth'
import { useMyTeam } from '@/hooks/useMyTeam'

// ── Carte de salutation personnalisée ────────────────────────────────────────
export function WelcomeCard({ profile, myPlayer, myTeam, role }: {
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>
  myPlayer: ReturnType<typeof useMyTeam>['myPlayer']
  myTeam: ReturnType<typeof useMyTeam>['myTeam']
  role: string
}) {
  const displayName = myPlayer
    ? `${myPlayer.first_name} ${myPlayer.last_name}`
    : profile.full_name ?? profile.email.split('@')[0]

  const roleLabel = role === 'admin' ? 'Administrateur' : role === 'captain' ? 'Capitaine' : role === 'player' ? 'Joueur' : 'Spectateur'
  const roleColor = role === 'admin' ? '#d9a441' : role === 'captain' ? '#c8f135' : role === 'player' ? '#22c55e' : '#64748b'
  const roleIcon = role === 'admin' ? <Settings size={11} /> : role === 'captain' ? <Crown size={11} /> : role === 'player' ? <Zap size={11} /> : <Users size={11} />

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4 flex items-center gap-4">
      {/* Glow de fond */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 100% at 0% 50%, ${roleColor}10 0%, transparent 70%)` }} />

      {/* Avatar */}
      <div className="relative shrink-0">
        <PlayerAvatar
          firstName={myPlayer?.first_name ?? (profile.full_name?.split(' ')[0] ?? 'U')}
          lastName={myPlayer?.last_name ?? (profile.full_name?.split(' ')[1] ?? '')}
          avatarUrl={profile.avatar_url}
          teamColor={myTeam?.color ?? roleColor}
          size={52}
          shape="lg"
        />
        {/* Badge rôle */}
        <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full border-2 border-surface-card"
          style={{ backgroundColor: roleColor }}>
          <span style={{ color: '#fff', display: 'flex' }}>{roleIcon}</span>
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0 relative">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Bienvenue</p>
        <p className="text-base font-black text-text-primary truncate">{displayName}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: roleColor, backgroundColor: `${roleColor}15`, borderColor: `${roleColor}30` }}>
            {roleLabel}
          </span>
          {myTeam && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: myTeam.color }} />
              <span className="text-[10px] text-text-muted font-semibold truncate">{myTeam.name}</span>
            </div>
          )}
          {myPlayer?.jersey_number && (
            <span className="text-[10px] text-text-muted font-bold">#{myPlayer.jersey_number}</span>
          )}
        </div>
      </div>

      {/* Raccourci profil */}
      <Link to="/profile"
        className="shrink-0 p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors border border-surface-border"
        title="Mon profil">
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
