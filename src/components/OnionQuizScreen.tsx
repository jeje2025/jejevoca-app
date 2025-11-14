import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Timer, Heart, Sparkles, X } from 'lucide-react';
import { OnionCharacter } from './OnionCharacter';

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

// Mock data - 실제로는 Supabase에서 가져올 데이터
const QUIZ_DATA: QuizQuestion[] = [
  {
    word: 'abandon',
    correctAnswer: '버리다, 포기하다',
    options: ['버리다, 포기하다', '얻다, 획득하다', '도착하다', '믿다, 신뢰하다', '시작하다']
  },
  {
    word: 'ability',
    correctAnswer: '능력, 재능',
    options: ['능력, 재능', '부족함', '어려움', '실수', '운']
  },
  {
    word: 'absent',
    correctAnswer: '결석한, 부재중인',
    options: ['결석한, 부재중인', '출석한', '행복한', '슬픈', '화난']
  },
  // ... 실제로는 30개
];

export function OnionQuizScreen({ volume, day, onBack, onComplete }: OnionQuizScreenProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [onionSize, setOnionSize] = useState(1);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [draggedAnswer, setDraggedAnswer] = useState<string | null>(null);
  const [isOverOnion, setIsOverOnion] = useState(false);

  const totalQuestions = 30;
  const currentQuiz = QUIZ_DATA[currentQuestion % QUIZ_DATA.length];

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
    setLives(prev => Math.max(0, prev - 1));
    setOnionSize(prev => Math.max(0.5, prev - 0.1));
    
    setTimeout(() => {
      if (lives <= 1) {
        onComplete(score);
      } else {
        nextQuestion();
      }
    }, 1500);
  };

  const handleCorrectAnswer = () => {
    setFeedback('correct');
    setScore(prev => prev + 1);
    setOnionSize(prev => Math.min(2, prev + 0.05));
    
    setTimeout(() => {
      if (currentQuestion >= totalQuestions - 1) {
        onComplete(score + 1);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4FF] via-[#B8DCFF] to-[#FFF4E0] relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Clouds */}
        <motion.div
          animate={{ x: [0, 100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-10 w-32 h-16 bg-white/60 rounded-full blur-xl"
        />
        <motion.div
          animate={{ x: [0, -80, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-40 right-20 w-40 h-20 bg-white/60 rounded-full blur-xl"
        />
        
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
      <div className="relative z-10 px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
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
        <div className="bg-white/40 backdrop-blur-sm rounded-full h-6 overflow-hidden border border-white/60 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
            className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full"
            transition={{ duration: 0.5 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-[#091A7A]">
              {currentQuestion + 1} / {totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 flex flex-col items-center">
        
        {/* Timer */}
        <motion.div
          key={timeLeft}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`mb-6 px-6 py-3 rounded-2xl backdrop-blur-xl shadow-lg border ${
            timeLeft <= 2 
              ? 'bg-red-500/90 border-red-300/50 text-white' 
              : 'bg-white/90 border-white/40 text-[#091A7A]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            <span className="font-bold text-xl">{timeLeft}초</span>
          </div>
        </motion.div>

        {/* Onion Character with Speech Bubble */}
        <div className="relative mb-8">
          {/* Speech Bubble */}
          <motion.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-[#091A7A] text-white px-6 py-3 rounded-2xl shadow-xl whitespace-nowrap"
          >
            <div className="font-bold text-lg">{currentQuiz.word}</div>
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-[#091A7A] rotate-45" />
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
        <div className="w-full max-w-sm space-y-3 mb-8">
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
              className={`px-6 py-4 rounded-2xl backdrop-blur-xl shadow-lg border-2 cursor-move transition-all ${
                draggedAnswer === option
                  ? 'bg-[#ADC8FF]/50 border-[#091A7A]/50 scale-95 opacity-50'
                  : feedback === 'correct' && option === currentQuiz.correctAnswer
                  ? 'bg-emerald-500/90 border-emerald-300 text-white'
                  : feedback === 'wrong' && option === draggedAnswer
                  ? 'bg-red-500/90 border-red-300 text-white'
                  : 'bg-white/90 border-white/40 text-[#091A7A] hover:bg-white/95'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#091A7A]/10 flex items-center justify-center font-bold text-[#091A7A]">
                  {index + 1}
                </div>
                <div className="flex-1 font-medium">{option}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Instruction Text */}
        {!feedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[#091A7A]/70 text-sm"
          >
            정답을 양파에게 드래그하세요! 🧅
          </motion.div>
        )}
      </div>
    </div>
  );
}