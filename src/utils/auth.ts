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

  private restoreSession() {
    try {
      const stored = localStorage.getItem('godslife_session');
      if (stored) {
        this.session = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error restoring session:', error);
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

      const response = await fetch(`${SERVER_URL}/auth/session`, {
        headers: {
          'Authorization': `Bearer ${this.session.accessToken}`
        }
      });

      if (!response.ok) {
        // 토큰 만료 시 세션 유지 - 새로고침 안 함
        console.log('Session check failed, keeping existing session');
        return this.session;
      }

      const data = await response.json();
      
      const session: AuthSession = {
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

      this.saveSession(session);
      return session;
    } catch (error) {
      console.error('Session check error:', error);
      // 에러 시에도 기존 세션 유지 - 새로고침 안 함
      console.log('Session check error, keeping existing session');
      return this.session;
    }
  }

  private startAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const refreshSession = async () => {
      if (this.session && this.session.expiresAt - Date.now() < 60000) {
        try {
          console.log('🔄 Starting token refresh...');
          console.log('🔑 Refresh token:', this.session.refreshToken.substring(0, 20) + '...');
          
          const response = await fetch(`${SERVER_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.session.refreshToken}`
            }
          });

          console.log('📡 Refresh response status:', response.status);
          console.log('📡 Refresh response ok?:', response.ok);
          
          let data;
          try {
            data = await response.json();
            console.log('📦 Refresh response data:', JSON.stringify(data, null, 2));
          } catch (parseError) {
            console.error('❌ Failed to parse response JSON:', parseError);
            throw new Error('Invalid response from server');
          }

          if (!response.ok) {
            console.error('❌ Refresh failed with error:', data.error || 'No error message');
            console.error('❌ Full error response:', data);
            throw new Error(data.error || `Refresh failed with status ${response.status}`);
          }

          console.log('✅ Building new session from refresh data...');
          console.log('✅ Profile data:', data.profile);
          console.log('✅ Session data:', data.session);
          
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
          console.log('✅ Token refresh successful!');
        } catch (error) {
          console.error('❌ Refresh error:', error);
          console.error('❌ Error details:', error instanceof Error ? error.message : error);
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'N/A');
          // Refresh 실패 시 세션 유지 - 새로고침 안 함
          console.log('⚠️ Refresh error, keeping existing session');
        }
      } else {
        console.log('⏭️ Token still valid, skipping refresh');
      }

      // 다음 refresh를 위해 타이머 재설정
      this.refreshTimer = setTimeout(refreshSession, 50000);
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