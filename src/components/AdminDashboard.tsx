import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { X, Users, BookOpen, Database, LogOut, UserPlus } from 'lucide-react';
import { Student } from './types/student';
import { StudentManagementTab } from './tabs/StudentManagementTab';
import { StudentDBTab } from './tabs/StudentDBTab';
import { WordDataTab } from './tabs/WordDataTab';
import { getStudents, updateStudent, deleteStudent, Student as APIStudent } from '../utils/api';
import { authService } from '../utils/auth';
import { initializeSampleStudents } from '../utils/initSampleStudents';
import { supabase } from '../utils/supabase-client';

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'studentdb' | 'words'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Load access token and students from Supabase
  useEffect(() => {
    // Get access token from authService
    const token = authService.getAccessToken();
    console.log('🔑 AdminDashboard - Access token:', token ? `${token.substring(0, 20)}...` : 'NULL');
    setAccessToken(token);
    
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 AdminDashboard - Loading students from profiles table');

      // Supabase에서 직접 profiles 테이블 조회
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        throw new Error(`프로필 조회 실패: ${profilesError.message}`);
      }

      console.log('✅ Loaded profiles:', profilesData?.length || 0);

      // Convert profiles to local Student format
      const convertedStudents: Student[] = (profilesData || []).map(p => ({
        id: p.id,
        name: p.name,
        password: p.student_code, // Display student_code as password
        point: p.points || 0,
        isActive: true,
        grade: '',
        school: '',
        studentPhone: '',
        parentName: '',
        parentPhone: '',
        class: '',
        instructor: '',
        progress: {
          1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0 }
        }
      }));

      setStudents(convertedStudents);
    } catch (err: any) {
      console.error('Error loading students:', err);
      setError('학생 데이터를 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (studentData: {
    name: string;
    password: string;
    studentCode: string;
    email: string;
  }) => {
    try {
      console.log('🎓 Creating student:', {
        name: studentData.name,
        email: studentData.email,
        studentCode: studentData.studentCode
      });

      // 0. 중복 아이디 체크
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('student_code')
        .eq('student_code', studentData.studentCode);

      if (checkError) {
        console.error('❌ Error checking duplicate studentCode:', checkError);
        throw new Error('아이디 중복 확인 중 오류가 발생했습니다.');
      }

      if (existingProfiles && existingProfiles.length > 0) {
        throw new Error(`이미 존재하는 아이디입니다: ${studentData.studentCode}`);
      }

      // 1. Supabase Auth에 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: studentData.email,
        password: studentData.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            name: studentData.name,
            student_code: studentData.studentCode,
            role: 'student'
          }
        }
      });

      console.log('🔍 Auth signup response:', { data: authData, error: authError });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        throw new Error(`계정 생성 실패: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('사용자 생성에 실패했습니다.');
      }

      console.log('✅ Auth user created:', authData.user.id);

      // 2. profiles 테이블에 프로필 생성 (트리거로 자동 생성되거나 수동으로 생성)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: studentData.name,
          student_code: studentData.studentCode,
          role: 'student',
          points: 0,
          total_xp: 0,
          streak_days: 0
        });

      if (profileError) {
        console.error('⚠️ Profile creation warning:', profileError);
        // 프로필 생성 실패는 경고만 표시 (트리거가 있을 수 있음)
      } else {
        console.log('✅ Profile created');
      }

      // Reload students
      await loadStudents();

      console.log('✅ Student registration complete');
    } catch (err) {
      console.error('Error creating student:', err);
      throw err;
    }
  };

  const handleUpdateStudent = async (studentId: string, updates: Partial<Student>) => {
    try {
      const token = authService.getAccessToken();
      if (!token) throw new Error('인증 토큰이 없습니다.');

      // Convert local Student format to API format
      const apiUpdates: Partial<APIStudent> = {};
      if (updates.name) apiUpdates.name = updates.name;
      if (updates.point !== undefined) apiUpdates.points = updates.point;
      
      await updateStudent(token, studentId, apiUpdates);
      
      // Reload students
      await loadStudents();
    } catch (err) {
      console.error('Error updating student:', err);
      throw err;
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      console.log('🗑️ Deleting student:', studentId);

      // 1. profiles 테이블에서 삭제
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', studentId);

      if (profileError) {
        console.error('❌ Profile deletion error:', profileError);
        throw new Error(`프로필 삭제 실패: ${profileError.message}`);
      }

      console.log('✅ Profile deleted');

      // 2. Auth user는 관리자만 삭제 가능 (Supabase Admin API 필요)
      // 일반적으로 RLS 정책으로 인해 클라이언트에서 직접 삭제 불가
      // profiles만 삭제하고 auth.users는 Supabase 대시보드나 백엔드에서 처리

      console.log('⚠️ Note: Auth user must be deleted from Supabase Dashboard or Admin API');

      // Reload students
      await loadStudents();

      console.log('✅ Student deletion complete');
    } catch (err) {
      console.error('Error deleting student:', err);
      throw err;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'students': return '학생 관리';
      case 'studentdb': return '학생 DB';
      case 'words': return '단어 데이터 관리';
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 flex">
      {/* Left Sidebar - Tabs */}
      <div className="w-64 bg-gradient-to-b from-[#091A7A] to-[#1A2FB8] text-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <h2 className="text-xl font-bold">관리자 대시보드</h2>
          <p className="text-sm text-white/80 mt-1">갓생보카 관리</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'students'
                ? 'bg-white text-[#091A7A] shadow-lg'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">학생 관리</span>
          </button>
          
          <button
            onClick={() => setActiveTab('studentdb')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'studentdb'
                ? 'bg-white text-[#091A7A] shadow-lg'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">학생 DB 관리</span>
          </button>
          
          <button
            onClick={() => setActiveTab('words')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'words'
                ? 'bg-white text-[#091A7A] shadow-lg'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">단어 데이터</span>
          </button>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/20">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">나가기</span>
          </motion.button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{getTabTitle()}</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'students' && (
            <StudentManagementTab students={students} setStudents={setStudents} handleCreateStudent={handleCreateStudent} handleUpdateStudent={handleUpdateStudent} handleDeleteStudent={handleDeleteStudent} />
          )}
          
          {activeTab === 'studentdb' && (
            <StudentDBTab students={students} setStudents={setStudents} handleCreateStudent={handleCreateStudent} handleUpdateStudent={handleUpdateStudent} handleDeleteStudent={handleDeleteStudent} />
          )}
          
          {activeTab === 'words' && (
            <WordDataTab accessToken={accessToken || undefined} />
          )}
        </div>
      </div>
    </div>
  );
}