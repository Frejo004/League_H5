export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'captain' | 'player' | 'spectator'
export type MatchStatus = 'scheduled' | 'completed' | 'cancelled'
export type SpectatorStatus = 'pending' | 'approved' | 'rejected'
export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward'

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
        Returns: undefined // ✅ 'void' → 'undefined' (requis par supabase-js v2.39+)
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