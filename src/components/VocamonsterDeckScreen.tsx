import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Search, Loader2, Trash2, Check } from 'lucide-react'
import { supabase } from '../utils/supabase-client'
import { authService } from '../utils/auth'
import { projectId } from '../utils/supabase/info'
import './VocamonsterScreen.css'

interface VocamonsterDeckScreenProps {
  onBack: () => void
}

interface DeckWord {
  id: string
  wordId: string
  word: {
    id: string
    word: string
    koreanMeaning: string
    pronunciation?: string
    synonyms?: string[]
    antonyms?: string[]
  } | null
  addedAt: string
}

interface AvailableWord {
  id: string
  word: string
  koreanMeaning: string
  pronunciation?: string
  vol: number
  day: number
  synonyms?: string[]
  antonyms?: string[]
}

const PROGRESS_STORAGE_KEY = 'learningAppProgress'
const DEFAULT_DAYS = Array.from({ length: 16 }, (_, i) => i + 1)

const getCompletedDaysFromStorage = (): number[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return []
  }
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { completedStages?: unknown }
    if (Array.isArray(parsed.completedStages)) {
      const numericStages = parsed.completedStages.filter(
        (stage): stage is number => typeof stage === 'number'
      )
      const unique = Array.from(new Set<number>(numericStages))
      return unique
    }
    return []
  } catch (error) {
    console.error('학습 완료 Day 정보를 불러올 수 없습니다:', error)
    return []
  }
}

export function VocamonsterDeckScreen({ onBack }: VocamonsterDeckScreenProps) {
  const authUser = authService.getUser()
  const currentStudyDay = authUser?.currentDay ?? 1

  const [deck, setDeck] = useState<DeckWord[]>([])
  const [availableWords, setAvailableWords] = useState<AvailableWord[]>([])
  const [completedDays, setCompletedDays] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingWords, setLoadingWords] = useState(false)
  const [deckSearchQuery, setDeckSearchQuery] = useState('')
  const [availableSearchQuery, setAvailableSearchQuery] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all')
  const [volOptions, setVolOptions] = useState<number[]>([1])
  const [selectedVol, setSelectedVol] = useState<number>(1)
  const [addingWordId, setAddingWordId] = useState<string | null>(null)
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set())
  const [bulkAdding, setBulkAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<'deck' | 'add'>('deck')
  const deckWordIds = new Set(deck.map(item => item.wordId))

  const dayOptions = useMemo(() => {
    const daySet = new Set<number>()
    completedDays.forEach(day => {
      if (typeof day === 'number' && day > 0) {
        daySet.add(day)
      }
    })
    const highestCompleted = completedDays.length ? Math.max(...completedDays) : 1
    const limit = Math.max(currentStudyDay, highestCompleted, 1)
    for (let i = 1; i <= limit; i++) {
      daySet.add(i)
    }
    const sorted = Array.from(daySet).sort((a, b) => a - b)
    return sorted.length ? sorted : DEFAULT_DAYS
  }, [completedDays, currentStudyDay])

  useEffect(() => {
    loadDeck()
    const days = getCompletedDaysFromStorage()
    setCompletedDays(days)
  }, [])

  useEffect(() => {
    loadVolumeOptions()
  }, [])

  useEffect(() => {
    setSelectedWordIds(prev => {
      const next = new Set(Array.from(prev).filter(id => !deckWordIds.has(id)))
      if (next.size === prev.size) return prev
      return next
    })
  }, [deck])

  useEffect(() => {
    const daysToFetch = selectedDay === 'all' ? dayOptions : [selectedDay]
    loadAvailableWords(selectedVol, daysToFetch)
  }, [dayOptions, selectedDay, selectedVol])

  const loadVolumeOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('words')
        .select('vol')
        .order('vol', { ascending: true })

      if (error) {
        throw error
      }

      const vols = Array.from(
        new Set(
          (data || [])
            .map((entry: { vol: number | null }) => entry.vol)
            .filter((vol): vol is number => typeof vol === 'number')
        )
      )

      if (vols.length) {
        setVolOptions(vols)
        setSelectedVol(prev => (vols.includes(prev) ? prev : vols[0]))
      }
    } catch (error) {
      console.error('볼륨 옵션 로드 오류:', error)
    }
  }

  const loadDeck = async () => {
    try {
      setLoading(true)
      const token = authService.getAccessToken()
      
      if (!token) {
        alert('로그인이 필요합니다.')
        onBack()
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/deck`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load deck')
      }

      setDeck(data.deck || [])
    } catch (error: any) {
      console.error('덱 로드 오류:', error)
      alert(error.message || '덱을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableWords = async (volToFetch: number, daysToFetch: number[]) => {
    try {
      setLoadingWords(true)
      const sanitizedDays = Array.from(
        new Set(
          daysToFetch.filter((day): day is number => typeof day === 'number' && Number.isFinite(day))
        )
      )
      const targetDays = sanitizedDays.length ? sanitizedDays : DEFAULT_DAYS

      if (!targetDays.length) {
        setAvailableWords([])
        return
      }

      const { data, error } = await supabase
        .from('words')
        .select('id, word, korean_meaning, pronunciation, synonyms, antonyms, vol, day, number')
        .eq('vol', volToFetch)
        .in('day', targetDays)
        .order('day', { ascending: true })
        .order('number', { ascending: true })

      if (error) {
        throw error
      }

      const mapped: AvailableWord[] = (data || []).map((w) => ({
        id: w.id,
        word: w.word,
        koreanMeaning: w.korean_meaning,
        pronunciation: w.pronunciation ?? undefined,
        synonyms: w.synonyms || [],
        antonyms: w.antonyms || [],
        vol: w.vol,
        day: w.day
      }))

      setAvailableWords(mapped)
    } catch (error) {
      console.error('단어 로드 오류:', error)
      setAvailableWords([])
    } finally {
      setLoadingWords(false)
    }
  }

  const toggleSelectWord = (wordId: string) => {
    if (deckWordIds.has(wordId)) return
    setSelectedWordIds(prev => {
      const next = new Set(prev)
      if (next.has(wordId)) {
        next.delete(wordId)
      } else {
        next.add(wordId)
      }
      return next
    })
  }

  const addSelectedWordsToDeck = async () => {
    if (bulkAdding || selectedWordIds.size === 0) return

    try {
      setBulkAdding(true)
      const token = authService.getAccessToken()
      if (!token) {
        alert('로그인이 필요합니다.')
        return
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/deck/add-multiple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ wordIds: Array.from(selectedWordIds) })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '선택한 단어를 추가할 수 없습니다.')
      }

      // 선택한 단어들을 덱에 즉시 추가 (새로고침 없이)
      const wordsToAdd = availableWords.filter(w => selectedWordIds.has(w.id))
      const newDeckItems: DeckWord[] = wordsToAdd.map(word => ({
        id: `temp-${word.id}`,
        wordId: word.id,
        word: {
          id: word.id,
          word: word.word,
          koreanMeaning: word.koreanMeaning,
          pronunciation: word.pronunciation,
          synonyms: word.synonyms,
          antonyms: word.antonyms,
        },
        addedAt: new Date().toISOString()
      }))
      setDeck(prev => [...newDeckItems, ...prev])

      setSelectedWordIds(new Set())
    } catch (error: any) {
      console.error('다중 단어 추가 오류:', error)
      alert(error.message || '단어 추가에 실패했습니다.')
    } finally {
      setBulkAdding(false)
    }
  }

  const addWordToDeck = async (wordId: string) => {
    if (addingWordId) return

    try {
      setAddingWordId(wordId)
      const token = authService.getAccessToken()

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/deck/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ wordId }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add word')
      }

      if (data.alreadyExists) {
        alert('이미 덱에 추가된 단어입니다.')
        return
      }

      // 덱에 새 카드 즉시 추가 (새로고침 없이)
      const wordToAdd = availableWords.find(w => w.id === wordId)
      if (wordToAdd) {
        const newDeckItem: DeckWord = {
          id: data.deckId || `temp-${wordId}`,
          wordId: wordId,
          word: {
            id: wordToAdd.id,
            word: wordToAdd.word,
            koreanMeaning: wordToAdd.koreanMeaning,
            pronunciation: wordToAdd.pronunciation,
            synonyms: wordToAdd.synonyms,
            antonyms: wordToAdd.antonyms,
          },
          addedAt: new Date().toISOString()
        }
        setDeck(prev => [newDeckItem, ...prev])
      }

      setSelectedWordIds(prev => {
        const next = new Set(prev)
        next.delete(wordId)
        return next
      })
    } catch (error: any) {
      console.error('단어 추가 오류:', error)
      alert(error.message || '단어 추가에 실패했습니다.')
    } finally {
      setAddingWordId(null)
    }
  }

  const removeWordFromDeck = async (wordId: string) => {
    if (!confirm('이 단어를 덱에서 제거하시겠습니까?')) {
      return
    }

    try {
      const token = authService.getAccessToken()
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/deck/${wordId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove word')
      }

      // 덱 새로고침
      await loadDeck()
    } catch (error: any) {
      console.error('단어 제거 오류:', error)
      alert(error.message || '단어 제거에 실패했습니다.')
    }
  }

  const filteredDeck = deck.filter(item => {
    if (!item.word) return false
    const query = deckSearchQuery.trim().toLowerCase()
    if (!query) return true
    return item.word.word.toLowerCase().includes(query) ||
           item.word.koreanMeaning.toLowerCase().includes(query)
  })

  const filteredAvailableWords = availableWords.filter(word => {
    if (deckWordIds.has(word.id)) return false
    if (selectedDay !== 'all' && word.day !== selectedDay) return false
    const query = availableSearchQuery.trim().toLowerCase()
    if (!query) return true
    return word.word.toLowerCase().includes(query) ||
           word.koreanMeaning.toLowerCase().includes(query)
  })

  const selectedCount = selectedWordIds.size

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center vocamonster-screen">
        <div className="vocamonster-card p-8">
          <Loader2 className="w-12 h-12 vocamonster-text-primary animate-spin mx-auto" />
          <p className="vocamonster-text-secondary mt-4 font-medium text-center">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 플로팅 추가 버튼 - 화면 하단 고정 (BottomNavigation과 동일한 레이어) */}
      {activeTab === 'add' && selectedCount > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none px-6 w-full max-w-sm">
          <div className="flex flex-col items-center gap-2 pointer-events-auto">
            {/* 카드 덱 아이콘 - 버튼 밖, 위에 크게 */}
            <img
              src="/vocamonster/vocamonster-cards.png"
              alt="Card Deck"
              className="w-48 h-48 object-contain"
              style={{ pointerEvents: 'none' }}
            />
            
            {/* 추가 버튼 - 작게 */}
            <div style={{ pointerEvents: 'auto', position: 'relative' }}>
              <button
                onClick={addSelectedWordsToDeck}
                disabled={bulkAdding}
                className="relative px-4 py-2 rounded-xl touch-manipulation shadow-xl active:scale-95 transition-transform"
                style={{
                  background: bulkAdding
                    ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.8) 0%, rgba(80, 80, 80, 0.8) 100%)'
                    : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                  backdropFilter: 'blur(12px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  cursor: bulkAdding ? 'not-allowed' : 'pointer',
                  opacity: bulkAdding ? 0.7 : 1,
                  boxShadow: bulkAdding
                    ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                    : '0 8px 32px rgba(245, 158, 11, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                }}
              >
                {/* 버튼 텍스트 - 작게 */}
                <span className="text-xs font-bold">
                  {bulkAdding ? '추가 중...' : `${selectedCount}개 추가`}
                </span>

                {/* 선택 개수 배지 (작은 원형) */}
                {!bulkAdding && (
                  <div
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #F3F4F6 100%)',
                      color: '#F59E0B',
                      border: '2px solid #F59E0B',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    {selectedCount}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm mx-auto min-h-screen vocamonster-screen relative" style={{ overflowX: 'hidden' }}>
      <div className="vocamonster-header">
        <div className="flex items-center justify-between h-full px-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-6 h-6 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
          <h1 className="text-center vocamonster-text-primary text-xl font-bold">
            VOCACARD 덱
          </h1>
          <div className="w-6 h-6" />
        </div>
      </div>

      <div className="px-6 py-6 space-y-5 pb-24">
        {/* Tab Bar */}
        <div className="vocamonster-tab-bar">
          <button
            onClick={() => setActiveTab('deck')}
            className={`vocamonster-tab ${activeTab === 'deck' ? 'active' : ''}`}
          >
            내 덱 ({deck.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`vocamonster-tab ${activeTab === 'add' ? 'active' : ''}`}
          >
            카드 추가
          </button>
        </div>

        {/* 내 덱 탭 */}
        {activeTab === 'deck' && (
          <>
            <div className="vocamonster-card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <img src="/vocamonster/deck-icon.png" alt="deck" className="w-14 h-14" />
                <div className="flex-1">
                  <div className="vocamonster-text-primary text-lg font-bold">
                    현재 <span className="vocamonster-text-primary">{deck.length}</span>개의 덱 카드
                  </div>
                  <p className="text-xs vocamonster-text-secondary">학습한 단어를 카드로 모아 배틀에 활용하세요</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 vocamonster-text-secondary" />
                <input
                  type="text"
                  value={deckSearchQuery}
                  onChange={(e) => setDeckSearchQuery(e.target.value)}
                  placeholder="내 덱에서 검색..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg vocamonster-input min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredDeck.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="vocamonster-card p-10 text-center"
                >
                  <img src="/vocamonster/deck-icon.png" alt="deck" className="w-28 h-28 mx-auto mb-4 opacity-30" />
                  <p className="vocamonster-text-primary font-bold text-lg mb-2">덱이 비어있습니다</p>
                  <p className="vocamonster-text-secondary text-xs mb-4">"카드 추가" 탭에서 단어를 선택해 추가하세요</p>
                </motion.div>
              ) : (
                filteredDeck.map((item) => (
                  item.word && (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="vocamonster-card p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="vocamonster-text-primary text-lg font-bold">{item.word.word}</h3>
                            {item.word.pronunciation && (
                              <span className="vocamonster-text-secondary text-xs">[{item.word.pronunciation}]</span>
                            )}
                          </div>
                          <p className="vocamonster-text-primary text-sm mb-2">{item.word.koreanMeaning}</p>
                          {(item.word.synonyms && item.word.synonyms.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.word.synonyms.slice(0, 3).map((syn, idx) => (
                                <span key={idx} className="text-xs vocamonster-text-secondary px-2 py-1 rounded vocamonster-tag">
                                  {syn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => removeWordFromDeck(item.wordId)}
                          className="ml-4 p-2 vocamonster-text-primary hover:opacity-80 rounded-lg transition-all min-h-[44px] min-w-[44px] touch-manipulation"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                ))
              )}
            </div>
          </>
        )}

        {/* 카드 추가 탭 */}
        {activeTab === 'add' && (
          <>
            <div className="vocamonster-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="vocamonster-text-primary font-bold mb-1 text-sm">학습 완료 Day</div>
                  {completedDays.length === 0 && (
                    <p className="text-xs vocamonster-text-secondary">학습 기록이 없어 전체 Day를 보여드릴게요.</p>
                  )}
                </div>
                <button className="text-xs vocamonster-text-secondary underline" onClick={() => setSelectedDay('all')}>
                  전체
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {dayOptions.map((day) => (
                  <motion.button
                    key={day}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDay(selectedDay === day ? 'all' : day)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold min-h-[44px] touch-manipulation transition-all ${
                      selectedDay === day
                        ? 'vocamonster-chip active'
                        : 'vocamonster-chip'
                    }`}
                  >
                    Day {day}
                  </motion.button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 vocamonster-text-secondary" />
                <input
                  type="text"
                  value={availableSearchQuery}
                  onChange={(e) => setAvailableSearchQuery(e.target.value)}
                  placeholder="학습 완료 단어 검색..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg vocamonster-input min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-4 pb-32">
              {loadingWords ? (
                <div className="vocamonster-card p-10 text-center">
                  <Loader2 className="w-12 h-12 vocamonster-text-primary animate-spin mx-auto" />
                  <p className="vocamonster-text-secondary mt-4 font-normal">단어 로딩 중...</p>
                </div>
              ) : filteredAvailableWords.length === 0 ? (
                <div className="vocamonster-card p-10 text-center">
                  <p className="vocamonster-text-primary font-bold">단어를 찾을 수 없습니다</p>
                </div>
              ) : (
                filteredAvailableWords.map((word) => {
                  const isSelected = selectedWordIds.has(word.id)
                  const alreadyInDeck = deckWordIds.has(word.id)
                  return (
                    <motion.div
                      key={word.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="vocamonster-card p-5 transition-all"
                      style={isSelected ? {
                        boxShadow: '0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3)'
                      } : {}}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSelectWord(word.id)}
                          disabled={alreadyInDeck}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                            alreadyInDeck
                              ? 'border-gray-600 bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'border-amber-400 bg-amber-500 text-white'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-amber-500'
                          }`}
                        >
                          {isSelected ? <Check className="w-6 h-6 text-white" /> : <Check className="w-6 h-6 text-slate-300" />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold vocamonster-text-primary">
                              {word.word}
                            </h3>
                            {word.pronunciation && (
                              <span className="text-xs vocamonster-text-secondary">[{word.pronunciation}]</span>
                            )}
                          </div>
                          <p className="text-sm mb-2 vocamonster-text-primary">
                            {word.koreanMeaning}
                          </p>
                          <p className="vocamonster-text-secondary text-xs mb-2">VOL {word.vol} · DAY {word.day}</p>
                          {(word.synonyms && word.synonyms.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {word.synonyms.slice(0, 3).map((syn, idx) => (
                                <span key={idx} className="text-xs vocamonster-text-secondary px-2 py-1 rounded vocamonster-tag">
                                  {syn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addWordToDeck(word.id)}
                          disabled={alreadyInDeck || addingWordId === word.id}
                          className={`px-3 py-2 rounded-lg text-xs font-bold min-h-[44px] touch-manipulation transition-all ${
                            alreadyInDeck
                              ? 'vocamonster-outline-button opacity-50 cursor-not-allowed'
                              : 'vocamonster-outline-button'
                          }`}
                        >
                          {alreadyInDeck ? '추가됨' : addingWordId === word.id ? '추가 중...' : '바로 추가'}
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>

          </>
        )}
      </div>
    </div>
    </>
  )
}

