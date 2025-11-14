import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useGameStore = create((set, get) => ({
  // 유저 상태
  user: null,
  profile: null,
  
  // 게임 상태
  currentMatch: null,
  myDeck: [],
  opponentInfo: null,
  isMyTurn: false,
  selectedWord: null,
  questionType: null,
  
  // 게임 진행 상태
  gameStatus: 'idle', // idle, waiting, playing, finished
  connectionStatus: 'disconnected',
  
  // UI 상태
  isLoading: false,
  error: null,
  
  // 액션들
  setUser: (user) => set({ user }),
  
  setProfile: (profile) => set({ profile }),
  
  loadProfile: async () => {
    const { user } = get()
    if (!user) return
    
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      set({ profile: data })
    } catch (error) {
      set({ error: error.message })
    } finally {
      set({ isLoading: false })
    }
  },
  
  loadUserDeck: async () => {
    const { user } = get()
    if (!user) return
    
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('user_decks')
        .select(`
          *,
          word:words(*)
        `)
        .eq('user_id', user.id)
        .limit(50)
      
      if (error) throw error
      set({ myDeck: data || [] })
    } catch (error) {
      set({ error: error.message })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateMatch: (match) => {
    const { user } = get()
    if (!user || !match) return
    
    const isPlayer1 = match.player1_id === user.id
    const isMyTurn = match.current_turn === user.id
    
    set({
      currentMatch: match,
      isMyTurn,
      gameStatus: match.status
    })
  },
  
  selectWord: (word) => set({ selectedWord: word }),
  
  selectQuestionType: (type) => set({ questionType: type }),
  
  submitAttack: async (answer) => {
    const { currentMatch, selectedWord, questionType, user } = get()
    if (!currentMatch || !selectedWord || !questionType || !user) return
    
    set({ isLoading: true })
    try {
      // 서버에서 답변 검증
      const { data, error } = await supabase.functions.invoke('verify-answer', {
        body: {
          matchId: currentMatch.id,
          wordId: selectedWord.id,
          questionType,
          answer,
          attackerId: user.id
        }
      })
      
      if (error) throw error
      
      // 턴 종료 후 초기화
      set({
        selectedWord: null,
        questionType: null,
        isMyTurn: false
      })
      
      return data
    } catch (error) {
      set({ error: error.message })
      return null
    } finally {
      set({ isLoading: false })
    }
  },
  
  resetGame: () => set({
    currentMatch: null,
    opponentInfo: null,
    isMyTurn: false,
    selectedWord: null,
    questionType: null,
    gameStatus: 'idle',
    error: null
  })
}))

export default useGameStore
