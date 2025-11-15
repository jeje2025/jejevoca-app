import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Timer, Heart, CheckCircle, X, Loader2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { authService } from '../utils/auth';

interface MeaningQuizScreenProps {
  volume: number;
  day: number;
  onBack: () => void;
  onComplete: (score: number) => void;
}

interface QuizQuestion {
  id?: string;
  word: string;
  correctAnswer: string;
  options: string[];
}

interface WordData {
  id: string;
  word: string;
  koreanMeaning: string;
}

// 품사 추출 함수
function extractPartOfSpeech(meaning: string): string {
  // 동사: ~하다, ~되다 등으로 끝남
  if (/하다|되다|시키다$/i.test(meaning.split(/[,;]/)[0])) {
    return 'verb';
  }

  // 형용사: ~한, ~로운, ~스러운 등으로 끝남
  if (/한|로운|스러운|적인$/i.test(meaning.split(/[,;]/)[0])) {
    return 'adjective';
  }

  // 부사: ~게, ~히, ~이 등으로 끝남
  if (/게|히$/i.test(meaning.split(/[,;]/)[0])) {
    return 'adverb';
  }

  // 기본값: 명사
  return 'noun';
}

// 품사별 기본 오답
const FALLBACK_BY_POS: Record<string, string[]> = {
  verb: ['얻다', '도착하다', '시작하다', '끝내다'],
  adjective: ['행복한', '슬픈', '좋은', '나쁜'],
  noun: ['부족함', '어려움', '실수', '운'],
  adverb: ['빠르게', '느리게', '쉽게', '어렵게'],
};

function generateOptions(correctAnswer: string, allWords: WordData[]): string[] {
  // 정답의 품사 파악
  const correctPos = extractPartOfSpeech(correctAnswer);

  // 같은 품사의 다른 단어들 찾기
  const samePosWords = allWords
    .filter(w => w.koreanMeaning !== correctAnswer)
    .filter(w => extractPartOfSpeech(w.koreanMeaning) === correctPos);

  // 오답 보기 생성
  const distractors: string[] = [];
  const shuffled = [...samePosWords].sort(() => Math.random() - 0.5);

  // 같은 품사에서 4개 선택
  for (const word of shuffled) {
    if (distractors.length >= 4) break;
    if (!distractors.includes(word.koreanMeaning)) {
      distractors.push(word.koreanMeaning);
    }
  }

  // 부족하면 다른 단어들로 채우기
  if (distractors.length < 4) {
    const otherWords = allWords
      .filter(w => w.koreanMeaning !== correctAnswer)
      .filter(w => !distractors.includes(w.koreanMeaning))
      .sort(() => Math.random() - 0.5);

    for (const word of otherWords) {
      if (distractors.length >= 4) break;
      distractors.push(word.koreanMeaning);
    }
  }

  // 여전히 부족하면 기본 오답 사용
  if (distractors.length < 4) {
    const fallbacks = FALLBACK_BY_POS[correctPos] || [];
    for (const fb of fallbacks) {
      if (distractors.length >= 4) break;
      if (!distractors.includes(fb) && fb !== correctAnswer) {
        distractors.push(fb);
      }
    }
  }

  // 정답과 오답 섞기
  const options = [correctAnswer, ...distractors.slice(0, 4)];
  return options.sort(() => Math.random() - 0.5);
}

export function MeaningQuizScreen({ volume, day, onBack, onComplete }: MeaningQuizScreenProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [words, setWords] = useState<WordData[]>([]);
  const [correctWordIds, setCorrectWordIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchWordsAndGenerateQuiz();
  }, [volume, day]);

  const fetchWordsAndGenerateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${volume}/${day}`;

      console.log(`🔍 [MeaningQuiz] Fetching words for VOL.${volume} Day ${day}...`);
      console.log(`🔍 [MeaningQuiz] URL:`, url);

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📡 [MeaningQuiz] Response status:`, response.status);
      console.log(`📡 [MeaningQuiz] Response ok:`, response.ok);

      const data = await response.json();
      console.log(`📦 [MeaningQuiz] Response data:`, data);

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.words && data.words.length > 0) {
        const wordsData: WordData[] = data.words;
        setWords(wordsData);

        const quizQuestions: QuizQuestion[] = wordsData.map((word) => ({
          id: word.id,
          word: word.word,
          correctAnswer: word.koreanMeaning,
          options: generateOptions(word.koreanMeaning, wordsData)
        }));

        setQuestions(quizQuestions);

        // 디버깅: 품사 분포 확인
        const posCount: Record<string, number> = {};
        wordsData.forEach(w => {
          const pos = extractPartOfSpeech(w.koreanMeaning);
          posCount[pos] = (posCount[pos] || 0) + 1;
        });
        console.log('📊 품사 분포:', posCount);
      } else {
        throw new Error('No words found for this volume and day');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const totalQuestions = questions.length;
  const currentQuiz = questions[currentQuestion];

  // Timer countdown
  useEffect(() => {
    if (showFeedback) return;

    if (timeLeft <= 0) {
      handleWrongAnswer();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showFeedback]);

  const handleWrongAnswer = () => {
    setShowFeedback(true);
    const newLives = Math.max(0, lives - 1);
    setLives(newLives);

    setTimeout(() => {
      if (score >= 27) {
        onComplete(score);
      } else if (newLives <= 0) {
        onComplete(score);
      } else if (currentQuestion + 1 >= totalQuestions) {
        onComplete(score);
      } else {
        nextQuestion();
      }
    }, 1500);
  };

  const handleCorrectAnswer = () => {
    setShowFeedback(true);
    const newScore = score + 1;
    setScore(newScore);
    setShowConfetti(true);

    const currentWord = words.find(w => w.word === currentQuiz.word);
    if (currentWord) {
      setCorrectWordIds(prev => new Set([...prev, currentWord.id]));
    }

    setTimeout(() => {
      setShowConfetti(false);
      if (newScore >= 27) {
        addWordsToDeck(Array.from(correctWordIds).concat(currentWord?.id || []));
        onComplete(newScore);
      } else if (currentQuestion + 1 >= totalQuestions) {
        addWordsToDeck(Array.from(correctWordIds).concat(currentWord?.id || []));
        onComplete(newScore);
      } else {
        nextQuestion();
      }
    }, 1500);
  };

  const addWordsToDeck = async (wordIds: string[]) => {
    if (wordIds.length === 0) return;

    try {
      const token = authService.getAccessToken();
      if (!token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/deck/add-multiple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ wordIds }),
        }
      );

      const data = await response.json();

      if (response.ok && data.added > 0) {
        console.log(`✅ ${data.added}개의 단어가 덱에 추가되었습니다.`);
      }
    } catch (error) {
      console.error('덱 추가 오류:', error);
    }
  };

  const nextQuestion = () => {
    setCurrentQuestion(prev => prev + 1);
    setTimeLeft(10);
    setShowFeedback(false);
    setSelectedAnswer(null);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);

    if (answer === currentQuiz.correctAnswer) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  // Confetti Component
  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(30)].map((_, i) => (
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
          className={`absolute w-3 h-3 rounded-full ${
            ['bg-emerald-500', 'bg-blue-500', 'bg-yellow-500', 'bg-pink-500', 'bg-purple-500'][i % 5]
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
          <p className="text-gray-600">퀴즈를 준비하는 중...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">😵</div>
          <p className="text-gray-700">{error || '단어를 불러올 수 없습니다.'}</p>
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
      {showConfetti && <Confetti />}

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
          <div className="text-sm font-semibold text-indigo-600 bg-white px-4 py-2 rounded-full shadow-sm">
            VOL.{volume} Day {day}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Timer size={20} className={timeLeft <= 3 ? 'text-red-500' : 'text-gray-600'} />
              <span className={`font-bold ${timeLeft <= 3 ? 'text-red-500' : 'text-gray-900'}`}>
                {timeLeft}초
              </span>
            </div>

            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={i >= lives ? { scale: [1, 0.5, 0.5] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {i < lives ? (
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  ) : (
                    <Heart className="w-5 h-5 text-gray-300" />
                  )}
                </motion.div>
              ))}
            </div>

            <div className="text-sm font-medium text-gray-600">
              {currentQuestion + 1} / {totalQuestions}
            </div>
          </div>

        {/* Progress Bar */}
        <div className="relative bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Word Card */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-8 text-center shadow-xl border border-gray-100"
        >
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">단어</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{currentQuiz.word}</h1>
          <p className="text-sm text-gray-500">뜻을 선택하세요</p>
        </motion.div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {currentQuiz.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === currentQuiz.correctAnswer;
            const showCorrect = showFeedback && isCorrect;
            const showWrong = showFeedback && isSelected && !isCorrect;

            return (
              <motion.button
                key={option}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: showFeedback ? 1 : 0.97 }}
                onClick={() => handleAnswerSelect(option)}
                disabled={showFeedback}
                className={`px-6 py-4 rounded-2xl transition-all text-left shadow-sm ${
                  showCorrect
                    ? 'bg-green-500 text-white shadow-lg'
                    : showWrong
                    ? 'bg-red-500 text-white shadow-lg'
                    : isSelected
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    showCorrect || showWrong || isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 font-medium text-base">{option}</div>
                  {showCorrect && <CheckCircle className="w-6 h-6" />}
                  {showWrong && <X className="w-6 h-6" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Score */}
        <div className="text-center text-sm text-gray-600 bg-white py-3 rounded-2xl shadow-sm">
          점수: <span className="font-bold text-indigo-600">{score}</span> / {currentQuestion + 1} | 목표: <span className="font-bold text-indigo-600">27개 이상</span>
        </div>
      </div>
    </div>
  );
}
