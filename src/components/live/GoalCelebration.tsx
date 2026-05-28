/**
 * GoalCelebration — Animation de but
 * Se déclenche au montage (via React key) et disparaît après 10s.
 * Le parent doit changer la `key` prop pour déclencher une nouvelle célébration.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'

const DISPLAY_DURATION = 10_000  // durée totale visible (ms)
const FADE_OUT_START   = 7_000   // début du fondu sortant (ms)

interface GoalCelebrationProps {
  teamName: string
  teamColor: string
  playerName?: string
}

export function GoalCelebration({ teamName, teamColor, playerName }: GoalCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)

  // Memoize random properties for confetti particles to keep rendering pure
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * 2 * Math.PI
      const dist = 300 + Math.random() * 200
      const rotate = Math.random() * 360
      return { angle, dist, rotate }
    })
  }, [])

  // Se déclenche au montage du composant (quand key change, React remont le composant)
  useEffect(() => {
    if (!teamName) return  // pas de célébration si pas d'équipe (état initial)

    setIsVisible(true)
    setFadingOut(false)

    const fadeTimer = setTimeout(() => setFadingOut(true), FADE_OUT_START)
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
      setFadingOut(false)
    }, DISPLAY_DURATION)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentionnel : déclenche au montage uniquement

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: fadingOut ? 0 : 1 }}
          transition={{ duration: fadingOut ? 3 : 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden"
        >
          {/* Background Flash — 3 éclairs puis s'arrête */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.1, 0.4, 0] }}
            transition={{ duration: 1.2, repeat: 2, repeatType: 'loop' }}
            className="absolute inset-0"
            style={{ backgroundColor: teamColor }}
          />

          {/* Particules — une seule passe, pas de repeat */}
          {particles.map((p, i) => {
            return (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.2, 0],
                  x: Math.cos(p.angle) * p.dist,
                  y: Math.sin(p.angle) * p.dist,
                  opacity: [1, 1, 0],
                  rotate: p.rotate,
                }}
                transition={{
                  duration: 2.5,
                  delay: (i % 4) * 0.15,
                  ease: 'easeOut',
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{ backgroundColor: teamColor }}
              />
            )
          })}

          {/* Texte principal */}
          <motion.div
            initial={{ scale: 0.5, y: 80, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            {/* "BUT !!!" — 3 pulses puis stable */}
            <motion.div
              animate={{ scale: [1, 1.15, 1, 1.1, 1, 1.05, 1] }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              className="text-8xl sm:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] italic"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              BUT !!!
            </motion.div>

            <div className="mt-4 p-4 bg-surface/60 backdrop-blur-xl border border-surface-border/20 rounded-2xl shadow-2xl">
              <p className="text-sm font-black text-text-primary uppercase tracking-[0.3em] mb-1">But pour</p>
              <h2
                className="text-2xl font-black uppercase tracking-wider mb-2"
                style={{ color: teamColor }}
              >
                {teamName}
              </h2>
              {playerName && (
                <p className="text-lg font-bold text-text-primary border-t border-surface-border/10 pt-2">
                  {playerName}
                </p>
              )}
            </div>
          </motion.div>

          {/* Vibration du cadre — 10 répétitions puis s'arrête */}
          <motion.div
            animate={{ x: [-2, 2, -2, 2, 0], y: [1, -1, 1, -1, 0] }}
            transition={{ duration: 0.1, repeat: 10 }}
            className="absolute inset-0 border-[20px] border-white/10 pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
