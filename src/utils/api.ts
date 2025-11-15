import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61`;

// API 호출 헬퍼 함수
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Merge headers properly - custom headers should override defaults
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`API Error (${endpoint}):`, error);
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// ===== 단어 관련 API =====

export interface Word {
  id: number;
  word: string;
  meaning: string;
  meaningDetail: string;
  pronunciation: string;
  pronunciationKor: string;
  derivatives: Array<{
    word: string;
    type: string;
    meaning: string;
  }>;
  example: string;
  story: string;
  englishDefinition: string;
  confusables: Array<{
    word: string;
    meaning: string;
    difference: string;
  }>;
  synonyms: string[];
  antonyms: string[];
  bookNumber: number; // 1-8
  dayNumber: number; // 1-16 (16일 * 30단어 = 480단어/교재)
}

export interface WordProgress {
  userId: string;
  wordId: number;
  mastery: number; // 0-100
  lastReviewed: string; // ISO date
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewDate: string; // ISO date (간격 반복 시스템)
  interval: number; // 복습 간격 (일 단위)
}

export interface BookProgress {
  userId: string;
  bookNumber: number;
  completedWords: number;
  totalWords: number; // 480
  masteredWords: number;
  progressPercentage: number;
  lastStudied: string; // ISO date
}

export interface StudyStatistics {
  userId: string;
  totalWordsLearned: number;
  totalWordsMastered: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  totalXP: number;
  currentLevel: number;
  averageAccuracy: number;
  totalTestsCompleted: number;
  totalStudyTimeMinutes: number;
}

// 모든 단어 가져오기
export async function getAllWords(): Promise<Word[]> {
  return apiCall<Word[]>('/words');
}

// 특정 교재의 단어들 가져오기
export async function getWordsByBook(bookNumber: number): Promise<Word[]> {
  return apiCall<Word[]>(`/words/book/${bookNumber}`);
}

// 특정 단어 ID들로 단어 가져오기
export async function getWordsByIds(wordIds: number[]): Promise<Word[]> {
  return apiCall<Word[]>('/words/by-ids', {
    method: 'POST',
    body: JSON.stringify({ wordIds }),
  });
}

// 특정 단어 상세 정보
export async function getWord(wordId: number): Promise<Word> {
  return apiCall<Word>(`/words/${wordId}`);
}

// 단어 검색
export async function searchWords(query: string): Promise<Word[]> {
  return apiCall<Word[]>(`/words/search?q=${encodeURIComponent(query)}`);
}

// ===== 진도 관련 API =====

// 사용자의 단어 학습 진도 가져오기
export async function getWordProgress(
  userId: string,
  wordId: number
): Promise<WordProgress> {
  return apiCall<WordProgress>(`/progress/word/${userId}/${wordId}`);
}

// 사용자의 모든 단어 학습 진도 가져오기
export async function getAllWordProgress(userId: string): Promise<WordProgress[]> {
  return apiCall<WordProgress[]>(`/progress/words/${userId}`);
}

// 단어 학습 진도 업데이트
export async function updateWordProgress(progress: WordProgress): Promise<void> {
  await apiCall('/progress/word', {
    method: 'POST',
    body: JSON.stringify(progress),
  });
}

// 여러 단어의 학습 진도 일괄 업데이트
export async function batchUpdateWordProgress(
  progressList: WordProgress[]
): Promise<void> {
  await apiCall('/progress/words/batch', {
    method: 'POST',
    body: JSON.stringify({ progressList }),
  });
}

// 사용자의 교재 진도 가져오기
export async function getBookProgress(
  userId: string,
  bookNumber: number
): Promise<BookProgress> {
  return apiCall<BookProgress>(`/progress/book/${userId}/${bookNumber}`);
}

// 사용자의 모든 교재 진도 가져오기
export async function getAllBookProgress(userId: string): Promise<BookProgress[]> {
  return apiCall<BookProgress[]>(`/progress/books/${userId}`);
}

// 교재 진도 업데이트
export async function updateBookProgress(progress: BookProgress): Promise<void> {
  await apiCall('/progress/book', {
    method: 'POST',
    body: JSON.stringify(progress),
  });
}

// ===== 학습 기록 관련 API =====

// 일일 학습 기록 저장
export async function saveDailyStudyRecord(record: {
  userId: string;
  date: string;
  wordsStudied: number;
  wordsCompleted: number;
  xpGained: number;
  studyTimeMinutes: number;
}): Promise<void> {
  await apiCall('/study/daily', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

// 사용자의 학습 통계 가져오기
export async function getStudyStatistics(
  userId: string
): Promise<StudyStatistics> {
  return apiCall<StudyStatistics>(`/study/statistics/${userId}`);
}

// 테스트 결과 저장
export async function saveTestResult(result: {
  userId: string;
  testId: string;
  bookNumber: number;
  wordIds: number[];
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  xpGained: number;
  completionTime: number; // seconds
  timestamp: string;
}): Promise<void> {
  await apiCall('/study/test', {
    method: 'POST',
    body: JSON.stringify(result),
  });
}

// 사용자의 최근 테스트 결과들
export async function getRecentTests(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  return apiCall(`/study/tests/${userId}?limit=${limit}`);
}

// ===== 복습 큐 관련 API =====

// 오늘 복습할 단어 목록 가져오기
export async function getTodayReviewWords(userId: string): Promise<any[]> {
  return apiCall(`/review/today/${userId}`);
}

// 복습 큐에 단어 추가
export async function addToReviewQueue(queue: {
  userId: string;
  wordId: number;
  scheduledDate: string;
}): Promise<void> {
  await apiCall('/review/queue', {
    method: 'POST',
    body: JSON.stringify(queue),
  });
}

// 복습 완료 처리
export async function completeReview(data: {
  userId: string;
  wordId: number;
  wasCorrect: boolean;
}): Promise<void> {
  await apiCall('/review/complete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== 관리자/초기화 API =====

// 샘플 단어 데이터 초기화 (개발/테스트용)
export async function initializeSampleWords(): Promise<void> {
  await apiCall('/admin/init-sample-words', {
    method: 'POST',
  });
}

// ===== 학생 관리 API =====

export interface Student {
  id: string;
  name: string;
  email?: string;            // Optional - only in Auth, not in profiles table
  student_code: string;
  points: number;
  total_xp: number;
  current_volume?: number;   // Optional - not in profiles table
  current_day?: number;      // Optional - not in profiles table
  streak_days: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export async function getStudents(accessToken: string): Promise<Student[]> {
  const response = await apiCall<{ success: boolean; students: Student[] }>('/students', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.students;
}

export async function createStudent(
  accessToken: string,
  studentData: {
    name: string;
    email: string;
    studentCode: string;
    password: string;
  }
): Promise<void> {
  await apiCall('/students', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(studentData)
  });
}

export async function updateStudent(
  accessToken: string,
  studentId: string,
  updates: Partial<Student>
): Promise<void> {
  await apiCall(`/students/${studentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(updates)
  });
}

export async function deleteStudent(accessToken: string, studentId: string): Promise<void> {
  await apiCall(`/students/${studentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
}

// ===== 리더보드 API =====

export interface LeaderboardEntry {
  id: string;
  name: string;
  total_xp: number; // backward compatibility
  points: number; // 실제 포인트 (total_xp와 동일)
  wins?: number;
  losses?: number;
  avatar_url?: string;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await apiCall<{ success: boolean; leaderboard: LeaderboardEntry[] }>('/leaderboard');
  return response.leaderboard;
}

// ===== 진행률 업데이트 API =====

export async function updateProgress(
  accessToken: string,
  progressData: {
    currentVolume: number;
    currentDay: number;
    points: number;
    totalXP: number;
    streakDays: number;
  }
): Promise<void> {
  await apiCall('/progress/update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(progressData)
  });
}

// ===== 간격 반복 시스템 헬퍼 =====

// SM-2 알고리즘 기반 간격 반복 계산
export function calculateNextReview(
  currentInterval: number,
  easeFactor: number,
  wasCorrect: boolean
): { nextInterval: number; nextEaseFactor: number } {
  if (!wasCorrect) {
    return { nextInterval: 1, nextEaseFactor: Math.max(1.3, easeFactor - 0.2) };
  }

  let nextInterval: number;
  if (currentInterval === 0) {
    nextInterval = 1;
  } else if (currentInterval === 1) {
    nextInterval = 6;
  } else {
    nextInterval = Math.round(currentInterval * easeFactor);
  }

  const nextEaseFactor = Math.min(2.5, easeFactor + 0.1);

  return { nextInterval, nextEaseFactor };
}

// 마스터리 계산 (0-100)
export function calculateMastery(
  correctCount: number,
  incorrectCount: number,
  interval: number
): number {
  const totalAttempts = correctCount + incorrectCount;
  if (totalAttempts === 0) return 0;

  const accuracy = (correctCount / totalAttempts) * 100;
  const intervalBonus = Math.min(interval / 30, 1) * 20; // 최대 30일 간격에서 +20점

  return Math.min(100, Math.round(accuracy * 0.8 + intervalBonus));
}