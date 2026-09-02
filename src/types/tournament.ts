export type TournamentType = 'elimination' | 'swiss' | 'round_robin'
export type TournamentStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled'
export type ParticipantStatus = 'registered' | 'confirmed' | 'withdrawn' | 'disqualified'
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'walkover'
export type MatchResult = 'player1_win' | 'player2_win' | 'draw' | 'abandon'
export type ChessResult = '1-0' | '0-1' | '1/2-1/2' | '*'
export type ChessTermination = 'normal' | 'time_forfeit' | 'abandon' | 'agreement' | 'resignation' | 'checkmate' | 'stalemate'

export interface Tournament {
  id: string
  slug: string
  name: string
  description: string | null
  tournament_type: TournamentType
  sport: string
  season_id: string | null
  max_participants: number | null
  status: TournamentStatus
  registration_opens_at: string | null
  registration_closes_at: string | null
  starts_at: string | null
  ends_at: string | null
  rules: string | null
  prize: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  player_id: string
  seed: number | null
  status: ParticipantStatus
  registered_at: string
  elo_rating: number
  // Joined fields
  player?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  round: number
  match_number: number
  player1_id: string | null
  player2_id: string | null
  winner_id: string | null
  status: MatchStatus
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  result: MatchResult | null
  next_match_id: string | null
  parent_match1_id: string | null
  parent_match2_id: string | null
  board_position: number | null
  created_at: string
  updated_at: string
  // Joined fields
  player1?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  player2?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  winner?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface ChessGame {
  id: string
  tournament_match_id: string | null
  white_player_id: string
  black_player_id: string
  pgn: string | null
  fen: string | null
  result: ChessResult
  termination: ChessTermination | null
  time_control: string | null
  white_time_used: number | null
  black_time_used: number | null
  moves_count: number
  created_at: string
  updated_at: string
  // Joined fields
  white_player?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  black_player?: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface TournamentWithParticipants extends Tournament {
  participants: TournamentParticipant[]
  participant_count: number
}

export interface TournamentWithMatches extends Tournament {
  matches: TournamentMatch[]
  participants: TournamentParticipant[]
}

export interface BracketRound {
  round: number
  matches: TournamentMatch[]
}
