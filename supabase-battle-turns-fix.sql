-- battle_turns 테이블 수정 SQL (실제 테이블 이름에 맞춤)
-- 이 SQL을 Supabase 대시보드에서 실행하세요

-- ======================
-- 1. battles 테이블에 hearts 컬럼 추가
-- ======================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'battles' AND column_name = 'player1_hearts'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN player1_hearts INTEGER NOT NULL DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'battles' AND column_name = 'player2_hearts'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN player2_hearts INTEGER NOT NULL DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'battles' AND column_name = 'winner_id'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ======================
-- 2. battle_turns 테이블 확인 및 수정
-- ======================

-- battle_turns 테이블이 battles를 참조하는지 확인하고 수정
DO $$ 
BEGIN
  -- battle_turns 테이블이 matches를 참조하고 있으면 battles로 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'battle_turns' 
    AND constraint_name LIKE '%matches%'
  ) THEN
    ALTER TABLE public.battle_turns DROP CONSTRAINT IF EXISTS battle_turns_match_id_fkey;
    ALTER TABLE public.battle_turns ADD CONSTRAINT battle_turns_match_id_fkey 
      FOREIGN KEY (match_id) REFERENCES public.battles(id) ON DELETE CASCADE;
  END IF;
  
  -- battle_turns가 battles를 참조하지 않으면 외래키 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'battle_turns' 
    AND constraint_name LIKE '%battles%'
  ) THEN
    -- 기존 외래키 제거 후 재생성
    ALTER TABLE public.battle_turns DROP CONSTRAINT IF EXISTS battle_turns_match_id_fkey;
    ALTER TABLE public.battle_turns ADD CONSTRAINT battle_turns_match_id_fkey 
      FOREIGN KEY (match_id) REFERENCES public.battles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- word_text 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battle_turns' 
    AND column_name = 'word_text'
  ) THEN
    ALTER TABLE public.battle_turns ADD COLUMN word_text TEXT;
    -- 기존 데이터가 있으면 word_id로부터 word_text 채우기
    UPDATE public.battle_turns bt
    SET word_text = w.word
    FROM public.words w
    WHERE bt.word_id = w.id AND bt.word_text IS NULL;
    -- NOT NULL 제약 조건 추가 (데이터가 모두 채워진 후)
    ALTER TABLE public.battle_turns ALTER COLUMN word_text SET NOT NULL;
  END IF;
END $$;

-- ======================
-- 3. 인덱스 생성
-- ======================

CREATE INDEX IF NOT EXISTS idx_battles_player1 ON public.battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON public.battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON public.battles(status);
CREATE INDEX IF NOT EXISTS idx_battle_turns_match ON public.battle_turns(match_id);
CREATE INDEX IF NOT EXISTS idx_battle_turns_defender ON public.battle_turns(defender_id);

-- ======================
-- 4. RLS 정책 설정
-- ======================

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_turns ENABLE ROW LEVEL SECURITY;

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

-- battle_turns 테이블 정책
DROP POLICY IF EXISTS "Users can view turns in their matches" ON public.battle_turns;
CREATE POLICY "Users can view turns in their matches" ON public.battle_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = battle_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create turns in their matches" ON public.battle_turns;
CREATE POLICY "Users can create turns in their matches" ON public.battle_turns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = battle_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update turns in their matches" ON public.battle_turns;
CREATE POLICY "Users can update turns in their matches" ON public.battle_turns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = battle_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

-- ======================
-- 5. 트리거 함수
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

