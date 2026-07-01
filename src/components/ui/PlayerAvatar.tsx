/**
 * PlayerAvatar — Avatar réutilisable pour un joueur
 * Affiche la photo si disponible, sinon les initiales sur fond couleur équipe.
 */
import { clsx } from 'clsx'
import { useState } from 'react'

interface PlayerAvatarProps {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  teamColor?: string
  /** Taille en pixels (appliquée via style inline). Défaut : 32 */
  size?: number
  className?: string
  /** Arrondi : 'full' (cercle) | 'lg' (carré arrondi). Défaut : 'full' */
  shape?: 'full' | 'lg'
}

export function PlayerAvatar({
  firstName,
  lastName,
  avatarUrl,
  teamColor = '#16a34a',
  size = 32,
  className,
  shape = 'full',
}: PlayerAvatarProps) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const fontSize = Math.max(8, Math.round(size * 0.35))
  // Bascule sur les initiales si l'URL est brisée
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className={clsx(
        'shrink-0 flex items-center justify-center overflow-hidden',
        shape === 'full' ? 'rounded-full' : 'rounded-lg',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: teamColor,
        fontSize,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1,
      }}
    >
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={`${firstName} ${lastName}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  )
}
