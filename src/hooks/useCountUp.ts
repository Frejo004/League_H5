import { useState, useEffect } from 'react'

/**
 * useCountUp — Anime une valeur numérique de 0 à end
 * @param end Valeur finale
 * @param duration Durée en ms
 * @param delay Délai avant démarrage en ms
 */
export function useCountUp(end: number, duration: number = 1500, delay: number = 0) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number
    let timeoutId: number

    const startAnimation = () => {
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function (outExpo)
        const easeOutExpo = (x: number): number => {
          return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
        }
        
        setCount(Math.floor(easeOutExpo(progress) * end))

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate)
        }
      }
      animationFrame = requestAnimationFrame(animate)
    }

    if (delay > 0) {
      timeoutId = window.setTimeout(startAnimation, delay)
    } else {
      startAnimation()
    }

    return () => {
      cancelAnimationFrame(animationFrame)
      clearTimeout(timeoutId)
    }
  }, [end, duration, delay])

  return count
}
