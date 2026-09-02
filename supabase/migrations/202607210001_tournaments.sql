-- Table pour les tournois
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('elimination', 'swiss', 'round_robin')),
  sport TEXT NOT NULL DEFAULT 'chess',
  season_id UUID REFERENCES seasons(id),
  max_participants INTEGER,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration_open', 'in_progress', 'completed', 'cancelled')),
  registration_opens_at TIMESTAMP WITH TIME ZONE,
  registration_closes_at TIMESTAMP WITH TIME ZONE,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  rules TEXT,
  prize TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les participants aux tournois
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  seed INTEGER,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'withdrawn', 'disqualified')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  elo_rating INTEGER DEFAULT 1200,
  UNIQUE(tournament_id, player_id)
);

-- Table pour les matchs de tournoi (bracket)
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'walkover')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  result TEXT CHECK (result IN ('player1_win', 'player2_win', 'draw', 'abandon')),
  next_match_id UUID REFERENCES tournament_matches(id),
  parent_match1_id UUID REFERENCES tournament_matches(id),
  parent_match2_id UUID REFERENCES tournament_matches(id),
  board_position INTEGER, -- Pour les tournois avec plusieurs tables simultanées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les parties d'échecs détaillées
CREATE TABLE chess_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
  white_player_id UUID NOT NULL REFERENCES profiles(id),
  black_player_id UUID NOT NULL REFERENCES profiles(id),
  pgn TEXT, -- Portable Game Notation
  fen TEXT, -- Forsyth-Edwards Notation
  result TEXT NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
  termination TEXT CHECK (termination IN ('normal', 'time_forfeit', 'abandon', 'agreement', 'resignation', 'checkmate', 'stalemate')),
  time_control TEXT, -- Format: "300+5" pour 5min + 5sec increment
  white_time_used INTEGER, -- en secondes
  black_time_used INTEGER, -- en secondes
  moves_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_type ON tournaments(tournament_type);
CREATE INDEX idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_player ON tournament_participants(player_id);
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_round ON tournament_matches(tournament_id, round);
CREATE INDEX idx_chess_games_match ON chess_games(tournament_match_id);

-- RLS Policies
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_games ENABLE ROW LEVEL SECURITY;

-- Policies pour tournaments
CREATE POLICY "Tournaments are viewable by everyone" 
  ON tournaments FOR SELECT USING (true);

CREATE POLICY "Admins can create tournaments" 
  ON tournaments FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update tournaments" 
  ON tournaments FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policies pour tournament_participants
CREATE POLICY "Participants are viewable by everyone" 
  ON tournament_participants FOR SELECT USING (true);

CREATE POLICY "Players can register for open tournaments" 
  ON tournament_participants FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_participants.tournament_id
      AND t.status = 'registration_open'
      AND t.registration_opens_at <= NOW()
      AND t.registration_closes_at > NOW()
      AND (
        SELECT COUNT(*) FROM tournament_participants tp 
        WHERE tp.tournament_id = t.id
      ) < COALESCE(t.max_participants, 999999)
    )
    AND tournament_participants.player_id = auth.uid()
  );

-- Policies pour tournament_matches
CREATE POLICY "Matches are viewable by everyone" 
  ON tournament_matches FOR SELECT USING (true);

CREATE POLICY "Admins can manage matches" 
  ON tournament_matches FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policies pour chess_games
CREATE POLICY "Games are viewable by everyone" 
  ON chess_games FOR SELECT USING (true);

CREATE POLICY "Players can create games for their matches" 
  ON chess_games FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_matches tm
      WHERE tm.id = chess_games.tournament_match_id
      AND (tm.player1_id = auth.uid() OR tm.player2_id = auth.uid())
    )
    AND (chess_games.white_player_id = auth.uid() OR chess_games.black_player_id = auth.uid())
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_matches_updated_at BEFORE UPDATE ON tournament_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chess_games_updated_at BEFORE UPDATE ON chess_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
