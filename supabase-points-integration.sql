-- 포인트 시스템 통합 SQL 스키마
-- XP를 Points로 통합하고 모든 시스템 연동

-- ======================
-- users 테이블 업데이트
-- ======================

-- users 테이블에 points 필드가 없으면 추가 (기본값 1000)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'points'
  ) THEN
    ALTER TABLE public.users ADD COLUMN points INTEGER NOT NULL DEFAULT 1000;
  ELSE
    -- 이미 있으면 기본값 변경
    ALTER TABLE public.users ALTER COLUMN points SET DEFAULT 1000;
  END IF;
END $$;

-- users 테이블에 wins, losses 필드가 없으면 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'wins'
  ) THEN
    ALTER TABLE public.users ADD COLUMN wins INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'losses'
  ) THEN
    ALTER TABLE public.users ADD COLUMN losses INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 기존 students 테이블의 total_xp를 users 테이블의 points로 마이그레이션
-- (students.id와 users.id가 같은 경우)
-- 포인트가 0이거나 없는 경우 1000으로 설정
UPDATE public.users u
SET points = CASE
  WHEN COALESCE(u.points, 0) = 0 THEN 1000
  ELSE COALESCE(
    (SELECT total_xp FROM public.students s WHERE s.id = u.id),
    u.points,
    1000
  )
END
WHERE EXISTS (SELECT 1 FROM public.students s WHERE s.id = u.id);

-- 포인트가 0인 모든 사용자를 1000으로 업데이트
UPDATE public.users
SET points = 1000
WHERE points = 0 OR points IS NULL;

-- ======================
-- battles 테이블 업데이트 (이미 있으면 스킵)
-- ======================

CREATE TABLE IF NOT EXISTS public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player1_hearts INTEGER NOT NULL DEFAULT 5,
  player2_hearts INTEGER NOT NULL DEFAULT 5,
  current_turn UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  bet_points INTEGER NOT NULL DEFAULT 100,
  is_bot_match BOOLEAN NOT NULL DEFAULT false,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- match_turns 테이블 업데이트
CREATE TABLE IF NOT EXISTS public.match_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  attacker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  word_id INTEGER NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  word_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('meaning', 'synonym', 'antonym')),
  answer TEXT,
  is_correct BOOLEAN,
  damage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- 인덱스 생성
-- ======================

CREATE INDEX IF NOT EXISTS idx_users_points ON public.users(points DESC);
CREATE INDEX IF NOT EXISTS idx_battles_player1 ON public.battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON public.battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON public.battles(status);
CREATE INDEX IF NOT EXISTS idx_match_turns_match ON public.match_turns(match_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_user ON public.user_decks(user_id);

-- ======================
-- RLS 정책 설정
-- ======================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_turns ENABLE ROW LEVEL SECURITY;

-- users 테이블 정책
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- battles 테이블 정책
DROP POLICY IF EXISTS "Users can view their own matches" ON public.battles;
CREATE POLICY "Users can view their own matches" ON public.battles
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Users can create matches" ON public.battles;
CREATE POLICY "Users can create matches" ON public.battles
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

DROP POLICY IF EXISTS "Users can update their own matches" ON public.battles;
CREATE POLICY "Users can update their own matches" ON public.battles
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- match_turns 테이블 정책
DROP POLICY IF EXISTS "Users can view turns in their matches" ON public.match_turns;
CREATE POLICY "Users can view turns in their matches" ON public.match_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = match_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create turns in their matches" ON public.match_turns;
CREATE POLICY "Users can create turns in their matches" ON public.match_turns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = match_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

-- ======================
-- 트리거 함수
-- ======================

-- battles 테이블의 updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_battles_updated_at()
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
  EXECUTE FUNCTION update_battles_updated_at();

-- ======================
-- 뷰 생성 (랭킹용)
-- ======================

CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  u.id,
  u.name,
  u.points,
  u.wins,
  u.losses,
  COALESCE(p.avatar_url, '') as avatar_url
FROM public.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.points > 0 OR u.wins > 0 OR u.losses > 0
ORDER BY u.points DESC, u.wins DESC;

