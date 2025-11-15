-- Supabase schema for real-time PVP/Bot battles
-- Run this script in the SQL editor to ensure every dependency exists.

-- =========================
-- Profiles alignment (single source of truth for players)
-- =========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_code TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  name,
  student_code,
  role,
  points,
  total_xp,
  streak_days,
  wins,
  losses,
  created_at,
  updated_at
FROM public.profiles;

-- =========================
-- Users table guarantees
-- =========================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0;

-- Fill empty points with default so battle entry validations are happy
UPDATE public.users
SET points = 1000
WHERE points IS NULL OR points = 0;

-- =========================
-- Battles table
-- =========================
CREATE TABLE IF NOT EXISTS public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player1_hearts INTEGER NOT NULL DEFAULT 5,
  player2_hearts INTEGER NOT NULL DEFAULT 5,
  current_turn UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  bet_points INTEGER NOT NULL DEFAULT 100,
  is_bot_match BOOLEAN NOT NULL DEFAULT FALSE,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- battle_turns table
-- =========================
CREATE TABLE IF NOT EXISTS public.battle_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  attacker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  word_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('meaning', 'synonym', 'antonym')),
  answer TEXT,
  is_correct BOOLEAN,
  damage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Helpful indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_battles_player1 ON public.battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON public.battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON public.battles(status);
CREATE INDEX IF NOT EXISTS idx_battles_updated_at ON public.battles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_turns_match ON public.battle_turns(match_id);
CREATE INDEX IF NOT EXISTS idx_battle_turns_defender ON public.battle_turns(defender_id);

-- =========================
-- Row Level Security
-- =========================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their profile" ON public.users;
CREATE POLICY "Users can view their profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their profile" ON public.users;
CREATE POLICY "Users can update their profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own battles" ON public.battles;
CREATE POLICY "Users can view their own battles" ON public.battles
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Users can create battles" ON public.battles;
CREATE POLICY "Users can create battles" ON public.battles
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

DROP POLICY IF EXISTS "Users can update their battles" ON public.battles;
CREATE POLICY "Users can update their battles" ON public.battles
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Users can view turns in their battles" ON public.battle_turns;
CREATE POLICY "Users can view turns in their battles" ON public.battle_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = battle_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create turns in their battles" ON public.battle_turns;
CREATE POLICY "Users can create turns in their battles" ON public.battle_turns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = battle_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update turns in their battles" ON public.battle_turns;
CREATE POLICY "Users can update turns in their battles" ON public.battle_turns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = battle_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

-- =========================
-- Trigger for updated_at
-- =========================
CREATE OR REPLACE FUNCTION public.update_battles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_battles_updated_at ON public.battles;
CREATE TRIGGER update_battles_updated_at
  BEFORE UPDATE ON public.battles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_battles_updated_at();


