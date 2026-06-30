import { useEffect, useState } from 'react'

interface ConfettiProps {
  active: boolean
  duration?: number
  particleCount?: number
  onComplete?: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  velocityX: number
  velocityY: number
  rotationSpeed: number
}

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function Confetti({ 
  active, 
  duration = 3000, 
  particleCount = 50,
  onComplete 
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParticles([])
      return
    }

    // Créer les particules
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: 2 + Math.random() * 3,
      rotationSpeed: (Math.random() - 0.5) * 10
    }))

    setParticles(newParticles)

    // Nettoyer après la durée
    const timeout = setTimeout(() => {
      setParticles([])
      onComplete?.()
    }, duration)

    return () => clearTimeout(timeout)
  }, [active, duration, particleCount, onComplete])

  if (particles.length === 0) return null

  return (
    <div className="confetti-container">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="confetti-particle"
          style={{
            '--x': `${particle.x}%`,
            '--vx': particle.velocityX,
            '--vy': particle.velocityY,
            '--rotation': `${particle.rotation}deg`,
            '--rotation-speed': `${particle.rotationSpeed}deg`,
            '--scale': particle.scale,
            '--color': particle.color,
            '--duration': `${duration}ms`
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
