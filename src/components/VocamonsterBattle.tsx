import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Heart, Clock, Swords, Shield, Trophy, Skull, Loader2, CheckCircle, XCircle, Zap, Sparkles, BookOpen, Target, Flame, Shield as ShieldIcon, X, Coins, Flag } from 'lucide-react'
import { authService } from '../utils/auth'
import { supabase } from '../utils/supabase-client'
import { projectId } from '../utils/supabase/info'
import './VocamonsterScreen.css'

interface VocamonsterBattleProps {
  matchId: string
  onBack: () => void
  onMatchEnd: (won: boolean, pointsGained: number) => void
}

interface Word {
  id: string
  word: string
  korean_meaning: string
  pronunciation?: string
  synonyms?: string[]
  antonyms?: string[]
}

interface Match {
  id: string
  player1_id: string
  player2_id: string
  player1_hearts: number
  player2_hearts: number
  current_turn: string
  status: string
  bet_points: number
  is_bot_match?: boolean
  winner_id?: string | null
}

interface MatchTurn {
  id: string
  match_id: string
  attacker_id: string
  defender_id: string
  word_id: string
  word_text: string
  question_type: 'meaning' | 'synonym' | 'antonym'
  answer?: string
  is_correct?: boolean
  damage?: number
  created_at: string
}

interface BattleLog {
  id: number
  message: string
  type: 'attack' | 'defend' | 'damage' | 'victory'
}

const DISTRACTOR_MEANINGS = [
  '얻다, 획득하다', '도착하다', '믿다, 신뢰하다', '시작하다', '부족함',
  '어려움', '실수', '운', '출석한', '행복한', '슬픈', '화난', '크다',
  '작다', '빠르다', '느리다', '쉽다', '어렵다', '좋다', '나쁘다'
]

const BOT_ID = '00000000-0000-0000-0000-000000000000'

function DefenseSuccessIcon({ size }: { size: number }) {
  return (
    <img
      src="/vocamonster/defense-success.png"
      alt="방어 성공"
      className="drop-shadow-2xl object-contain"
      style={{ width: size, height: size }}
    />
  )
}

export function VocamonsterBattle({ matchId, onBack, onMatchEnd }: VocamonsterBattleProps) {
  const user = authService.getUser()

  // 상태 관리
  const [match, setMatch] = useState<Match | null>(null)
  const [userDeck, setUserDeck] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([])

  // 공격 관련 상태
  const [showAttackPanel, setShowAttackPanel] = useState(false)
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [questionType, setQuestionType] = useState<'meaning' | 'synonym' | 'antonym' | null>(null)

  // 방어 관련 상태
  const [showQuestion, setShowQuestion] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<{ word: string; type: string; correctAnswer: string } | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [isAnswering, setIsAnswering] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [damage, setDamage] = useState(0)

  // 봇 관련 상태
  const [botThinking, setBotThinking] = useState(false)
  const [showBotDefenseResult, setShowBotDefenseResult] = useState(false)
  const [botDefenseResult, setBotDefenseResult] = useState<{
    word: string
    questionType: 'meaning' | 'synonym' | 'antonym'
    botAnswer: string
    correctAnswer: string
    isCorrect: boolean
  } | null>(null)

  // 게임 종료 상태
  const [gameEnded, setGameEnded] = useState(false)
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null)

  // UI 애니메이션 상태
  const [showAttackAnimation, setShowAttackAnimation] = useState(false)
  const [showDamageAnimation, setShowDamageAnimation] = useState(false)
  const [damagePosition, setDamagePosition] = useState<'left' | 'right'>('right')
  const [toastMessage, setToastMessage] = useState<{message: string, type: BattleLog['type']} | null>(null)

  // Refs
  const userDeckRef = useRef<Word[]>([])
  const processedTurnsRef = useRef<Set<string>>(new Set())
  const botAttackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ==================== DB 업데이트 함수들 (턴 로직 없음, 오직 DB만 업데이트) ====================

  async function updateBattleTurn(turnId: string, answer: string, isCorrect: boolean, damage: number) {
    await supabase
      .from('battle_turns')
      .update({ answer, is_correct: isCorrect, damage })
      .eq('id', turnId)
  }

  async function updateBattleHearts(matchId: string, isPlayer1: boolean, newHearts: number) {
    await supabase
      .from('battles')
      .update({ [isPlayer1 ? 'player1_hearts' : 'player2_hearts']: newHearts })
      .eq('id', matchId)
  }

  async function updateCurrentTurn(matchId: string, nextTurn: string) {
    await supabase
      .from('battles')
      .update({ current_turn: nextTurn })
      .eq('id', matchId)
  }

  async function finishBattle(matchId: string, winnerId: string) {
    await supabase
      .from('battles')
      .update({ status: 'finished', winner_id: winnerId })
      .eq('id', matchId)
  }

  async function createAttackTurn(attackerId: string, defenderId: string, word: Word, qType: 'meaning' | 'synonym' | 'antonym') {
    const { data } = await supabase
      .from('battle_turns')
      .insert({
        match_id: matchId,
        attacker_id: attackerId,
        defender_id: defenderId,
        word_id: word.id,
        word_text: word.word,
        question_type: qType
      })
      .select()
      .single()

    return data as MatchTurn | null
  }

  // ==================== 유틸리티 함수들 ====================

  function addLog(message: string, type: BattleLog['type'] = 'attack') {
    const newLog: BattleLog = { id: Date.now(), message, type }
    setBattleLogs(prev => [newLog, ...prev].slice(0, 5))
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  function triggerDamage(amount: number) {
    setDamage(amount)
    setDamagePosition('left')
    setShowDamageAnimation(true)
    setTimeout(() => setShowDamageAnimation(false), 800)
  }

  function checkGameEnd(m: Match) {
    if (m.status === 'finished') {
      setGameEnded(true)
      const won = m.winner_id === user?.id
      setGameResult(won ? 'win' : 'lose')
      const points = won ? m.bet_points * 2 : 0
      onMatchEnd(won, points)
    }
  }

  // ==================== 데이터 로딩 ====================

  async function loadMatch() {
    const { data, error } = await supabase
      .from('battles')
      .select('*')
      .eq('id', matchId)
      .single()

    if (error) throw error

    // 하트 기본값
    if (!data.player1_hearts) data.player1_hearts = 5
    if (!data.player2_hearts) data.player2_hearts = 5

    setMatch(data)
    checkGameEnd(data)
    addLog('🏁 배틀이 시작되었습니다! ⚔️', 'attack')
  }

  async function loadUserDeck() {
    const token = authService.getAccessToken()
    if (!token) return

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/deck`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    const data = await response.json()

    if (response.ok && data.deck) {
      const words: Word[] = data.deck
        .filter((item: any) => item.word)
        .map((item: any) => ({
          id: item.word.id,
          word: item.word.word,
          korean_meaning: item.word.koreanMeaning,
          pronunciation: item.word.pronunciation,
          synonyms: item.word.synonyms || [],
          antonyms: item.word.antonyms || []
        }))

      setUserDeck(words)
      userDeckRef.current = words
    }
  }

  // ==================== 초기 로딩 ====================

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.')
      onBack()
      return
    }

    async function init() {
      setLoading(true)
      try {
        await Promise.all([loadMatch(), loadUserDeck()])
      } catch (error) {
        console.error('배틀 초기화 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // ==================== 폴링: 모든 턴 결정은 여기서 ====================

  useEffect(() => {
    if (!user || !match) return

    const interval = setInterval(async () => {
      // 모달 열려있으면 폴링 스킵 (깜빡임 방지)
      if (showQuestion || showBotDefenseResult || showAttackPanel) return

      try {
        // 1. 매치 상태 업데이트
        const { data: matchData } = await supabase
          .from('battles')
          .select('*')
          .eq('id', matchId)
          .single()

        if (!matchData) return

        const newMatch = matchData as Match
        setMatch(newMatch)
        checkGameEnd(newMatch)

        // 2. 봇 턴인가? → 봇 자동 공격
        if (newMatch.current_turn === BOT_ID && newMatch.status === 'active' && !botThinking) {
          console.log('🤖 봇 턴 감지! 2초 후 자동 공격')
          setBotThinking(true)

          setTimeout(async () => {
            const deck = userDeckRef.current
            if (!deck.length) {
              setBotThinking(false)
              return
            }

            const word = deck[Math.floor(Math.random() * deck.length)]
            const questionPool: Array<'meaning' | 'synonym' | 'antonym'> = ['meaning']
            if (word.synonyms?.length) questionPool.push('synonym')
            if (word.antonyms?.length) questionPool.push('antonym')
            const qType = questionPool[Math.floor(Math.random() * questionPool.length)]

            const defenderId = newMatch.player1_id === BOT_ID ? newMatch.player2_id : newMatch.player1_id

            addLog('🤖 VOCABOT이 공격을 준비합니다… ⚡', 'attack')

            // 공격 턴 생성
            await createAttackTurn(BOT_ID, defenderId, word, qType)

            // 턴을 플레이어에게 넘김
            await updateCurrentTurn(matchId, defenderId)

            setBotThinking(false)
          }, 2000)
        }

        // 3. 내 턴인가? → 공격 버튼 활성화 (폴링으로만 판단)
        // (showAttackPanel은 유저가 직접 열어야 함)

        // 4. 내가 방어해야 할 턴이 있나? → 방어 퀴즈 표시
        if (newMatch.current_turn === user.id && !showQuestion) {
          const { data: defenseTurn } = await supabase
            .from('battle_turns')
            .select('*')
            .eq('match_id', matchId)
            .eq('defender_id', user.id)
            .is('answer', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (defenseTurn && !processedTurnsRef.current.has(defenseTurn.id)) {
            console.log('🛡️ 방어 퀴즈 표시:', defenseTurn)
            processedTurnsRef.current.add(defenseTurn.id)
            await showDefenseQuestion(defenseTurn as MatchTurn)
          }
        }

        // 5. 봇이 방어해야 할 턴이 있나? → 봇 자동 방어
        if (newMatch.is_bot_match && !showBotDefenseResult) {
          const { data: botDefenseTurn } = await supabase
            .from('battle_turns')
            .select('*')
            .eq('match_id', matchId)
            .eq('defender_id', BOT_ID)
            .is('answer', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (botDefenseTurn && !processedTurnsRef.current.has(botDefenseTurn.id)) {
            console.log('🤖 봇 방어 턴 감지')
            processedTurnsRef.current.add(botDefenseTurn.id)

            setTimeout(async () => {
              const word = userDeckRef.current.find(w => w.id === botDefenseTurn.word_id)
              if (!word) return

              // 80% 확률로 정답
              const isCorrect = Math.random() < 0.8
              let botAnswer = ''

              if (botDefenseTurn.question_type === 'meaning') {
                botAnswer = isCorrect ? word.korean_meaning : DISTRACTOR_MEANINGS[0]
              } else if (botDefenseTurn.question_type === 'synonym' && word.synonyms?.length) {
                botAnswer = isCorrect ? word.synonyms[0] : word.word
              } else if (botDefenseTurn.question_type === 'antonym' && word.antonyms?.length) {
                botAnswer = isCorrect ? word.antonyms[0] : word.word
              }

              const heartLoss = isCorrect ? 0 : 1

              // DB 업데이트
              await updateBattleTurn(botDefenseTurn.id, botAnswer, isCorrect, heartLoss)

              const isPlayer1 = newMatch.player1_id === BOT_ID
              const newHearts = isPlayer1
                ? Math.max(0, newMatch.player1_hearts - heartLoss)
                : Math.max(0, newMatch.player2_hearts - heartLoss)

              await updateBattleHearts(matchId, isPlayer1, newHearts)

              // 턴 전환: 방어 성공 → 방어자 턴, 실패 → 공격자 턴
              const nextTurn = isCorrect ? BOT_ID : botDefenseTurn.attacker_id
              await updateCurrentTurn(matchId, nextTurn)

              if (newHearts === 0) {
                await finishBattle(matchId, botDefenseTurn.attacker_id)
              }

              // 결과 표시
              setBotDefenseResult({
                word: word.word,
                questionType: botDefenseTurn.question_type,
                botAnswer,
                correctAnswer: botDefenseTurn.question_type === 'meaning' ? word.korean_meaning : (word.synonyms?.[0] || word.antonyms?.[0] || ''),
                isCorrect
              })
              setShowBotDefenseResult(true)
            }, 1000)
          }
        }
      } catch (err) {
        console.error('폴링 오류:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [user, match, matchId, showQuestion, showBotDefenseResult, showAttackPanel, botThinking])

  // ==================== 방어 퀴즈 표시 ====================

  async function showDefenseQuestion(turn: MatchTurn) {
    const word = userDeckRef.current.find(w => w.id === turn.word_id)
    if (!word) {
      console.error('단어를 찾을 수 없습니다:', turn.word_id)
      return
    }

    let correctAnswer = ''
    let allChoices: string[] = []

    if (turn.question_type === 'meaning') {
      correctAnswer = word.korean_meaning
      const distractors = DISTRACTOR_MEANINGS.filter(m => m !== correctAnswer).slice(0, 3)
      allChoices = [correctAnswer, ...distractors]
    } else if (turn.question_type === 'synonym') {
      correctAnswer = word.synonyms?.[0] || ''
      const otherWords = userDeckRef.current.filter(w => w.id !== word.id).slice(0, 3)
      allChoices = [correctAnswer, ...otherWords.map(w => w.word)]
    } else if (turn.question_type === 'antonym') {
      correctAnswer = word.antonyms?.[0] || ''
      const otherWords = userDeckRef.current.filter(w => w.id !== word.id).slice(0, 3)
      allChoices = [correctAnswer, ...otherWords.map(w => w.word)]
    }

    // 선택지 섞기
    const shuffled = [...allChoices].sort(() => Math.random() - 0.5)

    setCurrentQuestion({ word: word.word, type: turn.question_type, correctAnswer })
    setChoices(shuffled)
    setShowQuestion(true)
    setSelectedChoice(null)
    setShowResult(false)
  }

  // ==================== 방어 답변 제출 ====================

  async function submitDefense() {
    if (!selectedChoice || !currentQuestion || !match || !user) return

    setIsAnswering(true)

    try {
      const { data: turn } = await supabase
        .from('battle_turns')
        .select('*')
        .eq('match_id', matchId)
        .eq('defender_id', user.id)
        .is('answer', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!turn) throw new Error('턴을 찾을 수 없습니다')

      const correct = selectedChoice === currentQuestion.correctAnswer
      const heartLoss = correct ? 0 : 1

      setIsCorrect(correct)
      setDamage(heartLoss)
      setShowResult(true)

      if (!correct) {
        triggerDamage(heartLoss)
        addLog(`💔 방어 실패! 하트를 ${heartLoss}개 잃었습니다! 💥`, 'damage')
      } else {
        addLog('🛡️ 방어 성공! 반격 기회를 얻었습니다! ✨', 'defend')
      }

      // DB 업데이트
      await updateBattleTurn(turn.id, selectedChoice, correct, heartLoss)

      const isPlayer1 = match.player1_id === user.id
      const newHearts = isPlayer1
        ? Math.max(0, match.player1_hearts - heartLoss)
        : Math.max(0, match.player2_hearts - heartLoss)

      await updateBattleHearts(matchId, isPlayer1, newHearts)

      // 턴 전환: 방어 성공 → 방어자 턴, 실패 → 공격자 턴
      const nextTurn = correct ? user.id : turn.attacker_id
      await updateCurrentTurn(matchId, nextTurn)

      if (newHearts === 0) {
        await finishBattle(matchId, turn.attacker_id)
      }

      setTimeout(() => {
        setShowQuestion(false)
        setShowResult(false)
        setSelectedChoice(null)
        setIsAnswering(false)
      }, 2000)
    } catch (error) {
      console.error('방어 답변 제출 오류:', error)
      setIsAnswering(false)
    }
  }

  // ==================== 공격 실행 ====================

  async function submitAttack() {
    if (!selectedWord || !questionType || !match || !user) return

    try {
      const isPlayer1 = match.player1_id === user.id
      const defenderId = isPlayer1 ? match.player2_id : match.player1_id

      addLog(`⚔️ ${selectedWord.word}(으)로 공격을 시작합니다!`, 'attack')
      setShowAttackAnimation(true)
      setTimeout(() => setShowAttackAnimation(false), 1000)

      // 공격 턴 생성
      await createAttackTurn(user.id, defenderId, selectedWord, questionType)

      // 턴을 상대방에게 넘김
      await updateCurrentTurn(matchId, defenderId)

      setShowAttackPanel(false)
      setSelectedWord(null)
      setQuestionType(null)
    } catch (error) {
      console.error('공격 실행 오류:', error)
    }
  }

  // ==================== 배틀 포기 ====================

  async function leaveBattle() {
    if (!match || !user) return

    try {
      const isPlayer1 = match.player1_id === user.id
      const opponentId = isPlayer1 ? match.player2_id : match.player1_id

      await finishBattle(matchId, opponentId)

      const surrenderedMatch: Match = {
        ...match,
        status: 'finished',
        winner_id: opponentId
      }
      setMatch(surrenderedMatch)
      checkGameEnd(surrenderedMatch)
    } catch (error) {
      console.error('배틀 포기 오류:', error)
    }
  }

  // ==================== 모달 열릴 때 body 스크롤 방지 ====================

  useEffect(() => {
    const isModalOpen = showQuestion || showBotDefenseResult || showAttackPanel

    if (isModalOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [showQuestion, showBotDefenseResult, showAttackPanel])

  // ==================== 렌더링 ====================

  if (loading) {
    return (
      <div className="vocamonster-screen">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  if (gameEnded) {
    return (
      <div className="vocamonster-screen">
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="vocamonster-card p-8 text-center max-w-md w-full"
          >
            {gameResult === 'win' ? (
              <>
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-3xl font-black text-yellow-400 mb-2">승리!</h2>
                <p className="text-white/90 mb-4">축하합니다! 배틀에서 승리했습니다!</p>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <span className="text-xl font-bold text-yellow-400">+{match?.bet_points ? match.bet_points * 2 : 0} 포인트</span>
                </div>
              </>
            ) : (
              <>
                <Skull className="w-24 h-24 text-red-400 mx-auto mb-4" />
                <h2 className="text-3xl font-black text-red-400 mb-2">패배</h2>
                <p className="text-white/90 mb-6">아쉽지만 다음 기회에 도전하세요!</p>
              </>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="vocamonster-primary-button w-full"
            >
              돌아가기
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="vocamonster-screen">
        <div className="flex items-center justify-center h-screen">
          <p className="text-white">매치를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const isPlayer1 = match.player1_id === user?.id
  const myHearts = isPlayer1 ? match.player1_hearts : match.player2_hearts
  const opponentHearts = isPlayer1 ? match.player2_hearts : match.player1_hearts
  const isMyTurn = match.current_turn === user?.id
  const availableDeck = userDeck.filter(w => !processedTurnsRef.current.has(w.id))

  return (
    <div className="vocamonster-screen">
      <div className="vocamonster-background" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="vocamonster-header">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black text-white">보카몬스터 배틀</h1>
          <div className="w-6" />
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-black/80 text-white text-sm font-bold"
            >
              {toastMessage.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle Arena */}
        <div className="flex-1 px-6 pt-6 pb-32 space-y-6">
          {/* Opponent */}
          <div className="flex items-center justify-between">
            <div className="vocamonster-card p-4 flex-1">
              <p className="text-white/70 text-xs mb-1">상대방</p>
              <p className="text-white font-bold text-lg">
                {match.is_bot_match ? 'VOCABOT' : '플레이어 2'}
              </p>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: opponentHearts }).map((_, i) => (
                  <Heart key={i} className="w-5 h-5 fill-red-500 text-red-500" />
                ))}
              </div>
            </div>
          </div>

          {/* Turn Indicator */}
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-full ${isMyTurn ? 'bg-yellow-400' : 'bg-gray-600'}`}>
              <p className="font-black text-sm">
                {isMyTurn ? '🗡️ 내 턴!' : '⏳ 상대방 턴'}
              </p>
            </div>
          </div>

          {/* Player */}
          <div className="flex items-center justify-between">
            <div className="vocamonster-card p-4 flex-1">
              <p className="text-white/70 text-xs mb-1">나</p>
              <p className="text-white font-bold text-lg">{user?.name || '플레이어'}</p>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: myHearts }).map((_, i) => (
                  <Heart key={i} className="w-5 h-5 fill-red-500 text-red-500" />
                ))}
              </div>
            </div>
          </div>

          {/* Battle Logs */}
          {battleLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-white/70 text-xs font-bold">전투 로그</p>
              {battleLogs.map(log => (
                <div key={log.id} className="vocamonster-card p-2">
                  <p className="text-white/90 text-xs">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Defense Question Modal */}
        <AnimatePresence>
          {showQuestion && currentQuestion && (
            <motion.div
              className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="vocamonster-card p-6 max-w-md w-full"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <div className="text-center mb-6">
                  <Shield className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                  <h3 className="text-2xl font-black text-white mb-2">{currentQuestion.word}</h3>
                  <p className="text-white/70 text-sm">
                    {currentQuestion.type === 'meaning' && '뜻을 고르세요'}
                    {currentQuestion.type === 'synonym' && '동의어를 고르세요'}
                    {currentQuestion.type === 'antonym' && '반의어를 고르세요'}
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  {choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => !showResult && setSelectedChoice(choice)}
                      disabled={showResult}
                      className={`w-full p-4 rounded-lg text-left font-bold transition-all ${
                        showResult
                          ? choice === currentQuestion.correctAnswer
                            ? 'bg-green-600 text-white'
                            : choice === selectedChoice
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-700 text-white/50'
                          : selectedChoice === choice
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>

                {!showResult && (
                  <button
                    onClick={submitDefense}
                    disabled={!selectedChoice || isAnswering}
                    className="vocamonster-primary-button w-full"
                  >
                    {isAnswering ? '제출 중...' : '답변 제출'}
                  </button>
                )}

                {showResult && (
                  <div className="text-center mt-4">
                    {isCorrect ? (
                      <>
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-2" />
                        <p className="text-green-400 font-black text-xl">방어 성공!</p>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-2" />
                        <p className="text-red-400 font-black text-xl">방어 실패!</p>
                        <p className="text-white/90 text-sm mt-1">-{damage} 하트</p>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot Defense Result Modal */}
        <AnimatePresence>
          {showBotDefenseResult && botDefenseResult && (
            <motion.div
              className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="vocamonster-card p-6 max-w-md w-full text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <h3 className="text-2xl font-black text-white mb-4">{botDefenseResult.word}</h3>
                <p className="text-white/70 text-sm mb-4">
                  {botDefenseResult.questionType === 'meaning' && '뜻 방어 결과'}
                  {botDefenseResult.questionType === 'synonym' && '동의어 방어 결과'}
                  {botDefenseResult.questionType === 'antonym' && '반의어 방어 결과'}
                </p>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-white/70 text-xs">봇의 답</p>
                    <p className="text-white font-bold">{botDefenseResult.botAnswer}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">정답</p>
                    <p className="text-white font-bold">{botDefenseResult.correctAnswer}</p>
                  </div>
                </div>

                {botDefenseResult.isCorrect ? (
                  <div className="mb-6">
                    <DefenseSuccessIcon size={120} />
                    <p className="text-green-400 font-black text-xl mt-2">봇 방어 성공!</p>
                  </div>
                ) : (
                  <div className="mb-6">
                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-2" />
                    <p className="text-red-400 font-black text-xl">봇 방어 실패!</p>
                  </div>
                )}

                <button
                  onClick={() => setShowBotDefenseResult(false)}
                  className="vocamonster-primary-button w-full"
                >
                  계속하기
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attack Panel */}
        <AnimatePresence>
          {isMyTurn && !showQuestion && !showBotDefenseResult && showAttackPanel && (
            <motion.div
              className="fixed inset-0 bg-black/90 z-40 flex items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttackPanel(false)}
            >
              <motion.div
                className="vocamonster-card rounded-t-3xl p-6 w-full max-h-[80vh] overflow-y-auto"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white font-bold text-lg">공격 카드 선택</p>
                  <button onClick={() => setShowAttackPanel(false)} className="text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {!selectedWord ? (
                  <div className="space-y-2">
                    {availableDeck.map(word => (
                      <button
                        key={word.id}
                        onClick={() => setSelectedWord(word)}
                        className="vocamonster-card p-4 w-full text-left"
                      >
                        <p className="text-white font-bold">{word.word}</p>
                        <p className="text-white/70 text-sm">{word.korean_meaning}</p>
                      </button>
                    ))}
                  </div>
                ) : !questionType ? (
                  <div className="space-y-4">
                    <div className="vocamonster-card p-4 bg-yellow-400/20">
                      <p className="text-white font-bold">{selectedWord.word}</p>
                      <button
                        onClick={() => setSelectedWord(null)}
                        className="text-white/70 text-xs mt-1"
                      >
                        변경
                      </button>
                    </div>
                    <p className="text-white font-bold">공격 유형 선택</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setQuestionType('meaning')}
                        className="vocamonster-card p-4 text-center"
                      >
                        <BookOpen className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                        <p className="text-white text-xs font-bold">뜻</p>
                      </button>
                      {selectedWord.synonyms?.length > 0 && (
                        <button
                          onClick={() => setQuestionType('synonym')}
                          className="vocamonster-card p-4 text-center"
                        >
                          <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                          <p className="text-white text-xs font-bold">동의어</p>
                        </button>
                      )}
                      {selectedWord.antonyms?.length > 0 && (
                        <button
                          onClick={() => setQuestionType('antonym')}
                          className="vocamonster-card p-4 text-center"
                        >
                          <Shield className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                          <p className="text-white text-xs font-bold">반의어</p>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="vocamonster-card p-4 bg-yellow-400/20">
                      <p className="text-white font-bold">{selectedWord.word}</p>
                      <p className="text-yellow-400 text-xs">
                        {questionType === 'meaning' ? '뜻' : questionType === 'synonym' ? '동의어' : '반의어'}
                      </p>
                    </div>
                    <button
                      onClick={submitAttack}
                      className="vocamonster-primary-button w-full"
                    >
                      ⚔️ 공격 실행
                    </button>
                    <button
                      onClick={() => setQuestionType(null)}
                      className="w-full text-white/70 text-sm"
                    >
                      공격 유형 다시 선택
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attack CTA */}
        {isMyTurn && !showQuestion && !showBotDefenseResult && !showAttackPanel && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-30">
            <button
              onClick={() => setShowAttackPanel(true)}
              className="vocamonster-primary-button w-full"
            >
              ⚔️ 공격하기
            </button>
          </div>
        )}

        {/* Waiting for Opponent */}
        {!isMyTurn && !showQuestion && !showBotDefenseResult && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-30 space-y-2">
            <div className="vocamonster-card p-6 text-center">
              <Target className="w-12 h-12 text-yellow-400 mx-auto mb-2 animate-spin" />
              <p className="text-white font-bold">상대방의 공격을 기다리는 중...</p>
            </div>
            <button
              onClick={leaveBattle}
              className="w-full rounded-xl bg-red-600 text-white font-bold py-3 flex items-center justify-center gap-2"
            >
              <Flag className="w-4 h-4" />
              <span>패배 선언 (항복하기)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
