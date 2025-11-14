// 갓생보카 샘플 데이터 및 유틸리티 함수

import { Word, Book, CURRICULUM_CONFIG } from '../types/vocabulary';

// 교재 8권 정보
export const BOOKS: Book[] = [
  {
    id: 1,
    title: '갓생보카 1권',
    subtitle: '001-480 단어',
    wordRange: { start: 1, end: 480 },
    month: 1,
    totalWords: 480,
    color: '#FF6B6B', // 빨강
  },
  {
    id: 2,
    title: '갓생보카 2권',
    subtitle: '481-960 단어',
    wordRange: { start: 481, end: 960 },
    month: 2,
    totalWords: 480,
    color: '#4ECDC4', // 청록
  },
  {
    id: 3,
    title: '갓생보카 3권',
    subtitle: '961-1440 단어',
    wordRange: { start: 961, end: 1440 },
    month: 3,
    totalWords: 480,
    color: '#45B7D1', // 파랑
  },
  {
    id: 4,
    title: '갓생보카 4권',
    subtitle: '1441-1920 단어',
    wordRange: { start: 1441, end: 1920 },
    month: 4,
    totalWords: 480,
    color: '#96CEB4', // 초록
  },
  {
    id: 5,
    title: '갓생보카 5권',
    subtitle: '1921-2400 단어',
    wordRange: { start: 1921, end: 2400 },
    month: 5,
    totalWords: 480,
    color: '#FFEAA7', // 노랑
  },
  {
    id: 6,
    title: '갓생보카 6권',
    subtitle: '2401-2880 단어',
    wordRange: { start: 2401, end: 2880 },
    month: 6,
    totalWords: 480,
    color: '#DFE6E9', // 회색
  },
  {
    id: 7,
    title: '갓생보카 7권',
    subtitle: '2881-3360 단어',
    wordRange: { start: 2881, end: 3360 },
    month: 7,
    totalWords: 480,
    color: '#A29BFE', // 보라
  },
  {
    id: 8,
    title: '갓생보카 8권',
    subtitle: '3361-3840 단어',
    wordRange: { start: 3361, end: 3840 },
    month: 8,
    totalWords: 480,
    color: '#FD79A8', // 핑크
  },
];

// 샘플 단어 데이터 (실제로는 Supabase에서 가져올 것)
export const SAMPLE_WORDS: Word[] = [
  {
    id: 1,
    word: 'prohibit',
    meaning: '금지하다',
    meaningDetail: '권위나 규칙으로 어떤 행동을 못하게 \'딱\' 막아버림',
    pronunciation: '[prəˈhɪbɪt]',
    pronunciationKor: '(프러히빗)',
    derivatives: [
      { word: 'prohibition', type: 'n.', meaning: '금지, 금지령' },
      { word: 'prohibited', type: 'a.', meaning: '금지된, 금지되는' },
      { word: 'prohibitive', type: 'a.', meaning: '(가격이) 엄두도 못 낼 정도의' },
    ],
    example: '우리 학교는 교내에서 스마트폰 사용을 엄격히 prohibit한다.',
    story: '이 단어, 알고 보면 그림이 그려지는 되게 재밌는 단어야. 라틴어에서 왔는데, \'pro-\' 는 \'앞에서(in front of)\'라는 뜻이고, \'-hibit\' 은 \'붙잡다(to hold)\'라는 뜻이거든.\n\n상상해봐. 네가 PC방에 막 들어가려고 하는데, 문 앞에서 팔짱 낀 엄마가 길을 딱 막고 서서 못 들어가게 붙잡는(-hibit) 그림! 바로 그게 prohibit의 원래 이미지야. 앞에서 대놓고 못하게 막아서는 느낌!',
    englishDefinition: 'to formally forbid by law or rule (법이나 규칙으로 공식적으로 금지하다)',
    confusables: [
      {
        word: 'inhibit',
        meaning: '억제하다',
        difference: 'prohibit은 외부 규칙이 막는 거, inhibit은 내부에서 억누르는 거',
      },
      {
        word: 'exhibit',
        meaning: '전시하다',
        difference: '밖으로(ex-) 잡아서(hibit) 보여주는 거. 같은 -hibit이지만 의미 완전 다름!',
      },
    ],
    synonyms: ['forbid', 'ban', 'outlaw'],
    antonyms: ['permit', 'allow', 'authorize'],
    bookNumber: 1,
    dayNumber: 1,
  },
  // 추가 샘플 단어들은 실제 DB에서 로드
];

// 유틸리티 함수들

/**
 * 특정 교재의 특정 날짜에 해당하는 단어 ID 범위 계산
 */
export function getWordIdsForDay(bookNumber: number, dayNumber: number): number[] {
  const startWordId = (bookNumber - 1) * CURRICULUM_CONFIG.wordsPerBook + 
                      (dayNumber - 1) * CURRICULUM_CONFIG.wordsPerDay + 1;
  const endWordId = startWordId + CURRICULUM_CONFIG.wordsPerDay - 1;
  
  const wordIds: number[] = [];
  for (let i = startWordId; i <= endWordId; i++) {
    wordIds.push(i);
  }
  
  return wordIds;
}

/**
 * 단어 ID로부터 교재 번호와 일차 계산
 */
export function getBookAndDayFromWordId(wordId: number): { bookNumber: number; dayNumber: number } {
  const bookNumber = Math.ceil(wordId / CURRICULUM_CONFIG.wordsPerBook);
  const wordIndexInBook = (wordId - 1) % CURRICULUM_CONFIG.wordsPerBook;
  const dayNumber = Math.floor(wordIndexInBook / CURRICULUM_CONFIG.wordsPerDay) + 1;
  
  return { bookNumber, dayNumber };
}

/**
 * 교재 번호의 총 학습 일수 계산
 */
export function getTotalDaysInBook(bookNumber: number): number {
  return CURRICULUM_CONFIG.wordsPerBook / CURRICULUM_CONFIG.wordsPerDay; // 16일
}

/**
 * 전체 커리큘럼의 총 학습 일수
 */
export function getTotalStudyDays(): number {
  return CURRICULUM_CONFIG.totalBooks * getTotalDaysInBook(1); // 128일
}

/**
 * 현재 진행중인 교재와 일차 추천
 */
export function getCurrentRecommendedStudy(userProgress: {
  currentBookNumber: number;
  currentDayNumber: number;
}): {
  bookNumber: number;
  dayNumber: number;
  wordIds: number[];
  isCompleted: boolean;
} {
  const { currentBookNumber, currentDayNumber } = userProgress;
  
  // 마지막 교재의 마지막 날 완료 체크
  if (currentBookNumber > CURRICULUM_CONFIG.totalBooks) {
    return {
      bookNumber: CURRICULUM_CONFIG.totalBooks,
      dayNumber: getTotalDaysInBook(CURRICULUM_CONFIG.totalBooks),
      wordIds: [],
      isCompleted: true,
    };
  }
  
  const totalDaysInBook = getTotalDaysInBook(currentBookNumber);
  
  return {
    bookNumber: currentBookNumber,
    dayNumber: Math.min(currentDayNumber, totalDaysInBook),
    wordIds: getWordIdsForDay(currentBookNumber, currentDayNumber),
    isCompleted: false,
  };
}

/**
 * XP 계산 (정확도 기반)
 */
export function calculateXP(correctAnswers: number, totalQuestions: number): number {
  const accuracy = (correctAnswers / totalQuestions) * 100;
  const baseXP = correctAnswers * 10;
  
  // 정확도 보너스
  let bonus = 0;
  if (accuracy === 100) {
    bonus = 50; // 완벽!
  } else if (accuracy >= 90) {
    bonus = 30;
  } else if (accuracy >= 80) {
    bonus = 20;
  } else if (accuracy >= 70) {
    bonus = 10;
  }
  
  return baseXP + bonus;
}

/**
 * 간격 반복 알고리즘 - 다음 복습 날짜 계산
 */
export function calculateNextReviewDate(
  currentDate: Date,
  masteryLevel: number,
  consecutiveCorrect: number
): Date {
  const nextDate = new Date(currentDate);
  
  // 숙련도와 연속 정답 횟수에 따라 간격 설정
  let daysToAdd = 1;
  
  if (masteryLevel >= 80 && consecutiveCorrect >= 5) {
    daysToAdd = 30; // 1개월
  } else if (masteryLevel >= 60 && consecutiveCorrect >= 4) {
    daysToAdd = 14; // 2주
  } else if (masteryLevel >= 40 && consecutiveCorrect >= 3) {
    daysToAdd = 7; // 1주
  } else if (masteryLevel >= 20 && consecutiveCorrect >= 2) {
    daysToAdd = 3; // 3일
  } else {
    daysToAdd = 1; // 1일
  }
  
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}

/**
 * 숙련도 계산 (정답률 기반)
 */
export function calculateMasteryLevel(correctCount: number, wrongCount: number): number {
  const totalAttempts = correctCount + wrongCount;
  if (totalAttempts === 0) return 0;
  
  const accuracy = (correctCount / totalAttempts) * 100;
  
  // 학습 횟수도 고려 (최소 5번은 해야 마스터 가능)
  const attemptFactor = Math.min(totalAttempts / 5, 1);
  
  return Math.round(accuracy * attemptFactor);
}

/**
 * 학습 상태 판단
 */
export function getWordStatus(
  masteryLevel: number,
  studyCount: number
): 'new' | 'learning' | 'reviewing' | 'mastered' {
  if (studyCount === 0) return 'new';
  if (masteryLevel >= 80 && studyCount >= 5) return 'mastered';
  if (masteryLevel >= 40) return 'reviewing';
  return 'learning';
}

/**
 * 교재별 색상 가져오기
 */
export function getBookColor(bookNumber: number): string {
  const book = BOOKS.find(b => b.id === bookNumber);
  return book?.color || '#091A7A';
}

/**
 * 진행률 계산 (%)
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
