import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Search, UserPlus, Upload, Power, Lock, Trash2 } from 'lucide-react';
import { Student } from '../types/student';
import { StudentFilters } from '../StudentFilters';

interface StudentManagementTabProps {
  students: Student[];
  setStudents: (students: Student[]) => void;
  handleCreateStudent: (studentData: {
    name: string;
    password: string;
    studentCode: string;
    email: string;
  }) => Promise<void>;
  handleUpdateStudent: (studentId: string, updates: Partial<Student>) => Promise<void>;
  handleDeleteStudent: (studentId: string) => Promise<void>;
}

export function StudentManagementTab({ 
  students, 
  setStudents, 
  handleCreateStudent,
  handleUpdateStudent,
  handleDeleteStudent
}: StudentManagementTabProps) {
  const [selectedBook, setSelectedBook] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [bulkStudentData, setBulkStudentData] = useState('');

  // Filters
  const [filterGrade, setFilterGrade] = useState('전체');
  const [filterSchool, setFilterSchool] = useState('전체');
  const [filterClass, setFilterClass] = useState('전체');
  const [filterInstructor, setFilterInstructor] = useState('전체');

  // Get unique values for filters
  const uniqueGrades = ['전체', ...Array.from(new Set(students.map(s => s.grade).filter(Boolean)))];
  const uniqueSchools = ['전체', ...Array.from(new Set(students.map(s => s.school).filter(Boolean)))];
  const uniqueClasses = ['전체', ...Array.from(new Set(students.map(s => s.class).filter(Boolean)))];
  const uniqueInstructors = ['전체', ...Array.from(new Set(students.map(s => s.instructor).filter(Boolean)))];

  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentId.trim() || !newStudentPassword.trim()) {
      alert('이름, 아이디, 비밀번호를 모두 입력해주세요.');
      return;
    }

    // 아이디 형식 검증 (영문, 숫자만 허용)
    const studentIdRegex = /^[a-zA-Z0-9]+$/;
    if (!studentIdRegex.test(newStudentId.trim())) {
      alert('아이디는 영문과 숫자만 사용할 수 있습니다.');
      return;
    }

    if (newStudentPassword.length !== 8) {
      alert('비밀번호는 정확히 8자리여야 합니다.');
      return;
    }

    try {
      // 학생 아이디를 studentCode로 사용 (로그인 시 아이디로 로그인)
      const studentCode = newStudentId.trim();
      const email = `${studentCode}@student.godslifevoca.com`;

      await handleCreateStudent({
        name: newStudentName,
        password: newStudentPassword,
        studentCode,
        email
      });

      setNewStudentName('');
      setNewStudentId('');
      setNewStudentPassword('');
      setShowAddStudent(false);
      alert(`학생이 성공적으로 등록되었습니다!\n\n이름: ${newStudentName}\n아이디: ${studentCode}\n비밀번호: ${newStudentPassword}\n\n로그인 시 아이디와 비밀번호를 입력하세요.`);
    } catch (error) {
      console.error('Error adding student:', error);
      alert(`학생 등록 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const handleBulkAddStudents = async () => {
    if (!bulkStudentData.trim()) {
      alert('학생 데이터를 입력해주세요.');
      return;
    }

    const lines = bulkStudentData.trim().split('\n');
    const errors: string[] = [];
    let successCount = 0;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const parts = line.split(',').map(p => p.trim());

      if (parts.length !== 3) {
        errors.push(`줄 ${index + 1}: 형식 오류 (이름, 아이디, 비밀번호 필요)`);
        continue;
      }

      const [name, studentId, password] = parts;
      if (!name || !studentId || !password) {
        errors.push(`줄 ${index + 1}: 이름, 아이디 또는 비밀번호 누락`);
        continue;
      }

      // 아이디 형식 검증 (영문, 숫자만 허용)
      const studentIdRegex = /^[a-zA-Z0-9]+$/;
      if (!studentIdRegex.test(studentId.trim())) {
        errors.push(`줄 ${index + 1}: 아이디는 영문과 숫자만 사용할 수 있습니다 (${name})`);
        continue;
      }

      if (password.length !== 8) {
        errors.push(`줄 ${index + 1}: 비밀번호는 8자리여야 합니다 (${name})`);
        continue;
      }

      try {
        // 학생 아이디를 studentCode로 사용
        const studentCode = studentId.trim();
        const email = `${studentCode}@student.godslifevoca.com`;

        await handleCreateStudent({
          name,
          password,
          studentCode,
          email
        });

        successCount++;
      } catch (error) {
        errors.push(`줄 ${index + 1}: ${name} - ${error instanceof Error ? error.message : '등록 실패'}`);
      }
    }

    if (errors.length > 0) {
      alert(`일괄 등록 완료\n\n성공: ${successCount}명\n실패: ${errors.length}명\n\n오류:\n${errors.join('\n')}`);
    } else {
      alert(`${successCount}명의 학생이 성공적으로 등록되었습니다.`);
    }

    setBulkStudentData('');
    setShowAddStudent(false);
  };

  const handleToggleStudentStatus = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const newStatus = !student.isActive;
    const message = newStatus 
      ? `${student.name} 학생을 활성화하시겠습니까?`
      : `${student.name} 학생을 비활성화하시겠습니까?`;
    
    if (confirm(message)) {
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, isActive: newStatus } : s
      ));
    }
  };

  const handleLocalDeleteStudent = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    if (confirm(`정말 ${student.name} 학생을 삭제하시겠습니까?`)) {
      try {
        await handleDeleteStudent(studentId);
      } catch (error) {
        alert('학생 삭제에 실패했습니다.');
        console.error(error);
      }
    }
  };

  const handleUpdateProgress = (studentId: string, day: number, value: number) => {
    setStudents(students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          progress: {
            ...s.progress,
            [selectedBook]: {
              ...s.progress[selectedBook],
              [day]: value
            }
          }
        };
      }
      return s;
    }));
  };

  const getProgressValue = (student: Student, day: number): number => {
    return student.progress[selectedBook]?.[day] || 0;
  };

  const getProgressColor = (stage: number): string => {
    if (stage === 0) return 'bg-gray-100 text-gray-400';
    if (stage === 1) return 'bg-red-100 text-red-600';
    if (stage === 2) return 'bg-orange-100 text-orange-600';
    if (stage === 3) return 'bg-yellow-100 text-yellow-700';
    if (stage === 4) return 'bg-blue-100 text-blue-600';
    if (stage === 5) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-400';
  };

  // Apply filters
  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === '전체' || s.grade === filterGrade;
    const matchesSchool = filterSchool === '전체' || s.school === filterSchool;
    const matchesClass = filterClass === '전체' || s.class === filterClass;
    const matchesInstructor = filterInstructor === '전체' || s.instructor === filterInstructor;
    
    return matchesSearch && matchesGrade && matchesSchool && matchesClass && matchesInstructor;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 mb-4">
        {/* VOL Buttons + Search + Add */}
        <div className="flex items-center gap-3">
          {/* Book Filter - Button Style */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(book => (
              <motion.button
                key={book}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBook(book)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBook === book
                    ? 'bg-[#091A7A] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                VOL. {book}
              </motion.button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search - Smaller */}
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all"
            />
          </div>

          {/* Add Student Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddStudent(true)}
            className="px-4 py-2 bg-[#091A7A] text-white rounded-lg flex items-center gap-2 hover:bg-[#1A2FB8] transition-colors text-sm whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            등록
          </motion.button>
        </div>

        {/* Filters */}
        <StudentFilters
          grades={uniqueGrades}
          schools={uniqueSchools}
          classes={uniqueClasses}
          instructors={uniqueInstructors}
          selectedGrade={filterGrade}
          selectedSchool={filterSchool}
          selectedClass={filterClass}
          selectedInstructor={filterInstructor}
          onGradeChange={setFilterGrade}
          onSchoolChange={setFilterSchool}
          onClassChange={setFilterClass}
          onInstructorChange={setFilterInstructor}
          onReset={() => {
            setFilterGrade('전체');
            setFilterSchool('전체');
            setFilterClass('전체');
            setFilterInstructor('전체');
          }}
        />
      </div>

      {/* Add Student Panel */}
      <AnimatePresence>
        {showAddStudent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200 overflow-hidden"
          >
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setAddMode('single')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  addMode === 'single'
                    ? 'bg-[#091A7A] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                개별 등록
              </button>
              <button
                onClick={() => setAddMode('bulk')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  addMode === 'bulk'
                    ? 'bg-[#091A7A] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Upload className="w-3 h-3" />
                대량 등록
              </button>
            </div>

            {addMode === 'single' ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="학생 이름"
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                  />
                  <input
                    type="text"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="아이디 (영문/숫자)"
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                  />
                  <input
                    type="text"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value.slice(0, 8))}
                    placeholder="비밀번호 8자리"
                    maxLength={8}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddStudent}
                    className="flex-1 px-4 py-2 text-sm bg-[#091A7A] text-white rounded-lg hover:bg-[#1A2FB8] transition-colors"
                  >
                    등록
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowAddStudent(false);
                      setNewStudentName('');
                      setNewStudentId('');
                      setNewStudentPassword('');
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={bulkStudentData}
                  onChange={(e) => setBulkStudentData(e.target.value)}
                  placeholder="이름, 아이디, 비밀번호 (한 줄에 한 명)&#10;김학생, kim001, 01012345&#10;이영희, lee002, 01098765"
                  className="w-full h-24 p-3 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none resize-none mb-3"
                />
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBulkAddStudents}
                    disabled={!bulkStudentData.trim()}
                    className="flex-1 px-4 py-2 text-sm bg-[#091A7A] text-white rounded-lg hover:bg-[#1A2FB8] transition-colors disabled:opacity-50"
                  >
                    등록
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowAddStudent(false);
                      setBulkStudentData('');
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 sticky left-0 z-20 w-12">상태</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 sticky left-12 z-20 w-auto">이름</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 border-r-2 border-gray-300 bg-gray-50 sticky left-[148px] z-20 w-20">Point</th>
                
                {Array.from({ length: 16 }, (_, i) => i + 1).map(day => (
                  <th key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-200 w-14">
                    Day {day}
                  </th>
                ))}
                
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-gray-50 sticky right-0 z-20 w-12 border-l-2 border-gray-300">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                >
                  <td className="px-2 py-1.5 text-center border-r border-gray-200 bg-white sticky left-0 z-10">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleToggleStudentStatus(student.id)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center ${
                        student.isActive ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      <Power className={`w-3 h-3 ${student.isActive ? 'text-green-600' : 'text-red-600'}`} />
                    </motion.button>
                  </td>
                  
                  <td className="px-3 py-1.5 border-r border-gray-200 bg-white sticky left-12 z-10">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{student.name}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{student.password}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-3 py-1.5 text-center border-r-2 border-gray-300 bg-white sticky left-[148px] z-10">
                    <div className="inline-flex items-center justify-center px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold min-w-[60px]">
                      {student.point.toLocaleString()}
                    </div>
                  </td>
                  
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(day => {
                    const progress = getProgressValue(student, day);
                    return (
                      <td key={day} className="px-2 py-1.5 text-center border-r border-gray-100">
                        <div
                          className={`inline-flex items-center justify-center w-7 h-7 rounded font-bold text-xs ${getProgressColor(progress)} cursor-pointer hover:ring-2 hover:ring-[#091A7A]/50 transition-all`}
                          onClick={() => {
                            const newValue = prompt(`${student.name} - Day ${day} (0-5):`, String(progress));
                            if (newValue !== null) {
                              const val = Math.max(0, Math.min(5, parseInt(newValue) || 0));
                              handleUpdateProgress(student.id, day, val);
                            }
                          }}
                        >
                          {progress === 0 ? '-' : progress}
                        </div>
                      </td>
                    );
                  })}
                  
                  <td className="px-2 py-1.5 text-center bg-white sticky right-0 z-10 border-l-2 border-gray-300">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleLocalDeleteStudent(student.id)}
                      className="w-6 h-6 hover:bg-red-50 rounded flex items-center justify-center mx-auto"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-3 mt-3">
        <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
          <div className="text-xs text-blue-700">총 학생</div>
          <div className="text-lg font-bold text-blue-900">{students.length}명</div>
        </div>
        <div className="flex-1 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <div className="text-xs text-green-700">활성</div>
          <div className="text-lg font-bold text-green-900">{students.filter(s => s.isActive).length}명</div>
        </div>
        <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          <div className="text-xs text-amber-700">교재</div>
          <div className="text-lg font-bold text-amber-900">VOL.{selectedBook}</div>
        </div>
      </div>
    </div>
  );
}