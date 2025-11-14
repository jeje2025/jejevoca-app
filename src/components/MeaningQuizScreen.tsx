import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Timer, Heart, Sparkles, CheckCircle, X, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authService } from '../utils/auth';

interface MeaningQuizScreenProps {
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
  // 정답을 제외한 다른 단어들의 뜻
  const otherMeanings = allMeanings.filter(m => m !== correctAnswer);
  
  // 4개의 오답 선택
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
  
  // 정답과 오답을 합쳐서 섞기
  const options = [correctAnswer, ...distractors];
  return options.sort(() => Math.random() - 0.5);
}

export function MeaningQuizScreen({ volume, day, onBack, onComplete }: MeaningQuizScreenProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load words from server and generate quiz questions
  useEffect(() => {
    fetchWordsAndGenerateQuiz();
  }, [volume, day]);

  const fetchWordsAndGenerateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      
      console.log(`🔍 [Quiz] Fetching words for VOL.${volume} Day ${day}...`);
      console.log(`🔍 [Quiz] ProjectId:`, projectId);
      console.log(`🔍 [Quiz] Token:`, token ? 'Present' : 'Missing');
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${volume}/${day}`;
      console.log(`🔍 [Quiz] URL:`, url);
      
      const response = await fetch(url, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });

      console.log(`📡 [Quiz] Response status: ${response.status}`);
      console.log(`📡 [Quiz] Response ok: ${response.ok}`);

      const contentType = response.headers.get('content-type');
      console.log(`📡 [Quiz] Content-Type:`, contentType);

      let data;
      try {
        data = await response.json();
        console.log(`📦 [Quiz] Response data:`, data);
      } catch (jsonError) {
        console.error('❌ [Quiz] Failed to parse JSON:', jsonError);
        const text = await response.text();
        console.log(`📦 [Quiz] Response text:`, text);
        throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error(`❌ [Quiz] Server error:`, data.error);
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      console.log(`📦 [Quiz] Data structure:`, {
        hasWords: !!data.words,
        wordsLength: data.words?.length,
        firstWord: data.words?.[0]
      });

      if (data.words && data.words.length > 0) {
        const words: WordData[] = data.words;
        
        // 모든 단어의 뜻 목록 (오답 생성용)
        const allMeanings = words.map(w => w.koreanMeaning);
        
        // 퀴즈 문제 생성 (30개 또는 단어 개수만큼)
        const quizQuestions: QuizQuestion[] = words.map(word => ({
          word: word.word,
          correctAnswer: word.koreanMeaning,
          options: generateOptions(word.koreanMeaning, allMeanings)
        }));
        
        setQuestions(quizQuestions);
        console.log(`✅ [Quiz] Generated ${quizQuestions.length} quiz questions for VOL.${volume} Day ${day}`);
      } else {
        console.log(`⚠️ [Quiz] No words in response`);
        throw new Error('No words found for this volume and day');
      }
    } catch (err) {
      console.error('❌ [Quiz] Error fetching words:', err);
      console.error('❌ [Quiz] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined
      });
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
    setLives(prev => Math.max(0, prev - 1));
    
    setTimeout(() => {
      if (lives <= 1) {
        onComplete(score);
      } else {
        nextQuestion();
      }
    }, 2000);
  };

  const handleCorrectAnswer = () => {
    setShowFeedback(true);
    setScore(prev => prev + 1);
    setShowConfetti(true);
    
    setTimeout(() => {
      setShowConfetti(false);
      if (currentQuestion >= totalQuestions - 1) {
        onComplete(score + 1);
      } else {
        nextQuestion();
      }
    }, 2000);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ADC8FF]/30 via-[#F8FBFF]/50 to-white relative">
      {showConfetti && <Confetti />}
      
      {/* Loading State */}
      {loading && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 size={48} className="text-[#091A7A] animate-spin mx-auto" />
            <p className="text-[#091A7A] font-medium">퀴즈를 준비하는 중...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-gray-600">{error}</p>
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={fetchWordsAndGenerateQuiz}
                className="px-6 py-3 bg-[#091A7A] text-white rounded-[16px] animate-touch min-h-[44px]"
              >
                다시 시도
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="px-6 py-3 bg-white/80 backdrop-blur-lg border border-white/40 text-[#091A7A] rounded-[16px] animate-touch min-h-[44px]"
              >
                뒤로 가기
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Content - Only show when loaded and no error */}
      {!loading && !error && questions.length > 0 && currentQuiz && (
        <>
          {/* Header */}
          <div className="relative z-10 px-6 pt-8 pb-4">
            <div className="flex items-center justify-between mb-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/40"
              >
                <ArrowLeft className="w-5 h-5 text-[#091A7A]" />
              </motion.button>

              {/* Lives */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={i >= lives ? { scale: [1, 0.5, 0.5] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {i < lives ? (
                      <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    ) : (
                      <Heart className="w-6 h-6 text-gray-300" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative bg-white/60 backdrop-blur-sm rounded-full h-6 overflow-hidden border border-white/60 shadow-sm mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                className="h-full bg-gradient-to-r from-[#091A7A] to-[#4F8EFF] rounded-full"
                transition={{ duration: 0.5 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-[#091A7A]">
                  {currentQuestion + 1} / {totalQuestions}
                </span>
              </div>
            </div>

            {/* Timer */}
            <motion.div
              key={timeLeft}
              initial={{ scale: 1 }}
              animate={{ scale: timeLeft <= 3 ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl backdrop-blur-xl shadow-lg border ${
                timeLeft <= 3 
                  ? 'bg-red-500/90 border-red-300/50 text-white' 
                  : 'bg-white/90 border-white/40 text-[#091A7A]'
              }`}
            >
              <Timer className="w-5 h-5" />
              <span className="font-bold text-xl">{timeLeft}초</span>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 px-6 pb-8">
            
            {/* Word Card */}
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="mb-8"
            >
              <div className="bg-gradient-to-br from-[#091A7A] to-[#4F8EFF] rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                
                <div className="relative">
                  <div className="text-center mb-2">
                    <span className="text-[#ADC8FF] text-sm font-medium">단어</span>
                  </div>
                  <h1 className="text-center text-white text-5xl font-bold tracking-wide">
                    {currentQuiz.word}
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Sparkles className="w-4 h-4 text-[#ADC8FF]" />
                    <span className="text-[#ADC8FF] text-sm">뜻을 선택하세요</span>
                    <Sparkles className="w-4 h-4 text-[#ADC8FF]" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuiz.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuiz.correctAnswer;
                const showCorrect = showFeedback && isCorrect;
                const showWrong = showFeedback && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={option}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showFeedback}
                    className={`w-full px-6 py-5 rounded-2xl backdrop-blur-xl shadow-lg border-2 transition-all ${
                      showCorrect
                        ? 'bg-emerald-500/90 border-emerald-300 text-white scale-105'
                        : showWrong
                        ? 'bg-red-500/90 border-red-300 text-white'
                        : isSelected
                        ? 'bg-[#091A7A]/90 border-[#091A7A] text-white'
                        : 'bg-white/90 border-white/40 text-[#091A7A] hover:bg-white/95'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        showCorrect
                          ? 'bg-white/20 text-white'
                          : showWrong
                          ? 'bg-white/20 text-white'
                          : isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#091A7A]/10 text-[#091A7A]'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 text-left font-medium">
                        {option}
                      </div>
                      {showCorrect && (
                        <CheckCircle className="w-6 h-6 text-white" />
                      )}
                      {showWrong && (
                        <X className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Score Display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40">
                <Sparkles className="w-5 h-5 text-[#091A7A]" />
                <span className="text-[#091A7A] font-bold">
                  점수: {score} / {currentQuestion + 1}
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}