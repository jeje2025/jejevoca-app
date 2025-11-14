import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, Brain, Zap, Trophy, Clock, ChevronRight, CheckCircle, Calendar } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
  color: string;
  bookNumber?: number;
}

interface SubjectDetailScreenProps {
  subject: Subject;
  onBack: () => void;
  onStartQuiz: () => void;
  onLessonClick?: (lessonTitle: string) => void;
  onVocabularyCardClick?: () => void;
}

interface WordSet {
  id: string;
  title: string;
  wordCount: number;
  progress: number;
  isUnlocked: boolean;
  isCompleted: boolean;
}

interface Day {
  id: string;
  dayNumber: number;
  title: string;
  stamps: {
    meaning: boolean;  // 뜻
    derivative: boolean;  // 파생어
    synonym: boolean;  // 유반의어
  };
  progress: number;
}

// Mock days data - 8개월 × 16일(월/화/목/금) = 128일
const getDaysData = (bookNumber: number): Day[] => {
  // 각 권은 480단어 = 16일 × 30단어
  const days: Day[] = [];
  for (let i = 1; i <= 16; i++) {
    const progress = i === 1 ? 65 : i === 2 ? 40 : i === 3 ? 20 : 0;
    days.push({
      id: `day${i}`,
      dayNumber: i,
      title: `Day ${i}`,
      progress,
      stamps: {
        meaning: i === 1,  // Day 1은 뜻 완료
        derivative: false,
        synonym: false
      }
    });
  }
  return days;
};

const getCurrentDay = (days: Day[]) => {
  for (const day of days) {
    const allStampsComplete = day.stamps.meaning && day.stamps.derivative && day.stamps.synonym;
    if (!allStampsComplete) {
      return { day: day.title, progress: day.progress };
    }
  }
  return { day: days[0].title, progress: days[0].progress };
};

export function SubjectDetailScreen({ subject, onBack, onStartQuiz, onVocabularyCardClick }: SubjectDetailScreenProps) {
  const bookNumber = subject.bookNumber || 1;
  const [expandedDays, setExpandedDays] = useState<string[]>(['day1']);
  
  const days = getDaysData(bookNumber);
  const currentDay = getCurrentDay(days);
  const totalProgress = Math.round(days.reduce((sum, day) => sum + day.progress, 0) / days.length);
  const totalWords = days.length * 30; // 16일 × 30단어 = 480단어
  const completedDays = days.filter(day => day.progress === 100).length;

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };

  return (
    <div className="h-full bg-gradient-to-b from-[#ADC8FF] via-[#E8F2FF]/95 to-white">
      {/* Header Section */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ADC8FF]/30 via-transparent to-transparent" />
        
        <div className="relative px-6 pt-4 pb-6">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="w-12 h-12 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/40 min-h-[44px] min-w-[44px] animate-touch"
            >
              <ArrowLeft className="w-5 h-5 text-[#4F8EFF]" />
            </motion.button>
            
            <h1 className="text-section-header text-[#4F8EFF]/80">단어장 상세</h1>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/40 min-h-[44px] min-w-[44px] animate-touch"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#091A7A] to-[#4F8EFF] flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </motion.button>
          </div>

          {/* Subject Banner Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/50 mb-6"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${subject.color} rounded-3xl flex items-center justify-center shadow-lg`}>
                {subject.icon}
              </div>
              
              <div className="flex-1">
                <h1 className="text-main-heading text-[#4F8EFF] mb-2">{subject.name}</h1>
                <p className="text-small text-[#6B8EFF]/80 mb-3">{subject.description}</p>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#6B8EFF]/60" />
                    <span className="text-tiny text-[#6B8EFF]/70">16일 완성</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#6B8EFF]/60" />
                    <span className="text-tiny text-[#6B8EFF]/70">{totalWords}개 단어</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-subheading text-[#4F8EFF]">전체 진행률</span>
                <span className="text-subheading font-semibold text-[#4F8EFF]">{totalProgress}%</span>
              </div>
              
              <div className="h-3 bg-[#ADC8FF]/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalProgress}%` }}
                  transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-[#4F8EFF] to-[#7BA7FF] rounded-full shadow-sm"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-tiny text-[#6B8EFF]/70">완료한 Day</span>
                <span className="text-tiny text-[#6B8EFF]/80">{completedDays} / {days.length}일</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Continue Learning Button */}
      <div className="px-6 mb-6">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onVocabularyCardClick}
          className="w-full bg-subject-gradient text-[#4F8EFF] rounded-3xl p-5 shadow-xl border border-white/40 backdrop-blur-lg min-h-[44px] animate-touch"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-white/30 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#4F8EFF]" />
                </div>
                <span className="text-subheading font-semibold">학습 계속하기</span>
              </div>
              <p className="text-small text-[#4F8EFF]/80 font-medium">
                {currentDay.day}
              </p>
              <p className="text-small text-[#4F8EFF]/70 font-medium">
                {currentDay.progress}% 완료
              </p>
            </div>
            <div className="w-14 h-14 bg-white backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg">
              <BookOpen className="w-6 h-6 text-[#4F8EFF]" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* Days List - Simple Cards with 3 Stamps */}
      <div className="flex-1 px-6 pb-6">
        <div className="space-y-3">
          {days.map((day, dayIndex) => (
            <motion.button
              key={day.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={onVocabularyCardClick}
              className="w-full bg-white/95 backdrop-blur-xl rounded-[24px] p-5 shadow-card border border-white/60 ring-1 ring-[#ADC8FF]/20 min-h-[44px] animate-touch"
            >
              <div className="flex items-center justify-between">
                {/* Left: Day Number with "Day" label */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {/* Day Label - 비스듬히 매달려있는 느낌 */}
                    <div 
                      className="absolute -top-1 -left-2 z-10"
                      style={{ transform: 'rotate(-15deg)' }}
                    >
                      <span 
                        className="text-[10px] font-semibold text-[#091A7A]/60"
                        style={{ 
                          fontFamily: 'Lexend, sans-serif',
                          letterSpacing: '0.5px'
                        }}
                      >
                        Day
                      </span>
                    </div>
                    
                    {/* Number Circle */}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg ${
                      day.stamps.meaning && day.stamps.derivative && day.stamps.synonym
                        ? 'bg-gradient-to-br from-[#10B981] to-[#14B8A6] border-green-300'
                        : 'bg-gradient-to-br from-[#ADC8FF] to-[#8FB0FF] border-white/50'
                    }`}>
                      <span className="text-xl font-bold text-white">{day.dayNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Right: 3 Mission Stamps */}
                <div className="flex items-center gap-3">
                  {/* 표제어 Stamp */}
                  <div className="relative">
                    {/* Base Circle - Always visible */}
                    <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                      day.stamps.meaning
                        ? 'bg-white/80 border-gray-300 shadow-sm'
                        : 'bg-gray-100 border-gray-300'
                    }`}>
                      <span className="text-[11px] font-bold text-gray-600">표제어</span>
                    </div>
                    
                    {/* Real Rubber Stamp Overlay */}
                    {day.stamps.meaning && (
                      <motion.div
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: -12 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ transform: 'rotate(-12deg)' }}
                      >
                        <svg width="70" height="70" viewBox="0 0 70 70" style={{ filter: 'drop-shadow(0 2px 4px rgba(220, 38, 38, 0.3))' }}>
                          <defs>
                            {/* Grunge texture filter */}
                            <filter id="grunge">
                              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
                              <feColorMatrix in="noise" type="saturate" values="0"/>
                              <feComponentTransfer>
                                <feFuncA type="discrete" tableValues="0 0 0 0 1 1 1 1 1"/>
                              </feComponentTransfer>
                              <feGaussianBlur stdDeviation="0.5"/>
                            </filter>
                            
                            {/* Irregular circle mask */}
                            <mask id="stampMask">
                              <circle cx="35" cy="35" r="30" fill="white" filter="url(#grunge)"/>
                            </mask>
                          </defs>
                          
                          {/* Red stamp base with irregular edges */}
                          <circle 
                            cx="35" 
                            cy="35" 
                            r="30" 
                            fill="#DC2626" 
                            opacity="0.75"
                            mask="url(#stampMask)"
                          />
                          
                          {/* Additional texture layer */}
                          <circle 
                            cx="35" 
                            cy="35" 
                            r="30" 
                            fill="url(#stampGradient)" 
                            opacity="0.6"
                            mask="url(#stampMask)"
                          />
                          
                          <defs>
                            <radialGradient id="stampGradient">
                              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8"/>
                              <stop offset="50%" stopColor="#DC2626" stopOpacity="0.6"/>
                              <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.3"/>
                            </radialGradient>
                          </defs>
                          
                          {/* CLEAR text */}
                          <text
                            x="35"
                            y="42"
                            fontFamily="Arial Black, sans-serif"
                            fontSize="13"
                            fontWeight="900"
                            fill="#991B1B"
                            textAnchor="middle"
                            opacity="0.9"
                            style={{ letterSpacing: '0.5px' }}
                          >
                            CLEAR
                          </text>
                        </svg>
                      </motion.div>
                    )}
                  </div>

                  {/* 파생어 Stamp */}
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                      day.stamps.derivative
                        ? 'bg-white/80 border-gray-300 shadow-sm'
                        : 'bg-gray-100 border-gray-300'
                    }`}>
                      <span className="text-[11px] font-bold text-gray-600">파생어</span>
                    </div>
                    {day.stamps.derivative && (
                      <motion.div
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: -12 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ transform: 'rotate(-12deg)' }}
                      >
                        <svg width="70" height="70" viewBox="0 0 70 70" style={{ filter: 'drop-shadow(0 2px 4px rgba(220, 38, 38, 0.3))' }}>
                          <defs>
                            <filter id="grunge2">
                              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
                              <feColorMatrix in="noise" type="saturate" values="0"/>
                              <feComponentTransfer>
                                <feFuncA type="discrete" tableValues="0 0 0 0 1 1 1 1 1"/>
                              </feComponentTransfer>
                              <feGaussianBlur stdDeviation="0.5"/>
                            </filter>
                            <mask id="stampMask2">
                              <circle cx="35" cy="35" r="30" fill="white" filter="url(#grunge2)"/>
                            </mask>
                          </defs>
                          <circle cx="35" cy="35" r="30" fill="#DC2626" opacity="0.75" mask="url(#stampMask2)"/>
                          <circle cx="35" cy="35" r="30" fill="url(#stampGradient2)" opacity="0.6" mask="url(#stampMask2)"/>
                          <defs>
                            <radialGradient id="stampGradient2">
                              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8"/>
                              <stop offset="50%" stopColor="#DC2626" stopOpacity="0.6"/>
                              <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.3"/>
                            </radialGradient>
                          </defs>
                          <text x="35" y="42" fontFamily="Arial Black, sans-serif" fontSize="13" fontWeight="900" fill="#991B1B" textAnchor="middle" opacity="0.9" style={{ letterSpacing: '0.5px' }}>
                            CLEAR
                          </text>
                        </svg>
                      </motion.div>
                    )}
                  </div>

                  {/* 유반의어 Stamp */}
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                      day.stamps.synonym
                        ? 'bg-white/80 border-gray-300 shadow-sm'
                        : 'bg-gray-100 border-gray-300'
                    }`}>
                      <span className="text-[10px] font-bold text-gray-600 leading-tight text-center">유반<br/>의어</span>
                    </div>
                    {day.stamps.synonym && (
                      <motion.div
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: -12 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ transform: 'rotate(-12deg)' }}
                      >
                        <svg width="70" height="70" viewBox="0 0 70 70" style={{ filter: 'drop-shadow(0 2px 4px rgba(220, 38, 38, 0.3))' }}>
                          <defs>
                            <filter id="grunge3">
                              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
                              <feColorMatrix in="noise" type="saturate" values="0"/>
                              <feComponentTransfer>
                                <feFuncA type="discrete" tableValues="0 0 0 0 1 1 1 1 1"/>
                              </feComponentTransfer>
                              <feGaussianBlur stdDeviation="0.5"/>
                            </filter>
                            <mask id="stampMask3">
                              <circle cx="35" cy="35" r="30" fill="white" filter="url(#grunge3)"/>
                            </mask>
                          </defs>
                          <circle cx="35" cy="35" r="30" fill="#DC2626" opacity="0.75" mask="url(#stampMask3)"/>
                          <circle cx="35" cy="35" r="30" fill="url(#stampGradient3)" opacity="0.6" mask="url(#stampMask3)"/>
                          <defs>
                            <radialGradient id="stampGradient3">
                              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8"/>
                              <stop offset="50%" stopColor="#DC2626" stopOpacity="0.6"/>
                              <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.3"/>
                            </radialGradient>
                          </defs>
                          <text x="35" y="42" fontFamily="Arial Black, sans-serif" fontSize="13" fontWeight="900" fill="#991B1B" textAnchor="middle" opacity="0.9" style={{ letterSpacing: '0.5px' }}>
                            CLEAR
                          </text>
                        </svg>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}