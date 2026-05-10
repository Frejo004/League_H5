export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'captain' | 'player' | 'spectator'
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type SpectatorStatus = 'pending' | 'approved' | 'rejected'
export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward'
export type MatchEventType =
  | 'goal' | 'own_goal'
  | 'yellow_card' | 'red_card'
  | 'substitution'
  | 'kickoff' | 'halftime' | 'fulltime'
  | 'comment'

export interface Database {
  public: {
    Tables: {
      seasons: {
        Row: {
          id: string
          name: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          is_locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          is_locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          is_locked?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          season_id: string
          name: string
          color: string
          logo_url: string | null
          captain_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          name: string
          color?: string
          logo_url?: string | null
          captain_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          name?: string
          color?: string
          logo_url?: string | null
          captain_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          team_id: string
          season_id: string
          user_id: string | null
          first_name: string
          last_name: string
          jersey_number: number | null
          position: PlayerPosition | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          season_id: string
          user_id?: string | null
          first_name: string
          last_name: string
          jersey_number?: number | null
          position?: PlayerPosition | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          season_id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          jersey_number?: number | null
          position?: PlayerPosition | null
          avatar_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          season_id: string
          home_team_id: string
          away_team_id: string
          matchday: number
          scheduled_at: string | null
          played_at: string | null
          home_score: number | null
          away_score: number | null
          status: MatchStatus
          venue: string | null
          live_started_at: string | null
          live_period: 1 | 2 | null
          live_minute: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          home_team_id: string
          away_team_id: string
          matchday: number
          scheduled_at?: string | null
          played_at?: string | null
          home_score?: number | null
          away_score?: number | null
          status?: MatchStatus
          venue?: string | null
          live_started_at?: string | null
          live_period?: 1 | 2 | null
          live_minute?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          home_team_id?: string
          away_team_id?: string
          matchday?: number
          scheduled_at?: string | null
          played_at?: string | null
          home_score?: number | null
          away_score?: number | null
          status?: MatchStatus
          venue?: string | null
          live_started_at?: string | null
          live_period?: 1 | 2 | null
          live_minute?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          match_id: string
          player_id: string
          team_id: string
          minute: number | null
          is_own_goal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          player_id: string
          team_id: string
          minute?: number | null
          is_own_goal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          player_id?: string
          team_id?: string
          minute?: number | null
          is_own_goal?: boolean
        }
        Relationships: []
      }
      assists: {
        Row: {
          id: string
          match_id: string
          goal_id: string
          player_id: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          goal_id: string
          player_id: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          goal_id?: string
          player_id?: string
        }
        Relationships: []
      }
      mvp_votes: {
        Row: {
          id: string
          match_id: string
          player_id: string
          voted_by: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          player_id: string
          voted_by: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          player_id?: string
          voted_by?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          season_id: string
          league_locked: boolean
          playoff_enabled: boolean
          playoff_format: 'single' | 'two_legs'
          teams_in_playoff: number
          points_win: number
          points_draw: number
          points_loss: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          league_locked?: boolean
          playoff_enabled?: boolean
          playoff_format?: 'single' | 'two_legs'
          teams_in_playoff?: number
          points_win?: number
          points_draw?: number
          points_loss?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          league_locked?: boolean
          playoff_enabled?: boolean
          playoff_format?: 'single' | 'two_legs'
          teams_in_playoff?: number
          points_win?: number
          points_draw?: number
          points_loss?: number
          updated_at?: string
        }
        Relationships: []
      }
      spectators: {
        Row: {
          id: string
          user_id: string
          season_id: string
          status: SpectatorStatus
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          season_id: string
          status?: SpectatorStatus
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          season_id?: string
          status?: SpectatorStatus
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          id: string
          team_id: string
          sender_id: string
          content: string
          reply_to_id: string | null
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          sender_id: string
          content: string
          reply_to_id?: string | null
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          edited_at?: string | null
        }
        Relationships: []
      }
      team_message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          emoji?: string
        }
        Relationships: []
      }
chat_read_receipts: {
         Row: {
           user_id: string
           team_id: string
           last_read_at: string
           last_read_msg: string | null
           updated_at: string
         }
         Insert: {
           user_id: string
           team_id: string
           last_read_at?: string
           last_read_msg?: string | null
           updated_at?: string
         }
         Update: {
           last_read_at?: string
           last_read_msg?: string | null
           updated_at?: string
         }
         Relationships: []
       }
       chat_typing: {
         Row: {
           user_id: string
           team_id: string
           started_at: string
         }
         Insert: {
           user_id: string
           team_id: string
           started_at?: string
         }
         Update: {
           started_at?: string
         }
         Relationships: []
       }
       team_pinned_messages: {
         Row: {
           id: string
           team_id: string
           message_id: string
           pinned_by: string
           pinned_at: string
         }
         Insert: {
           id?: string
           team_id: string
           message_id: string
           pinned_by: string
           pinned_at?: string
         }
         Update: {
           pinned_by?: string
           pinned_at?: string
         }
         Relationships: []
       }
       chat_mentions: {
         Row: {
           id: string
           message_id: string
           mentioned_user_id: string
           mentioned_by: string
           created_at: string
         }
         Insert: {
           id?: string
           message_id: string
           mentioned_user_id: string
           mentioned_by: string
           created_at?: string
         }
         Update: {
           mentioned_user_id?: string
           mentioned_by?: string
         }
         Relationships: []
       }
       player_invites: {
        Row: {
          id: string
          player_id: string
          token: string
          created_by: string
          used_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          token?: string
          created_by: string
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          token?: string
          created_by?: string
          used_at?: string | null
          expires_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invite_player: {
        Args: { p_token: string }
        Returns: {
          player_id: string
          first_name: string
          last_name: string
          team_name: string
          is_valid: boolean
        }[]
      }
      claim_player_invite: {
        Args: { p_token: string; p_user_id: string }
        Returns: undefined
      }
      set_active_season: {
        Args: { p_season_id: string }
        Returns: undefined
      }
      get_standings: {
        Args: { p_season_id: string }
        Returns: {
          team_id: string
          team_name: string
          team_color: string
          team_logo: string | null
          played: number
          won: number
          drawn: number
          lost: number
          goals_for: number
          goals_against: number
          goal_diff: number
          points: number
          form: string // Format: "W,D,L,W,W" (comma-separated)
        }[]
      }
      set_team_captain: {
        Args: {
          p_team_id: string
          p_captain_player_id: string | null
          p_captain_user_id: string | null
        }
        Returns: undefined
      }
      get_scorers: {
        Args: { p_season_id: string }
        Returns: {
          player_id: string
          first_name: string
          last_name: string
          team_id: string
          team_name: string
          team_color: string
          goals: number
          assists: number
          own_goals: number
        }[]
      }
    }
    Enums: {
      user_role: UserRole
      match_status: MatchStatus
      spectator_status: SpectatorStatus
      player_position: PlayerPosition
    }
    // ✅ Champ requis par supabase-js v2.39+
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience row types
export type Season = Database['public']['Tables']['seasons']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Goal = Database['public']['Tables']['goals']['Row']
export type Assist = Database['public']['Tables']['assists']['Row']
export type MvpVote = Database['public']['Tables']['mvp_votes']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
export type Spectator = Database['public']['Tables']['spectators']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type PlayerInvite = Database['public']['Tables']['player_invites']['Row']

// ─────────────────────────────────────────────────────────────────────────────
// Types de jointure — utilisés partout où Supabase retourne des relations
// imbriquées. Évite les casts `as unknown as` dans les composants.
// ─────────────────────────────────────────────────────────────────────────────

/** Sous-type équipe retourné dans les jointures (select partiel) */
export type TeamRef = Pick<Team, 'id' | 'name' | 'color' | 'logo_url'>

/** Sous-type joueur retourné dans les jointures (select partiel) */
export type PlayerRef = Pick<Player, 'id' | 'first_name' | 'last_name' | 'jersey_number'>

/** Sous-type joueur pour les passes décisives (sans jersey_number) */
export type PlayerRefSlim = Pick<Player, 'id' | 'first_name' | 'last_name'>

/** But avec joueur imbriqué — retourné par useMatch (détail) */
export type GoalWithPlayer = Goal & {
  players: (PlayerRef) | null
}

/** Passe avec joueur imbriqué — retourné par useMatch (détail) */
export type AssistWithPlayer = Assist & {
  players: PlayerRefSlim | null
}

/** Match avec équipes imbriquées — retourné par useMatches */
export type MatchWithTeams = Match & {
  home_team: TeamRef
  away_team: TeamRef
}

/** Match détaillé avec équipes + buts + passes — retourné par useMatch */
export type MatchDetail = MatchWithTeams & {
  goals: GoalWithPlayer[]
  assists: AssistWithPlayer[]
}

/** Équipe avec captain_player_id — retourné par useTeams (migration 022) */
export type TeamWithCaptain = Team & {
  captain_player_id: string | null
}

/** Joueur avec équipe imbriquée — retourné par usePlayers */
export type PlayerWithTeam = Player & {
  teams: TeamRef | null
}

export type TeamMessage = Database['public']['Tables']['team_messages']['Row']
export type TeamMessageReaction = Database['public']['Tables']['team_message_reactions']['Row']
export type ChatReadReceipt = Database['public']['Tables']['chat_read_receipts']['Row']
export type ChatTyping = Database['public']['Tables']['chat_typing']['Row']
export type TeamPinnedMessage = Database['public']['Tables']['team_pinned_messages']['Row']
export type ChatMention = Database['public']['Tables']['chat_mentions']['Row']

// ── Live match types ──────────────────────────────────────────────────────────

export interface MatchEvent {
  id: string
  match_id: string
  type: MatchEventType
  minute: number | null
  period: 1 | 2 | null
  team_id: string | null
  player_id: string | null
  player2_id: string | null
  description: string | null
  created_at: string
  created_by: string
  // Jointures optionnelles
  team?: { id: string; name: string; color: string } | null
  player?: { id: string; first_name: string; last_name: string } | null
  player2?: { id: string; first_name: string; last_name: string } | null
}

export interface LiveReaction {
  id: string
  match_id: string
  user_id: string
  emoji: string
  created_at: string
}

/** Message enrichi avec sender + réactions + message cité */
export type TeamMessageFull = TeamMessage & {
  sender: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  reactions: (TeamMessageReaction & {
    profile: Pick<Profile, 'id' | 'full_name'>
  })[]
  reply_to: (Pick<TeamMessage, 'id' | 'content'> & {
    sender: Pick<Profile, 'id' | 'full_name'>
  }) | null
}
