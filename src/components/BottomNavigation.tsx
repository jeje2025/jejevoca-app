import { motion } from 'motion/react';
import { imgHome01 } from '../imports/svg-5stpn';
import { imgFrame, imgFrame1, imgFrame2, imgFrame3 } from '../imports/svg-vnq26';

interface BottomNavigationProps {
  currentScreen: string;
  onScreenChange: (screen: 'home' | 'vocamonster' | 'quiz' | 'ai' | 'leaderboard' | 'profile') => void;
}

function NavigationIcon({ src, active }: { src: string; active: boolean }) {
  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      <img 
        className={`w-full h-full object-contain transition-all duration-300 ${
          active ? 'brightness-0' : 'brightness-0 invert'
        }`} 
        src={src} 
        alt=""
      />
    </div>
  );
}

export function BottomNavigation({ currentScreen, onScreenChange }: BottomNavigationProps) {
  const navItems = [
    { icon: imgHome01, screen: 'home' as const, active: currentScreen === 'home' },
    { icon: imgFrame, screen: 'vocamonster' as const, active: currentScreen === 'vocamonster' },
    { icon: imgFrame1, screen: 'ai' as const, active: currentScreen === 'ai' },
    { icon: imgFrame2, screen: 'leaderboard' as const, active: currentScreen === 'leaderboard' },
    { icon: imgFrame3, screen: 'profile' as const, active: currentScreen === 'profile' },
  ];

  // Perfect mathematical positioning system for 5 items
  // Container: 320px wide, 10px padding each side = 300px usable
  // 5 sections of 60px each = perfect distribution
  const iconPositions = [10, 70, 130, 190, 250]; // Left edge of each 60px section
  const indicatorPositions = [10, 70, 130, 190, 250]; // Same positions for perfect alignment

  const getActiveIndex = () => {
    switch (currentScreen) {
      case 'home': return 0;
      case 'vocamonster': return 1;
      case 'ai': return 2;
      case 'leaderboard': return 3;
      case 'profile': return 4;
      default: return 0;
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1, duration: 0.6, ease: "easeOut" }}
      className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none"
    >
      <div className="pointer-events-auto bg-[#091A7A]/95 backdrop-blur-lg relative rounded-[50px] h-20 w-80 mx-auto shadow-elevated border border-white/20">
        {/* Active indicator with design system colors */}
        <motion.div 
          className="absolute bg-white rounded-full w-15 h-15 top-1/2 -translate-y-1/2 shadow-interactive"
          animate={{ 
            left: `${indicatorPositions[getActiveIndex()]}px`
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
        
        {/* Navigation Icons with perfect alignment */}
        <div className="absolute inset-0 flex items-center">
          <div className="relative w-full h-full">
            {navItems.map((item, index) => (
              <motion.button
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => onScreenChange(item.screen)}
                className="absolute top-1/2 -translate-y-1/2 z-10 w-15 h-15 flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  left: `${iconPositions[index]}px`
                }}
              >
                <NavigationIcon src={item.icon} active={item.active} />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}