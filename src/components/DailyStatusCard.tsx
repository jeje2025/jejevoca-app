import { motion } from 'motion/react';
import { Coins, CheckCircle, Clock } from 'lucide-react';

interface DailyStatusCardProps {
  points: number;
  isTodayCompleted: boolean;
  todayProgress: number; // 0-100
}

export function DailyStatusCard({ points, isTodayCompleted, todayProgress }: DailyStatusCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 포인트 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(173, 200, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(9, 26, 122, 0.15)'
        }}
      >
        {/* 배경 그라데이션 효과 */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at top right, rgba(255, 215, 0, 0.2), transparent 60%)'
          }}
        />
        
        {/* 반짝이는 파티클 효과 */}
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: 'rgba(255, 215, 0, 0.6)' }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className="relative z-10">
          {/* 아이콘 */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)'
            }}
          >
            <Coins className="w-6 h-6 text-white" />
          </motion.div>
          
          {/* 포인트 수 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p 
              className="mb-1"
              style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 500,
                fontSize: '12px',
                color: '#091A7A',
                opacity: 0.8
              }}
            >
              내 포인트
            </p>
            <motion.p
              key={points}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 700,
                fontSize: '28px',
                color: '#091A7A',
                lineHeight: 1
              }}
            >
              {points.toLocaleString()}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>

      {/* 오늘 숙제 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background: isTodayCompleted
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.9) 100%)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isTodayCompleted 
            ? '1px solid rgba(255, 255, 255, 0.3)'
            : '1px solid rgba(173, 200, 255, 0.2)',
          boxShadow: isTodayCompleted 
            ? '0 8px 32px rgba(16, 185, 129, 0.3)'
            : '0 8px 32px rgba(9, 26, 122, 0.15)'
        }}
      >
        {/* 배경 그라데이션 효과 */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: isTodayCompleted
              ? 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.5), transparent 60%)'
              : 'radial-gradient(circle at top left, rgba(9, 26, 122, 0.1), transparent 60%)'
          }}
        />
        
        {/* 완료 시 반짝이는 효과 */}
        {isTodayCompleted && (
          <>
            <motion.div
              className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-white"
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0
              }}
            />
            <motion.div
              className="absolute top-5 right-8 w-1 h-1 rounded-full bg-white"
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.3
              }}
            />
            <motion.div
              className="absolute top-8 right-5 w-1.5 h-1.5 rounded-full bg-white"
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.6
              }}
            />
          </>
        )}
        
        <div className="relative z-10">
          {/* 아이콘 */}
          <motion.div
            initial={{ scale: 0, rotate: isTodayCompleted ? 180 : 0 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{
              background: isTodayCompleted
                ? 'rgba(255, 255, 255, 0.3)'
                : 'linear-gradient(135deg, rgba(9, 26, 122, 0.15) 0%, rgba(79, 142, 255, 0.15) 100%)',
              boxShadow: isTodayCompleted
                ? '0 4px 12px rgba(255, 255, 255, 0.2)'
                : '0 4px 12px rgba(9, 26, 122, 0.1)'
            }}
          >
            {isTodayCompleted ? (
              <CheckCircle className="w-6 h-6 text-white" />
            ) : (
              <Clock className="w-6 h-6 text-[#091A7A]" />
            )}
          </motion.div>
          
          {/* 상태 텍스트 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
          >
            <p 
              className="mb-1"
              style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 500,
                fontSize: '12px',
                color: isTodayCompleted ? '#ffffff' : '#091A7A',
                opacity: isTodayCompleted ? 0.9 : 0.8
              }}
            >
              오늘의 학습
            </p>
            {isTodayCompleted ? (
              <motion.p
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 700,
                  fontSize: '20px',
                  color: '#ffffff',
                  lineHeight: 1.2
                }}
              >
                완료! 🎉
              </motion.p>
            ) : (
              <div>
                <motion.p
                  style={{
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    color: '#091A7A',
                    lineHeight: 1.2,
                    marginBottom: '4px'
                  }}
                >
                  {todayProgress}%
                </motion.p>
                {/* 작은 진행률 바 */}
                <div 
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{
                    background: 'rgba(9, 26, 122, 0.15)'
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${todayProgress}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #091A7A 0%, #4F8EFF 100%)'
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}