import { projectId, publicAnonKey } from './supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61`;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  studentCode: string;
  role: 'student' | 'admin';
  points: number;
  totalXP: number;
  currentVolume: number;
  currentDay: number;
  streakDays: number;
  avatarUrl?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

class AuthService {
  private session: AuthSession | null = null;
  private listeners: ((session: AuthSession | null) => void)[] = [];
  private refreshTimer: number | null = null;

  constructor() {
    // Try to restore session from localStorage
    this.restoreSession();
    // Start auto-refresh timer
    this.startAutoRefresh();
  }

  restoreSession() {
    try {
      const stored = localStorage.getItem('godslife_session');
      if (stored) {
        this.session = JSON.parse(stored);
        // 세션 만료 확인
        if (this.session && this.session.expiresAt < Date.now()) {
          console.log('⚠️ Session expired, clearing...');
          this.saveSession(null);
          return;
        }
        console.log('✅ Session restored:', this.session?.user?.name);
        this.notifyListeners();
      } else {
        console.log('ℹ️ No stored session found');
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      this.saveSession(null);
    }
  }

  private saveSession(session: AuthSession | null) {
    this.session = session;
    if (session) {
      localStorage.setItem('godslife_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('godslife_session');
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.session));
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    this.listeners.push(callback);
    // Immediately call with current session
    callback(this.session);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signUp(email: string, password: string, name: string, studentCode: string) {
    try {
      const response = await fetch(`${SERVER_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name, studentCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      const response = await fetch(`${SERVER_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed');
      }

      const session: AuthSession = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at * 1000, // Convert seconds to milliseconds  
        user: {
          id: data.profile.id,
          email: data.profile.email,
          name: data.profile.name,
          studentCode: data.profile.student_code,
          role: data.profile.role,
          points: data.profile.points,
          totalXP: data.profile.total_xp,
          currentVolume: data.profile.current_volume,
          currentDay: data.profile.current_day,
          streakDays: data.profile.streak_days,
          avatarUrl: data.profile.avatar_url
        }
      };

      this.saveSession(session);
      return { success: true, session };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      if (this.session) {
        await fetch(`${SERVER_URL}/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.accessToken}`
          }
        });
      }

      this.saveSession(null);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local session even if server call fails
      this.saveSession(null);
      throw error;
    }
  }

  async checkSession() {
    try {
      if (!this.session) {
        return null;
      }

      // 세션이 있으면 항상 유지 (로그아웃 버튼 누르기 전까지)
      console.log('✅ Session exists, keeping it active');

      // 선택적으로 서버에서 프로필 업데이트 시도
      try {
        const response = await fetch(`${SERVER_URL}/auth/session`, {
          headers: {
            'Authorization': `Bearer ${this.session.accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();

          // 프로필 정보만 업데이트 (토큰은 유지)
          const updatedSession: AuthSession = {
            accessToken: this.session.accessToken,
            refreshToken: this.session.refreshToken,
            expiresAt: this.session.expiresAt,
            user: {
              id: data.profile.id,
              email: data.profile.email,
              name: data.profile.name,
              studentCode: data.profile.student_code,
              role: data.profile.role,
              points: data.profile.points,
              totalXP: data.profile.total_xp,
              currentVolume: data.profile.current_volume,
              currentDay: data.profile.current_day,
              streakDays: data.profile.streak_days,
              avatarUrl: data.profile.avatar_url
            }
          };

          this.saveSession(updatedSession);
          return updatedSession;
        }
      } catch (profileError) {
        console.log('⚠️ Profile update failed, keeping existing session');
      }

      // 항상 기존 세션 반환 (에러나 실패와 관계없이)
      return this.session;
    } catch (error) {
      console.error('Session check error:', error);
      // 어떤 에러가 발생해도 기존 세션 유지
      console.log('✅ Error occurred, but keeping existing session');
      return this.session;
    }
  }

  private startAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const refreshSession = async () => {
      if (!this.session) return;

      const timeUntilExpiry = this.session.expiresAt - Date.now();

      // 만료 1시간 전이면 로컬에서 조용히 연장 (서버 호출 X)
      if (timeUntilExpiry < 3600000) { // 1시간 = 3,600,000ms
        console.log('🔄 Extending session locally (no server call)');

        const extendedSession: AuthSession = {
          ...this.session,
          expiresAt: Date.now() + 86400000 // 24시간
        };
        this.saveSession(extendedSession);
        console.log('✅ Session extended locally');
      }

      // 5분마다 체크
      if (this.session) {
        this.refreshTimer = setTimeout(refreshSession, 300000); // 5분
      }
    };

    refreshSession();
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  getUser(): AuthUser | null {
    return this.session?.user || null;
  }

  getAccessToken(): string | null {
    return this.session?.accessToken || null;
  }

  isAuthenticated(): boolean {
    return !!this.session;
  }

  isAdmin(): boolean {
    return this.session?.user.role === 'admin';
  }
}

export const authService = new AuthService();