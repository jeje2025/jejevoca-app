import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Search, Phone, School, GraduationCap, UserCircle, Edit, Users } from 'lucide-react';
import { Student } from '../types/student';
import { StudentFilters } from '../StudentFilters';
import { NoteModal } from '../NoteModal';
import { motion } from 'motion/react';

interface StudentDBTabProps {
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

export function StudentDBTab({ 
  students, 
  setStudents,
  handleCreateStudent,
  handleUpdateStudent,
  handleDeleteStudent 
}: StudentDBTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('전체');
  const [filterSchool, setFilterSchool] = useState('전체');
  const [filterClass, setFilterClass] = useState('전체');
  const [filterInstructor, setFilterInstructor] = useState('전체');
  
  const [noteModal, setNoteModal] = useState<{ isOpen: boolean; studentId: string; studentName: string; note: string }>({
    isOpen: false,
    studentId: '',
    studentName: '',
    note: ''
  });

  // Get unique values for filters
  const uniqueGrades = ['전체', ...Array.from(new Set(students.map(s => s.grade).filter(Boolean)))];
  const uniqueSchools = ['전체', ...Array.from(new Set(students.map(s => s.school).filter(Boolean)))];
  const uniqueClasses = ['전체', ...Array.from(new Set(students.map(s => s.class).filter(Boolean)))];
  const uniqueInstructors = ['전체', ...Array.from(new Set(students.map(s => s.instructor).filter(Boolean)))];

  const handleUpdateStudentDB = (studentId: string, field: keyof Student, value: string) => {
    setStudents(students.map(s =>
      s.id === studentId ? { ...s, [field]: value } : s
    ));
  };

  // Apply filters
  const filteredStudentsDB = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const matchesGrade = filterGrade === '전체' || s.grade === filterGrade;
    const matchesSchool = filterSchool === '전체' || s.school === filterSchool;
    const matchesClass = filterClass === '전체' || s.class === filterClass;
    const matchesInstructor = filterInstructor === '전체' || s.instructor === filterInstructor;
    
    return matchesSearch && matchesGrade && matchesSchool && matchesClass && matchesInstructor;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all"
          />
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

      {/* Compact Notion-style Table */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-20">
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="w-3.5 h-3.5" />
                    이름
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-16">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    학년
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-32">
                  <div className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5" />
                    학교
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-16">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    반
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-20">
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="w-3.5 h-3.5" />
                    강사
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-28">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    학생 연락처
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-20">
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="w-3.5 h-3.5" />
                    부모님
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-28">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    부모님 연락처
                  </div>
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-16">
                  <div className="flex items-center justify-center gap-1.5">
                    <Edit className="w-3.5 h-3.5" />
                    비고
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudentsDB.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Name */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-[#091A7A] to-[#ADC8FF] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {student.name[0]}
                      </div>
                      <span className="text-gray-900 font-medium">{student.name}</span>
                    </div>
                  </td>
                  
                  {/* Grade */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.grade || ''}
                      onChange={(e) => handleUpdateStudentDB(student.id, 'grade', e.target.value)}
                      placeholder="학년"
                      className="w-full px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all text-gray-700"
                    />
                  </td>
                  
                  {/* School */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.school || ''}
                      onChange={(e) => handleUpdateStudentDB(student.id, 'school', e.target.value)}
                      placeholder="학교명"
                      className="w-full px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all text-gray-700"
                    />
                  </td>
                  
                  {/* Class */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.class || ''}
                      onChange={(e) => handleUpdateStudentDB(student.id, 'class', e.target.value)}
                      placeholder="반"
                      className="w-full px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all text-gray-700"
                    />
                  </td>
                  
                  {/* Instructor */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.instructor || ''}
                      onChange={(e) => handleUpdateStudentDB(student.id, 'instructor', e.target.value)}
                      placeholder="강사"
                      className="w-full px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all text-gray-700"
                    />
                  </td>
                  
                  {/* Student Phone */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.studentPhone || ''}
                      onChange={(e) => handleUpdateStudentDB(student.id, 'studentPhone', e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all text-gray-700"
                    />
                  </td>
                  
                  {/* Parent Name */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.parentName || ''}
                      onChange={(e) => handleUpdateStudentDB(student.id, 'parentName', e.target.value)}
                      placeholder="성함"
                      className="w-full px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all text-gray-700"
                    />
                  </td>
                  
                  {/* Parent Phone */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.parentPhone || ''}
                      onChange={(e) => handleUpdateStudentDB(student.id, 'parentPhone', e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all text-gray-700"
                    />
                  </td>
                  
                  {/* Notes */}
                  <td className="px-3 py-2 text-center">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setNoteModal({
                          isOpen: true,
                          studentId: student.id,
                          studentName: student.name,
                          note: student.notes || ''
                        });
                      }}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        student.notes 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {student.notes ? '메모' : '입력'}
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compact Summary */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          총 {filteredStudentsDB.length}명의 학생 정보
        </div>
        {(filterGrade !== '전체' || filterSchool !== '전체' || filterClass !== '전체' || filterInstructor !== '전체') && (
          <div className="text-xs text-[#091A7A] font-medium">
            필터 적용 중
          </div>
        )}
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        <NoteModal
          isOpen={noteModal.isOpen}
          studentName={noteModal.studentName}
          note={noteModal.note}
          onNoteChange={(note) => setNoteModal({ ...noteModal, note })}
          onSave={() => {
            handleUpdateStudentDB(noteModal.studentId, 'notes', noteModal.note);
            setNoteModal({ ...noteModal, isOpen: false });
          }}
          onClose={() => setNoteModal({ ...noteModal, isOpen: false })}
        />
      </AnimatePresence>
    </div>
  );
}