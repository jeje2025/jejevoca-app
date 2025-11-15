-- battles 테이블 하트 시스템 마이그레이션
-- player1_hp, player2_hp를 player1_hearts, player2_hearts로 변경

-- ======================
-- battles 테이블이 없으면 생성
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

-- ======================
-- 기존 battles 테이블에 hearts 컬럼 추가 (없는 경우)
-- ======================

-- player1_hearts 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battles' 
    AND column_name = 'player1_hearts'
  ) THEN
    -- player1_hp가 있으면 그 값을 사용, 없으면 5로 설정
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'battles' 
      AND column_name = 'player1_hp'
    ) THEN
      ALTER TABLE public.battles ADD COLUMN player1_hearts INTEGER;
      UPDATE public.battles SET player1_hearts = CASE 
        WHEN player1_hp > 0 THEN LEAST(player1_hp, 5)
        ELSE 5
      END;
      ALTER TABLE public.battles ALTER COLUMN player1_hearts SET NOT NULL;
      ALTER TABLE public.battles ALTER COLUMN player1_hearts SET DEFAULT 5;
    ELSE
      ALTER TABLE public.battles ADD COLUMN player1_hearts INTEGER NOT NULL DEFAULT 5;
    END IF;
  END IF;
END $$;

-- player2_hearts 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'battles' 
    AND column_name = 'player2_hearts'
  ) THEN
    -- player2_hp가 있으면 그 값을 사용, 없으면 5로 설정
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'battles' 
      AND column_name = 'player2_hp'
    ) THEN
      ALTER TABLE public.battles ADD COLUMN player2_hearts INTEGER;
      UPDATE public.battles SET player2_hearts = CASE 
        WHEN player2_hp > 0 THEN LEAST(player2_hp, 5)
        ELSE 5
      END;
      ALTER TABLE public.battles ALTER COLUMN player2_hearts SET NOT NULL;
      ALTER TABLE public.battles ALTER COLUMN player2_hearts SET DEFAULT 5;
    ELSE
      ALTER TABLE public.battles ADD COLUMN player2_hearts INTEGER NOT NULL DEFAULT 5;
    END IF;
  END IF;
END $$;

-- winner_id 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
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
-- match_turns 테이블 업데이트
-- ======================

-- match_turns 테이블이 battles를 참조하도록 수정
DO $$ 
BEGIN
  -- match_turns가 matches를 참조하고 있으면 battles로 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'match_turns' 
    AND constraint_name LIKE '%matches%'
  ) THEN
    -- 기존 외래키 제약 조건 삭제 후 재생성
    ALTER TABLE public.match_turns DROP CONSTRAINT IF EXISTS match_turns_match_id_fkey;
    ALTER TABLE public.match_turns ADD CONSTRAINT match_turns_match_id_fkey 
      FOREIGN KEY (match_id) REFERENCES public.battles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- word_text 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'match_turns' 
    AND column_name = 'word_text'
  ) THEN
    ALTER TABLE public.match_turns ADD COLUMN word_text TEXT;
  END IF;
END $$;

-- ======================
-- 인덱스 생성
-- ======================

CREATE INDEX IF NOT EXISTS idx_battles_player1 ON public.battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON public.battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON public.battles(status);
CREATE INDEX IF NOT EXISTS idx_match_turns_match ON public.match_turns(match_id);

-- ======================
-- RLS 정책 설정
-- ======================

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_turns ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Users can view their own matches" ON public.battles;
DROP POLICY IF EXISTS "Users can create matches" ON public.battles;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.battles;

CREATE POLICY "Users can view their own matches" ON public.battles
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create matches" ON public.battles
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Users can update their own matches" ON public.battles
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- match_turns 정책
DROP POLICY IF EXISTS "Users can view turns in their matches" ON public.match_turns;
DROP POLICY IF EXISTS "Users can create turns in their matches" ON public.match_turns;

CREATE POLICY "Users can view turns in their matches" ON public.match_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.battles
      WHERE battles.id = match_turns.match_id
      AND (battles.player1_id = auth.uid() OR battles.player2_id = auth.uid())
    )
  );

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

