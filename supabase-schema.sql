-- Vocamonster 게임을 위한 테이블 생성 SQL

-- matches 테이블: 게임 매치 정보
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  player1_hp INTEGER NOT NULL DEFAULT 100,
  player2_hp INTEGER NOT NULL DEFAULT 100,
  current_turn UUID REFERENCES auth.users(id),
  bet_points INTEGER NOT NULL DEFAULT 100,
  is_bot_match BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- match_turns 테이블: 매치의 각 턴 정보
CREATE TABLE IF NOT EXISTS public.match_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  attacker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  word_id INTEGER NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('meaning', 'synonym', 'antonym')),
  answer TEXT,
  is_correct BOOLEAN,
  damage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_decks 테이블: 사용자의 단어 덱
CREATE TABLE IF NOT EXISTS public.user_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON public.matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON public.matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_match_turns_match ON public.match_turns(match_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_user ON public.user_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_word ON public.user_decks(word_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_decks ENABLE ROW LEVEL SECURITY;

-- matches 테이블 정책
CREATE POLICY "Users can view their own matches" ON public.matches
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Users can update their own matches" ON public.matches
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- match_turns 테이블 정책
CREATE POLICY "Users can view turns in their matches" ON public.match_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_turns.match_id
      AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create turns in their matches" ON public.match_turns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_turns.match_id
      AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );

-- user_decks 테이블 정책
CREATE POLICY "Users can view their own deck" ON public.user_decks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add words to their deck" ON public.user_decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove words from their deck" ON public.user_decks
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- matches 테이블의 updated_at 트리거
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

