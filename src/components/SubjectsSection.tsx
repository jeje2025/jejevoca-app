import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { MathIcon2D } from './2d-icons/MathIcon2D';
import { EnglishIcon2D } from './2d-icons/EnglishIcon2D';
import { ScienceIcon2D } from './2d-icons/ScienceIcon2D';
import { SocialStudiesIcon2D } from './2d-icons/SocialStudiesIcon2D';

interface Subject {
  id: string;
  name: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
  color: string;
  bookNumber: number;
  isUnlocked: boolean;
}

interface SubjectsSectionProps {
  onSubjectClick: (subject: Subject) => void;
}

export function SubjectsSection({ onSubjectClick }: SubjectsSectionProps) {
  const subjects: Subject[] = [
    {
      id: 'book1',
      name: 'VOL. 1',
      description: '480개 단어',
      progress: 65,
      icon: <div className="text-2xl font-bold text-[#091A7A]">1</div>,
      color: 'from-[#091A7A] to-[#3B82F6]',
      bookNumber: 1,
      isUnlocked: true
    },
    {
      id: 'book2',
      name: 'VOL. 2',
      description: '480개 단어',
      progress: 40,
      icon: <div className="text-2xl font-bold text-[#091A7A]">2</div>,
      color: 'from-[#091A7A] to-[#10B981]',
      bookNumber: 2,
      isUnlocked: false
    },
    {
      id: 'book3',
      name: 'VOL. 3',
      description: '480개 단어',
      progress: 20,
      icon: <div className="text-2xl font-bold text-[#091A7A]">3</div>,
      color: 'from-[#091A7A] to-[#8B5CF6]',
      bookNumber: 3,
      isUnlocked: false
    },
    {
      id: 'book4',
      name: 'VOL. 4',
      description: '480개 단어',
      progress: 5,
      icon: <div className="text-2xl font-bold text-[#091A7A]">4</div>,
      color: 'from-[#091A7A] to-[#F59E0B]',
      bookNumber: 4,
      isUnlocked: false
    },
    {
      id: 'book5',
      name: 'VOL. 5',
      description: '480개 단어',
      progress: 0,
      icon: <div className="text-2xl font-bold text-[#091A7A]">5</div>,
      color: 'from-[#091A7A] to-[#EC4899]',
      bookNumber: 5,
      isUnlocked: false
    },
    {
      id: 'book6',
      name: 'VOL. 6',
      description: '480개 단어',
      progress: 0,
      icon: <div className="text-2xl font-bold text-[#091A7A]">6</div>,
      color: 'from-[#091A7A] to-[#14B8A6]',
      bookNumber: 6,
      isUnlocked: false
    },
    {
      id: 'book7',
      name: 'VOL. 7',
      description: '480개 단어',
      progress: 0,
      icon: <div className="text-2xl font-bold text-[#091A7A]">7</div>,
      color: 'from-[#091A7A] to-[#F97316]',
      bookNumber: 7,
      isUnlocked: false
    },
    {
      id: 'book8',
      name: 'VOL. 8',
      description: '480개 단어',
      progress: 0,
      icon: <div className="text-2xl font-bold text-[#091A7A]">8</div>,
      color: 'from-[#091A7A] to-[#6366F1]',
      bookNumber: 8,
      isUnlocked: false
    }
  ];

  // Calculate circumference for progress animation
  const circumference = 2 * Math.PI * 30; // radius = 30px

  return (
    <div className="relative mx-6 mb-6">
      {/* Floating ambient particles around the subject area */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -inset-8">
        <motion.div
          className="absolute top-16 left-4 w-1.5 h-1.5 bg-gradient-to-br from-[#ADC8FF]/40 to-[#091A7A]/20 rounded-full blur-sm"
          animate={{
            y: [0, -25, 0],
            x: [0, 15, 0],
            scale: [0.4, 1.2, 0.4],
            opacity: [0.2, 0.7, 0.2]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        <motion.div
          className="absolute top-32 right-8 w-1 h-1 bg-gradient-to-br from-[#091A7A]/30 to-[#ADC8FF]/40 rounded-full blur-sm"
          animate={{
            y: [0, -18, 0],
            x: [0, -12, 0],
            scale: [0.3, 0.9, 0.3],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className="absolute bottom-20 left-16 w-0.5 h-0.5 bg-gradient-to-br from-[#ADC8FF]/50 to-[#091A7A]/10 rounded-full blur-sm"
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [0.5, 1.5, 0.5],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
        <motion.div
          className="absolute top-24 right-2 w-2 h-2 bg-gradient-to-br from-yellow-300/30 to-orange-300/20 rounded-full blur-sm"
          animate={{
            y: [0, -22, 0],
            x: [0, -8, 0],
            scale: [0.2, 1, 0.2],
            opacity: [0.2, 0.5, 0.2],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6
          }}
        />
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <motion.h3 
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 600,
            fontSize: '16px',
            color: '#091A7A'
          }}
        >
          VOL. 1~8 전체보기
        </motion.h3>
        <motion.button
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.98 }}
          style={{
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 500,
            fontSize: '12px',
            color: '#6B7280'
          }}
          className="px-3 py-1 rounded-[50px] transition-all duration-200"
        >
          전체보기
        </motion.button>
      </div>
      
      {/* Subjects Grid - 2×4 grid for 8 books */}
      <div className="grid grid-cols-2 gap-5">
        {subjects.map((subject, index) => {
          const isUnlocked = subject.bookNumber === 1; // 1번만 해금
          
          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
              whileTap={isUnlocked ? { scale: 0.98 } : undefined}
              onClick={() => isUnlocked && onSubjectClick(subject)}
              className={`relative flex-1 ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{
                opacity: isUnlocked ? 1 : 0.5,
                filter: isUnlocked ? 'none' : 'grayscale(0.5)'
              }}
            >
              {/* 2D Icon - Removed (숫자는 카드 안으로 이동) */}

              {/* Subject Card Container - Clean without icon inside */}
              <div 
                className="relative p-4 backdrop-blur-lg border rounded-[40px] overflow-hidden group"
                style={{
                  height: '155px',
                  background: 'linear-gradient(135deg, rgba(173, 200, 255, 0.9) 0%, rgba(173, 200, 255, 0.7) 100%)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 25px 50px -12px rgba(9, 26, 122, 0.25)'
                }}
              >
                {/* Book Number Badge - 좌상단 */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + index * 0.1, type: "spring", stiffness: 300 }}
                  className="absolute top-3 left-3 z-20"
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: isUnlocked 
                        ? '#FFFFFF'
                        : 'rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: isUnlocked 
                        ? '0 4px 12px rgba(9, 26, 122, 0.2)'
                        : '0 2px 6px rgba(9, 26, 122, 0.1)'
                    }}
                  >
                    <span 
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 700,
                        fontSize: '18px',
                        color: isUnlocked ? '#091A7A' : 'rgba(9, 26, 122, 0.3)'
                      }}
                    >
                      {subject.bookNumber}
                    </span>
                  </div>
                </motion.div>

                {/* Achievement Star Badge for 70%+ progress */}
                {subject.progress >= 70 && (
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 1 + index * 0.1, type: "spring", stiffness: 300 }}
                    className="absolute -top-2 -right-2 z-30"
                  >
                    <div 
                      className="p-1 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #facc15 0%, #f97316 100%)'
                      }}
                    >
                      <Star className="w-4 h-4 text-white" fill="currentColor" />
                    </div>
                  </motion.div>
                )}

                {/* Content Container - Perfectly centered with 2px spacing */}
                <div className="h-full flex flex-col items-center justify-center text-center" style={{ gap: '2px' }}>
                  
                  {/* Circular Progress Bar - Centered */}
                  <motion.div
                    className="relative"
                  >
                    <svg 
                      viewBox="0 0 80 80" 
                      className="size-20"
                      style={{
                        filter: 'drop-shadow(0 4px 8px rgba(9, 26, 122, 0.15))'
                      }}
                    >
                      {/* Progress Gradient Definition */}
                      <defs>
                        <linearGradient id={`progressGradient-${subject.id}`} x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#091a7a" />
                          <stop offset="50%" stopColor="#1a2fb8" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      
                      {/* Background Circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(9, 26, 122, 0.1))'
                        }}
                      />
                      
                      {/* Progress Circle */}
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke={`url(#progressGradient-${subject.id})`}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ 
                          strokeDashoffset: circumference - (subject.progress / 100) * circumference 
                        }}
                        transition={{ 
                          delay: 0.7 + index * 0.1, 
                          duration: 1.5, 
                          ease: "easeOut" 
                        }}
                        transform="rotate(-90 40 40)"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(9, 26, 122, 0.2))'
                        }}
                      />
                    </svg>
                    
                    {/* Progress Percentage Text */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        delay: 1 + index * 0.1, 
                        duration: 0.5, 
                        type: "spring", 
                        stiffness: 300 
                      }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span
                        style={{
                          fontFamily: 'Lexend, sans-serif',
                          fontWeight: 500,
                          fontSize: '16px',
                          color: '#091A7A'
                        }}
                      >
                        {subject.progress}%
                      </span>
                    </motion.div>
                  </motion.div>

                  {/* Subject Information - Centered below progress circle */}
                  <div className="space-y-1">
                    {/* Subject Title */}
                    <h4
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '18px',
                        color: '#091A7A'
                      }}
                    >
                      {subject.name}
                    </h4>
                    
                    {/* Subject Description */}
                    <p
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 500,
                        fontSize: '10px',
                        lineHeight: '12px',
                        color: '#525252'
                      }}
                    >
                      {subject.description}
                    </p>
                  </div>
                </div>

                {/* Enhanced glass morphism overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none rounded-[40px]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)'
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}