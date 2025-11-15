import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Loader2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { authService } from '../utils/auth';

interface SynonymQuizScreenProps {
  volume: number;
  day: number;
  onBack: () => void;
  onComplete: (score: number) => void;
}

interface Balloon {
  id: string;
  word: string;
  progress: number; // 0, 1, 2, 3 (3이면 터짐)
  synonyms: string[]; // 이 풍선의 정답 유의어들
}

interface SynonymCard {
  id: string;
  word: string;
  belongsTo: string; // 어떤 표제어의 유의어인지
}

export function SynonymQuizScreen({ volume, day, onBack, onComplete }: SynonymQuizScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [synonymCards, setSynonymCards] = useState<SynonymCard[]>([]);
  const [allWords, setAllWords] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedCards, setSelectedCards] = useState<SynonymCard[]>([]); // 여러 개 선택 가능
  const [showCelebration, setShowCelebration] = useState(false);
  const [poppingBalloon, setPoppingBalloon] = useState<string | null>(null);
  const [currentWordSynonymCount, setCurrentWordSynonymCount] = useState(0); // 현재 단어의 유의어 개수

  const totalBalloonsNeeded = 30;
  const balloonsOnScreen = 4; // 화면에 4개 풍선

  useEffect(() => {
    fetchWords();
  }, [volume, day]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${volume}/${day}`;
      console.log(`🔍 [SynonymQuiz] Fetching words for VOL.${volume} Day ${day}...`);

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`📡 [SynonymQuiz] Response status:`, response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.words && data.words.length > 0) {
        // 유의어/반의어가 있는 단어들 필터링
        const wordsWithSynonyms = data.words.filter((word: any) =>
          word.synonyms && Array.isArray(word.synonyms) && word.synonyms.length > 0
        );

        console.log(`📊 [SynonymQuiz] Found ${wordsWithSynonyms.length} words with synonyms`);

        if (wordsWithSynonyms.length < 4) {
          throw new Error('유의어가 있는 단어가 부족합니다 (최소 4개 필요)');
        }

        setAllWords(wordsWithSynonyms);
        loadBalloons(wordsWithSynonyms, 0);
      } else {
        throw new Error('단어를 불러올 수 없습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  const loadBalloons = (words: any[], startIndex: number) => {
    // 화면에 1개 풍선만 선택
    const selectedWords = words.slice(startIndex, startIndex + 1);

    const newBalloons: Balloon[] = selectedWords.map((word, index) => ({
      id: `balloon-${startIndex + index}`,
      word: word.word,
      progress: 0,
      synonyms: word.synonyms.map((s: any) => s.word || s)
    }));

    console.log('🎈 [SynonymQuiz] Balloons created:', newBalloons);

    setBalloons(newBalloons);

    // 현재 단어의 유의어 개수 저장
    if (newBalloons.length > 0) {
      setCurrentWordSynonymCount(newBalloons[0].synonyms.length);
    }

    // 유의어 카드 생성 (현재 풍선의 유의어 + 다른 단어들의 유의어도 섞어서)
    const cards: SynonymCard[] = [];

    // 현재 풍선의 유의어 추가
    newBalloons.forEach(balloon => {
      balloon.synonyms.forEach((syn, idx) => {
        if (syn) {
          cards.push({
            id: `${balloon.id}-syn-${idx}`,
            word: syn,
            belongsTo: balloon.word
          });
        }
      });
    });

    // 다른 랜덤 단어들의 유의어도 추가 (오답 선택지)
    const otherWords = words.filter((_, idx) => idx !== startIndex).slice(0, 5);
    otherWords.forEach((word, wordIdx) => {
      if (word.synonyms && word.synonyms.length > 0) {
        word.synonyms.slice(0, 2).forEach((syn: any, idx: number) => {
          const synWord = syn.word || syn;
          if (synWord) {
            cards.push({
              id: `other-${wordIdx}-syn-${idx}`,
              word: synWord,
              belongsTo: word.word
            });
          }
        });
      }
    });

    console.log('🃏 [SynonymQuiz] Cards created BEFORE shuffle:', cards);

    // 카드 섞기
    const shuffled = cards.sort(() => Math.random() - 0.5);

    console.log('🃏 [SynonymQuiz] Final cards to display:', shuffled);

    setSynonymCards(shuffled);
  };

  const handleCardClick = (card: SynonymCard) => {
    const isAlreadySelected = selectedCards.some(c => c.id === card.id);

    if (isAlreadySelected) {
      // 이미 선택되어 있으면 선택 해제
      setSelectedCards(prev => prev.filter(c => c.id !== card.id));
    } else {
      // 선택 추가
      setSelectedCards(prev => [...prev, card]);
    }
  };

  const handleSubmit = () => {
    const currentBalloon = balloons[0];
    if (!currentBalloon || selectedCards.length === 0) return;

    // 정답 개수 확인
    const correctAnswers = selectedCards.filter(card => card.belongsTo === currentBalloon.word);
    const correctCount = correctAnswers.length;

    if (correctCount === currentWordSynonymCount && selectedCards.length === currentWordSynonymCount) {
      // 모든 유의어를 정확히 맞춤!
      setPoppingBalloon(currentBalloon.id);
      setScore(prev => prev + 30);

      setTimeout(() => {
        const newCompletedCount = completedCount + 1;
        setCompletedCount(newCompletedCount);
        setPoppingBalloon(null);
        setSelectedCards([]);

        // 30개 완료 체크
        if (newCompletedCount >= totalBalloonsNeeded) {
          setShowCelebration(true);
          setTimeout(() => {
            onComplete(score + 30);
          }, 2000);
        } else {
          // 다음 단어로 이동
          const nextIndex = newCompletedCount % allWords.length;
          loadBalloons(allWords, nextIndex);
        }
      }, 1000);
    } else {
      // 오답 - 선택 해제
      setTimeout(() => {
        setSelectedCards([]);
      }, 500);
    }
  };

  // Celebration Component
  const Celebration = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
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
            ['bg-pink-400', 'bg-purple-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400'][i % 5]
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={48} className="text-indigo-600 animate-spin mx-auto" />
          <p className="text-indigo-900 text-lg font-semibold">유의어 퀴즈를 준비하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">😵</div>
          <p className="text-indigo-900 text-lg">{error}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg"
          >
            돌아가기
          </motion.button>
        </div>
      </div>
    );
  }

  const currentBalloon = balloons[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 relative overflow-hidden">
      {showCelebration && <Celebration />}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">돌아가기</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-indigo-600 bg-white px-4 py-2 rounded-full shadow-sm">
              {completedCount} / {totalBalloonsNeeded}
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Trophy className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-900">{score}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalBalloonsNeeded) * 100}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Word Card */}
        {currentBalloon && (
          <motion.div
            key={currentBalloon.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-8 text-center shadow-xl border border-gray-100"
          >
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">표제어</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{currentBalloon.word}</h1>
            <p className="text-sm text-gray-500">유의어를 {currentWordSynonymCount}개 선택하세요</p>
            <p className="text-xs text-indigo-600 mt-2 font-semibold">선택됨: {selectedCards.length} / {currentWordSynonymCount}</p>
          </motion.div>
        )}

        {/* Synonym Pills */}
        <div className="bg-gray-50 rounded-3xl p-6 shadow-xl border border-gray-200">
          <h3 className="text-sm text-gray-600 mb-4 font-semibold">유의어 선택</h3>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {synonymCards.map((card) => {
                const isSelected = selectedCards.some(c => c.id === card.id);

                return (
                  <motion.button
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      backgroundColor: isSelected ? '#c7d2fe' : '#ffffff'
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      backgroundColor: isSelected ? '#c7d2fe' : '#ffffff',
                      color: isSelected ? '#3730a3' : '#111827'
                    }}
                    className={`px-6 py-3 rounded-full transition-all font-bold text-base border-2 shadow-md ${
                      isSelected
                        ? 'border-indigo-400'
                        : 'border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    {card.word}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Submit Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={selectedCards.length !== currentWordSynonymCount}
          whileTap={{ scale: 0.97 }}
          style={{
            backgroundColor: selectedCards.length === currentWordSynonymCount ? '#4f46e5' : '#d1d5db',
            color: selectedCards.length === currentWordSynonymCount ? '#ffffff' : '#4b5563'
          }}
          className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all ${
            selectedCards.length === currentWordSynonymCount
              ? 'hover:bg-indigo-700'
              : 'cursor-not-allowed'
          }`}
        >
          정답 제출
        </motion.button>
      </div>
    </div>
  );
}
