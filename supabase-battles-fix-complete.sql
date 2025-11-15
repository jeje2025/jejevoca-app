-- battles 테이블 및 관련 테이블 완전 수정 SQL
-- 이 SQL을 Supabase 대시보드에서 실행하세요

-- ======================
-- 1. battles 테이블 생성/수정
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

-- 기존 battles 테이블에 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  -- player1_hearts 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battles' 
    AND column_name = 'player1_hearts'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN player1_hearts INTEGER NOT NULL DEFAULT 5;
  END IF;
  
  -- player2_hearts 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battles' 
    AND column_name = 'player2_hearts'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN player2_hearts INTEGER NOT NULL DEFAULT 5;
  END IF;
  
  -- winner_id 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battles' 
    AND column_name = 'winner_id'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ======================
-- 2. match_turns 테이블 생성
-- ======================

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

-- match_turns 테이블에 word_text 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'match_turns' 
    AND column_name = 'word_text'
  ) THEN
    ALTER TABLE public.match_turns ADD COLUMN word_text TEXT;
    -- 기존 데이터가 있으면 word_id로부터 word_text 채우기
    UPDATE public.match_turns mt
    SET word_text = w.word
    FROM public.words w
    WHERE mt.word_id = w.id AND mt.word_text IS NULL;
    -- NOT NULL 제약 조건 추가
    ALTER TABLE public.match_turns ALTER COLUMN word_text SET NOT NULL;
  END IF;
END $$;

-- ======================
-- 3. user_decks 테이블 생성 (없는 경우)
-- ======================

CREATE TABLE IF NOT EXISTS public.user_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- ======================
-- 4. 인덱스 생성
-- ======================

CREATE INDEX IF NOT EXISTS idx_battles_player1 ON public.battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON public.battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON public.battles(status);
CREATE INDEX IF NOT EXISTS idx_match_turns_match ON public.match_turns(match_id);
CREATE INDEX IF NOT EXISTS idx_match_turns_defender ON public.match_turns(defender_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_user ON public.user_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_word ON public.user_decks(word_id);

-- ======================
-- 5. RLS 정책 설정
-- ======================

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_decks ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can update turns in their matches" ON public.match_turns;
CREATE POLICY "Users can update turns in their matches" ON public.match_turns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = match_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

-- user_decks 테이블 정책
DROP POLICY IF EXISTS "Users can view their own deck" ON public.user_decks;
CREATE POLICY "Users can view their own deck" ON public.user_decks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add words to their deck" ON public.user_decks;
CREATE POLICY "Users can add words to their deck" ON public.user_decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove words from their deck" ON public.user_decks;
CREATE POLICY "Users can remove words from their deck" ON public.user_decks
  FOR DELETE USING (auth.uid() = user_id);

-- ======================
-- 6. 트리거 함수
-- ======================

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

