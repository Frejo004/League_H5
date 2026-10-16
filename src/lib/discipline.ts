/**
 * Module de calcul et de règles disciplinaires de la Ligue H5
 * Cartons jaunes, rouges, scores de fair-play et suspensions
 */

export interface DisciplinaryEvent {
  type: 'yellow_card' | 'red_card'
  player_id: string | null
  team_id: string
}

export interface PlayerDisciplinarySummary {
  player_id: string
  team_id: string
  yellow_cards: number
  red_cards: number
  fairplay_score: number
}

export interface TeamDisciplinarySummary {
  team_id: string
  yellow_cards: number
  red_cards: number
  fairplay_score: number
}

/**
 * Calcule le score de fair-play :
 * 1 point par carton jaune, 3 points par carton rouge.
 * Plus le score est élevé, plus l'équipe ou le joueur a commis d'infractions.
 */
export function calculateFairplayScore(yellowCards: number, redCards: number): number {
  return Math.max(0, yellowCards) * 1 + Math.max(0, redCards) * 3
}

/**
 * Crée le payload standard d'auto-suspension consécutive à un carton rouge.
 */
export function createRedCardSuspensionPayload(params: {
  playerId: string
  seasonId: string
  matchId: string
  minute: number
}) {
  return {
    player_id: params.playerId,
    season_id: params.seasonId,
    reason: `Carton rouge — J${params.minute}'`,
    match_id_trigger: params.matchId,
    matches_count: 1,
    matches_served: 0,
    is_active: true,
    is_auto_generated: true,
  }
}

/**
 * Vérifie si un joueur est éligible pour participer à un match (non suspendu).
 */
export function isPlayerEligible(
  playerId: string,
  activeSuspendedPlayerIds: Set<string> | string[]
): boolean {
  if (!playerId) return false
  if (activeSuspendedPlayerIds instanceof Set) {
    return !activeSuspendedPlayerIds.has(playerId)
  }
  return !activeSuspendedPlayerIds.includes(playerId)
}

/**
 * Agrège les événements disciplinaires par joueur et par équipe
 */
export function aggregateDisciplinaryEvents(events: DisciplinaryEvent[]): {
  players: PlayerDisciplinarySummary[]
  teams: TeamDisciplinarySummary[]
  totalYellow: number
  totalRed: number
} {
  const playerMap = new Map<string, PlayerDisciplinarySummary>()
  const teamMap = new Map<string, TeamDisciplinarySummary>()

  let totalYellow = 0
  let totalRed = 0

  for (const ev of events) {
    if (ev.type !== 'yellow_card' && ev.type !== 'red_card') continue

    const isYellow = ev.type === 'yellow_card'
    if (isYellow) totalYellow++
    else totalRed++

    // Agrégation équipe
    if (ev.team_id) {
      if (!teamMap.has(ev.team_id)) {
        teamMap.set(ev.team_id, {
          team_id: ev.team_id,
          yellow_cards: 0,
          red_cards: 0,
          fairplay_score: 0,
        })
      }
      const td = teamMap.get(ev.team_id)!
      if (isYellow) td.yellow_cards++
      else td.red_cards++
      td.fairplay_score = calculateFairplayScore(td.yellow_cards, td.red_cards)
    }

    // Agrégation joueur
    if (ev.player_id && ev.team_id) {
      if (!playerMap.has(ev.player_id)) {
        playerMap.set(ev.player_id, {
          player_id: ev.player_id,
          team_id: ev.team_id,
          yellow_cards: 0,
          red_cards: 0,
          fairplay_score: 0,
        })
      }
      const pd = playerMap.get(ev.player_id)!
      if (isYellow) pd.yellow_cards++
      else pd.red_cards++
      pd.fairplay_score = calculateFairplayScore(pd.yellow_cards, pd.red_cards)
    }
  }

  const players = [...playerMap.values()].sort((a, b) => b.fairplay_score - a.fairplay_score)
  const teams = [...teamMap.values()].sort((a, b) => b.fairplay_score - a.fairplay_score)

  return {
    players,
    teams,
    totalYellow,
    totalRed,
  }
}
