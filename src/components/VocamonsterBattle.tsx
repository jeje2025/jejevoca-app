import React, { useState, useEffect, useRef, useCallback } from 'react'
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

// 방어 성공 아이콘 컴포넌트
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
  const [match, setMatch] = useState<Match | null>(null)
  const [userDeck, setUserDeck] = useState<Word[]>([])
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [questionType, setQuestionType] = useState<'meaning' | 'synonym' | 'antonym' | null>(null)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [timeLeft, setTimeLeft] = useState(10)
  const [showQuestion, setShowQuestion] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<{ word: string; type: string; correctAnswer: string } | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [isAnswering, setIsAnswering] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [damage, setDamage] = useState(0)
  const [gameEnded, setGameEnded] = useState(false)
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null)
  const [loading, setLoading] = useState(true)
  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([])
  const [toastMessage, setToastMessage] = useState<{message: string, type: BattleLog['type']} | null>(null)
  const [showAttackAnimation, setShowAttackAnimation] = useState(false)
  const [showDamageAnimation, setShowDamageAnimation] = useState(false)
  const [damagePosition, setDamagePosition] = useState<'left' | 'right'>('right')
  const userDeckRef = useRef<Word[]>([])
  const [botThinking, setBotThinking] = useState(false)
  const [showAttackPanel, setShowAttackPanel] = useState(false)
  const attackPanelOpenedRef = useRef(false)
  const getTurnMatchId = (turn: MatchTurn) => turn.match_id || null
  const [showBotDefenseResult, setShowBotDefenseResult] = useState(false)
  const [botDefenseResult, setBotDefenseResult] = useState<{
    word: string
    questionType: 'meaning' | 'synonym' | 'antonym'
    botAnswer: string
    correctAnswer: string
    isCorrect: boolean
  } | null>(null)
  const [showOpponentDefenseResult, setShowOpponentDefenseResult] = useState(false)
  const [opponentDefenseResult, setOpponentDefenseResult] = useState<{
    word: string
    questionType: 'meaning' | 'synonym' | 'antonym'
    opponentAnswer: string
    correctAnswer: string
    isCorrect: boolean
  } | null>(null)
  const processedDefenseTurnsRef = useRef<Set<string>>(new Set())
  const [usedWordIds, setUsedWordIds] = useState<Set<string>>(new Set())
  const prevMatchRef = useRef<Match | null>(null)
  const botAutoAnswerRef = useRef<((turn: MatchTurn) => Promise<void>) | null>(null)
  const triggerDamageAnimation = useCallback((amount: number) => {
    setDamage(amount)
    setDamagePosition('left')
    setShowDamageAnimation(true)
    setTimeout(() => setShowDamageAnimation(false), 800)
  }, [])

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.')
      onBack()
      return
    }

    // 최초 로딩 - 두 작업을 동시에 수행하고 모두 완료될 때까지 로딩 상태 유지
    const initBattle = async () => {
      setLoading(true)
      try {
        await Promise.all([loadMatch(), loadUserDeck()])
      } catch (error) {
        console.error('배틀 초기화 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    initBattle()
  }, [matchId, user?.id])

  // 시간 초과 시 턴 넘기기 함수
  const skipTurn = useCallback(async () => {
    if (!match || !user) return

    const isPlayer1 = match.player1_id === user.id
    const nextTurn = isPlayer1 ? match.player2_id : match.player1_id

    await supabase
      .from('battles')
      .update({ current_turn: nextTurn })
      .eq('id', matchId)

    setIsMyTurn(false)
    setTimeLeft(10)
    const newLog: BattleLog = {
      id: Date.now(),
      message: '⏰ 시간이 초과되어 턴을 넘겼습니다.',
      type: 'attack'
    }
    setBattleLogs(prev => [newLog, ...prev].slice(0, 5))
  }, [match, user, matchId])

  // 시간 초과 시 자동 오답 처리 함수
  const handleTimeOut = useCallback(async () => {
    if (!match || !currentQuestion || !user) return
    if (isAnswering || showResult) return
    
    setIsAnswering(true)

    try {
      const { data: currentTurnData, error: currentTurnError } = await supabase
        .from('battle_turns')
        .select('*')
        .eq('match_id', matchId)
        .eq('defender_id', user.id)
        .is('answer', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (currentTurnError || !currentTurnData) {
        throw currentTurnError
      }

      const currentTurn = currentTurnData as MatchTurn
      const questionWord = userDeck.find(w => w.id === currentTurn.word_id) || {
        id: currentTurn.word_id,
        word: currentTurn.word_text,
        korean_meaning: '',
        synonyms: [],
        antonyms: []
      }

      // 시간 초과는 항상 오답
      const correct = false
      const heartLoss = 1

      setIsCorrect(false)
      setDamage(heartLoss)
      setShowResult(true)
      setIsAnswering(false)

      triggerDamageAnimation(heartLoss)

      // addBattleLog는 일반 함수이므로 직접 호출
      const newLog: BattleLog = {
        id: Date.now(),
        message: `💔 시간 초과! 하트를 ${heartLoss}개 잃었습니다! 💥`,
        type: 'damage'
      }
      setBattleLogs(prev => [newLog, ...prev].slice(0, 5))

      await supabase
        .from('battle_turns')
        .update({
          answer: '시간 초과',
          is_correct: false,
          damage: heartLoss
        })
        .eq('id', currentTurn.id)

      const isPlayer1 = match.player1_id === user.id
      const newHearts = isPlayer1
        ? Math.max(0, match.player1_hearts - heartLoss)
        : Math.max(0, match.player2_hearts - heartLoss)

      const nextTurn = currentTurn.attacker_id

      const updateData: any = {
        [isPlayer1 ? 'player1_hearts' : 'player2_hearts']: newHearts,
        current_turn: nextTurn
      }

      if (newHearts === 0) {
        updateData.status = 'finished'
        updateData.winner_id = currentTurn.attacker_id
      }

      await supabase
        .from('battles')
        .update(updateData)
        .eq('id', matchId)

      setTimeout(() => {
        setShowQuestion(false)
        setShowResult(false)
        setSelectedChoice(null)
        setIsMyTurn(false)
        setTimeLeft(10)
      }, 2000)
    } catch (error) {
      console.error('시간 초과 처리 오류:', error)
      setShowResult(false)
      setShowQuestion(false)
      setSelectedChoice(null)
      setIsAnswering(false)
      setTimeLeft(10)
    }
  }, [match, currentQuestion, user, isAnswering, showResult, matchId, userDeck])

  useEffect(() => {
    if (!match) return
    // 내 공격 턴이거나, 방어 퀴즈 화면이 떠 있을 때만 타이머 동작
    if (!isMyTurn && !showQuestion) return

    // 시간이 0초가 되면 즉시 처리하고 타이머 중지
    if (timeLeft === 0) {
      // 내 공격 턴에서 시간 초과 → 턴을 넘김
      if (isMyTurn && !showQuestion) {
        skipTurn()
        return
      }
      // 방어 퀴즈에서 시간 초과 → 자동으로 오답 처리
      if (!isMyTurn && showQuestion && !isAnswering && !showResult && currentQuestion) {
        handleTimeOut()
        return
      }
      return
    }

    // timeLeft가 0보다 클 때만 타이머 실행
    const timer = setTimeout(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 1)
        
        // 0이 되면 즉시 처리 (다음 렌더링에서 처리됨)
        return next
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, isMyTurn, showQuestion, match, isAnswering, showResult, currentQuestion, handleTimeOut, skipTurn])

  useEffect(() => {
    if (isMyTurn && !showQuestion) {
      if (!attackPanelOpenedRef.current) {
        setShowAttackPanel(true)
        attackPanelOpenedRef.current = true
      }
    } else {
      setShowAttackPanel(false)
      setSelectedWord(null)
      setQuestionType(null)
      attackPanelOpenedRef.current = false
    }
  }, [isMyTurn, showQuestion])

  // 모달 열릴 때 body 스크롤 막기
  useEffect(() => {
    const isModalOpen = showQuestion || showBotDefenseResult || showOpponentDefenseResult || showAttackPanel

    if (isModalOpen) {
      // 현재 스크롤 위치 저장
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      // 스크롤 위치 복원
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
  }, [showQuestion, showBotDefenseResult, showOpponentDefenseResult, showAttackPanel])

  // 폴링 기반 매치/방어 턴 체크
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      // 모달이나 공격 패널이 열려있으면 polling 스킵 (깜빡임 방지 & 동시 공격 방지)
      if (showQuestion || showBotDefenseResult || showOpponentDefenseResult || showAttackPanel) {
        return
      }

      try {
        const { data: matchData, error: matchError } = await supabase
          .from('battles')
          .select('*')
          .eq('id', matchId)
          .single()

        if (matchError || !matchData) {
          return
        }

        const newMatch = matchData as Match

        // match가 실제로 변경되었을 때만 업데이트 (깜빡임 방지)
        const hasChanged = !prevMatchRef.current ||
          prevMatchRef.current.current_turn !== newMatch.current_turn ||
          prevMatchRef.current.player1_hearts !== newMatch.player1_hearts ||
          prevMatchRef.current.player2_hearts !== newMatch.player2_hearts ||
          prevMatchRef.current.status !== newMatch.status

        if (hasChanged) {
          prevMatchRef.current = newMatch
          setMatch(newMatch)
          setIsMyTurn(newMatch.current_turn === user.id)
          checkGameEnd(newMatch)
        }

        // 내가 방어해야 할 턴이 있는지 체크 (퀴즈가 안 떠 있을 때만)
        if (newMatch.current_turn === user.id && !showQuestion && !showBotDefenseResult && !showOpponentDefenseResult) {
          const { data: defenseTurn, error: defenseError } = await supabase
            .from('battle_turns')
            .select('*')
            .eq('match_id', matchId)
            .eq('defender_id', user.id)
            .is('answer', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!defenseError && defenseTurn) {
            console.log('⚡ 폴링으로 방어 퀴즈 표시:', defenseTurn)
            await showQuestionToDefender(defenseTurn as MatchTurn)
          }
        }

        // 봇이 방어해야 할 턴이 있는지 체크 (botAutoAnswer는 나중에 정의되므로 ref 사용)
        if (newMatch.is_bot_match && !showQuestion && !showBotDefenseResult && !showOpponentDefenseResult && !botThinking) {
          const { data: botDefenseTurn, error: botDefenseError } = await supabase
            .from('battle_turns')
            .select('*')
            .eq('match_id', matchId)
            .eq('defender_id', BOT_ID)
            .is('answer', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!botDefenseError && botDefenseTurn) {
            console.log('🤖 봇 방어 턴 감지, 자동 답변 시작:', botDefenseTurn)
            setBotThinking(true)
            // 1초 후 봇이 답변하도록 (botAutoAnswer는 나중에 정의되므로 직접 호출)
            setTimeout(() => {
              botAutoAnswerRef.current?.(botDefenseTurn as MatchTurn).then(() => {
                setBotThinking(false)
              })
            }, 1000)
          }
        }

        // 상대방의 방어 결과 체크 (내가 공격한 턴이 완료되었는지)
        if (!showQuestion && !showBotDefenseResult && !showOpponentDefenseResult && !newMatch.is_bot_match) {
          const isPlayer1 = newMatch.player1_id === user.id
          const opponentId = isPlayer1 ? newMatch.player2_id : newMatch.player1_id
          
          if (opponentId) {
            // 내가 공격한 턴 중에서 상대방이 방어를 완료한 것 찾기
            const { data: myAttackTurns, error: myAttackError } = await supabase
              .from('battle_turns')
              .select('*')
              .eq('match_id', matchId)
              .eq('attacker_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5)

            if (!myAttackError && myAttackTurns && myAttackTurns.length > 0) {
              // 방어가 완료된 턴 찾기 (answer가 null이 아닌 것)
              const completedTurn = myAttackTurns.find(turn => 
                turn.defender_id === opponentId && 
                turn.answer !== null && 
                !processedDefenseTurnsRef.current.has(turn.id)
              )

              if (completedTurn) {
                console.log('🎯 상대방 방어 결과 감지:', completedTurn)
                processedDefenseTurnsRef.current.add(completedTurn.id)
                
                // 단어 정보 가져오기 (words 테이블에서)
                const { data: wordData, error: wordError } = await supabase
                  .from('words')
                  .select('korean_meaning, synonyms, antonyms')
                  .eq('id', completedTurn.word_id)
                  .single()

                let correctAnswerText = ''
                if (completedTurn.question_type === 'meaning') {
                  correctAnswerText = wordData?.korean_meaning || ''
                } else if (completedTurn.question_type === 'synonym') {
                  correctAnswerText = wordData?.synonyms?.[0] || ''
                } else if (completedTurn.question_type === 'antonym') {
                  correctAnswerText = wordData?.antonyms?.[0] || ''
                }

                setOpponentDefenseResult({
                  word: completedTurn.word_text,
                  questionType: completedTurn.question_type,
                  opponentAnswer: completedTurn.answer || '',
                  correctAnswer: correctAnswerText,
                  isCorrect: completedTurn.is_correct || false
                })
                setShowOpponentDefenseResult(true)
              }
            }
          }
        }
      } catch (err) {
        console.error('매치/방어 폴링 오류:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [matchId, user?.id, showQuestion, showBotDefenseResult, showOpponentDefenseResult, showAttackPanel, match?.is_bot_match, botThinking])

  // 봇 자동 공격 트리거 (봇 턴일 때만, 단 showBotDefenseResult가 false일 때만)
  useEffect(() => {
    if (!match || !user) return

    const isBotTurn = match.current_turn === BOT_ID
    // showBotDefenseResult가 true이면 "계속하기" 버튼을 기다림
    const canAttack = !botThinking && !showQuestion && !showBotDefenseResult && !showOpponentDefenseResult && !showAttackPanel

    if (isBotTurn && canAttack && match.status === 'active') {
      console.log('🤖 봇 턴! 2초 후 자동 공격')
      const timer = setTimeout(() => {
        botAutoAttack()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [match?.current_turn, match?.status, user, botThinking, showQuestion, showBotDefenseResult, showOpponentDefenseResult, showAttackPanel, botAutoAttack])

  const addBattleLog = (message: string, type: BattleLog['type'] = 'attack') => {
    const newLog: BattleLog = {
      id: Date.now(),
      message,
      type
    }
    setBattleLogs(prev => [newLog, ...prev].slice(0, 5)) // 최대 5개만 유지

    // 토스트로도 표시
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 3000) // 3초 후 자동으로 사라짐
  }

  const loadMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('id', matchId)
        .single()

      if (error) {
        console.error('매치 로드 오류:', error)
        throw error
      }

      // 하트 시스템 마이그레이션 지원: player1_hp가 있으면 hearts로 변환
      if (!data.player1_hearts && (data as any).player1_hp !== undefined) {
        data.player1_hearts = Math.min((data as any).player1_hp || 5, 5)
      }
      if (!data.player2_hearts && (data as any).player2_hp !== undefined) {
        data.player2_hearts = Math.min((data as any).player2_hp || 5, 5)
      }

      // 하트가 없으면 5로 초기화
      if (!data.player1_hearts) data.player1_hearts = 5
      if (!data.player2_hearts) data.player2_hearts = 5

      setMatch(data)
      setIsMyTurn(data.current_turn === user?.id)
      checkGameEnd(data)
      addBattleLog('🏁 배틀이 시작되었습니다! ⚔️', 'attack')
    } catch (error: any) {
      console.error('매치 로드 오류:', error)
      alert('매치를 불러올 수 없습니다.')
      onBack()
      throw error
    }
  }

  const loadUserDeck = async () => {
    try {
      const token = authService.getAccessToken()
      
      if (!token) return

      // Load from user_decks table
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/deck`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
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
        console.log(`✅ 배틀 덱 로드 완료: ${words.length}개`)
      } else {
        // Fallback: Load from words table if deck is empty
        const words: Word[] = []
        for (let day = 1; day <= 16; day++) {
          try {
            const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/1/${day}`
            const response = await fetch(url, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            })

            if (response.ok) {
              const data = await response.json()
              if (data.words) {
                words.push(...data.words.map((w: any) => ({
                  id: w.id,
                  word: w.word,
                  korean_meaning: w.koreanMeaning,
                  pronunciation: w.pronunciation,
                  synonyms: w.synonyms || [],
                  antonyms: w.antonyms || []
                })))
              }
            }
          } catch (error) {
            console.error(`Day ${day} 로드 오류:`, error)
          }
        }

        const trimmed = words.slice(0, 50)
        setUserDeck(trimmed)
        userDeckRef.current = trimmed
      }
    } catch (error) {
      console.error('덱 로드 오류:', error)
    }
  }

  const leaveBattle = async () => {
    try {
      if (match && match.status !== 'finished') {
        const isPlayer1 = match.player1_id === user?.id
        const opponentId = isPlayer1 ? match.player2_id : match.player1_id
        const payload: Partial<Match> = {
          status: 'finished',
        }
        if (opponentId) {
          payload.winner_id = opponentId as string
        }
        await supabase.from('battles').update(payload).eq('id', match.id)

        // 로컬에서도 즉시 패배 화면을 보여주기 위해 상태 업데이트
        const surrenderedMatch: Match = {
          ...match,
          status: 'finished',
          winner_id: opponentId as string
        }
        setMatch(surrenderedMatch)
        await checkGameEnd(surrenderedMatch)
      }
    } catch (error) {
      console.error('배틀 종료 처리 오류:', error)
    }
  }

  const botAutoAttack = async () => {
    console.log('🤖 botAutoAttack 시작')
    setBotThinking(true)

    if (!match) {
      console.log('🤖 매치 없음')
      setBotThinking(false)
      return
    }

    try {
      let deck = userDeckRef.current
      if (!deck.length) {
        await loadUserDeck()
        deck = userDeckRef.current
      }

      if (!deck.length) {
        console.warn('VOCABOT 공격을 위한 카드가 없습니다.')
        setBotThinking(false)
        return
      }

      const word = deck[Math.floor(Math.random() * deck.length)]
      const questionPool: Array<'meaning' | 'synonym' | 'antonym'> = ['meaning']
      if (word.synonyms && word.synonyms.length) questionPool.push('synonym')
      if (word.antonyms && word.antonyms.length) questionPool.push('antonym')
      const questionType = questionPool[Math.floor(Math.random() * questionPool.length)]

      const defenderId = match.player1_id === BOT_ID ? match.player2_id : match.player1_id
      if (!defenderId) {
        setBotThinking(false)
        return
      }

      addBattleLog('🤖 VOCABOT이 전자기 펄스를 충전합니다… ⚡', 'attack')

      // battle_turns 테이블에 VOCABOT 공격 턴 생성 (정답은 나중에 사용자가 풂)
      const { data: insertedTurn, error: insertError } = await supabase
        .from('battle_turns')
        .insert({
          match_id: match.id,
          attacker_id: BOT_ID,
          defender_id: defenderId,
          word_id: word.id,
          word_text: word.word,
          question_type: questionType
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Realtime이 늦게 오거나 안 올 때를 대비해서, 여기서 바로 방어 퀴즈를 띄워준다
      if (defenderId === user?.id && insertedTurn) {
        console.log('⚡ VOCABOT 공격 직후 바로 방어 퀴즈 표시:', insertedTurn)
        await showQuestionToDefender(insertedTurn as MatchTurn)
      }

      console.log(`🤖 봇 공격 완료 → 턴을 플레이어(${defenderId})에게 넘김`)
      const { error: turnError } = await supabase
        .from('battles')
        .update({ current_turn: defenderId })
        .eq('id', match.id)

      if (turnError) {
        console.error('🤖 턴 전환 오류:', turnError)
        throw turnError
      }

      console.log('✅ 턴 전환 완료: 이제 플레이어 방어 차례')
    } catch (error) {
      console.error('봇 공격 생성 오류:', error)
    } finally {
      console.log('🤖 botThinking false로 설정')
      setBotThinking(false)
    }
  }

  const checkGameEnd = async (matchData: Match) => {
    if (gameEnded) return

    if (matchData.status === 'finished') {
      const won = matchData.winner_id
        ? matchData.winner_id === user?.id
        : (matchData.player1_id === user?.id
            ? matchData.player1_hearts > 0
            : matchData.player2_hearts > 0)
      setGameEnded(true)
      setGameResult(won ? 'win' : 'lose')
      
      await handleGameEnd(matchData, won)
      // 패배/승리 화면을 최소 3초는 보여주기 위해 콜백을 지연 실행
      setTimeout(() => {
        onMatchEnd(won, won ? matchData.bet_points : -matchData.bet_points)
      }, 3000)
    } else if (matchData.player1_hearts <= 0 || matchData.player2_hearts <= 0) {
      const isPlayer1 = matchData.player1_id === user?.id
      const won = isPlayer1 ? matchData.player1_hearts > 0 : matchData.player2_hearts > 0
      
      await supabase
        .from('battles')
        .update({ 
          status: 'finished',
          winner_id: won ? user?.id : (isPlayer1 ? matchData.player2_id : matchData.player1_id)
        })
        .eq('id', matchId)

      setGameEnded(true)
      setGameResult(won ? 'win' : 'lose')
      
      await handleGameEnd(matchData, won)
      onMatchEnd(won, won ? matchData.bet_points : -matchData.bet_points)
    }
  }

  const handleGameEnd = async (matchData: Match, won: boolean) => {
    const winnerId = won
      ? user?.id
      : (matchData.player1_id === user?.id ? matchData.player2_id : matchData.player1_id)
    const loserId = won
      ? (matchData.player1_id === user?.id ? matchData.player2_id : matchData.player1_id)
      : user?.id

    try {
      // 승자 정보 가져오기
      const { data: winner } = await supabase
        .from('users')
        .select('points, wins')
        .eq('id', winnerId)
        .single()

      // 패자 정보 가져오기
      const { data: loser } = await supabase
        .from('users')
        .select('points, losses')
        .eq('id', loserId)
        .single()

      if (winner && loser) {
        // 승자 포인트 증가 및 승리 카운트
        await supabase
          .from('users')
          .update({
            points: (winner.points || 0) + matchData.bet_points,
            wins: (winner.wins || 0) + 1
          })
          .eq('id', winnerId)

        // 패자 포인트 감소 및 패배 카운트
        await supabase
          .from('users')
          .update({
            points: Math.max(0, (loser.points || 0) - matchData.bet_points),
            losses: (loser.losses || 0) + 1
          })
          .eq('id', loserId)
      }

      // 포인트 업데이트 (authService)
      if (won) {
        updatePoints(matchData.bet_points)
        addBattleLog('🏆 승리했습니다! 영광의 왕관을 차지했습니다! 👑', 'victory')
      } else {
        updatePoints(-matchData.bet_points)
        addBattleLog('💀 패배했습니다... 다음번엔 더 강해져서 돌아오세요!', 'victory')
      }
    } catch (error) {
      console.error('게임 종료 처리 오류:', error)
    }
  }

  const updatePoints = async (pointsChange: number) => {
    try {
      const currentUser = authService.getUser()
      if (!currentUser) return

      // users 테이블에서 현재 포인트 가져오기
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('points')
        .eq('id', currentUser.id)
        .single()

      if (fetchError) {
        console.error('포인트 조회 오류:', fetchError)
        return
      }

      const currentPoints = userData?.points || 0
      const newPoints = Math.max(0, currentPoints + pointsChange)
      
      // users 테이블에 직접 업데이트
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', currentUser.id)

      if (updateError) {
        console.error('포인트 업데이트 오류:', updateError)
      } else {
        console.log('✅ 포인트 업데이트 완료:', newPoints)
      }
    } catch (error) {
      console.error('포인트 업데이트 실패:', error)
    }
  }

  const generateChoices = (word: Word, type: 'meaning' | 'synonym' | 'antonym'): string[] => {
    let correctAnswer = ''
    let wrongAnswers: string[] = []

    switch (type) {
      case 'meaning':
        correctAnswer = word.korean_meaning || ''
        // 정답이 없으면 빈 배열 반환
        if (!correctAnswer || correctAnswer.trim() === '') {
          console.error('정답이 없습니다:', word)
          return []
        }
        wrongAnswers = [
          ...userDeck.filter(w => w.id !== word.id && w.korean_meaning && w.korean_meaning.trim() !== '')
            .map(w => w.korean_meaning).slice(0, 10),
          ...DISTRACTOR_MEANINGS
        ]
        break
      case 'synonym':
        if (word.synonyms && word.synonyms.length > 0) {
          correctAnswer = word.synonyms[0] || ''
          if (!correctAnswer || correctAnswer.trim() === '') {
            return generateChoices(word, 'meaning')
          }
          wrongAnswers = [
            ...(word.synonyms.slice(1) || []).filter(s => s && s.trim() !== ''),
            ...(word.antonyms?.slice(0, 4) || []).filter(a => a && a.trim() !== ''),
            ...userDeck.filter(w => w.id !== word.id && w.synonyms && w.synonyms.length > 0)
              .flatMap(w => w.synonyms || [])
              .filter(s => s && s.trim() !== '')
              .slice(0, 4)
          ]
        } else {
          return generateChoices(word, 'meaning')
        }
        break
      case 'antonym':
        if (word.antonyms && word.antonyms.length > 0) {
          correctAnswer = word.antonyms[0] || ''
          if (!correctAnswer || correctAnswer.trim() === '') {
            return generateChoices(word, 'meaning')
          }
          wrongAnswers = [
            ...(word.antonyms.slice(1) || []).filter(a => a && a.trim() !== ''),
            ...(word.synonyms?.slice(0, 4) || []).filter(s => s && s.trim() !== ''),
            ...userDeck.filter(w => w.id !== word.id && w.antonyms && w.antonyms.length > 0)
              .flatMap(w => w.antonyms || [])
              .filter(a => a && a.trim() !== '')
              .slice(0, 4)
          ]
        } else {
          return generateChoices(word, 'meaning')
        }
        break
    }

    const shuffledWrong = wrongAnswers
      .filter(a => a && a.trim() !== '' && a !== correctAnswer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4)

    // 최소 2개 이상의 선택지가 있어야 함
    if (shuffledWrong.length < 1) {
      // 오답이 부족하면 DISTRACTOR_MEANINGS에서 가져오기
      const fallbacks = DISTRACTOR_MEANINGS
        .filter(m => m && m.trim() !== '' && m !== correctAnswer)
        .slice(0, 4 - shuffledWrong.length)
      shuffledWrong.push(...fallbacks)
    }

    const allChoices = [correctAnswer, ...shuffledWrong.slice(0, 4)]
      .filter(c => c && c.trim() !== '')
      .sort(() => Math.random() - 0.5)
    
    return allChoices.length >= 2 ? allChoices : []
  }

  const submitAttack = async () => {
    if (!selectedWord || !questionType || !match || !user) return

    try {
      const isPlayer1 = match.player1_id === user.id
      const defenderId = isPlayer1 ? match.player2_id : match.player1_id

      setShowAttackAnimation(true)
      addBattleLog(`⚔️ ${selectedWord.word}의 힘을 모아 공격!`, 'attack')
      setTimeout(() => setShowAttackAnimation(false), 1000)

      // battle_turns 테이블에 턴 생성
      const { data: insertedTurn, error: insertError } = await supabase
        .from('battle_turns')
        .insert({
          match_id: matchId,
          attacker_id: user.id,
          defender_id: defenderId,
          word_id: selectedWord.id,
          word_text: selectedWord.word,
          question_type: questionType
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      const turn = insertedTurn as MatchTurn

      // 사용한 카드는 현재 배틀에서 숨김
      setUsedWordIds(prev => {
        const next = new Set(prev)
        next.add(selectedWord.id)
        return next
      })

      // 턴 종료
      setSelectedWord(null)
      setQuestionType(null)
      setIsMyTurn(false)
      setShowAttackPanel(false)

      await supabase
        .from('battles')
        .update({ current_turn: defenderId })
        .eq('id', matchId)

    } catch (error: any) {
      console.error('공격 제출 오류:', error)
      alert(error.message || '공격에 실패했습니다.')
    }
  }

  const showQuestionToDefender = async (turn: MatchTurn) => {
    try {
      // 단어 정보 가져오기
      let word = userDeck.find(w => w.id === turn.word_id)

      // userDeck에 없으면 데이터베이스에서 직접 가져오기
      if (!word) {
        try {
          const { data: wordData, error } = await supabase
            .from('words')
            .select('id, word, korean_meaning, pronunciation, synonyms, antonyms')
            .eq('id', turn.word_id)
            .single()

          if (wordData && !error) {
            word = {
              id: wordData.id,
              word: wordData.word,
              korean_meaning: wordData.korean_meaning || '',
              pronunciation: wordData.pronunciation,
              synonyms: wordData.synonyms || [],
              antonyms: wordData.antonyms || []
            }
            console.log('✅ 데이터베이스에서 단어 로드:', word)
          } else {
            console.error('❌ 단어 로드 실패:', error)
            word = {
              id: turn.word_id,
              word: turn.word_text,
              korean_meaning: '',
              synonyms: [],
              antonyms: []
            }
          }
        } catch (fetchError) {
          console.error('❌ 단어 fetch 오류:', fetchError)
          word = {
            id: turn.word_id,
            word: turn.word_text,
            korean_meaning: '',
            synonyms: [],
            antonyms: []
          }
        }
      }

      // 실제로 사용할 문제 유형 결정
      let questionType = turn.question_type
      const hasSynonyms = word.synonyms && word.synonyms.length > 0
      const hasAntonyms = word.antonyms && word.antonyms.length > 0

      if (questionType === 'synonym' && !hasSynonyms) {
        questionType = 'meaning'
      } else if (questionType === 'antonym' && !hasAntonyms) {
        questionType = 'meaning'
      }

      const choices = generateChoices(word, questionType)
      
      // 선택지가 없거나 부족하면 에러 처리
      if (!choices || choices.length < 2) {
        console.error('선택지 생성 실패:', { word, questionType, choices })
        // 기본 선택지 생성 시도
        const fallbackChoices = [
          word.korean_meaning || '알 수 없음',
          ...DISTRACTOR_MEANINGS.slice(0, 4)
        ].filter(c => c && c.trim() !== '')
        
        if (fallbackChoices.length >= 2) {
          setCurrentQuestion({
            word: turn.word_text,
            type: questionType,
            correctAnswer: fallbackChoices[0]
          })
          setChoices(fallbackChoices)
        } else {
          console.error('기본 선택지도 생성 실패')
          return
        }
      } else {
        const correctAnswer = choices.find(c => {
          if (questionType === 'meaning') return c === word.korean_meaning
          if (questionType === 'synonym') return word.synonyms?.includes(c)
          if (questionType === 'antonym') return word.antonyms?.includes(c)
          return false
        }) || choices[0]

        setCurrentQuestion({
          word: turn.word_text,
          type: questionType,
          correctAnswer: correctAnswer || choices[0]
        })
        setChoices(choices.filter(c => c && c.trim() !== ''))
      }
      setShowQuestion(true)
      // 아직 답변을 선택하지 않았으니 클릭 가능 상태로
      setIsAnswering(false)
      // 방어 퀴즈는 10초 제한
      setTimeLeft(10)
    } catch (error) {
      console.error('질문 표시 오류:', error)
    }
  }

  const botAutoAnswer = useCallback(async (turn: MatchTurn) => {
    try {
      console.log('봇이 답변 중...', turn)

      // 단어 정보 가져오기
      let word = userDeck.find(w => w.id === turn.word_id)

      // userDeck에 없으면 데이터베이스에서 직접 가져오기
      if (!word) {
        try {
          const { data: wordData, error } = await supabase
            .from('words')
            .select('id, word, korean_meaning, pronunciation, synonyms, antonyms')
            .eq('id', turn.word_id)
            .single()

          if (wordData && !error) {
            word = {
              id: wordData.id,
              word: wordData.word,
              korean_meaning: wordData.korean_meaning || '',
              pronunciation: wordData.pronunciation,
              synonyms: wordData.synonyms || [],
              antonyms: wordData.antonyms || []
            }
          } else {
            word = {
              id: turn.word_id,
              word: turn.word_text,
              korean_meaning: '',
              synonyms: [],
              antonyms: []
            }
          }
        } catch (fetchError) {
          word = {
            id: turn.word_id,
            word: turn.word_text,
            korean_meaning: '',
            synonyms: [],
            antonyms: []
          }
        }
      }

      // 봇 난이도: 70% 확률로 정답
      const botCorrectRate = 0.7
      const willAnswerCorrect = Math.random() < botCorrectRate

      let botAnswer = ''
      let isCorrect = false

      if (willAnswerCorrect) {
        // 정답 선택
        switch (turn.question_type) {
          case 'meaning':
            botAnswer = word.korean_meaning
            isCorrect = true
            break
          case 'synonym':
            botAnswer = word.synonyms?.[0] || ''
            isCorrect = true
            break
          case 'antonym':
            botAnswer = word.antonyms?.[0] || ''
            isCorrect = true
            break
        }
      } else {
        // 오답 선택
        const choices = generateChoices(word, turn.question_type)
        const wrongAnswers = choices.filter(c => {
          if (turn.question_type === 'meaning') return c !== word.korean_meaning
          if (turn.question_type === 'synonym') return !word.synonyms?.includes(c)
          if (turn.question_type === 'antonym') return !word.antonyms?.includes(c)
          return true
        })
        botAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)] || choices[0]
        isCorrect = false
      }

      // 정답 텍스트 계산 (UI 표시용)
      let correctAnswerText = ''
      switch (turn.question_type) {
        case 'meaning':
          correctAnswerText = word.korean_meaning
          break
        case 'synonym':
          correctAnswerText = word.synonyms?.[0] || ''
          break
        case 'antonym':
          correctAnswerText = word.antonyms?.[0] || ''
          break
      }

      // VOCABOT 방어 결과 모달 표시
      setBotDefenseResult({
        word: word.word,
        questionType: turn.question_type,
        botAnswer,
        correctAnswer: correctAnswerText,
        isCorrect
      })
      setShowBotDefenseResult(true)

      // 턴 업데이트
      await supabase
        .from('battle_turns')
        .update({
          answer: botAnswer,
          is_correct: isCorrect,
          damage: isCorrect ? 0 : 1
        })
        .eq('id', turn.id)

      // 매치 정보 업데이트
      const targetMatchId = getTurnMatchId(turn)
      const { data: matchData } = await supabase
        .from('battles')
        .select('*')
        .eq('id', targetMatchId)
        .single()

      if (!matchData) return

      const isPlayer1 = matchData.player1_id === turn.defender_id
      const damage = isCorrect ? 0 : 1
      const newHearts = isPlayer1
        ? Math.max(0, matchData.player1_hearts - damage)
        : Math.max(0, matchData.player2_hearts - damage)

      // 턴 전환: 방어 성공 → 방어자 턴, 방어 실패 → 공격자 계속
      const nextTurn = isCorrect ? turn.defender_id : turn.attacker_id

      const updateData: any = {
        [isPlayer1 ? 'player1_hearts' : 'player2_hearts']: newHearts,
        current_turn: nextTurn
      }

      console.log(`🎯 봇 방어 결과: ${isCorrect ? '성공' : '실패'}, 다음 턴: ${nextTurn === BOT_ID ? 'BOT' : 'PLAYER'}`)

      if (newHearts === 0) {
        updateData.status = 'finished'
        updateData.winner_id = turn.attacker_id
      }

      await supabase
        .from('battles')
        .update(updateData)
        .eq('id', targetMatchId)

    } catch (error) {
      console.error('봇 답변 오류:', error)
    }
  }, [userDeck, matchId])

  // botAutoAnswer를 ref에 할당
  useEffect(() => {
    botAutoAnswerRef.current = botAutoAnswer
  }, [botAutoAnswer])

  const submitAnswer = useCallback(async (answer: string) => {
    if (!match || !currentQuestion || !user) return
    
    // 이미 답변을 제출한 상태면 중복 실행 방지
    if (isAnswering || showResult) return
    
    setIsAnswering(true)

    try {
      // 현재 턴 찾기
      const { data: currentTurnData, error: currentTurnError } = await supabase
        .from('battle_turns')
        .select('*')
        .eq('match_id', matchId)
        .eq('defender_id', user.id)
        .is('answer', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (currentTurnError || !currentTurnData) {
        throw currentTurnError
      }

      const currentTurn = currentTurnData as MatchTurn

      const questionWord = userDeck.find(w => w.id === currentTurn.word_id) || {
        id: currentTurn.word_id,
        word: currentTurn.word_text,
        korean_meaning: '',
        synonyms: [],
        antonyms: []
      }

      let correct = false
      if (currentQuestion.type === 'meaning') {
        correct = answer === currentQuestion.correctAnswer
      } else if (currentQuestion.type === 'synonym') {
        correct = !!questionWord.synonyms?.includes(answer)
      } else if (currentQuestion.type === 'antonym') {
        correct = !!questionWord.antonyms?.includes(answer)
      }
      const heartLoss = correct ? 0 : 1

      setIsCorrect(correct)
      setDamage(heartLoss)
      setShowResult(true)
      setIsAnswering(false)

      if (correct) {
        addBattleLog('🛡️ 방어 성공! 반격 기회를 얻었습니다! ⚡', 'defend')
      } else {
        addBattleLog(`💔 방어 실패! 하트를 ${heartLoss}개 잃었습니다! 💥`, 'damage')
        triggerDamageAnimation(heartLoss)
      }

      // 턴 업데이트
      await supabase
        .from('battle_turns')
        .update({
          answer: answer,
          is_correct: correct,
          damage: heartLoss
        })
        .eq('id', currentTurn.id)

      // 매치 정보 업데이트
      const isPlayer1 = match.player1_id === user.id
      const newHearts = isPlayer1
        ? Math.max(0, match.player1_hearts - heartLoss)
        : Math.max(0, match.player2_hearts - heartLoss)

      // 턴 전환: 방어 성공 → 방어자 턴, 방어 실패 → 공격자 계속
      const nextTurn = correct ? user.id : currentTurn.attacker_id

      const updateData: any = {
        [isPlayer1 ? 'player1_hearts' : 'player2_hearts']: newHearts,
        current_turn: nextTurn
      }

      console.log(`🎯 플레이어 방어 결과: ${correct ? '성공' : '실패'}, 다음 턴: ${nextTurn === user.id ? 'PLAYER' : 'BOT'}`)

      if (newHearts === 0) {
        updateData.status = 'finished'
        updateData.winner_id = currentTurn.attacker_id
      }

      await supabase
        .from('battles')
        .update(updateData)
        .eq('id', matchId)

      setTimeout(() => {
        setShowQuestion(false)
        setShowResult(false)
        setSelectedChoice(null)
        setIsMyTurn(correct)
        // 내 공격 턴이 오면 10초로 리셋
        setTimeLeft(10)
      }, 2000)
    } catch (error) {
      console.error('답안 제출 오류:', error)
      // 오류가 나더라도 화면이 영원히 멈춰있지 않도록 최소한 정리
      setShowResult(false)
      setShowQuestion(false)
      setSelectedChoice(null)
      setIsAnswering(false)
      setTimeLeft(10)
    }
  }, [match, currentQuestion, user, isAnswering, showResult, matchId, userDeck])

  if (loading) {
    return (
      <div className="vocamonster-container fixed inset-0 overflow-hidden">
        <div className="w-full max-w-sm mx-auto relative h-full flex flex-col justify-center">
          <div className="vocamonster-header">
            <div className="flex items-center justify-between h-full px-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="w-6 h-6 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
              <h1 className="text-center vocamonster-text-primary text-xl font-bold">VOCAMONSTER</h1>
              <div className="w-6 h-6" />
            </div>
          </div>

          <div className="px-6 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="vocamonster-card p-12 text-center relative overflow-hidden"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-6"
              >
                <Target className="w-16 h-16 vocamonster-text-primary mx-auto" />
              </motion.div>
              <p className="vocamonster-text-primary text-xl font-bold mb-2">배틀 준비 중...</p>
              <p className="vocamonster-text-secondary text-sm">잠시만 기다려주세요</p>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (gameEnded) {
    return (
      <div className="vocamonster-container fixed inset-0 overflow-hidden">
        <div className="w-full max-w-sm mx-auto relative h-full overflow-y-auto">
          <div className="vocamonster-header">
            <div className="flex items-center justify-between h-full px-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="w-6 h-6 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
              <h1 className="text-center vocamonster-text-primary text-xl font-bold">VOCAMONSTER</h1>
              <div className="w-6 h-6" />
            </div>
          </div>

          <div className="px-6 py-6 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="vocamonster-card p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              {gameResult === 'win' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-6"
                  >
                    <Trophy className="w-24 h-24 text-yellow-300 mx-auto drop-shadow-2xl" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl font-black text-yellow-300 mb-4 drop-shadow-lg"
                  >
                    VICTORY!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl font-bold text-yellow-300 mb-4"
                  >
                    +{match?.bet_points || 0} 포인트 획득
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex gap-2 justify-center mb-6"
                  >
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.9 + i * 0.1, type: "spring" }}
                        className="text-2xl"
                      >
                        ⭐
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-6"
                  >
                    <Skull className="w-24 h-24 vocamonster-defeat-icon mx-auto drop-shadow-2xl" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl font-black vocamonster-defeat-title mb-4 drop-shadow-lg"
                  >
                    DEFEAT
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg font-bold vocamonster-defeat-points mb-4"
                  >
                    -{match?.bet_points || 0} 포인트
                  </motion.p>
                </>
              )}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="w-full vocamonster-card p-4 font-black text-base text-white touch-manipulation"
              >
                돌아가기
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (!match) return null

  const isPlayer1 = match.player1_id === user?.id
  const myHearts = isPlayer1 ? match.player1_hearts : match.player2_hearts
  const opponentHearts = isPlayer1 ? match.player2_hearts : match.player1_hearts
  const opponentIsBot = match.is_bot_match && (match.player1_id === BOT_ID || match.player2_id === BOT_ID)
  const opponentName = opponentIsBot ? 'VOCABOT' : '상대방'
  const opponentBadge = opponentIsBot ? 'AI 모드' : '온라인'
  const opponentEmoji = opponentIsBot ? '🤖' : '👹'
  const betPointsDisplay = match.bet_points || 0
  const availableDeck = userDeck.filter(word => !usedWordIds.has(word.id))

  return (
    <div className="vocamonster-container fixed inset-0 overflow-hidden">
      <div className="w-full max-w-sm mx-auto relative h-full overflow-y-auto">
        <div className="vocamonster-header">
          <div className="flex items-center justify-between h-full px-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={leaveBattle}
              className="flex items-center gap-2 vocamonster-text-primary font-bold min-h-[44px] touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
              <span>나가기</span>
            </motion.button>
            <h1 className="text-center vocamonster-text-primary text-xl font-bold">BATTLE</h1>
            <div className="w-6 h-6" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Battle Info */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="vocamonster-card p-4 flex items-center justify-between"
          >
            <div>
              <p className="vocamonster-text-secondary text-xs uppercase tracking-wide">Bet Stakes</p>
              <div className="flex items-center gap-2 mt-1">
                <Coins className="w-5 h-5 text-yellow-400" />
                <p className="vocamonster-points-text text-2xl font-black drop-shadow-lg">
                  {betPointsDisplay.toLocaleString()} P
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="vocamonster-text-secondary text-xs uppercase tracking-wide">Battle Mode</p>
              <p className="vocamonster-text-primary text-lg font-bold">
                {match.is_bot_match ? 'Solo vs AI' : 'Multiplayer'}
              </p>
            </div>
          </motion.div>

          {opponentIsBot && botThinking && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cyan-500/90 rounded-lg shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                <span className="text-white text-sm font-semibold">VOCABOT 공격 준비 중...</span>
              </div>
            </motion.div>
          )}

          {/* 게임 안내 토스트 */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
                  toastMessage.type === 'damage' ? 'bg-red-500/90' :
                  toastMessage.type === 'defend' ? 'bg-green-500/90' :
                  toastMessage.type === 'victory' ? 'bg-yellow-500/90' :
                  'bg-blue-500/90'
                }`}
              >
                <span className="text-white text-sm font-semibold">{toastMessage.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

        {/* 배틀 필드 - 퀴즈 화면이 표시될 때는 숨김 */}
        {!showQuestion && (
        <div className="relative mb-6 overflow-visible">
          {/* 상대방 (위) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`vocamonster-card p-6 mb-4 relative overflow-visible ${opponentIsBot ? 'border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 to-blue-700/10' : 'border-red-500/30 bg-gradient-to-br from-red-600/10 to-red-800/10'}`}
          >
            {/* 게임적 효과 - 상대방 주변에 에너지 필드 */}
            <div className="absolute inset-0 rounded-2xl overflow-visible">
              <div className={`absolute inset-0 ${opponentIsBot ? 'bg-cyan-400/5' : 'bg-red-400/5'}`}></div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {opponentIsBot ? (
                    <img src="/vocamonster/bot-icon.png" alt="Bot" className="w-16 h-16 object-contain vocamonster-icon-transparent" />
                  ) : (
                    <img src="/vocamonster/player-you-icon.png" alt="Opponent" className="w-16 h-16 object-contain vocamonster-icon-transparent" />
                  )}
                  <div>
                    <div className="vocamonster-text-primary font-black text-lg">{opponentName}</div>
                    <div className="vocamonster-text-secondary text-[10px] uppercase tracking-widest">{opponentBadge}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-3xl transition-all">
                    {i < opponentHearts ? '❤️' : '💔'}
                  </span>
                ))}
              </div>
            </div>

            {opponentIsBot && (
              <div className="text-right vocamonster-text-secondary text-[11px] uppercase tracking-widest">
                Neural Core {botThinking ? 'Charging...' : 'Ready'}
              </div>
            )}

            {/* 데미지 애니메이션 */}
            <AnimatePresence>
              {showDamageAnimation && damagePosition === 'right' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="fixed top-1/2 left-1/2 z-[120] pointer-events-none"
                  style={{ transform: 'translate(160px, -50%)' }}
                >
                  <div className="relative">
                    <motion.img
                      src="/vocamonster/damage.png"
                      alt="Damage"
                      className="w-[220px] h-auto object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 24px rgba(248, 113, 113, 0.7))'
                      }}
                      animate={{ rotate: [-5, 5, -5] }}
                      transition={{ duration: 0.4, repeat: 2, ease: "easeInOut" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl font-black text-red-500" style={{ filter: 'drop-shadow(0 0 12px rgba(248, 113, 113, 0.8))' }}>
                        -{damage}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* VS 표시 - 플레이어 카드 사이에 배치 */}
          <div className="relative flex items-center justify-center -my-8 z-30">
            <img src="/vocamonster/vs-icon.png" alt="VS" className="w-40 h-40 object-contain drop-shadow-xl vocamonster-icon-transparent" />
          </div>

          {/* 내 캐릭터 (아래) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="vocamonster-card p-6 relative border-blue-500/30 bg-gradient-to-br from-blue-600/10 to-blue-800/10 overflow-visible"
          >
            {/* 게임적 효과 - 내 캐릭터 주변에 에너지 필드 */}
            <div className="absolute inset-0 rounded-2xl overflow-visible">
              <div className="absolute inset-0 bg-blue-400/5" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src="/vocamonster/player-me-icon.png?v=2" alt="Me" className="w-16 h-16 object-contain vocamonster-icon-transparent" />
                  <div>
                    <div className="vocamonster-text-primary font-black text-lg">나</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-3xl transition-all">
                    {i < myHearts ? '❤️' : '💔'}
                  </span>
                ))}
              </div>
            </div>

            {/* 데미지 애니메이션 */}
            <AnimatePresence>
              {showDamageAnimation && damagePosition === 'left' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, rotate: 10 }}
                  animate={{ opacity: 1, scale: 1, rotate: [10, -8, 6, -4, 0] }}
                  exit={{ opacity: 0, scale: 0.5, rotate: -12 }}
                  className="fixed top-1/2 left-1/2 z-[120] pointer-events-none"
                  style={{ transform: 'translate(-160px, -50%)' }}
                >
                  <div className="relative">
                    <img
                      src="/vocamonster/damage.png"
                      alt="Damage"
                      className="w-[220px] h-auto object-contain drop-shadow-[0_0_42px_rgba(248,113,113,0.95)]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span
                        className="text-6xl font-black text-red-500 drop-shadow-[0_0_18px_rgba(248,113,113,0.9)]"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                      >
                        -{damage}
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 공격 애니메이션 */}
            <AnimatePresence>
              {showAttackAnimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: [1, 1.2, 1, 1.2, 1],
                    rotate: [0, -15, 15, -15, 15, 0],
                    x: [0, -20, 20, -20, 20, 0],
                    y: [0, -10, 10, -10, 10, 0]
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none"
                >
                  <motion.img
                    src="/vocamonster/attack.png"
                    alt="Attack"
                    className="w-64 h-64 object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 60px rgba(250, 204, 21, 1)) drop-shadow(0 0 100px rgba(250, 204, 21, 0.8))',
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 0.3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        )}

        {/* 턴 표시 */}
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="vocamonster-card p-4 text-center mb-4 border-yellow-400/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10"
          >
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </motion.div>
              <span className="font-black text-xl vocamonster-turn-text">내 턴</span>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4 text-yellow-200" />
                <span className="font-bold text-yellow-200">{timeLeft}초</span>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* Question Screen */}
      <AnimatePresence mode="wait">
        {showQuestion && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[9999] overflow-y-auto"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vocamonster-card p-8 max-w-md w-full relative overflow-y-auto bg-gradient-to-br from-purple-900/90 to-indigo-900/90"
            >
              
              <div className="relative z-10">
                <h3 className="text-2xl font-black vocamonster-text-primary mb-6 text-center drop-shadow-lg">
                  {currentQuestion.type === 'meaning' && `"${currentQuestion.word}"의 뜻은?`}
                  {currentQuestion.type === 'synonym' && `"${currentQuestion.word}"의 동의어는?`}
                  {currentQuestion.type === 'antonym' && `"${currentQuestion.word}"의 반의어는?`}
                </h3>

                {showResult ? (
                  <div className="text-center">
                    {isCorrect ? (
                      <>
                        <div className="flex items-center justify-center mb-6">
                          <DefenseSuccessIcon size={200} />
                        </div>
                        <p className="vocamonster-correct-text font-black text-2xl mb-2 drop-shadow-lg">정답입니다!</p>
                        <p className="vocamonster-correct-message font-semibold">방어 성공! 반격 기회를 얻었습니다!</p>
                      </>
                    ) : (
                      <>
                        <div className="mb-6">
                          {/* 데미지 아이콘 - 대각선 할퀴기 애니메이션 */}
                          <img
                            src="/vocamonster/damage.png"
                            alt="틀림"
                            className="w-32 h-32 mx-auto object-contain"
                            style={{
                              filter: 'drop-shadow(0 0 16px rgba(248, 113, 113, 0.6))',
                              animation: 'damageSlash 0.4s ease-out forwards',
                              opacity: 0
                            }}
                          />
                        </div>
                        <p className="vocamonster-wrong-text font-black text-2xl mb-2">틀렸습니다!</p>
                        <p className="vocamonster-wrong-damage font-semibold">하트 -{damage}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6">
                      {choices.map((choice, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedChoice(choice)
                            submitAnswer(choice)
                          }}
                          disabled={isAnswering}
                          className="w-full vocamonster-card p-4 vocamonster-text-primary disabled:opacity-50 text-left min-h-[56px] touch-manipulation font-bold hover:bg-white/10 transition-all active:scale-95"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-yellow-400 bg-yellow-500/40 rounded-lg shadow-lg">
                        <Clock className="w-5 h-5 vocamonster-timer-icon" />
                        <span className="font-black text-lg vocamonster-timer-text">{timeLeft}초 남음</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VOCABOT 방어 결과 화면 */}
      <AnimatePresence mode="wait">
        {showBotDefenseResult && botDefenseResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          >
            <div className="vocamonster-card p-8 max-w-md w-full relative overflow-hidden bg-gradient-to-br from-cyan-900/90 to-blue-900/90"
            >
              <div className="relative z-10 text-center space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white">VOCABOT DEFENSE</p>
                <h3 className="text-3xl font-black text-white mb-2">
                  {botDefenseResult.word}
                </h3>
                <p className="text-sm text-white/90 mb-4">
                  {botDefenseResult.questionType === 'meaning' && '뜻 방어 결과'}
                  {botDefenseResult.questionType === 'synonym' && '동의어 방어 결과'}
                  {botDefenseResult.questionType === 'antonym' && '반의어 방어 결과'}
                </p>

                <div className="space-y-3 text-left vocamonster-card p-4 bg-black/30 border border-white/20">
                  <p className="text-xs text-white/80 font-semibold">VOCABOT의 답</p>
                  <p className="text-base font-bold text-white">
                    {botDefenseResult.botAnswer || '—'}
                  </p>
                  <p className="text-xs text-white/80 font-semibold mt-3">정답</p>
                  <p className="text-base font-bold text-white">
                    {botDefenseResult.correctAnswer || '—'}
                  </p>
                </div>

                <div className="mt-4">
                  {botDefenseResult.isCorrect ? (
                    <div className="flex flex-col items-center gap-2">
                      <DefenseSuccessIcon size={200} />
                      <p className="vocamonster-correct-text font-black text-xl">VOCABOT 방어 성공!</p>
                      <p className="text-white/90 text-sm">이제 VOCABOT의 반격을 준비하세요.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="vocamonster-bot-defense-fail font-black text-xl drop-shadow-lg">VOCABOT 방어 실패!</p>
                      <p className="text-white/90 text-sm">VOCABOT이 데미지를 받았습니다.</p>
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowBotDefenseResult(false)
                    // 모달을 닫으면 useEffect가 봇 턴 체크 후 자동으로 공격 실행
                  }}
                  className="mt-4 w-full vocamonster-primary-button"
                >
                  계속하기
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상대방 방어 결과 화면 */}
      <AnimatePresence mode="wait">
        {showOpponentDefenseResult && opponentDefenseResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200] overflow-hidden"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vocamonster-card p-8 max-w-md w-full relative overflow-hidden bg-gradient-to-br from-purple-900/90 to-indigo-900/90"
            >
              <div className="relative z-10 text-center space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white">OPPONENT DEFENSE</p>
                <h3 className="text-3xl font-black text-white mb-2">
                  {opponentDefenseResult.word}
                </h3>
                <p className="text-sm text-white/90 mb-4">
                  {opponentDefenseResult.questionType === 'meaning' && '뜻 방어 결과'}
                  {opponentDefenseResult.questionType === 'synonym' && '동의어 방어 결과'}
                  {opponentDefenseResult.questionType === 'antonym' && '반의어 방어 결과'}
                </p>

                <div className="space-y-3 text-left vocamonster-card p-4 bg-black/30 border border-white/20">
                  <p className="text-xs text-white/80 font-semibold">상대방의 답</p>
                  <p className="text-base font-bold text-white">
                    {opponentDefenseResult.opponentAnswer || '—'}
                  </p>
                  <p className="text-xs text-white/80 font-semibold mt-3">정답</p>
                  <p className="text-base font-bold text-white">
                    {opponentDefenseResult.correctAnswer || '—'}
                  </p>
                </div>

                <div className="mt-4">
                  {opponentDefenseResult.isCorrect ? (
                    <div className="flex flex-col items-center gap-2">
                      <DefenseSuccessIcon size={200} />
                      <p className="vocamonster-correct-text font-black text-xl">상대방 방어 성공!</p>
                      <p className="text-white/90 text-sm">상대방이 반격 기회를 얻었습니다.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="vocamonster-bot-defense-fail font-black text-xl">상대방 방어 실패!</p>
                      <p className="text-white/90 text-sm">상대방이 데미지를 받았습니다.</p>
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowOpponentDefenseResult(false)
                  }}
                  className="mt-4 w-full vocamonster-primary-button"
                >
                  계속하기
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attack CTA */}
      {isMyTurn && !showQuestion && !showOpponentDefenseResult && !showBotDefenseResult && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-30 pointer-events-none">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAttackPanel(true)}
            className="vocamonster-attack-cta pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-yellow-400" />
              <div className="text-left">
                <p className="font-black text-white text-base leading-tight">내 턴! 공격 준비 완료</p>
                <p className="text-white/90 text-xs">
                  {selectedWord ? `선택된 카드: ${selectedWord.word}` : '카드를 선택해 공격을 시작하세요'}
                </p>
              </div>
            </div>
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isMyTurn && !showQuestion && !showOpponentDefenseResult && !showBotDefenseResult && showAttackPanel && (
          <motion.div
            className="vocamonster-attack-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAttackPanel(false)}
          >
            <motion.div
              className="vocamonster-attack-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vocamonster-bottom-handle" />
              <div className="flex items-center justify-between mb-4">
                <p className="text-white text-base font-bold">공격 카드 선택</p>
                <button
                  type="button"
                  onClick={() => setShowAttackPanel(false)}
                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 flex flex-col flex-1 min-h-0">
                {!selectedWord ? (
                  <>
                    <div className="space-y-2 h-full overflow-y-auto pr-1">
                      {availableDeck.map((word) => (
                        <button
                          key={word.id}
                          onClick={() => setSelectedWord(word)}
                          className="vocamonster-card p-3 text-left flex items-center justify-between gap-3 w-full active:scale-95 transition-transform touch-manipulation"
                        >
                          <span className="font-bold text-base text-white">{word.word}</span>
                          <span className="text-sm text-white/90 truncate">{word.korean_meaning}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : !questionType ? (
                  <div className="space-y-2 h-full flex flex-col overflow-y-auto">
                    <div className="vocamonster-card p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-white/10 flex items-center justify-between">
                      <p className="text-white font-black text-lg">{selectedWord.word}</p>
                      <button
                        onClick={() => {
                          setSelectedWord(null)
                          setQuestionType(null)
                        }}
                        className="text-white/70 text-xs"
                      >
                        변경
                      </button>
                    </div>
                    <p className="text-white font-black text-sm">공격 유형 선택</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setQuestionType('meaning')}
                        className="vocamonster-card p-3 flex flex-col items-center gap-2 border-yellow-400/40 active:scale-95 transition-transform"
                      >
                        <BookOpen className="w-5 h-5 text-yellow-300" />
                        <span className="text-white font-bold text-xs">뜻</span>
                      </button>
                      {selectedWord.synonyms && selectedWord.synonyms.length > 0 && (
                        <button
                          onClick={() => setQuestionType('synonym')}
                          className="vocamonster-card p-3 flex flex-col items-center gap-2 border-yellow-400/40 active:scale-95 transition-transform"
                        >
                          <Zap className="w-5 h-5 text-yellow-300" />
                          <span className="text-white font-bold text-xs">동의어</span>
                        </button>
                      )}
                      {selectedWord.antonyms && selectedWord.antonyms.length > 0 && (
                        <button
                          onClick={() => setQuestionType('antonym')}
                          className="vocamonster-card p-3 flex flex-col items-center gap-2 border-yellow-400/40 active:scale-95 transition-transform"
                        >
                          <Shield className="w-5 h-5 text-yellow-300" />
                          <span className="text-white font-bold text-xs">반의어</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 h-full flex flex-col overflow-y-auto">
                    <div className="vocamonster-card p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-white/10 flex items-center justify-between">
                      <p className="text-white text-lg font-black">{selectedWord.word}</p>
                      <span className="text-yellow-300 text-xs font-bold">
                        {questionType === 'meaning' ? '뜻' : questionType === 'synonym' ? '동의어' : '반의어'}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={submitAttack}
                      className="vocamonster-primary-button flex items-center justify-center gap-2 !w-full shadow-[0_0_20px_rgba(250,204,21,0.7)]"
                    >
                      <motion.img
                        src="/vocamonster/attack.png"
                        alt="Attack"
                        className="w-10 h-10 object-contain"
                        animate={{
                          rotate: [0, -10, 10, -10, 10, 0],
                          scale: [1, 1.1, 1, 1.1, 1],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <span className="tracking-wide text-base font-black">공격 실행</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setQuestionType(null)
                      }}
                      className="w-full text-center text-white/70 font-semibold py-3 mt-3"
                    >
                      공격 유형 다시 선택
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting for Opponent */}
      {!isMyTurn && !showQuestion && !showOpponentDefenseResult && !showBotDefenseResult && (
        <div className="relative z-10 px-6 space-y-3 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="vocamonster-card p-12 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-6"
            >
              <Target className="w-16 h-16 vocamonster-text-primary mx-auto" />
            </motion.div>
            <p className="vocamonster-text-primary font-black text-xl mb-2">상대방의 공격을 기다리는 중...</p>
            <p className="vocamonster-text-secondary font-semibold">잠시만 기다려주세요</p>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={leaveBattle}
            className="w-full mt-2 rounded-xl bg-red-600 text-white font-black text-sm py-3 shadow-lg border border-red-300 flex items-center justify-center gap-2"
          >
            <Flag className="w-4 h-4" />
            <span>패배 선언 (항복하기)</span>
          </motion.button>
        </div>
      )}
      </div>
    </div>
  )
}
