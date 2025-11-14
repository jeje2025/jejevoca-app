// 갓생보카 Supabase API 연동

import { 
  Word, 
  UserWordProgress, 
  UserBookProgress, 
  DailyStudyRecord,
  StudyStatistics,
  TestResult,
  ReviewQueue 
} from '../types/vocabulary';
import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61`;

// API 호출 헬퍼
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }

  return response.json();
}

// ============================================
// 단어 관련 API
// ============================================

/**
 * 모든 단어 가져오기 (초기 로드용)
 */
export async function getAllWords(): Promise<Word[]> {
  return apiCall<Word[]>('/words');
}

/**
 * 특정 교재의 단어들 가져오기
 */
export async function getWordsByBook(bookNumber: number): Promise<Word[]> {
  return apiCall<Word[]>(`/words/book/${bookNumber}`);
}

/**
 * 특정 단어 ID들로 단어 가져오기
 */
export async function getWordsByIds(wordIds: number[]): Promise<Word[]> {
  return apiCall<Word[]>('/words/by-ids', {
    method: 'POST',
    body: JSON.stringify({ wordIds }),
  });
}

/**
 * 특정 단어 상세 정보
 */
export async function getWordById(wordId: number): Promise<Word> {
  return apiCall<Word>(`/words/${wordId}`);
}

/**
 * 단어 검색
 */
export async function searchWords(query: string): Promise<Word[]> {
  return apiCall<Word[]>(`/words/search?q=${encodeURIComponent(query)}`);
}

// ============================================
// 사용자 진도 관련 API
// ============================================

/**
 * 사용자의 단어 학습 진도 가져오기
 */
export async function getUserWordProgress(
  userId: string,
  wordId: number
): Promise<UserWordProgress | null> {
  try {
    return await apiCall<UserWordProgress>(`/progress/word/${userId}/${wordId}`);
  } catch {
    return null;
  }
}

/**
 * 사용자의 모든 단어 학습 진도 가져오기
 */
export async function getAllUserWordProgress(userId: string): Promise<UserWordProgress[]> {
  return apiCall<UserWordProgress[]>(`/progress/words/${userId}`);
}

/**
 * 단어 학습 진도 업데이트
 */
export async function updateUserWordProgress(
  progress: UserWordProgress
): Promise<void> {
  await apiCall('/progress/word', {
    method: 'POST',
    body: JSON.stringify(progress),
  });
}

/**
 * 여러 단어의 학습 진도 일괄 업데이트
 */
export async function batchUpdateUserWordProgress(
  progressList: UserWordProgress[]
): Promise<void> {
  await apiCall('/progress/words/batch', {
    method: 'POST',
    body: JSON.stringify({ progressList }),
  });
}

/**
 * 사용자의 교재 진도 가져오기
 */
export async function getUserBookProgress(
  userId: string,
  bookNumber: number
): Promise<UserBookProgress | null> {
  try {
    return await apiCall<UserBookProgress>(`/progress/book/${userId}/${bookNumber}`);
  } catch {
    return null;
  }
}

/**
 * 사용자의 모든 교재 진도 가져오기
 */
export async function getAllUserBookProgress(userId: string): Promise<UserBookProgress[]> {
  return apiCall<UserBookProgress[]>(`/progress/books/${userId}`);
}

/**
 * 교재 진도 업데이트
 */
export async function updateUserBookProgress(
  progress: UserBookProgress
): Promise<void> {
  await apiCall('/progress/book', {
    method: 'POST',
    body: JSON.stringify(progress),
  });
}

// ============================================
// 학습 기록 관련 API
// ============================================

/**
 * 일일 학습 기록 저장
 */
export async function saveDailyStudyRecord(record: DailyStudyRecord): Promise<void> {
  await apiCall('/study/daily', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

/**
 * 사용자의 학습 통계 가져오기
 */
export async function getStudyStatistics(userId: string): Promise<StudyStatistics> {
  return apiCall<StudyStatistics>(`/study/statistics/${userId}`);
}

/**
 * 테스트 결과 저장
 */
export async function saveTestResult(result: TestResult): Promise<void> {
  await apiCall('/study/test', {
    method: 'POST',
    body: JSON.stringify(result),
  });
}

/**
 * 사용자의 최근 테스트 결과들
 */
export async function getRecentTestResults(
  userId: string,
  limit: number = 10
): Promise<TestResult[]> {
  return apiCall<TestResult[]>(`/study/tests/${userId}?limit=${limit}`);
}

// ============================================
// 복습 큐 관련 API
// ============================================

/**
 * 오늘 복습할 단어 목록 가져오기
 */
export async function getTodayReviewWords(userId: string): Promise<ReviewQueue[]> {
  return apiCall<ReviewQueue[]>(`/review/today/${userId}`);
}

/**
 * 복습 큐에 단어 추가
 */
export async function addToReviewQueue(queue: ReviewQueue): Promise<void> {
  await apiCall('/review/queue', {
    method: 'POST',
    body: JSON.stringify(queue),
  });
}

/**
 * 복습 완료 처리
 */
export async function completeReview(
  userId: string,
  wordId: number,
  wasCorrect: boolean
): Promise<void> {
  await apiCall('/review/complete', {
    method: 'POST',
    body: JSON.stringify({ userId, wordId, wasCorrect }),
  });
}

// ============================================
// 로컬 스토리지 폴백 (오프라인 지원)
// ============================================

const STORAGE_KEYS = {
  WORDS: 'godslife_words',
  USER_PROGRESS: 'godslife_user_progress',
  BOOK_PROGRESS: 'godslife_book_progress',
  STATISTICS: 'godslife_statistics',
};

/**
 * 로컬에서 단어 데이터 가져오기
 */
export function getWordsFromLocal(): Word[] {
  const data = localStorage.getItem(STORAGE_KEYS.WORDS);
  return data ? JSON.parse(data) : [];
}

/**
 * 로컬에 단어 데이터 저장
 */
export function saveWordsToLocal(words: Word[]): void {
  localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
}

/**
 * 로컬에서 사용자 진도 가져오기
 */
export function getUserProgressFromLocal(userId: string): UserWordProgress[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.USER_PROGRESS}_${userId}`);
  return data ? JSON.parse(data) : [];
}

/**
 * 로컬에 사용자 진도 저장
 */
export function saveUserProgressToLocal(userId: string, progress: UserWordProgress[]): void {
  localStorage.setItem(`${STORAGE_KEYS.USER_PROGRESS}_${userId}`, JSON.stringify(progress));
}

/**
 * 로컬에서 교재 진도 가져오기
 */
export function getBookProgressFromLocal(userId: string): UserBookProgress[] {
  const data = localStorage.getItem(`${STORAGE_KEYS.BOOK_PROGRESS}_${userId}`);
  return data ? JSON.parse(data) : [];
}

/**
 * 로컬에 교재 진도 저장
 */
export function saveBookProgressToLocal(userId: string, progress: UserBookProgress[]): void {
  localStorage.setItem(`${STORAGE_KEYS.BOOK_PROGRESS}_${userId}`, JSON.stringify(progress));
}

/**
 * 로컬에서 통계 가져오기
 */
export function getStatisticsFromLocal(userId: string): StudyStatistics | null {
  const data = localStorage.getItem(`${STORAGE_KEYS.STATISTICS}_${userId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * 로컬에 통계 저장
 */
export function saveStatisticsToLocal(userId: string, stats: StudyStatistics): void {
  localStorage.setItem(`${STORAGE_KEYS.STATISTICS}_${userId}`, JSON.stringify(stats));
}
