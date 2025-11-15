import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Trophy, Loader2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { authService } from '../utils/auth';

interface DerivativeQuizScreenProps {
  volume: number;
  day: number;
  onBack: () => void;
  onComplete: (score: number) => void;
}

interface DerivativeWord {
  word: string;
  partOfSpeech: string;
  meaning: string;
}

interface Card {
  id: string;
  content: string; // word 또는 meaning
  type: 'word' | 'meaning';
  derivativeWord: string; // 원래 단어 (매칭 판별용)
  isMatched: boolean;
}

export function DerivativeQuizScreen({ volume, day, onBack, onComplete }: DerivativeQuizScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [allDerivatives, setAllDerivatives] = useState<DerivativeWord[]>([]);
  const totalRounds = 5;

  useEffect(() => {
    fetchDerivatives();
  }, [volume, day]);

  const loadRound = (derivatives: DerivativeWord[], roundNumber: number) => {
    // 랜덤하게 8개 선택
    const shuffled = [...derivatives].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 8);

    // 카드 생성: 각 파생어마다 단어 카드 + 뜻 카드
    const wordCards: Card[] = [];
    const meaningCards: Card[] = [];

    selected.forEach((der, index) => {
      wordCards.push({
        id: `word-${roundNumber}-${index}`,
        content: der.word,
        type: 'word',
        derivativeWord: der.word,
        isMatched: false
      });
      meaningCards.push({
        id: `meaning-${roundNumber}-${index}`,
        content: der.meaning,
        type: 'meaning',
        derivativeWord: der.word,
        isMatched: false
      });
    });

    // 단어와 뜻을 각각 섞기
    const shuffledWords = wordCards.sort(() => Math.random() - 0.5);
    const shuffledMeanings = meaningCards.sort(() => Math.random() - 0.5);

    // 4x4 그리드 배치: 왼쪽 2줄은 단어, 오른쪽 2줄은 뜻
    const arrangedCards: Card[] = [];
    for (let row = 0; row < 4; row++) {
      // 각 행마다 왼쪽 2개는 단어
      arrangedCards.push(shuffledWords[row * 2]);
      arrangedCards.push(shuffledWords[row * 2 + 1]);
      // 오른쪽 2개는 뜻
      arrangedCards.push(shuffledMeanings[row * 2]);
      arrangedCards.push(shuffledMeanings[row * 2 + 1]);
    }

    setCards(arrangedCards);
    setTotalPairs(selected.length);
    setMatchedCount(0);
    setSelectedCards([]);
    setCurrentRound(roundNumber);
  };

  const fetchDerivatives = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${volume}/${day}`;

      console.log(`🔍 [DerivativeQuiz] Fetching words for VOL.${volume} Day ${day}...`);

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📡 [DerivativeQuiz] Response status:`, response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.words && data.words.length > 0) {
        // 모든 단어의 파생어 수집
        const allDerivatives: DerivativeWord[] = [];

        data.words.forEach((word: any) => {
          if (word.derivatives && Array.isArray(word.derivatives)) {
            word.derivatives.forEach((der: any) => {
              if (der.word && der.meaning) {
                allDerivatives.push({
                  word: der.word,
                  partOfSpeech: der.partOfSpeech || '',
                  meaning: der.meaning
                });
              }
            });
          }
        });

        console.log(`📊 [DerivativeQuiz] Found ${allDerivatives.length} derivatives`);

        if (allDerivatives.length < 8) {
          throw new Error('파생어가 부족합니다 (최소 8개 필요)');
        }

        // 모든 파생어 저장 (5라운드 동안 랜덤하게 사용)
        setAllDerivatives(allDerivatives);

        // 첫 라운드 로드
        loadRound(allDerivatives, 1);
      } else {
        throw new Error('단어를 불러올 수 없습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load derivatives');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (card: Card) => {
    // 이미 매칭된 카드나 이미 선택된 카드는 무시
    if (card.isMatched || selectedCards.some(c => c.id === card.id)) {
      return;
    }

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    // 2장을 선택했을 때 매칭 확인
    if (newSelected.length === 2) {
      const [first, second] = newSelected;

      // 같은 파생어이고, 하나는 word, 하나는 meaning인지 확인
      if (
        first.derivativeWord === second.derivativeWord &&
        first.type !== second.type
      ) {
        // 매칭 성공!
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first.id || c.id === second.id
              ? { ...c, isMatched: true }
              : c
          ));
          const newMatchedCount = matchedCount + 1;
          setMatchedCount(newMatchedCount);
          setScore(prev => prev + 10);
          setSelectedCards([]);

          // 현재 라운드의 모든 카드가 매칭되었는지 확인
          if (newMatchedCount === totalPairs) {
            // 5라운드 완료했으면 퀴즈 종료
            if (currentRound >= totalRounds) {
              setShowCelebration(true);
              setTimeout(() => {
                onComplete(score + 10);
              }, 2000);
            } else {
              // 다음 라운드로
              setTimeout(() => {
                loadRound(allDerivatives, currentRound + 1);
              }, 1000);
            }
          }
        }, 500);
      } else {
        // 매칭 실패
        setTimeout(() => {
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  // Celebration Component
  const Celebration = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 1,
            y: -20,
            x: Math.random() * window.innerWidth,
            rotate: 0,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{
            opacity: 0,
            y: window.innerHeight + 100,
            rotate: Math.random() * 720 + 360,
            x: Math.random() * window.innerWidth
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            delay: Math.random() * 0.5,
            ease: "easeOut"
          }}
          className={`absolute w-4 h-4 rounded-full ${
            ['bg-yellow-400', 'bg-orange-400', 'bg-red-400', 'bg-pink-400', 'bg-purple-400'][i % 5]
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={48} className="text-indigo-500 animate-spin mx-auto" />
          <p className="text-gray-600">파생어 퀴즈를 준비하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">😵</div>
          <p className="text-gray-700">{error}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg"
          >
            돌아가기
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 relative">
      {showCelebration && <Celebration />}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">돌아가기</span>
          </button>
          <div className="text-sm font-semibold text-indigo-600 bg-white px-4 py-2 rounded-full shadow-sm">
            VOL.{volume} Day {day}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="font-bold text-gray-900">라운드: {currentRound} / {totalRounds}</span>
            </div>
            <div className="text-gray-300">|</div>
            <span className="font-bold text-gray-700">매칭: {matchedCount} / {totalPairs}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-gray-900">점수: {score}</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 bg-white py-2 px-6 rounded-full inline-block shadow-sm">
            파생어와 뜻을 매칭하세요!
          </p>
        </div>

        {/* 4x4 Grid */}
        <div className="grid grid-cols-4 gap-3" style={{ gridAutoRows: '1fr' }}>
          {cards.map((card) => {
            const isSelected = selectedCards.some(c => c.id === card.id);
            const isMatched = card.isMatched;

            return (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(card)}
                disabled={isMatched}
                whileTap={{ scale: isMatched ? 1 : 0.98 }}
                style={{ aspectRatio: '1 / 1' }}
                className={`rounded-2xl p-3 font-bold transition-all flex items-center justify-center text-sm ${
                  isMatched
                    ? 'bg-green-500 text-white opacity-0 cursor-default'
                    : isSelected
                    ? 'bg-indigo-600 text-white shadow-xl'
                    : 'bg-white text-gray-900 shadow-sm hover:shadow-lg hover:bg-gray-50 border border-gray-200'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isMatched ? 0 : 1, scale: 1 }}
                transition={{ delay: cards.indexOf(card) * 0.02 }}
              >
                <span className="break-words text-center leading-snug">{card.content}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Hint */}
        {selectedCards.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-block bg-white rounded-2xl px-6 py-3 shadow-sm border border-gray-100">
              <span className="text-sm text-gray-600">
                선택됨: <span className="font-bold text-indigo-600">{selectedCards[0].content}</span>
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
