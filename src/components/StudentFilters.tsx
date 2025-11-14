import { motion } from 'motion/react';

interface StudentFiltersProps {
  grades: string[];
  schools: string[];
  classes: string[];
  instructors: string[];
  selectedGrade: string;
  selectedSchool: string;
  selectedClass: string;
  selectedInstructor: string;
  onGradeChange: (grade: string) => void;
  onSchoolChange: (school: string) => void;
  onClassChange: (cls: string) => void;
  onInstructorChange: (instructor: string) => void;
  onReset: () => void;
}

export function StudentFilters({
  grades,
  schools,
  classes,
  instructors,
  selectedGrade,
  selectedSchool,
  selectedClass,
  selectedInstructor,
  onGradeChange,
  onSchoolChange,
  onClassChange,
  onInstructorChange,
  onReset
}: StudentFiltersProps) {
  const hasActiveFilters = selectedGrade !== '전체' || selectedSchool !== '전체' || 
                          selectedClass !== '전체' || selectedInstructor !== '전체';

  return (
    <div className="flex gap-2">
      {/* Grade Filter */}
      <select
        value={selectedGrade}
        onChange={(e) => onGradeChange(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all bg-white"
      >
        {grades.map(grade => (
          <option key={grade} value={grade}>
            {grade === '전체' ? '📚 학년: 전체' : `📚 ${grade}`}
          </option>
        ))}
      </select>
      
      {/* School Filter */}
      <select
        value={selectedSchool}
        onChange={(e) => onSchoolChange(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all bg-white"
      >
        {schools.map(school => (
          <option key={school} value={school}>
            {school === '전체' ? '🏫 학교: 전체' : `🏫 ${school}`}
          </option>
        ))}
      </select>
      
      {/* Class Filter */}
      <select
        value={selectedClass}
        onChange={(e) => onClassChange(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all bg-white"
      >
        {classes.map(cls => (
          <option key={cls} value={cls}>
            {cls === '전체' ? '📂 반: 전체' : `📂 ${cls}`}
          </option>
        ))}
      </select>
      
      {/* Instructor Filter */}
      <select
        value={selectedInstructor}
        onChange={(e) => onInstructorChange(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all bg-white"
      >
        {instructors.map(instructor => (
          <option key={instructor} value={instructor}>
            {instructor === '전체' ? '👨‍🏫 강사: 전체' : `👨‍🏫 ${instructor}`}
          </option>
        ))}
      </select>
      
      {/* Reset Filters */}
      {hasActiveFilters && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          초기화
        </motion.button>
      )}
    </div>
  );
}
