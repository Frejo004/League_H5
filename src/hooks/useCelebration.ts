import { useState, useCallback } from 'react'
import { CelebrationType } from '@/components/ui/CelebrationEffect'

interface UseCelebrationReturn {
  isActive: boolean
  celebrationType: CelebrationType
  celebrate: (type: CelebrationType, duration?: number) => void
  stop: () => void
}

export function useCelebration(): UseCelebrationReturn {
  const [isActive, setIsActive] = useState(false)
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('none')

  const celebrate = useCallback((type: CelebrationType, duration = 3000) => {
    setCelebrationType(type)
    setIsActive(true)

    // Auto-stop après la durée
    setTimeout(() => {
      setIsActive(false)
      setCelebrationType('none')
    }, duration)
  }, [])

  const stop = useCallback(() => {
    setIsActive(false)
    setCelebrationType('none')
  }, [])

  return {
    isActive,
    celebrationType,
    celebrate,
    stop
  }
}
