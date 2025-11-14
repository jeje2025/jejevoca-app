import { motion } from 'motion/react';
import { ArrowLeft, Settings, Award, Zap, Calendar, Target, Book, TrendingUp, Camera } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useRef } from 'react';

interface ProfileScreenProps {
  onBack: () => void;
  userXP: number;
  streakCount: number;
  profileImage: string;
  levelProgress: {
    currentLevel: number;
    xpForNextLevel: number;
    xpInCurrentLevel: number;
  };
  onProfileImageChange?: (imageUrl: string) => void;
}

const achievements = [
  { id: 1, title: "First Quiz Complete", description: "Completed your first quiz", icon: Book, earned: true },
  { id: 2, title: "Week Warrior", description: "7-day learning streak", icon: Calendar, earned: false },
  { id: 3, title: "Math Master", description: "100% in Mathematics quiz", icon: Target, earned: true },
  { id: 4, title: "XP Champion", description: "Earned 10,000 XP", icon: Zap, earned: false }
];

const stats = [
  { label: "Total XP", value: "5,500", icon: Zap, color: "from-yellow-400 to-yellow-600" },
  { label: "Current Streak", value: "3 days", icon: Calendar, color: "from-orange-400 to-orange-600" },
  { label: "Quizzes Completed", value: "12", icon: Book, color: "from-blue-400 to-blue-600" },
  { label: "Avg. Score", value: "87%", icon: TrendingUp, color: "from-green-400 to-green-600" }
];

export function ProfileScreen({ onBack, userXP, streakCount, profileImage, levelProgress, onProfileImageChange }: ProfileScreenProps) {
  const currentLevel = levelProgress.currentLevel;
  const xpForNextLevel = levelProgress.xpForNextLevel - levelProgress.xpInCurrentLevel;
  const levelProgressPercent = (levelProgress.xpInCurrentLevel / levelProgress.xpForNextLevel) * 100;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        if (onProfileImageChange) {
          onProfileImageChange(imageUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ADC8FF]/30 to-[#6B8FFF]/20" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="w-12 h-12 bg-card-glass backdrop-blur-lg rounded-full flex items-center justify-center shadow-card border border-white/20"
            >
              <ArrowLeft className="w-5 h-5 text-[#091A7A]" />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 bg-card-glass backdrop-blur-lg rounded-[20px] flex items-center justify-center shadow-card border border-white/20"
            >
              <Settings className="w-5 h-5 text-[#091A7A]" />
            </motion.button>
          </div>

          {/* Profile Info */}
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <ImageWithFallback
                src={profileImage}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover object-top"
              />
              
              {/* Camera Button for changing profile picture */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={triggerFileInput}
                className="absolute bottom-10 right-0 w-8 h-8 bg-gradient-to-br from-[#091A7A] to-[#1a2b8a] rounded-full flex items-center justify-center shadow-lg border-2 border-white"
              >
                <Camera className="w-4 h-4 text-white" />
              </motion.button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              
              <div className="absolute -bottom-2 -right-2 px-3 py-1 bg-gradient-to-r from-[#091A7A] to-[#1a2b8a] rounded-full">
                <span className="text-white font-bold text-sm">Lv.{currentLevel}</span>
              </div>
            </motion.div>

            <div>
              <h1 className="text-2xl font-bold text-[#091A7A]">Abhi Dhande</h1>
              <p className="text-[#091A7A]/70">Learning enthusiast</p>
            </div>

            {/* Level Progress */}
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-[#091A7A]/70">
                <span>Level {currentLevel}</span>
                <span>{xpForNextLevel} XP to next level</span>
              </div>
              <div className="h-3 bg-white/40 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgressPercent}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full bg-gradient-to-r from-[#091A7A] to-[#1a2b8a] rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <h3 className="font-semibold text-[#091A7A] mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm"
            >
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-[#091A7A]">
                {stat.label === "Total XP" ? userXP.toLocaleString() : 
                 stat.label === "Current Streak" ? `${streakCount} days` : stat.value}
              </p>
              <p className="text-xs text-[#091A7A]/70">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Achievements */}
        <h3 className="font-semibold text-[#091A7A] mb-4">Achievements</h3>
        <div className="space-y-3">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`p-4 rounded-2xl border ${
                achievement.earned
                  ? 'bg-gradient-to-r from-green-50 to-green-100/50 border-green-200'
                  : 'bg-white/40 border-white/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  achievement.earned
                    ? 'bg-gradient-to-br from-green-400 to-green-600'
                    : 'bg-gray-200'
                }`}>
                  <achievement.icon className={`w-6 h-6 ${
                    achievement.earned ? 'text-white' : 'text-gray-400'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${
                      achievement.earned ? 'text-green-800' : 'text-[#091A7A]/60'
                    }`}>
                      {achievement.title}
                    </h4>
                    {achievement.earned && (
                      <Award className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className={`text-sm ${
                    achievement.earned ? 'text-green-700' : 'text-[#091A7A]/50'
                  }`}>
                    {achievement.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}