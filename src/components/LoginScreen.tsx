import { motion } from 'motion/react';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Sparkles, Shield, UserPlus } from 'lucide-react';
import logoImage from 'figma:asset/2a6c1d3bb872264b344a42f0c6e792cd9cea4b63.png';
import { authService } from '../utils/auth';
import { supabase } from '../utils/supabase-client';

interface LoginScreenProps {
  onLoginSuccess: (isAdmin: boolean, userName?: string) => void;
  onCreateAdmin?: () => void;
}

export function LoginScreen({ onLoginSuccess, onCreateAdmin }: LoginScreenProps) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [formData, setFormData] = useState({
    studentCode: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogoTap = () => {
    const newCount = logoTapCount + 1;
    setLogoTapCount(newCount);

    // 5번 탭하면 관리자 모드 활성화
    if (newCount >= 5) {
      setIsAdminMode(true);
      // 관리자 이메일 자동 입력
      setFormData(prev => ({
        ...prev,
        email: 'admin@godslifevoca.com'
      }));
      setLogoTapCount(0);
    }

    // 2초 후 카운트 리셋
    setTimeout(() => {
      setLogoTapCount(0);
    }, 2000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const handleLogin = async () => {
    // Validation
    if (isAdminMode) {
      if (!formData.email || !formData.password) {
        setError('이메일과 비밀번호를 입력해주세요.');
        return;
      }
    } else {
      if (!formData.studentCode || !formData.password) {
        setError('아이디와 비밀번호를 입력해주세요.');
        return;
      }
    }

    try {
      setIsLoading(true);
      setError('');

      if (isAdminMode) {
        // Admin login with email
        const session = await authService.signIn(formData.email, formData.password);
        console.log('🔐 Admin login session:', session ? 'SUCCESS' : 'FAILED');
        if (session) {
          onLoginSuccess(true);
        } else {
          setError('관리자 로그인에 실패했습니다.');
        }
      } else {
        // Student login with Supabase Auth directly
        const email = `${formData.studentCode}@student.godslifevoca.com`;
        console.log('👨‍🎓 Attempting student login with email:', email);

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password
        });

        if (error) {
          console.error('❌ Student login error:', error);
          setError('학생 로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
        } else if (data.session) {
          console.log('✅ Student login successful:', data.user?.id);

          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            console.error('❌ Profile not found:', profileError);
            setError('프로필을 찾을 수 없습니다. 관리자에게 문의하세요.');
            await supabase.auth.signOut();
          } else {
            console.log('✅ Profile found:', profile);
            onLoginSuccess(false, profile.name);
          }
        } else {
          setError('학생 로그인에 실패했습니다.');
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '로그인 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const isFormValid = isAdminMode 
    ? formData.email && formData.password
    : formData.studentCode && formData.password;

  return (
    <div className="flex-1 flex flex-col relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.3, 0],
              scale: [0, 1, 0],
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 300 - 150],
            }}
            transition={{
              duration: 4,
              delay: i * 0.5,
              repeat: Infinity,
              repeatDelay: 2
            }}
            className="absolute w-8 h-8 rounded-full bg-gradient-to-r from-[#ADC8FF] to-[#091A7A] opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: 'blur(4px)'
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center pt-16 pb-8 relative z-10"
      >
        <motion.h2 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #091A7A 0%, #ADC8FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: 'Lexend, sans-serif'
          }}
        >
          {isAdminMode ? '관리자 로그인' : '갓생보카'}
        </motion.h2>
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-small opacity-70 mt-2"
        >
          {isAdminMode ? 'ADMIN ACCESS' : '네 인생이 예문이 되어'}
        </motion.p>
      </motion.div>

      {/* Animated Logo - 5번 탭하면 관리자 모드 */}
      <div className="flex justify-center mb-12">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleLogoTap}
          initial={{ scale: 0, rotateY: 180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ 
            duration: 0.8, 
            delay: 0.4,
            type: "spring",
            bounce: 0.4
          }}
          className="relative"
        >
          {/* Glow Effect */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 w-24 h-24 bg-[#ADC8FF]/30 rounded-[20px] blur-lg"
          />
          
          {/* Main Logo Container */}
          <div className="relative w-40 h-40">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-full h-full text-[#091A7A]"
            >
              <img src={logoImage} alt="Logo" className="w-full h-full" />
            </motion.div>
          </div>

          {/* Secret Admin Badge - only shows when getting close to 5 taps */}
          {logoTapCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-1 -right-1"
            >
              <div className="w-6 h-6 bg-[#091A7A] rounded-full flex items-center justify-center text-white text-xs font-bold">
                {logoTapCount}
              </div>
            </motion.div>
          )}

          {/* Icon Badge */}
          {isAdminMode ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <Shield 
                size={16} 
                className="absolute -top-2 -right-2 text-[#091A7A]" 
              />
            </motion.div>
          ) : (
            <Sparkles 
              size={16} 
              className="absolute -top-2 -right-2 text-[#ADC8FF] animate-pulse" 
            />
          )}
        </motion.button>
      </div>

      {/* Form Container */}
      <div className="flex-1 px-6">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="space-y-5"
        >
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 bg-red-50 border border-red-200 rounded-[16px] text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Email or Student Code Input */}
          <motion.div
            animate={focusedField === 'identifier' ? { scale: 1.02 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <label className="text-small font-medium" style={{ color: '#091A7A' }}>
              {isAdminMode ? '관리자 이메일' : '아이디'}
            </label>
            <div className="relative">
              <motion.div
                animate={focusedField === 'identifier' ? { scale: 1.1, color: '#ADC8FF' } : { scale: 1, color: '#6B7280' }}
                transition={{ duration: 0.2 }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
              >
                {isAdminMode ? <Mail size={20} /> : <Sparkles size={20} />}
              </motion.div>
              <input
                type={isAdminMode ? "email" : "text"}
                placeholder={isAdminMode ? "admin@godslifevoca.com" : "아이디 (영문/숫자)"}
                value={isAdminMode ? formData.email : formData.studentCode}
                onChange={(e) => handleInputChange(isAdminMode ? 'email' : 'studentCode', e.target.value)}
                onFocus={() => setFocusedField('identifier')}
                onBlur={() => setFocusedField(null)}
                onKeyPress={handleKeyPress}
                className="w-full h-14 bg-card-glass border border-white/30 rounded-[20px] pl-12 pr-4 text-body placeholder-gray-400 backdrop-blur-lg shadow-card focus:outline-none focus:ring-2 focus:ring-[#ADC8FF]/50 focus:border-[#ADC8FF]/50 animate-touch min-h-[44px] transition-all duration-200"
                style={{ fontSize: '14px', fontFamily: 'Lexend, sans-serif' }}
              />
            </div>
          </motion.div>

          {/* Password Input */}
          <motion.div
            animate={focusedField === 'password' ? { scale: 1.02 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <label className="text-small font-medium" style={{ color: '#091A7A' }}>비밀번호</label>
            <div className="relative">
              <motion.div
                animate={focusedField === 'password' ? { scale: 1.1, color: '#ADC8FF' } : { scale: 1, color: '#6B7280' }}
                transition={{ duration: 0.2 }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
              >
                <Lock size={20} />
              </motion.div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onKeyPress={handleKeyPress}
                className="w-full h-14 bg-card-glass border border-white/30 rounded-[20px] pl-12 pr-12 text-body placeholder-gray-400 backdrop-blur-lg shadow-card focus:outline-none focus:ring-2 focus:ring-[#ADC8FF]/50 focus:border-[#ADC8FF]/50 animate-touch min-h-[44px] transition-all duration-200"
                style={{ fontSize: '14px', fontFamily: 'Lexend, sans-serif' }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 animate-touch min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] transition-colors duration-200"
              >
                <motion.div
                  animate={{ rotate: showPassword ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </motion.div>
              </motion.button>
            </div>
          </motion.div>

          {/* Login Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={!isFormValid || isLoading}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className={`w-full h-16 rounded-[24px] font-semibold shadow-elevated animate-touch min-h-[44px] mt-8 relative overflow-hidden transition-all duration-300 flex items-center justify-center ${
              isFormValid && !isLoading
                ? 'bg-gradient-to-r from-[#091A7A] via-[#4A5FC4] to-[#091A7A] text-white hover:shadow-2xl'
                : 'bg-gradient-to-r from-gray-300 to-gray-200 text-gray-500'
            }`}
            style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'Lexend, sans-serif' }}
          >
            {/* Animated Background Shine */}
            {isFormValid && !isLoading && (
              <>
                <motion.div
                  animate={{
                    x: ['-120%', '120%']
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                />
                
                {/* Subtle Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#ADC8FF]/20 via-transparent to-[#ADC8FF]/20 rounded-[24px]" />
              </>
            )}
            
            {/* Button Content */}
            <div className="relative z-10 flex items-center justify-center">
              {isLoading ? (
                <div className="flex items-center justify-center space-x-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>로그인 중...</span>
                </div>
              ) : (
                <span>로그인</span>
              )}
            </div>
          </motion.button>

          {/* Back to Student Mode (Only in Admin Mode) */}
          {isAdminMode && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAdminMode(false)}
              className="w-full py-3 text-center text-sm text-gray-500 underline"
            >
              학생 로그인으로 돌아가기
            </motion.button>
          )}

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-center mt-8 p-4 bg-gradient-to-r from-[#ADC8FF]/10 to-[#091A7A]/5 rounded-[16px] border border-white/20"
          >
            <p className="text-xs text-gray-600">
              {isAdminMode ? (
                <>관리자 전용 로그인</>
              ) : (
                <>학생코드는 천개의 바람 영어학원에서 받으세요</>
              )}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}