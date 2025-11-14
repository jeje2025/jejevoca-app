// 갓생보카 데이터 타입 정의

// 단어 정보
export interface Word {
  id: number;                    // 001-3840
  word: string;                  // "prohibit"
  meaning: string;               // "금지하다"
  meaningDetail: string;         // "권위나 규칙으로 어떤 행동을 못하게 '딱' 막아버림"
  pronunciation: string;         // "[prəˈhɪbɪt]"
  pronunciationKor: string;      // "(프러히빗)"
  derivatives: {
    word: string;                // "prohibition"
    type: string;                // "n."
    meaning: string;             // "금지, 금지령"
  }[];
  example: string;               // "우리 학교는 교내에서..."
  story: string;                 // "이 단어, 알고 보면..."
  englishDefinition: string;     // "to formally forbid by law or rule"
  confusables: {
    word: string;                // "inhibit"
    meaning: string;             // "억제하다"
    difference: string;          // "prohibit은 외부 규칙이 막는 거..."
  }[];
  synonyms: string[];            // ["forbid", "ban", "outlaw"]
  antonyms: string[];            // ["permit", "allow", "authorize"]
  bookNumber: number;            // 1-8 (교재 번호)
  dayNumber: number;             // 학습 일차
  audioUrl?: string;             // 발음 오디오 URL (선택)
}

// 교재 정보
export interface Book {
  id: number;                    // 1-8
  title: string;                 // "갓생보카 1권"
  subtitle: string;              // "001-480 단어"
  wordRange: {
    start: number;               // 1
    end: number;                 // 480
  };
  month: number;                 // 1-8 (몇 개월차)
  totalWords: number;            // 480
  color: string;                 // 테마 컬러
  coverImage?: string;           // 교재 표지 이미지
}

// 학습 스케줄 (월/화/목/금)
export interface StudySchedule {
  bookNumber: number;            // 1-8
  weekNumber: number;            // 1-4 (월별 주차)
  day: 'monday' | 'tuesday' | 'thursday' | 'friday';
  wordIds: number[];             // 해당 날짜에 학습할 단어 ID (30개)
  date?: Date;                   // 실제 학습 예정일
}

// 사용자 단어 학습 진도
export interface UserWordProgress {
  userId: string;
  wordId: number;
  status: 'new' | 'learning' | 'reviewing' | 'mastered';
  correctCount: number;          // 정답 횟수
  wrongCount: number;            // 오답 횟수
  accuracy: number;              // 정확도 (%)
  lastStudiedDate?: Date;        // 마지막 학습일
  nextReviewDate?: Date;         // 다음 복습일 (간격 반복)
  masteryLevel: number;          // 0-100 숙련도
  bookmarked: boolean;           // 북마크 여부
  studyCount: number;            // 학습 횟수
  firstLearnedDate?: Date;       // 처음 학습한 날짜
}

// 사용자 교재 진도
export interface UserBookProgress {
  userId: string;
  bookNumber: number;
  totalWords: number;            // 480
  learnedWords: number;          // 학습한 단어 수
  masteredWords: number;         // 암기 완료 단어 수
  currentDay: number;            // 현재 학습 중인 일차
  progress: number;              // 0-100 진행률
  startedDate?: Date;            // 시작일
  completedDate?: Date;          // 완료일
}

// 일일 학습 기록
export interface DailyStudyRecord {
  userId: string;
  date: Date;
  bookNumber: number;
  dayNumber: number;
  wordsStudied: number;          // 학습한 단어 수
  wordsReviewed: number;         // 복습한 단어 수
  testsCompleted: number;        // 완료한 테스트 수
  accuracy: number;              // 평균 정확도
  studyTimeMinutes: number;      // 학습 시간 (분)
  xpGained: number;              // 획득한 XP
}

// 학습 통계
export interface StudyStatistics {
  userId: string;
  totalWordsLearned: number;
  totalWordsMastered: number;
  currentStreak: number;         // 연속 학습일
  longestStreak: number;         // 최장 연속 학습일
  totalStudyDays: number;        // 총 학습 일수
  totalXP: number;
  currentLevel: number;
  averageAccuracy: number;       // 평균 정확도
  totalTestsCompleted: number;
  totalStudyTimeMinutes: number;
}

// 테스트 결과
export interface TestResult {
  userId: string;
  testId: string;
  testType: 'meaning' | 'spelling' | 'example' | 'mixed';
  bookNumber: number;
  wordIds: number[];
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  completionTime: number;        // 초 단위
  xpGained: number;
  date: Date;
}

// 복습 큐 (간격 반복 시스템)
export interface ReviewQueue {
  userId: string;
  wordId: number;
  reviewType: 'daily' | 'weekly' | 'monthly';
  scheduledDate: Date;
  priority: number;              // 1-5 (높을수록 우선순위 높음)
  missedReviews: number;         // 놓친 복습 횟수
}

// 8개월 커리큘럼 설정
export const CURRICULUM_CONFIG = {
  totalBooks: 8,
  totalWords: 3840,
  wordsPerBook: 480,
  wordsPerDay: 30,
  studyDaysPerWeek: 4,           // 월, 화, 목, 금
  daysPerMonth: 16,              // 4주 * 4일
  months: 8,
} as const;

// 학습 요일
export const STUDY_DAYS = ['monday', 'tuesday', 'thursday', 'friday'] as const;
export type StudyDay = typeof STUDY_DAYS[number];

// 테스트 타입
export const TEST_TYPES = {
  meaning: { name: '뜻 맞추기', description: '영어 단어를 보고 한글 뜻 고르기' },
  spelling: { name: '스펠링', description: '한글 뜻을 보고 영어 단어 입력하기' },
  example: { name: '예문 완성', description: '예문의 빈칸에 알맞은 단어 넣기' },
  mixed: { name: '종합 테스트', description: '모든 유형의 문제가 섞인 테스트' },
} as const;

export type TestType = keyof typeof TEST_TYPES;
