import { ReactNode } from 'react'
import { Confetti } from './Confetti'

export type CelebrationType = 
  | 'goal' 
  | 'victory' 
  | 'trophy' 
  | 'podium' 
  | 'red-card'
  | 'star-burst'
  | 'none'

interface CelebrationEffectProps {
  type: CelebrationType
  active: boolean
  children: ReactNode
  onComplete?: () => void
  showConfetti?: boolean
}

export function CelebrationEffect({ 
  type, 
  active, 
  children, 
  onComplete,
  showConfetti = true 
}: CelebrationEffectProps) {
  const getClassName = () => {
    if (!active || type === 'none') return ''
    
    switch (type) {
      case 'goal':
        return 'goal-celebration'
      case 'victory':
        return 'victory-animation'
      case 'trophy':
        return 'trophy-shine'
      case 'red-card':
        return 'red-card-shake'
      case 'star-burst':
        return 'star-burst'
      default:
        return ''
    }
  }

  const shouldShowConfetti = showConfetti && active && ['goal', 'victory', 'trophy'].includes(type)

  return (
    <>
      <div className={getClassName()}>
        {children}
      </div>
      
      {shouldShowConfetti && (
        <Confetti 
          active={active} 
          duration={3000}
          particleCount={type === 'trophy' ? 100 : 50}
          onComplete={onComplete}
        />
      )}
    </>
  )
}
