import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'
import { Trophy } from 'lucide-react'

interface GoalAlertProps {
  matchId: string
  homeTeam: { id: string; name: string; color: string }
  awayTeam: { id: string; name: string; color: string }
}

export function GoalAlert({ matchId, homeTeam, awayTeam }: GoalAlertProps) {
  const [activeGoal, setActiveGoal] = useState<{
    playerName: string
    teamName: string
    teamColor: string
    type: 'goal' | 'own_goal'
  } | null>(null)

  useEffect(() => {
    // Écouter les nouveaux événements en temps réel sur la table match_events
    const channel = supabase
      .channel(`goal-alerts-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`
        },
        async (payload) => {
          const newEvent = payload.new
          if (newEvent.type === 'goal' || newEvent.type === 'own_goal') {
            // Récupérer le nom du joueur depuis la DB car le payload brut ne contient pas les joins
            // On fait une seule requête légère avec seulement les champs nécessaires
            let playerName = 'Inconnu'
            if (newEvent.player_id) {
              const { data: player } = await supabase
                .from('players')
                .select('first_name, last_name')
                .eq('id', newEvent.player_id)
                .single()
              // @ts-expect-error Supabase select typing inference issue
              if (player) playerName = `${player.first_name} ${player.last_name}`
            }

            const team = newEvent.team_id === homeTeam.id ? homeTeam : awayTeam
            
            setActiveGoal({
              playerName,
              teamName: team.name,
              teamColor: team.color,
              type: newEvent.type
            })

            // Masquer après 6 secondes
            setTimeout(() => setActiveGoal(null), 6000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, homeTeam, awayTeam])

  if (!activeGoal) return null

  return (
    <div className="fixed inset-x-0 top-20 z-100 flex justify-center px-4 pointer-events-none overflow-hidden">
      <div className={clsx(
        "relative flex flex-col items-center animate-goal-banner",
        "bg-surface-card border-y-2 py-4 px-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
        "before:absolute before:inset-0 before:opacity-20 before:bg-linear-to-r before:from-transparent before:via-white before:to-transparent"
      )}
      style={{ borderColor: activeGoal.teamColor }}>
        
        {/* Glow effect */}
        <div className="absolute inset-0 blur-xl opacity-30 animate-pulse" 
             style={{ backgroundColor: activeGoal.teamColor }} />

        {/* Title */}
        <div className="relative flex items-center gap-3 mb-1">
          <Trophy size={24} className="text-amber-400 animate-bounce" />
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {activeGoal.type === 'own_goal' ? 'BUT CSC !' : 'BUT !!!'}
          </h2>
          <Trophy size={24} className="text-amber-400 animate-bounce" />
        </div>

        {/* Player Name */}
        <p className="relative text-2xl font-bold text-white uppercase tracking-widest drop-shadow-md">
          {activeGoal.playerName}
        </p>

        {/* Team Name Badge */} 
        <div className="relative mt-2 px-3 py-1 rounded bg-white/10 border border-white/20">
          <span className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: activeGoal.teamColor }}>
            {activeGoal.teamName}
          </span>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: activeGoal.teamColor }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: activeGoal.teamColor }} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes goal-banner {
          0% { transform: translateY(-150%) scale(0.8); opacity: 0; }
          10% { transform: translateY(0) scale(1.1); opacity: 1; }
          15% { transform: scale(1); }
          85% { transform: scale(1); opacity: 1; }
          100% { transform: translateY(-150%) scale(0.8); opacity: 0; }
        }
        .animate-goal-banner {
          animation: goal-banner 6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
      `}} />
    </div>
  )
}
