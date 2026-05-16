import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface GoalCelebrationProps {
  show: boolean
  teamName: string
  teamColor: string
  playerName?: string
}

export function GoalCelebration({ show, teamName, teamColor, playerName }: GoalCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => setIsVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [show])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden"
        >
          {/* Background Flash */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.1, 0.4, 0] }}
            transition={{ duration: 1, repeat: 2 }}
            className="absolute inset-0"
            style={{ backgroundColor: teamColor }}
          />

          {/* Particles / Sparkles (Simplified) */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 800,
                rotate: Math.random() * 360
              }}
              transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
              className="absolute w-4 h-4 rounded-full"
              style={{ backgroundColor: teamColor, opacity: 0.6 }}
            />
          ))}

          {/* Main Text Content */}
          <motion.div
            initial={{ scale: 0.5, y: 100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-8xl sm:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] italic"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              BUT !!!
            </motion.div>
            
            <div className="mt-4 p-4 bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
              <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em] mb-1">But pour</p>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2" style={{ color: teamColor }}>
                {teamName}
              </h2>
              {playerName && (
                <p className="text-lg font-bold text-white border-t border-white/10 pt-2">
                  {playerName}
                </p>
              )}
            </div>
          </motion.div>

          {/* Vibrating background */}
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
