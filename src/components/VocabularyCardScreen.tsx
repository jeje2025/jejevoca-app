import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, Star, Check, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authService } from '../utils/auth';

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

  // Initialize speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      // Voices may not be immediately available, so we load them when they become available
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('✅ Speech synthesis voices loaded:', voices.length);
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Some browsers load voices asynchronously
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const fetchWords = async (vol: number, day: number) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Fetching words for VOL.${vol} Day ${day}...`);
      console.log(`🔍 ProjectId:`, projectId);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/${vol}/${day}`;
      console.log(`🔍 URL:`, url);

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const handlePlayAudio = async () => {
    try {
      // Web Speech API 사용 (무료, 브라우저 내장)
      if ('speechSynthesis' in window) {
        // 기존 재생 중지
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // 약간 느리게
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // 더 나은 음성 선택 (가능한 경우)
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.name.includes('US')
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        
        speechSynthesis.speak(utterance);
      } else {
        // Fallback: Google TTS API (무료, 제한적)
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(currentWord.word)}`;
        const audio = new Audio(audioUrl);
        audio.play().catch(err => {
          console.error('TTS playback error:', err);
          alert('발음 재생에 실패했습니다.');
        });
      }
    } catch (error) {
      console.error('TTS error:', error);
      alert('발음 재생에 실패했습니다.');
    }
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
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide px-1">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((day) => (
            <motion.button
              key={day}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-[12px] border min-h-[44px] min-w-[56px] sm:min-w-[60px] animate-touch touch-manipulation text-sm sm:text-base ${
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
                      className="w-full bg-white/90 backdrop-blur-xl rounded-[32px] border border-white/40 shadow-elevated p-6 sm:p-8 min-h-[400px] flex flex-col"
                    >
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 px-2">
                        {/* Word */}
                        <div>
                          <h2 className="font-bold text-[#091A7A] mb-2" style={{ fontSize: 'clamp(28px, 8vw, 36px)' }}>
                            {currentWord.word}
                          </h2>
                          <p className="text-gray-600 sm:text-gray-500" style={{ fontSize: 'clamp(14px, 4vw, 16px)' }}>
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
                          className="flex items-center justify-center w-14 h-14 sm:w-12 sm:h-12 bg-[#ADC8FF]/20 rounded-full animate-touch min-h-[56px] min-w-[56px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation"
                        >
                          <Volume2 size={28} className="sm:w-6 sm:h-6 text-[#091A7A]" />
                        </motion.button>

                        {/* Hint */}
                        <p className="text-xs sm:text-sm text-gray-500 sm:text-gray-400 mt-4 sm:mt-8">
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
                      className="w-full bg-gradient-to-br from-[#091A7A] to-[#4A5FC4] rounded-[32px] border border-white/20 shadow-elevated p-6 sm:p-8 min-h-[400px] flex flex-col"
                    >
                      <div className="flex-1 flex flex-col space-y-4 sm:space-y-6">
                        {/* Word (Small) */}
                        <div className="text-center">
                          <h3 className="font-bold text-white" style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>
                            {currentWord.word}
                          </h3>
                        </div>

                        {/* Meaning */}
                        <div className="flex-1 flex items-center justify-center px-2">
                          <p className="font-bold text-center text-white" style={{ fontSize: 'clamp(24px, 6vw, 28px)', lineHeight: '1.4' }}>
                            {currentWord.meaning}
                          </p>
                        </div>

                        {/* Example */}
                        {currentWord.example && (
                          <div className="space-y-2 bg-white/20 rounded-[20px] p-4 backdrop-blur-sm border border-white/30">
                            <p className="text-sm sm:text-base italic text-white leading-relaxed">
                              "{currentWord.example}"
                            </p>
                          </div>
                        )}

                        {/* Story */}
                        {currentWord.story && (
                          <div className="bg-white/20 rounded-[20px] p-4 backdrop-blur-sm border border-white/30">
                            <p className="text-xs sm:text-sm font-semibold mb-2 text-white">💡 네 인생이 예문이 되어</p>
                            <p className="text-sm sm:text-base text-white leading-relaxed whitespace-pre-wrap">
                              {currentWord.story}
                            </p>
                          </div>
                        )}

                        {/* Synonyms & Antonyms */}
                        {((currentWord.synonyms && currentWord.synonyms.length > 0) || 
                          (currentWord.antonyms && currentWord.antonyms.length > 0)) && (
                          <div className="flex flex-col sm:flex-row gap-2 text-xs sm:text-sm">
                            {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                              <div className="flex-1 bg-white/20 rounded-[12px] p-3 backdrop-blur-sm border border-white/30">
                                <p className="font-semibold mb-1 text-white">유의어</p>
                                <p className="text-white leading-relaxed">{currentWord.synonyms.join(', ')}</p>
                              </div>
                            )}
                            {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                              <div className="flex-1 bg-white/20 rounded-[12px] p-3 backdrop-blur-sm border border-white/30">
                                <p className="font-semibold mb-1 text-white">반의어</p>
                                <p className="text-white leading-relaxed">{currentWord.antonyms.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hint */}
                        <p className="text-xs sm:text-sm text-white/90 text-center mt-2 sm:mt-4">
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
          <div className="px-4 sm:px-6 pb-6 sm:pb-8 space-y-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Previous Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`flex items-center justify-center w-16 h-16 sm:w-14 sm:h-14 rounded-[20px] border shadow-card animate-touch min-h-[56px] min-w-[56px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation ${
                  currentIndex === 0
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-white/90 backdrop-blur-lg border-white/40'
                }`}
              >
                <ChevronLeft size={28} className="sm:w-6 sm:h-6 text-[#091A7A]" />
              </motion.button>

              {/* Card Counter */}
              <div className="flex-1 flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide px-2">
                {words.map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                      index === currentIndex
                        ? 'w-6 sm:w-8 bg-[#091A7A]'
                        : index < currentIndex
                        ? 'w-1.5 sm:w-2 bg-[#ADC8FF]'
                        : 'w-1.5 sm:w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                disabled={currentIndex === words.length - 1}
                className={`flex items-center justify-center w-16 h-16 sm:w-14 sm:h-14 rounded-[20px] border shadow-card animate-touch min-h-[56px] min-w-[56px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation ${
                  currentIndex === words.length - 1
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-gradient-to-r from-[#091A7A] to-[#4A5FC4] border-transparent'
                }`}
              >
                <ChevronRight size={28} className="sm:w-6 sm:h-6 text-white" />
              </motion.button>
            </div>

            {/* Memorized Count */}
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
              <Check size={16} className="text-[#10B981] flex-shrink-0" />
              <span>암기한 단어: {memorizedWords.size} / {words.length}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}