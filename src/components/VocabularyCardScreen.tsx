import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, Star, Check, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface VocabularyCardScreenProps {
  bookNumber: number;
  onBack: () => void;
  onComplete?: () => void;
}

interface VocabWord {
  id: string;
  word: string;
  pronunciation: string;
  koreanPronunciation?: string;
  meaning: string;
  example: string;
  story?: string;
  derivatives?: string[];
  synonyms?: string[];
  antonyms?: string[];
  confusionWords?: string[];
  isMemorized: boolean;
}

export function VocabularyCardScreen({ bookNumber, onBack, onComplete }: VocabularyCardScreenProps) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [memorizedWords, setMemorizedWords] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState(1);

  // Load words from server
  useEffect(() => {
    fetchWords(bookNumber, selectedDay);
  }, [bookNumber, selectedDay]);

  const fetchWords = async (vol: number, day: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      
      console.log(`🔍 Fetching words for VOL.${vol} Day ${day}...`);
      console.log(`🔍 ProjectId:`, projectId);
      console.log(`🔍 Token:`, token ? 'Present' : 'Missing');
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${vol}/${day}`;
      console.log(`🔍 URL:`, url);
      
      const response = await fetch(url, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });

      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response ok: ${response.ok}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`📡 Content-Type:`, contentType);

      let data;
      try {
        data = await response.json();
        console.log(`📦 Response data:`, data);
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON:', jsonError);
        const text = await response.text();
        console.log(`📦 Response text:`, text);
        throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error(`❌ Server error:`, data.error);
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      console.log(`📦 Data structure:`, {
        hasWords: !!data.words,
        wordsLength: data.words?.length,
        firstWord: data.words?.[0]
      });

      if (data.words && data.words.length > 0) {
        const formattedWords: VocabWord[] = data.words.map((w: any) => ({
          id: w.id,
          word: w.word,
          pronunciation: w.pronunciation || '',
          koreanPronunciation: w.koreanPronunciation || '',
          meaning: w.koreanMeaning || '',
          example: w.example || '',
          story: w.story || '',
          derivatives: w.derivatives || [],
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          confusionWords: w.confusionWords || [],
          isMemorized: false
        }));
        
        setWords(formattedWords);
        setCurrentIndex(0);
        setIsFlipped(false);
        console.log(`✅ Loaded ${formattedWords.length} words for VOL.${vol} Day ${day}`);
      } else {
        setWords([]);
        console.log(`ℹ️ No words found for VOL.${vol} Day ${day}`);
      }
    } catch (err) {
      console.error('❌ Error fetching words:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined
      });
      setError(err instanceof Error ? err.message : 'Failed to load words');
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  const currentWord = words[currentIndex];
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const toggleMemorized = () => {
    const newMemorized = new Set(memorizedWords);
    if (newMemorized.has(currentWord.id)) {
      newMemorized.delete(currentWord.id);
    } else {
      newMemorized.add(currentWord.id);
    }
    setMemorizedWords(newMemorized);
  };

  const handlePlayAudio = () => {
    // TTS 기능 - 실제 구현 시 Web Speech API 사용
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      rotateY: direction > 0 ? 20 : -20
    }),
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      rotateY: direction > 0 ? -20 : 20
    })
  };

  return (
    <div className="flex-1 flex flex-col relative min-h-screen bg-gradient-to-br from-[#F8FAFF] via-white to-[#EDF2FF]">
      {/* Header */}
      <div className="relative z-10 pt-12 pb-6 px-6">
        <div className="flex items-center justify-between mb-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-lg rounded-[16px] border border-white/40 shadow-card animate-touch min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft size={20} className="text-[#091A7A]" />
          </motion.button>

          <div className="flex-1 mx-4">
            <h1 className="font-bold text-[#091A7A] text-center" style={{ fontSize: '20px' }}>
              VOL. {bookNumber} 단어장
            </h1>
            <p className="text-sm text-gray-600 mt-1 text-center">
              {words.length > 0 ? `${currentIndex + 1} / ${words.length}` : 'Day 선택'}
            </p>
          </div>

          {currentWord && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMemorized}
              className={`flex items-center justify-center w-10 h-10 rounded-[16px] border shadow-card animate-touch min-h-[44px] min-w-[44px] ${
                memorizedWords.has(currentWord.id)
                  ? 'bg-[#091A7A] border-[#091A7A]'
                  : 'bg-white/80 backdrop-blur-lg border-white/40'
              }`}
            >
              <Star
                size={20}
                className={memorizedWords.has(currentWord.id) ? 'text-white fill-white' : 'text-gray-400'}
              />
            </motion.button>
          )}
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((day) => (
            <motion.button
              key={day}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-4 py-2 rounded-[12px] border min-h-[44px] min-w-[60px] animate-touch ${
                selectedDay === day
                  ? 'bg-[#091A7A] border-[#091A7A] text-white'
                  : 'bg-white/80 backdrop-blur-lg border-white/40 text-gray-600'
              }`}
            >
              Day {day}
            </motion.button>
          ))}
        </div>

        {/* Progress Bar */}
        {words.length > 0 && (
          <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-[#091A7A] to-[#ADC8FF] rounded-full"
            />
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 size={48} className="text-[#091A7A] animate-spin mx-auto" />
            <p className="text-gray-600">단어를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-gray-600">{error}</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchWords(bookNumber, selectedDay)}
              className="px-6 py-3 bg-[#091A7A] text-white rounded-[16px] animate-touch min-h-[44px]"
            >
              다시 시도
            </motion.button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && words.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-gray-600">이 Day에는 단어가 없습니다.</p>
          </div>
        </div>
      )}

      {/* Card Container */}
      {!loading && !error && words.length > 0 && currentWord && (
        <>
          <div className="flex-1 flex items-center justify-center px-6 py-8">
            <div className="w-full max-w-md relative" style={{ perspective: '1000px' }}>
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  onClick={handleFlip}
                  className="w-full cursor-pointer animate-touch"
                  style={{
                    transformStyle: 'preserve-3d',
                    position: 'relative'
                  }}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    style={{
                      transformStyle: 'preserve-3d',
                      position: 'relative'
                    }}
                    className="w-full"
                  >
                    {/* Front of Card */}
                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                      }}
                      className="w-full bg-white/90 backdrop-blur-xl rounded-[32px] border border-white/40 shadow-elevated p-8 min-h-[400px] flex flex-col"
                    >
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        {/* Word */}
                        <div>
                          <h2 className="font-bold text-[#091A7A] mb-2" style={{ fontSize: '36px' }}>
                            {currentWord.word}
                          </h2>
                          <p className="text-gray-500" style={{ fontSize: '16px' }}>
                            {currentWord.pronunciation}
                          </p>
                        </div>

                        {/* Play Audio Button */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio();
                          }}
                          className="flex items-center justify-center w-12 h-12 bg-[#ADC8FF]/20 rounded-full animate-touch min-h-[44px] min-w-[44px]"
                        >
                          <Volume2 size={24} className="text-[#091A7A]" />
                        </motion.button>

                        {/* Hint */}
                        <p className="text-sm text-gray-400 mt-8">
                          카드를 탭하여 뜻 보기
                        </p>
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0
                      }}
                      className="w-full bg-gradient-to-br from-[#091A7A] to-[#4A5FC4] rounded-[32px] border border-white/20 shadow-elevated p-8 min-h-[400px] flex flex-col text-white"
                    >
                      <div className="flex-1 flex flex-col space-y-6">
                        {/* Word (Small) */}
                        <div className="text-center">
                          <h3 className="font-bold" style={{ fontSize: '24px' }}>
                            {currentWord.word}
                          </h3>
                        </div>

                        {/* Meaning */}
                        <div className="flex-1 flex items-center justify-center">
                          <p className="font-bold text-center" style={{ fontSize: '28px' }}>
                            {currentWord.meaning}
                          </p>
                        </div>

                        {/* Example */}
                        {currentWord.example && (
                          <div className="space-y-3 bg-white/10 rounded-[20px] p-4 backdrop-blur-sm">
                            <p className="text-sm italic">
                              "{currentWord.example}"
                            </p>
                          </div>
                        )}

                        {/* Story */}
                        {currentWord.story && (
                          <div className="bg-white/10 rounded-[20px] p-4 backdrop-blur-sm">
                            <p className="text-xs font-semibold mb-2">💡 네 인생이 예문이 되어</p>
                            <p className="text-sm opacity-90">
                              {currentWord.story}
                            </p>
                          </div>
                        )}

                        {/* Synonyms & Antonyms */}
                        {((currentWord.synonyms && currentWord.synonyms.length > 0) || 
                          (currentWord.antonyms && currentWord.antonyms.length > 0)) && (
                          <div className="flex gap-2 text-xs">
                            {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                              <div className="flex-1 bg-white/10 rounded-[12px] p-3 backdrop-blur-sm">
                                <p className="font-semibold mb-1">유의어</p>
                                <p className="opacity-80">{currentWord.synonyms.join(', ')}</p>
                              </div>
                            )}
                            {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                              <div className="flex-1 bg-white/10 rounded-[12px] p-3 backdrop-blur-sm">
                                <p className="font-semibold mb-1">반의어</p>
                                <p className="opacity-80">{currentWord.antonyms.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hint */}
                        <p className="text-sm text-white/60 text-center mt-4">
                          카드를 탭하여 단어 보기
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="px-6 pb-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              {/* Previous Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`flex items-center justify-center w-14 h-14 rounded-[20px] border shadow-card animate-touch min-h-[44px] min-w-[44px] ${
                  currentIndex === 0
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-white/90 backdrop-blur-lg border-white/40'
                }`}
              >
                <ChevronLeft size={24} className="text-[#091A7A]" />
              </motion.button>

              {/* Card Counter */}
              <div className="flex-1 flex items-center justify-center gap-2">
                {words.map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'w-8 bg-[#091A7A]'
                        : index < currentIndex
                        ? 'w-2 bg-[#ADC8FF]'
                        : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                disabled={currentIndex === words.length - 1}
                className={`flex items-center justify-center w-14 h-14 rounded-[20px] border shadow-card animate-touch min-h-[44px] min-w-[44px] ${
                  currentIndex === words.length - 1
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-gradient-to-r from-[#091A7A] to-[#4A5FC4] border-transparent'
                }`}
              >
                <ChevronRight size={24} className="text-white" />
              </motion.button>
            </div>

            {/* Memorized Count */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Check size={16} className="text-[#10B981]" />
              <span>암기한 단어: {memorizedWords.size} / {words.length}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}