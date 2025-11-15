import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Timer, Heart, Sparkles, X, Loader2 } from 'lucide-react';
import { OnionCharacter } from './OnionCharacter';
import { projectId } from '../utils/supabase/info';
import { authService } from '../utils/auth';

interface OnionQuizScreenProps {
  volume: number;
  day: number;
  onBack: () => void;
  onComplete: (score: number) => void;
}

interface QuizQuestion {
  word: string;
  correctAnswer: string;
  options: string[];
}

interface WordData {
  id: string;
  word: string;
  koreanMeaning: string;
}

// 오답 보기 생성을 위한 랜덤 한국어 뜻 목록
const DISTRACTOR_MEANINGS = [
  '얻다, 획득하다',
  '도착하다',
  '믿다, 신뢰하다',
  '시작하다',
  '부족함',
  '어려움',
  '실수',
  '운',
  '출석한',
  '행복한',
  '슬픈',
  '화난',
  '크다',
  '작다',
  '빠르다',
  '느리다',
  '쉽다',
  '어렵다',
  '좋다',
  '나쁘다',
  '밝다',
  '어둡다',
  '새로운',
  '오래된',
  '강하다',
  '약하다',
  '높다',
  '낮다',
  '많다',
  '적다',
  '긴',
  '짧은',
  '넓다',
  '좁다',
  '무겁다',
  '가볍다',
];

function generateOptions(correctAnswer: string, allMeanings: string[]): string[] {
  const otherMeanings = allMeanings.filter(m => m !== correctAnswer);
  const distractors: string[] = [];
  const availableOptions = [...otherMeanings, ...DISTRACTOR_MEANINGS];
  
  while (distractors.length < 4 && availableOptions.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableOptions.length);
    const option = availableOptions[randomIndex];
    
    if (!distractors.includes(option) && option !== correctAnswer) {
      distractors.push(option);
    }
    
    availableOptions.splice(randomIndex, 1);
  }
  
  const options = [correctAnswer, ...distractors];
  return options.sort(() => Math.random() - 0.5);
}

export function OnionQuizScreen({ volume, day, onBack, onComplete }: OnionQuizScreenProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [onionSize, setOnionSize] = useState(1);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [draggedAnswer, setDraggedAnswer] = useState<string | null>(null);
  const [isOverOnion, setIsOverOnion] = useState(false);

  // Load words from server and generate quiz questions
  useEffect(() => {
    fetchWordsAndGenerateQuiz();
  }, [volume, day]);

  const fetchWordsAndGenerateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${volume}/${day}`;

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.words && data.words.length > 0) {
        const words: WordData[] = data.words;
        const allMeanings = words.map(w => w.koreanMeaning);
        
        // 퀴즈 문제 생성 (최대 30개 또는 단어 개수만큼)
        const quizQuestions: QuizQuestion[] = words
          .slice(0, 30)
          .map(word => ({
            word: word.word,
            correctAnswer: word.koreanMeaning,
            options: generateOptions(word.koreanMeaning, allMeanings)
          }));
        
        setQuestions(quizQuestions);
        console.log(`✅ [OnionQuiz] Generated ${quizQuestions.length} quiz questions for VOL.${volume} Day ${day}`);
      } else {
        throw new Error('No words found for this volume and day');
      }
    } catch (err) {
      console.error('❌ [OnionQuiz] Error fetching words:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const totalQuestions = questions.length || 30;
  const currentQuiz = questions[currentQuestion] || { word: '', correctAnswer: '', options: [] };

  // Determine onion growth stage based on score
  // 0-9: Stage 1 (작은 양파)
  // 10-19: Stage 2 (중간 양파)
  // 20-29: Stage 3 (큰 양파)
  // 30: Stage 4 (완전한 양파)
  const getOnionStage = () => {
    if (score >= 30) return 4;
    if (score >= 20) return 3;
    if (score >= 10) return 2;
    return 1;
  };

  const onionStage = getOnionStage();

  // Timer countdown
  useEffect(() => {
    if (isAnswering || feedback) return;
    
    if (timeLeft <= 0) {
      handleWrongAnswer();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswering, feedback]);

  const handleWrongAnswer = () => {
    setFeedback('wrong');
    const newLives = Math.max(0, lives - 1);
    setLives(newLives);
    setOnionSize(prev => Math.max(0.5, prev - 0.1));
    
    setTimeout(() => {
      // 27개 이상 맞췄으면 클리어
      if (score >= 27) {
        onComplete(score);
      } else if (newLives <= 0) {
        // 목숨이 다 떨어졌지만 27개 미만이면 실패
        onComplete(score);
      } else if (currentQuestion + 1 >= totalQuestions) {
        // 모든 문제를 풀었지만 27개 미만이면 실패
        onComplete(score);
      } else {
        nextQuestion();
      }
    }, 1500);
  };

  const handleCorrectAnswer = () => {
    setFeedback('correct');
    const newScore = score + 1;
    setScore(newScore);
    setOnionSize(prev => Math.min(2, prev + 0.05));
    
    setTimeout(() => {
      // 27개 이상 맞추면 클리어
      if (newScore >= 27) {
        onComplete(newScore);
      } else if (currentQuestion + 1 >= totalQuestions) {
        // 모든 문제를 풀었지만 27개 미만이면 실패
        onComplete(newScore);
      } else {
        nextQuestion();
      }
    }, 1500);
  };

  const nextQuestion = () => {
    setCurrentQuestion(prev => prev + 1);
    setTimeLeft(5);
    setFeedback(null);
    setDraggedAnswer(null);
    setIsOverOnion(false);
  };

  const handleDragStart = (answer: string) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', answer);
    setDraggedAnswer(answer);
  };

  const handleDragEnd = () => {
    setDraggedAnswer(null);
    setIsOverOnion(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOverOnion(true);
  };

  const handleDragLeave = () => {
    setIsOverOnion(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const answer = e.dataTransfer.getData('text/plain');
    setIsOverOnion(false);
    setIsAnswering(true);

    if (answer === currentQuiz.correctAnswer) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  // Touch event handlers for mobile
  const handleTouchStart = (answer: string) => (e: React.TouchEvent) => {
    setDraggedAnswer(answer);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedAnswer) return;

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element?.id === 'onion-drop-zone') {
      setIsAnswering(true);
      if (draggedAnswer === currentQuiz.correctAnswer) {
        handleCorrectAnswer();
      } else {
        handleWrongAnswer();
      }
    }
    
    setDraggedAnswer(null);
    setIsOverOnion(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto" />
          <p className="text-white font-semibold">단어를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto border-2 border-red-500/30">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-white font-semibold">{error || '단어를 불러올 수 없습니다.'}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-indigo-500 min-h-[44px] touch-manipulation"
          >
            돌아가기
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden pb-24">
      
      {/* 배경 효과 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_70%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Sparkles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 2 + i * 0.3, 
              repeat: Infinity,
              delay: i * 0.2 
            }}
            className="absolute"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 20}%`
            }}
          >
            <Sparkles className="w-4 h-4 text-white/60" />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border-2 border-white/30 hover:bg-white/30 min-h-[56px] touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </motion.button>

          {/* Lives */}
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={i >= lives ? { scale: [1, 0.5, 0.5] } : {}}
                transition={{ duration: 0.3 }}
              >
                {i < lives ? (
                  <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-red-500 fill-red-500" />
                ) : (
                  <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600 fill-gray-600" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/30 backdrop-blur-md rounded-full h-7 sm:h-8 overflow-hidden border-2 border-white/40 shadow-inner relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full"
            transition={{ duration: 0.5 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base sm:text-lg font-black text-white">
              {currentQuestion + 1} / {totalQuestions}
            </span>
          </div>
        </div>
        
        {/* Clear Condition */}
        <div className="mt-3 text-center">
          <span className="text-sm sm:text-base text-white/90 font-bold">
            클리어 조건: 27개 이상 정답 ({score >= 27 ? '✅ 클리어!' : `현재 ${score}개, ${27 - score}개 더 필요`})
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 flex flex-col items-center">
        
        {/* Timer */}
        <motion.div
          key={timeLeft}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`mb-6 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl backdrop-blur-xl shadow-lg border-2 ${
            timeLeft <= 2 
              ? 'bg-red-500/90 border-red-400/50 text-white' 
              : 'bg-white/20 border-white/30 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="font-black text-2xl sm:text-3xl">{timeLeft}초</span>
          </div>
        </motion.div>

        {/* Onion Character with Speech Bubble */}
        <div className="relative mb-6 sm:mb-8">
          {/* Speech Bubble */}
          <motion.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="absolute -top-16 sm:-top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-xl whitespace-nowrap border-2 border-white/30"
          >
            <div className="font-black text-lg sm:text-xl md:text-2xl">{currentQuiz.word}</div>
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-r from-purple-600 to-indigo-600 rotate-45" />
          </motion.div>

          {/* Onion Drop Zone */}
          <motion.div
            id="onion-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            animate={{ 
              scale: isOverOnion ? 1.1 : 1,
              rotate: feedback === 'correct' ? [0, -5, 5, 0] : feedback === 'wrong' ? [0, -10, 10, -10, 10, 0] : 0
            }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* Onion Character */}
            <OnionCharacter
              stage={onionStage}
              feedback={feedback}
              isOverOnion={isOverOnion}
            />
          </motion.div>

          {/* Feedback particles */}
          <AnimatePresence>
            {feedback === 'correct' && (
              <>
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{ 
                      scale: [0, 1, 0],
                      x: Math.cos(i * 30 * Math.PI / 180) * 100,
                      y: Math.sin(i * 30 * Math.PI / 180) * 100
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute top-1/2 left-1/2"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  </motion.div>
                ))}
              </>
            )}
            {feedback === 'wrong' && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{ 
                      scale: [0, 1, 0],
                      x: (i % 2 === 0 ? 1 : -1) * 50,
                      y: -50 + (i * 15)
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute top-1/2 left-1/2"
                  >
                    <X className="w-6 h-6 text-red-500" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Answer Options */}
        <div className="w-full max-w-md space-y-3 mb-6 sm:mb-8">
          {currentQuiz.options.map((option, index) => (
            <motion.div
              key={option}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              draggable
              onDragStart={handleDragStart(option)}
              onDragEnd={handleDragEnd}
              onTouchStart={handleTouchStart(option)}
              onTouchEnd={handleTouchEnd}
              whileTap={{ scale: 0.95 }}
              className={`px-5 sm:px-6 py-4 sm:py-5 rounded-2xl backdrop-blur-xl shadow-lg border-2 cursor-move transition-all min-h-[72px] sm:min-h-[80px] touch-manipulation ${
                draggedAnswer === option
                  ? 'bg-purple-500/40 border-purple-400/60 scale-95 opacity-50'
                  : feedback === 'correct' && option === currentQuiz.correctAnswer
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400 text-white'
                  : feedback === 'wrong' && option === draggedAnswer
                  ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-400 text-white'
                  : 'bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-purple-400/60'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/30 flex items-center justify-center font-black text-xl sm:text-2xl text-white flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 font-bold text-base sm:text-lg md:text-xl leading-tight">{option}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Instruction Text */}
        {!feedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-white/90 text-base sm:text-lg font-bold mb-6 sm:mb-8"
          >
            정답을 양파에게 드래그하세요! 🧅
          </motion.div>
        )}
      </div>
    </div>
  );
}