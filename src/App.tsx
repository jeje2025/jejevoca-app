import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from './components/Header';
import { ProgressCard } from './components/ProgressCard';
import { DailyStreak } from './components/DailyStreak';
import { DailyStatusCard } from './components/DailyStatusCard';
import { CalendarWidget } from './components/CalendarWidget';
import { SubjectsSection } from './components/SubjectsSection';
import { BottomNavigation } from './components/BottomNavigation';
import { QuizScreen } from './components/QuizScreen';
import { GameMapQuizScreen } from './components/GameMapQuizScreen';
import { QuizCompletionScreen } from './components/QuizCompletionScreen';
import { AITutorScreen } from './components/AITutorScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SubjectDetailScreen } from './components/SubjectDetailScreen';
import { VocabularyCardScreen } from './components/VocabularyCardScreen';
import { VideosScreen } from './components/VideosScreen';
import { VocamonsterScreen } from './components/VocamonsterScreen';
import { VocamonsterBattle } from './components/VocamonsterBattle';
import { VocamonsterDeckScreen } from './components/VocamonsterDeckScreen';
import { LessonPlayerScreen } from './components/LessonPlayerScreen';
import { ProgressNotification } from './components/ProgressNotification';
import { InlineXPNotification } from './components/InlineXPNotification';
import { ProgressManager, UserProgress, ProgressUtils } from './components/ProgressManager';
import { ProgressSaveIndicator, useSaveStatus } from './components/ProgressSaveIndicator';
import { AmbientParticles } from './components/AmbientParticles';
import { DynamicBackground } from './components/DynamicBackground';
import { OpeningAnimation } from './components/OpeningAnimation';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSetup } from './components/AdminSetup';
import ExportPage from './ExportPage';
import profileImage from 'figma:asset/1627f3a870e9b56d751d07f53392d7a84aa55817.png';
import logoImage from 'figma:asset/2a6c1d3bb872264b344a42f0c6e792cd9cea4b63.png';
import { initializeSampleWords } from './utils/api';
import { authService } from './utils/auth';
import { createAdminAccount } from './utils/createAdminAccount';
import { supabase } from './utils/supabase-client';

// 앱 로드 시 자동으로 관리자 계정 생성
createAdminAccount();

export type Screen = 'opening' | 'login' | 'admin-setup' | 'home' | 'quiz' | 'game-map-quiz' | 'quiz-completion' | 'ai' | 'leaderboard' | 'profile' | 'subject-detail' | 'vocabulary-cards' | 'videos' | 'vocamonster' | 'vocamonster-battle' | 'vocamonster-deck' | 'lesson-player';

export interface Subject {
  id: string;
  name: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
  color: string;
  bookNumber?: number;
}

export default function App() {
  // Export Route - Check first before any other logic
  if (window.location.pathname === '/export') {
    return <ExportPage />;
  }

  // Admin Setup Route - Direct access to create admin account
  if (window.location.pathname === '/admin-setup' || window.location.search.includes('setup=admin')) {
    return <AdminSetup onComplete={() => {
      window.location.href = '/';
    }} />;
  }

  // 새로고침 시 세션 확인해서 자동 로그인
  const initialScreen = (): Screen => {
    const session = authService.getSession();
    if (session) {
      console.log('✅ 세션 발견! 자동 로그인:', session.user.name);
      return 'home'; // 세션 있으면 바로 홈으로
    }
    return 'opening'; // 세션 없으면 오프닝부터
  };

  // 초기 userName 설정 - 세션에서 가져오기
  const initialUserName = (): string => {
    const session = authService.getSession();
    return session?.user?.name || '김학생';
  };

  // Mobile-first design with touch-optimized interactions
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen());
  const [activeTab, setActiveTab] = useState('home');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [quizType, setQuizType] = useState<'standard' | 'game-map'>('standard');
  const [currentProfileImage, setCurrentProfileImage] = useState(profileImage);
  const [userName, setUserName] = useState(initialUserName());
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [battleMatchId, setBattleMatchId] = useState<string | null>(null);
  const [userXP, setUserXP] = useState(0); // 이제 users.points와 동기화됨
  const [streakCount, setStreakCount] = useState(3);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [completionData, setCompletionData] = useState({
    xpGained: 0,
    completionTime: '0:00',
    accuracy: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    stageName: ''
  });
  const [currentProgress, setCurrentProgress] = useState(40);
  const [totalQuizzesCompleted, setTotalQuizzesCompleted] = useState(2);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [recentXPGain, setRecentXPGain] = useState(0);
  const [showProgressNotification, setShowProgressNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'xp-gain' as const,
    title: '',
    subtitle: '',
    xpGain: 0
  });
  const [showInlineXP, setShowInlineXP] = useState(false);
  const [levelProgress, setLevelProgress] = useState(ProgressUtils.calculateLevel(5500));
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  
  // Admin mode
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  
  // Save status management
  const { saveStatus, showIndicator, triggerSave, triggerError } = useSaveStatus();

  // Load user points from users table and subscribe to real-time updates
  useEffect(() => {
    const loadUserPoints = async () => {
      const user = authService.getUser();
      if (!user) {
        setLoadingPoints(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('points')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('포인트 로드 오류:', error);
          // users 테이블에 points 필드가 없을 수 있으므로 기본값 사용
          setUserXP(1000);
        } else {
          const points = data?.points || 1000;
          // 포인트가 0이면 1000으로 설정
          const finalPoints = points === 0 ? 1000 : points;
          setUserXP(finalPoints);
          const levelProgress = ProgressUtils.calculateLevel(finalPoints);
          setLevelProgress(levelProgress);
          
          // 포인트가 0이었으면 데이터베이스에도 업데이트
          if (points === 0) {
            await supabase
              .from('users')
              .update({ points: 1000 })
              .eq('id', user.id);
          }
        }
      } catch (error) {
        console.error('포인트 로드 실패:', error);
        setUserXP(1000); // 기본값 1000
      } finally {
        setLoadingPoints(false);
      }
    };

    loadUserPoints();

    // 실시간 포인트 업데이트 구독
    const user = authService.getUser();
    if (user) {
      const channel = supabase
        .channel(`user-points-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            const updatedUser = payload.new as any;
            if (updatedUser.points !== undefined) {
              const newPoints = updatedUser.points || 0;
              setUserXP(newPoints);
              const levelProgress = ProgressUtils.calculateLevel(newPoints);
              setLevelProgress(levelProgress);
              console.log('✅ 포인트 실시간 업데이트:', newPoints);
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, []);

  const illustrationImage = "https://images.unsplash.com/photo-1743247299142-8f1c919776c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzZCUyMGNoYXJhY3RlciUyMGxlYXJuaW5nJTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc1NzQzMTU5MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  // Setup admin mode trigger
  (window as any).__showAdminMode = () => {
    setShowAdminDashboard(true);
  };
  
  const handleAdminLoginSuccess = () => {
    setShowAdminDashboard(true);
  };
  
  const handleAdminLoginCancel = () => {
    setShowAdminDashboard(false);
  };
  
  const handleAdminDashboardClose = () => {
    setShowAdminDashboard(false);
    // 관리자 대시보드 닫을 때 로그아웃 안 함 - 자동 로그인 유지
  };
 
  // Logout handler
  const handleLogout = async () => {
    try {
      await authService.signOut();
      console.log('🔓 로그아웃 완료');
      // 로그인 화면으로 이동
      setCurrentScreen('login');
      setActiveTab('home');
      setShowAdminDashboard(false);
    } catch (error) {
      console.error('로그아웃 에러:', error);
    }
  };
 
  // Navigation helper functions
  const navigateToScreen = (screen: Screen) => {
    setCurrentScreen(screen);
    setActiveTab(screen);
  };

  const navigateBack = () => {
    setCurrentScreen('home');
    setActiveTab('home');
    setSelectedSubject(null);
  };

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    navigateToScreen('subject-detail');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setActiveTab('home');
    setSelectedSubject(null);
  };

  const handleXPGain = async (points: number) => {
    const user = authService.getUser();
    if (!user) return;

    const oldXP = userXP;
    const newXP = oldXP + points;
    
    setRecentXPGain(points);
    setShowXPAnimation(true);
    setUserXP(newXP);
    
    // Update level progress
    const newLevelProgress = ProgressUtils.calculateLevel(newXP);
    setLevelProgress(newLevelProgress);
    
    // Check for level up
    const leveledUp = ProgressUtils.checkForLevelUp(oldXP, newXP);
    if (leveledUp) {
      setNotificationData({
        type: 'level-up',
        title: `Level ${newLevelProgress.currentLevel}!`,
        subtitle: 'You leveled up! Keep going!',
        xpGain: points
      });
      setShowProgressNotification(true);
    } else {
      // Show immediate inline XP feedback
      setShowInlineXP(true);
      setTimeout(() => setShowInlineXP(false), 2000);
      
      // Show detailed XP gain notification for larger amounts
      if (points >= 25) {
        setNotificationData({
          type: 'xp-gain',
          title: 'Excellent Work!',
          subtitle: 'You earned bonus Points!',
          xpGain: points
        });
        setShowProgressNotification(true);
      }
    }
    
    // Update users.points in database
    try {
      const { error } = await supabase
        .from('users')
        .update({ points: newXP })
        .eq('id', user.id);

      if (error) {
        console.error('포인트 업데이트 오류:', error);
      } else {
        console.log('✅ 포인트 업데이트 완료:', newXP);
      }
    } catch (error) {
      console.error('포인트 업데이트 실패:', error);
    }
    
    // Trigger save indicator
    triggerProgressSave();
  };

  const handleStreakIncrease = () => {
    setStreakCount(prev => prev + 1);
    
    // Show streak notification
    setNotificationData({
      type: 'streak',
      title: 'Streak Extended!',
      subtitle: `${streakCount + 1} days in a row!`,
      xpGain: 0
    });
    setShowProgressNotification(true);
    
    // Trigger save indicator
    triggerProgressSave();
  };

  const handleLessonClick = (lessonTitle: string) => {
    setSelectedLesson(lessonTitle);
    navigateToScreen('lesson-player');
  };

  const handleQuizCompletion = (data: {
    xpGained: number;
    completionTime: string;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
    stageName: string;
  }) => {
    setCompletionData(data);
    
    // Update progress and stats
    setTotalQuizzesCompleted(prev => prev + 1);
    const newProgress = Math.min(100, currentProgress + (data.accuracy >= 50 ? 20 : 10));
    setCurrentProgress(newProgress);
    
    // Real-time XP gain
    const oldXP = userXP;
    const newXP = oldXP + data.xpGained;
    setRecentXPGain(data.xpGained);
    setShowXPAnimation(true);
    setUserXP(newXP);
    
    // Update level progress
    const newLevelProgress = ProgressUtils.calculateLevel(newXP);
    setLevelProgress(newLevelProgress);
    
    // Check for level up
    const leveledUp = ProgressUtils.checkForLevelUp(oldXP, newXP);
    
    // Show completion notification
    setTimeout(() => {
      if (leveledUp) {
        setNotificationData({
          type: 'level-up',
          title: `Level ${newLevelProgress.currentLevel}!`,
          subtitle: 'Quiz completed with a level up!',
          xpGain: data.xpGained
        });
      } else {
        setNotificationData({
          type: 'quiz-complete',
          title: 'Quiz Completed!',
          subtitle: `${data.correctAnswers}/${data.totalQuestions} correct • ${data.accuracy}% accuracy`,
          xpGain: data.xpGained
        });
      }
      setShowProgressNotification(true);
    }, 1000);
    
    // Trigger save indicator
    triggerProgressSave();
    
    navigateToScreen('quiz-completion');
  };

  const handleXPAnimationComplete = () => {
    setShowXPAnimation(false);
    setRecentXPGain(0);
  };

  const handleNotificationComplete = () => {
    setShowProgressNotification(false);
  };

  // Handle progress loading from storage
  const handleProgressLoaded = (progress: UserProgress) => {
    setUserXP(progress.userXP);
    setStreakCount(progress.streakCount);
    setCurrentProgress(progress.currentProgress);
    setTotalQuizzesCompleted(progress.totalQuizzesCompleted);
    setLevelProgress(progress.levelProgress);
    setCompletedStages(progress.completedStages);
    setAchievements(progress.achievements);
    console.log('📊 Progress loaded:', progress);
  };

  // Trigger save indicator when progress changes
  const triggerProgressSave = () => {
    triggerSave();
  };

  const handleRetakeQuiz = () => {
    navigateToScreen('game-map-quiz');
  };

  const handleNextChallenge = () => {
    setCurrentScreen('home');
    setActiveTab('home');
    setSelectedSubject(null);
    setSelectedLesson(null);
  };

  const handleOpeningComplete = () => {
    setCurrentScreen('login');
    setActiveTab('home');
  };

  const handleSignupComplete = () => {
    navigateToScreen('welcome');
  };

  const handleWelcomeComplete = () => {
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'opening':
        return <OpeningAnimation onAnimationComplete={handleOpeningComplete} />;
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={async (isAdmin, userName) => {
              if (isAdmin) {
                // Admin logged in - show dashboard
                setShowAdminDashboard(true);
              } else {
                // Student logged in - go to home
                if (userName) {
                  setUserName(userName);
                }
                // 로그인 후 포인트 다시 로드
                const user = authService.getUser();
                if (user) {
                  try {
                    const { data, error } = await supabase
                      .from('users')
                      .select('points')
                      .eq('id', user.id)
                      .single();
                    if (!error && data) {
                      const points = data.points || 1000;
                      const finalPoints = points === 0 ? 1000 : points;
                      setUserXP(finalPoints);
                      const levelProgress = ProgressUtils.calculateLevel(finalPoints);
                      setLevelProgress(levelProgress);
                      
                      // 포인트가 0이었으면 데이터베이스에도 업데이트
                      if (points === 0) {
                        await supabase
                          .from('users')
                          .update({ points: 1000 })
                          .eq('id', user.id);
                      }
                    }
                  } catch (error) {
                    console.error('로그인 후 포인트 로드 실패:', error);
                  }
                }
                setCurrentScreen('home');
                setActiveTab('home');
              }
            }}
            onCreateAdmin={() => setCurrentScreen('admin-setup')}
          />
        );
      case 'admin-setup':
        return <AdminSetup onComplete={() => setCurrentScreen('login')} />;
      case 'home':
        return (
          <div className="space-y-6">
            <Header 
              profileImage={currentProfileImage} 
              userXP={userXP}
              recentXPGain={recentXPGain}
              showXPAnimation={showXPAnimation}
              onXPAnimationComplete={handleXPAnimationComplete}
              levelProgress={levelProgress}
              userName={userName}
              onLogout={handleLogout}
            />
            <div className="px-6">
              <ProgressCard 
                illustrationImage={illustrationImage} 
                onStartQuiz={() => navigateToScreen('game-map-quiz')}
                currentProgress={currentProgress}
                totalQuizzesCompleted={totalQuizzesCompleted}
                currentDay={1}
                currentVolume={1}
              />
            </div>
            <div className="px-6">
              <DailyStatusCard 
                points={userXP}
                isTodayCompleted={currentProgress >= 100}
                todayProgress={currentProgress}
              />
            </div>
            <div className="px-6">
              <DailyStreak streakCount={streakCount} />
            </div>
            <div className="px-6">
              <CalendarWidget />
            </div>
            <SubjectsSection onSubjectClick={handleSubjectClick} />
          </div>
        );
      case 'quiz':
        return <QuizScreen onBack={navigateBack} onXPGain={handleXPGain} onStreakIncrease={handleStreakIncrease} />;
      case 'game-map-quiz':
        return <GameMapQuizScreen onBack={navigateBack} onXPGain={handleXPGain} onStreakIncrease={handleStreakIncrease} userXP={userXP} streakCount={streakCount} selectedSubject={selectedSubject} onQuizCompletion={handleQuizCompletion} />;
      case 'quiz-completion':
        return <QuizCompletionScreen 
          onBack={navigateBack}
          onRetakeQuiz={handleRetakeQuiz}
          onNextChallenge={handleNextChallenge}
          userXP={userXP}
          xpGained={completionData.xpGained}
          streakCount={streakCount}
          completionTime={completionData.completionTime}
          accuracy={completionData.accuracy}
          totalQuestions={completionData.totalQuestions}
          correctAnswers={completionData.correctAnswers}
          stageName={completionData.stageName}
        />;
      case 'ai':
        return <AITutorScreen onBack={navigateBack} />;
      case 'leaderboard':
        return <LeaderboardScreen onBack={navigateBack} userXP={userXP} />;
      case 'profile':
        return <ProfileScreen 
          onBack={navigateBack} 
          userXP={userXP} 
          streakCount={streakCount} 
          profileImage={currentProfileImage} 
          levelProgress={levelProgress}
          onProfileImageChange={(imageUrl) => setCurrentProfileImage(imageUrl)}
        />;
      case 'videos':
        return <VideosScreen onBack={navigateBack} />;
              case 'vocamonster':
                return <VocamonsterScreen
                  onBack={navigateBack}
                  userPoints={userXP}
                  onStartBattle={(matchId) => {
                    setBattleMatchId(matchId)
                    setCurrentScreen('vocamonster-battle')
                  }}
                  onOpenDeck={() => setCurrentScreen('vocamonster-deck')}
                />;
      case 'vocamonster-deck':
        return <VocamonsterDeckScreen
          onBack={() => setCurrentScreen('vocamonster')}
        />;
      case 'vocamonster-battle':
        return battleMatchId ? (
          <VocamonsterBattle
            matchId={battleMatchId}
            onBack={() => {
              setBattleMatchId(null)
              setCurrentScreen('vocamonster')
            }}
            onMatchEnd={(won, pointsGained) => {
              setBattleMatchId(null)
              setCurrentScreen('vocamonster')
              // 포인트 업데이트는 VocamonsterBattle에서 처리됨
            }}
          />
        ) : null;
      case 'subject-detail':
        return selectedSubject ? (
          <SubjectDetailScreen 
            subject={selectedSubject} 
            onBack={navigateBack}
            onStartQuiz={() => navigateToScreen('game-map-quiz')}
            onVocabularyCardClick={() => navigateToScreen('vocabulary-cards')}
            onLessonClick={handleLessonClick}
          />
        ) : null;
      case 'vocabulary-cards':
        return selectedSubject && selectedSubject.bookNumber ? (
          <VocabularyCardScreen 
            bookNumber={selectedSubject.bookNumber}
            onBack={() => navigateToScreen('subject-detail')}
          />
        ) : null;
      case 'lesson-player':
        return <LessonPlayerScreen 
          onBack={navigateBack} 
          onTakeQuiz={() => navigateToScreen('game-map-quiz')} 
          lessonTitle={selectedLesson || 'Introduction to Algebra'}
        />;
      default:
        return null;
    }
  };

  const isVocamonsterScreen = currentScreen === 'vocamonster' || currentScreen === 'vocamonster-battle' || currentScreen === 'vocamonster-deck'
  
  return (
    <div 
      className="min-h-screen overflow-hidden flex flex-col"
      style={isVocamonsterScreen 
        ? { background: 'linear-gradient(180deg, #0E1647 0%, #0A1033 100%)' }
        : { background: 'linear-gradient(to bottom, #ADC8FF, rgba(232, 242, 255, 0.95), white)' }
      }
    >
      {/* Admin Dashboard */}
      {showAdminDashboard && (
        <AdminDashboard onClose={handleAdminDashboardClose} />
      )}
      
      {/* Progress Manager - Invisible component for handling saves */}
      <ProgressManager
        userXP={userXP}
        streakCount={streakCount}
        currentProgress={currentProgress}
        totalQuizzesCompleted={totalQuizzesCompleted}
        onProgressLoaded={handleProgressLoaded}
      />

      {/* Main Content - Perfectly scrollable with padding for fixed bottom navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-hide relative pb-32">
        {/* Opening Animation - No transition wrapper needed */}
        {currentScreen === 'opening' ? (
          renderScreen()
        ) : (
          /* Modern Screen Transition Animation for all other screens */
          <motion.div
            key={currentScreen}
            initial={{ 
              opacity: 0, 
              scale: currentScreen === 'welcome' ? 0.95 : (currentScreen === 'home' ? 1 : 0.98),
              y: currentScreen === 'welcome' ? 20 : (currentScreen === 'home' ? 0 : 15),
              filter: 'blur(8px)'
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: 0,
              filter: 'blur(0px)'
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              y: -15,
              filter: 'blur(4px)'
            }}
            transition={{ 
              duration: currentScreen === 'welcome' ? 0.8 : 0.5,
              ease: currentScreen === 'welcome' ? [0.23, 1, 0.32, 1] : "easeInOut",
              type: currentScreen === 'welcome' ? "spring" : "tween",
              bounce: currentScreen === 'welcome' ? 0.25 : 0
            }}
          >
            {/* Enhanced Transition Effects for Welcome Screen */}
            {currentScreen === 'welcome' && (
              <>
                {/* Subtle Particle Background */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-0 pointer-events-none"
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: Math.random() * 400,
                        y: Math.random() * 800,
                        opacity: 0,
                        scale: 0
                      }}
                      animate={{ 
                        opacity: [0, 0.4, 0],
                        scale: [0, 1, 0],
                        x: [
                          Math.random() * 400,
                          Math.random() * 400,
                          Math.random() * 400
                        ],
                        y: [
                          Math.random() * 800,
                          Math.random() * 800 + 50,
                          Math.random() * 800 + 100
                        ]
                      }}
                      transition={{
                        duration: 6,
                        delay: Math.random() * 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: `linear-gradient(45deg, #ADC8FF, #091A7A)`,
                        filter: 'blur(1px)'
                      }}
                    />
                  ))}
                </motion.div>

                {/* Gradient Overlay for Enhanced Depth */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 0.3, 0],
                    background: [
                      'radial-gradient(circle at 30% 20%, #ADC8FF 0%, transparent 50%)',
                      'radial-gradient(circle at 70% 60%, #091A7A 0%, transparent 40%)',
                      'radial-gradient(circle at 20% 80%, #ADC8FF 0%, transparent 60%)'
                    ]
                  }}
                  transition={{ 
                    opacity: { duration: 2, ease: "easeInOut" },
                    background: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute inset-0 pointer-events-none"
                />
              </>
            )}

            {renderScreen()}
          </motion.div>
        )}
        
        {/* Progress Notification */}
        <ProgressNotification
          show={showProgressNotification}
          type={notificationData.type}
          title={notificationData.title}
          subtitle={notificationData.subtitle}
          xpGain={notificationData.xpGain}
          onComplete={handleNotificationComplete}
        />
        
        {/* Inline XP Notification - Quick feedback */}
        <InlineXPNotification
          show={showInlineXP}
          xpGain={recentXPGain}
        />
        
        {/* Progress Save Indicator */}
        <ProgressSaveIndicator
          show={showIndicator}
          status={saveStatus}
        />
        
        {/* Bottom padding for navigation */}
        <div className={currentScreen === 'subject-detail' || currentScreen === 'vocabulary-cards' || currentScreen === 'lesson-player' || currentScreen === 'game-map-quiz' ? 'h-8' : 'h-28'} />
      </div>

      {/* Bottom Navigation - Hidden on opening, login, subject detail, vocabulary cards, lesson player, game map quiz, and completion screens */}
      {currentScreen !== 'opening' && currentScreen !== 'login' && currentScreen !== 'subject-detail' && currentScreen !== 'vocabulary-cards' && currentScreen !== 'lesson-player' && currentScreen !== 'game-map-quiz' && currentScreen !== 'quiz-completion' && currentScreen !== 'vocamonster-battle' && currentScreen !== 'vocamonster-deck' && (
        <BottomNavigation currentScreen={currentScreen} onScreenChange={(screen) => {
          if (screen === 'home') {
            handleBackToHome();
          } else {
            navigateToScreen(screen);
          }
        }} />
      )}
    </div>
  );
}