import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Loader2, CheckCircle, X } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { authService } from '../utils/auth';

interface ContextQuizScreenProps {
  volume: number;
  day: number;
  onBack: () => void;
  onComplete: (score: number) => void;
}

interface QuizQuestion {
  word: string;
  example: string;
  beforeBlank: string;
  afterBlank: string;
  correctAnswer: string;
  options: string[];
  partOfSpeech?: string;
  exampleType: 'english' | 'godlife'; // 예문 타입 추가
}

interface WordData {
  id: string;
  word: string;
  koreanMeaning: string;
  example: string;
  englishExample?: string;
  godlifeExample?: string;
  partOfSpeech?: string;
}

export function ContextQuizScreen({ volume, day, onBack, onComplete }: ContextQuizScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [useGodlifeExample, setUseGodlifeExample] = useState(false); // false = 영어 예문, true = 갓생 예문

  const totalQuestions = 30;

  useEffect(() => {
    fetchWords();
  }, [volume, day]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${volume}/${day}`;
      console.log(`🔍 [ContextQuiz] Fetching words for VOL.${volume} Day ${day}...`);

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
        // 영어 예문과 갓생 예문이 모두 있는 단어들만 필터링
        const wordsWithExamples = data.words.filter((word: any) =>
          (word.englishExample && word.englishExample.trim().length > 0) ||
          (word.godlifeExample && word.godlifeExample.trim().length > 0)
        );

        console.log(`📊 [ContextQuiz] Found ${wordsWithExamples.length} words with examples`);

        if (wordsWithExamples.length < 4) {
          throw new Error('예문이 있는 단어가 부족합니다 (최소 4개 필요)');
        }

        const quizQuestions = generateQuestions(wordsWithExamples);
        setQuestions(quizQuestions);
      } else {
        throw new Error('단어를 불러올 수 없습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = (words: WordData[]): QuizQuestion[] => {
    // 품사별로 단어 그룹화
    const wordsByPOS = words.reduce((acc, word) => {
      const pos = word.partOfSpeech || 'unknown';
      if (!acc[pos]) acc[pos] = [];
      acc[pos].push(word);
      return acc;
    }, {} as Record<string, WordData[]>);

    const questions: QuizQuestion[] = [];
    const usedWords = new Set<string>();

    // 최대 30개 문제 생성
    for (let i = 0; i < Math.min(totalQuestions, words.length); i++) {
      const word = words[i];

      // 영어 예문과 갓생 예문 중 하나라도 있어야 함
      const hasEnglishExample = word.englishExample && word.englishExample.trim().length > 0;
      const hasGodlifeExample = word.godlifeExample && word.godlifeExample.trim().length > 0;

      if ((!hasEnglishExample && !hasGodlifeExample) || usedWords.has(word.word)) continue;

      // 두 예문 모두 생성 (있는 것만)
      const exampleTypes: Array<{ type: 'english' | 'godlife', example: string }> = [];
      if (hasEnglishExample) exampleTypes.push({ type: 'english', example: word.englishExample! });
      if (hasGodlifeExample) exampleTypes.push({ type: 'godlife', example: word.godlifeExample! });

      // 각 예문 타입별로 문제 생성 (두 개 모두 생성)
      for (const { type, example } of exampleTypes) {
        // 예문에서 단어 찾기 (대소문자 구분 없이)
        const exampleLower = example.toLowerCase();
        const wordLower = word.word.toLowerCase();
        const wordIndex = exampleLower.indexOf(wordLower);

        if (wordIndex === -1) {
          console.warn(`⚠️ Word "${word.word}" not found in example: "${example}"`);
          continue;
        }

        // 빈칸 전후 텍스트 추출
        const beforeBlank = example.substring(0, wordIndex);
        const afterBlank = example.substring(wordIndex + word.word.length);

        // 같은 품사의 단어들에서 오답 선택지 생성
        const pos = word.partOfSpeech || 'unknown';
        const samePoSWords = wordsByPOS[pos] || [];

        // 오답 선택지 생성 (같은 품사 우선, 부족하면 다른 품사에서)
        const distractors: string[] = [];
        const availableWords = [...samePoSWords.filter(w => w.word !== word.word)];

        // 같은 품사에서 부족하면 다른 단어들도 추가
        if (availableWords.length < 3) {
          words.filter(w => w.word !== word.word && !availableWords.includes(w))
            .forEach(w => availableWords.push(w));
        }

        // 랜덤하게 3개 선택
        const shuffled = availableWords.sort(() => Math.random() - 0.5);
        for (let j = 0; j < Math.min(3, shuffled.length); j++) {
          distractors.push(shuffled[j].word);
        }

        if (distractors.length < 3) {
          console.warn(`⚠️ Not enough distractors for "${word.word}"`);
          continue;
        }

        // 보기 섞기
        const options = [word.word, ...distractors].sort(() => Math.random() - 0.5);

        questions.push({
          word: word.word,
          example: example,
          beforeBlank,
          afterBlank,
          correctAnswer: word.word,
          options,
          partOfSpeech: word.partOfSpeech,
          exampleType: type
        });

        // 모든 예문 타입에 대해 문제 생성 (break 제거)
      }

      usedWords.add(word.word);
    }

    console.log(`✅ [ContextQuiz] Generated ${questions.length} questions`);
    return questions;
  };

  // 현재 선택된 예문 타입에 맞는 문제만 필터링
  const displayQuestions = useMemo(() => {
    const filtered = questions.filter(q =>
      useGodlifeExample ? q.exampleType === 'godlife' : q.exampleType === 'english'
    );
    // 필터링된 문제가 없으면 전체 문제 사용
    return filtered.length > 0 ? filtered : questions;
  }, [questions, useGodlifeExample]);

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;

    const currentQuiz = displayQuestions[currentQuestion];
    if (!currentQuiz) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const isCorrect = answer === currentQuiz.correctAnswer;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      const newScore = isCorrect ? score + 1 : score;

      // 27개 이상이면 완료
      if (newScore >= 27) {
        setShowCelebration(true);
        setTimeout(() => {
          onComplete(newScore);
        }, 2000);
      } else if (currentQuestion + 1 >= displayQuestions.length) {
        // 모든 문제 풀었으면 완료
        onComplete(newScore);
      } else {
        // 다음 문제
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 1500);
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
          <p className="text-indigo-900 text-lg font-semibold">맥락 채우기 퀴즈를 준비하는 중...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">😵</div>
          <p className="text-indigo-900 text-lg">{error || '단어를 불러올 수 없습니다.'}</p>
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

  const currentQuiz = displayQuestions[currentQuestion];

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
              {currentQuestion + 1} / {displayQuestions.length}
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Trophy className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-900">{score}</span>
            </div>
          </div>
        </div>

        {/* Example Type Switch */}
        <div className="flex justify-center">
          <div className="bg-white rounded-full p-1 shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => {
                setUseGodlifeExample(false);
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setShowFeedback(false);
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                !useGodlifeExample
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              영어 예문
            </button>
            <button
              onClick={() => {
                setUseGodlifeExample(true);
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setShowFeedback(false);
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                useGodlifeExample
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              갓생 예문
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / displayQuestions.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Example Sentence Card */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-8 text-center shadow-xl border border-gray-100"
        >
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">예문</p>
          <div className="text-2xl font-medium text-gray-900 mb-3 leading-relaxed">
            <span>{currentQuiz.beforeBlank}</span>
            <span className="inline-block mx-2 px-4 py-1 bg-indigo-100 border-2 border-dashed border-indigo-400 rounded-lg text-indigo-600 font-bold">
              _____
            </span>
            <span>{currentQuiz.afterBlank}</span>
          </div>
          <p className="text-sm text-gray-500">빈칸에 들어갈 알맞은 단어를 선택하세요</p>
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
