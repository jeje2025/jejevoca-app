import { motion } from 'motion/react';
import onionImage from 'figma:asset/527f83e89faee2b183595f29c439367a7d511617.png';

interface OnionCharacterProps {
  stage: number; // 1: 작은 양파, 2: 중간 양파, 3: 큰 양파, 4: 완전한 양파
  feedback: 'correct' | 'wrong' | null;
  isOverOnion: boolean;
}

export function OnionCharacter({ stage, feedback, isOverOnion }: OnionCharacterProps) {
  // Size based on stage
  const getScale = () => {
    switch (stage) {
      case 1: return 0.7;
      case 2: return 0.85;
      case 3: return 1.0;
      case 4: return 1.15;
      default: return 0.7;
    }
  };

  const scale = getScale();

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 320 }}>
      {/* Onion Image */}
      <motion.div
        animate={{
          scale: scale * (isOverOnion ? 1.08 : 1),
          rotate: feedback === 'correct' ? [0, -3, 3, -3, 3, 0] : feedback === 'wrong' ? [0, -8, 8, -8, 8, 0] : 0,
          opacity: feedback === 'wrong' ? [1, 0.7, 1] : 1,
        }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <img 
          src={onionImage} 
          alt="양파" 
          className="w-full h-auto"
          style={{ width: 280, height: 'auto' }}
        />
      </motion.div>

      {/* Glow effect when hovering/dropping */}
      {isOverOnion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.6, scale: 1 }}
          className="absolute inset-0 bg-[#ADC8FF] rounded-full blur-3xl"
          style={{ width: 280 * scale, height: 280 * scale }}
        />
      )}

      {/* Success glow */}
      {feedback === 'correct' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.3, 1.5] }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-emerald-400 rounded-full blur-3xl"
          style={{ width: 300 * scale, height: 300 * scale }}
        />
      )}
    </div>
  );
}