-- battles 테이블에 hearts 컬럼만 추가하는 SQL
-- battle_turns 테이블은 이미 존재하므로 battles만 수정

-- ======================
-- battles 테이블에 hearts 컬럼 추가
-- ======================

DO $$ 
BEGIN
  -- player1_hearts 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battles' 
    AND column_name = 'player1_hearts'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN player1_hearts INTEGER NOT NULL DEFAULT 5;
    -- 기존 데이터가 있으면 모두 5로 설정
    UPDATE public.battles SET player1_hearts = 5 WHERE player1_hearts IS NULL;
  END IF;
  
  -- player2_hearts 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battles' 
    AND column_name = 'player2_hearts'
  ) THEN
    ALTER TABLE public.battles ADD COLUMN player2_hearts INTEGER NOT NULL DEFAULT 5;
    -- 기존 데이터가 있으면 모두 5로 설정
    UPDATE public.battles SET player2_hearts = 5 WHERE player2_hearts IS NULL;
  END IF;
  
  -- winner_id 컬럼 추가 (없는 경우)
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
-- battle_turns 테이블에 word_text 컬럼 추가 (없는 경우)
-- ======================

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
  END IF;
END $$;

-- ======================
-- battle_turns가 battles를 참조하는지 확인
-- ======================

DO $$ 
BEGIN
  -- battle_turns가 matches를 참조하고 있으면 battles로 변경
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
    AND constraint_name LIKE '%match_id%'
  ) THEN
    ALTER TABLE public.battle_turns DROP CONSTRAINT IF EXISTS battle_turns_match_id_fkey;
    ALTER TABLE public.battle_turns ADD CONSTRAINT battle_turns_match_id_fkey 
      FOREIGN KEY (match_id) REFERENCES public.battles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ======================
-- RLS 정책 확인 및 업데이트
-- ======================

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_turns ENABLE ROW LEVEL SECURITY;

-- battles 정책
DROP POLICY IF EXISTS "Users can view their own matches" ON public.battles;
CREATE POLICY "Users can view their own matches" ON public.battles
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Users can create matches" ON public.battles;
CREATE POLICY "Users can create matches" ON public.battles
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

DROP POLICY IF EXISTS "Users can update their own matches" ON public.battles;
CREATE POLICY "Users can update their own matches" ON public.battles
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- battle_turns 정책
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

