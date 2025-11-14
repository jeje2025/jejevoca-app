import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Clock, Send, Shield, Swords, AlertCircle, Trophy, Skull } from 'lucide-react'
import toast from 'react-hot-toast'
import useGameStore from '../store/gameStore'
import { supabase } from '../lib/supabase'

const Battle = () => {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const {
    user,
    profile,
    currentMatch,
    myDeck,
    isMyTurn,
    selectedWord,
    questionType,
    updateMatch,
    selectWord,
    selectQuestionType,
    loadUserDeck,
  } = useGameStore()

  const [timeLeft, setTimeLeft] = useState(30)
  const [showQuestion, setShowQuestion] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [isAnswering, setIsAnswering] = useState(false)
  const [choices, setChoices] = useState([])
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [showGameEnd, setShowGameEnd] = useState(false)
  const [gameResult, setGameResult] = useState(null)

  useEffect(() => {
    loadMatchData()
    loadUserDeck()
    
    // 실시간 매치 구독
    const subscription = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        async (payload) => {
          console.log('실시간 매치 업데이트:', payload.new)

          // 플레이어 정보를 포함한 매치 데이터 다시 로드
          await loadMatchData()

          // 게임 종료 체크
          if (payload.new.status === 'finished') {
            handleGameEnd(payload.new)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_turns',
          filter: `match_id=eq.${matchId}`
        },
        async (payload) => {
          // 상대방이 공격했을 때
          if (payload.new.attacker_id !== user?.id) {
            showQuestionToDefender(payload.new)
          }
          // 내가 공격하고 상대가 봇인 경우 자동 응답
          else if (payload.new.attacker_id === user?.id && currentMatch?.is_bot_match) {
            setTimeout(() => {
              botAutoAnswer(payload.new)
            }, 2000) // 2초 후 봇이 답변
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_turns',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          // 상대방이 답변했을 때 (내가 공격자인 경우)
          if (payload.new.attacker_id === user?.id && payload.new.answer) {
            if (payload.new.is_correct) {
              toast.success('상대방이 정답을 맞췄습니다!')
            } else {
              toast.error(`상대방이 틀렸습니다! -${payload.new.damage} HP`)
            }
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [matchId])

  // 타이머
  useEffect(() => {
    if (!isMyTurn || timeLeft <= 0) return

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
      if (timeLeft <= 1) {
        // 시간 초과 - 턴 넘기기
        skipTurn()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, isMyTurn])

  const loadMatchData = async () => {
    try {
      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (error) {
        console.error('매치 로딩 오류:', error)
        return
      }

      console.log('Loaded match:', match)

      // 플레이어 정보를 별도로 가져오기
      const { data: player1 } = await supabase
        .from('users')
        .select('username, points')
        .eq('id', match.player1_id)
        .single()

      let player2 = null
      if (match.player2_id) {
        const { data: p2 } = await supabase
          .from('users')
          .select('username, points')
          .eq('id', match.player2_id)
          .single()
        player2 = p2
      }

      const matchWithPlayers = {
        ...match,
        player1,
        player2
      }

      console.log('Match with players:', matchWithPlayers)
      updateMatch(matchWithPlayers)
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const generateChoices = async (turn) => {
    try {
      // 턴 정보에서 단어 가져오기
      const { data: turnWithWord } = await supabase
        .from('match_turns')
        .select(`
          *,
          word:words(*)
        `)
        .eq('id', turn.id)
        .single()

      const word = turnWithWord.word
      let correctAnswer = ''
      let wrongAnswers = []

      // 질문 유형에 따라 정답과 오답 생성
      switch (turn.question_type) {
        case 'meaning':
          correctAnswer = word.meaning
          // 다른 단어들의 뜻을 오답으로 가져오기
          const { data: otherWords } = await supabase
            .from('words')
            .select('meaning')
            .neq('id', word.id)
            .limit(10)
          wrongAnswers = otherWords?.map(w => w.meaning).filter(m => m !== correctAnswer) || []
          break
        case 'synonym':
          correctAnswer = word.synonyms[0]
          wrongAnswers = [...word.synonyms.slice(1), ...word.antonyms.slice(0, 4)]
          break
        case 'antonym':
          correctAnswer = word.antonyms[0]
          wrongAnswers = [...word.antonyms.slice(1), ...word.synonyms.slice(0, 4)]
          break
      }

      // 오답 중 4개를 랜덤으로 선택
      const shuffledWrong = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 4)

      // 정답과 오답을 합쳐서 섞기
      const allChoices = [correctAnswer, ...shuffledWrong].sort(() => Math.random() - 0.5)

      setChoices(allChoices)
      return allChoices
    } catch (error) {
      console.error('선택지 생성 오류:', error)
      return []
    }
  }

  const showQuestionToDefender = async (turn) => {
    setCurrentQuestion(turn)
    setShowQuestion(true)
    setIsAnswering(true)
    setTimeLeft(15) // 답변 시간
    await generateChoices(turn)
  }

  const submitAttack = async () => {
    if (!selectedWord || !questionType) {
      toast.error('단어와 질문 유형을 선택하세요!')
      return
    }

    try {
      // Edge Function 호출 시도
      const { error } = await supabase.functions.invoke('create-question', {
        body: {
          matchId,
          wordId: selectedWord.id,
          questionType,
          attackerId: user.id
        }
      })

      if (!error) {
        // 턴 종료
        selectWord(null)
        selectQuestionType(null)
        setTimeLeft(30)
        return
      }
    } catch (error) {
      console.log('Edge Function failed, using direct database approach')
    }

    // Fallback: 직접 데이터베이스에 턴 생성
    try {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      const defenderId = match.player1_id === user.id ? match.player2_id : match.player1_id

      await supabase
        .from('match_turns')
        .insert({
          match_id: matchId,
          attacker_id: user.id,
          defender_id: defenderId,
          word_id: selectedWord.id,
          word_text: selectedWord.word,
          question_type: questionType
        })

      // 턴 종료
      selectWord(null)
      selectQuestionType(null)
      setTimeLeft(30)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const submitAnswer = async () => {
    if (!selectedChoice) {
      toast.error('답을 선택하세요!')
      return
    }

    const answerText = selectedChoice

    // Edge Function은 사용하지 않고 직접 처리
    console.log('Using direct database approach for answer verification')

    // Fallback: 직접 데이터베이스에서 답변 검증
    try {
      const { data: turn, error: turnError } = await supabase
        .from('match_turns')
        .select(`
          *,
          word:words(*)
        `)
        .eq('id', currentQuestion.id)
        .single()

      if (turnError) throw turnError

      // 답변 검증
      let isCorrect = false
      const word = turn.word
      const normalizedAnswer = answerText.toLowerCase().trim()

      switch (turn.question_type) {
        case 'meaning':
          isCorrect = word.meaning.toLowerCase().includes(normalizedAnswer) ||
                     normalizedAnswer.includes(word.meaning.toLowerCase())
          break
        case 'synonym':
          isCorrect = word.synonyms.some(s => 
            s.toLowerCase() === normalizedAnswer
          )
          break
        case 'antonym':
          isCorrect = word.antonyms.some(a => 
            a.toLowerCase() === normalizedAnswer
          )
          break
      }

      const damage = isCorrect ? 0 : Math.floor(10 + Math.random() * 10)

      // 턴 업데이트
      await supabase
        .from('match_turns')
        .update({
          defender_id: user.id,
          answer: answerText,
          is_correct: isCorrect,
          damage: damage
        })
        .eq('id', currentQuestion.id)

      // 매치 정보 업데이트
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', turn.match_id)
        .single()

      if (matchError) throw matchError

      const isPlayer1 = match.player1_id === user.id
      const newHp = isPlayer1
        ? Math.max(0, match.player1_hp - damage)
        : Math.max(0, match.player2_hp - damage)

      // 턴 결정: 맞추면 방어자(나)에게, 틀리면 공격자가 계속
      const nextTurn = isCorrect ? user.id : turn.attacker_id

      const updateData = {
        [isPlayer1 ? 'player1_hp' : 'player2_hp']: newHp,
        current_turn: nextTurn
      }

      if (newHp === 0) {
        updateData.status = 'finished'
        updateData.winner_id = turn.attacker_id
      }

      await supabase
        .from('matches')
        .update(updateData)
        .eq('id', turn.match_id)

      if (isCorrect) {
        toast.success('정답입니다!')
      } else {
        toast.error(`틀렸습니다! -${damage} HP`)
      }

      setShowQuestion(false)
      setIsAnswering(false)
      setSelectedChoice(null)
      setChoices([])
    } catch (error) {
      toast.error(error.message)
    }
  }

  const skipTurn = async () => {
    try {
      await supabase.functions.invoke('skip-turn', {
        body: { matchId, playerId: user.id }
      })
    } catch (error) {
      console.error(error)
    }
  }

  const botAutoAnswer = async (turn) => {
    try {
      console.log('봇이 답변 중...', turn)

      // 턴 정보 가져오기
      const { data: turnWithWord } = await supabase
        .from('match_turns')
        .select('*, word:words(*)')
        .eq('id', turn.id)
        .single()

      if (!turnWithWord) return

      const word = turnWithWord.word

      // 봇 난이도: 70% 확률로 정답
      const botCorrectRate = 0.7
      const willAnswerCorrect = Math.random() < botCorrectRate

      let botAnswer = ''
      let isCorrect = false

      if (willAnswerCorrect) {
        // 정답 선택
        switch (turn.question_type) {
          case 'meaning':
            botAnswer = word.meaning
            isCorrect = true
            break
          case 'synonym':
            botAnswer = word.synonyms[0]
            isCorrect = true
            break
          case 'antonym':
            botAnswer = word.antonyms[0]
            isCorrect = true
            break
        }
      } else {
        // 오답 선택
        switch (turn.question_type) {
          case 'meaning':
            botAnswer = 'wrong answer'
            isCorrect = false
            break
          case 'synonym':
            botAnswer = word.antonyms[0] || 'wrong'
            isCorrect = false
            break
          case 'antonym':
            botAnswer = word.synonyms[0] || 'wrong'
            isCorrect = false
            break
        }
      }

      const damage = isCorrect ? 0 : Math.floor(10 + Math.random() * 10)

      // 턴 업데이트
      await supabase
        .from('match_turns')
        .update({
          defender_id: turn.defender_id,
          answer: botAnswer,
          is_correct: isCorrect,
          damage: damage
        })
        .eq('id', turn.id)

      // 매치 정보 업데이트
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', turn.match_id)
        .single()

      if (!match) return

      const isPlayer1 = match.player1_id === turn.defender_id
      const newHp = isPlayer1
        ? Math.max(0, match.player1_hp - damage)
        : Math.max(0, match.player2_hp - damage)

      const nextTurn = isCorrect ? turn.defender_id : turn.attacker_id

      const updateData = {
        [isPlayer1 ? 'player1_hp' : 'player2_hp']: newHp,
        current_turn: nextTurn
      }

      if (newHp === 0) {
        updateData.status = 'finished'
        updateData.winner_id = turn.attacker_id
      }

      await supabase
        .from('matches')
        .update(updateData)
        .eq('id', turn.match_id)

    } catch (error) {
      console.error('봇 답변 오류:', error)
    }
  }

  const handleGameEnd = async (match) => {
    const won = match.winner_id === user?.id
    const loserId = won ? (match.player1_id === user.id ? match.player2_id : match.player1_id) : user.id
    const winnerId = match.winner_id

    // 포인트 및 전적 업데이트
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

      // 승자 포인트 증가 및 승리 카운트
      await supabase
        .from('users')
        .update({
          points: winner.points + match.bet_points,
          wins: winner.wins + 1
        })
        .eq('id', winnerId)

      // 패자 포인트 감소 및 패배 카운트
      await supabase
        .from('users')
        .update({
          points: Math.max(0, loser.points - match.bet_points),
          losses: loser.losses + 1
        })
        .eq('id', loserId)

      console.log('포인트 업데이트 완료')
    } catch (error) {
      console.error('포인트 업데이트 오류:', error)
    }

    // 게임 결과 모달 표시
    setGameResult({
      won,
      betPoints: match.bet_points
    })
    setShowGameEnd(true)

    setTimeout(() => {
      navigate('/')
    }, 5000)
  }

  if (!currentMatch) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  const isPlayer1 = currentMatch.player1_id === user?.id
  const myHp = isPlayer1 ? currentMatch.player1_hp : currentMatch.player2_hp
  const opponentHp = isPlayer1 ? currentMatch.player2_hp : currentMatch.player1_hp
  const opponent = isPlayer1 ? currentMatch.player2 : currentMatch.player1
  const opponentName = currentMatch.is_bot_match ? '🤖 봇' : (opponent?.username || '대기 중...')

  return (
    <div className="space-y-4">
      {/* 상대방 정보 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-red-900/50 to-slate-800"
      >
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-sm text-slate-400">상대</div>
            <div className="font-bold text-lg">{opponentName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-bold">{opponentHp}/100</span>
          </div>
        </div>
        <div className="hp-bar">
          <motion.div
            className="hp-fill bg-gradient-to-r from-red-500 to-red-600"
            initial={{ width: '100%' }}
            animate={{ width: `${opponentHp}%` }}
          />
        </div>
      </motion.div>

      {/* 게임 상태 */}
      <div className="card bg-slate-800/50 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isMyTurn ? (
              <>
                <Swords className="w-5 h-5 text-primary-500 animate-pulse" />
                <span className="font-semibold text-primary-400">내 턴</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400">상대 턴</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className={`font-bold ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
              {timeLeft}초
            </span>
          </div>
          
          <div className="text-sm">
            베팅: <span className="font-bold text-primary-400">{currentMatch.bet_points}P</span>
          </div>
        </div>
      </div>

      {/* 내 정보 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-primary-900/50 to-slate-800"
      >
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-sm text-slate-400">나</div>
            <div className="font-bold text-lg">{profile?.username || user?.user_metadata?.username || '플레이어'}</div>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary-500" />
            <span className="font-bold">{myHp}/100</span>
          </div>
        </div>
        <div className="hp-bar">
          <motion.div
            className="hp-fill bg-gradient-to-r from-primary-500 to-primary-600"
            initial={{ width: '100%' }}
            animate={{ width: `${myHp}%` }}
          />
        </div>
      </motion.div>

      {/* 게임 영역 */}
      <AnimatePresence mode="wait">
        {isMyTurn && !showQuestion ? (
          // 공격 선택 UI
          <motion.div
            key="attack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* 단어 선택 */}
            {!selectedWord ? (
              <div className="card">
                <h3 className="font-bold mb-3">단어 선택</h3>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {myDeck.map((item) => (
                    <button
                      key={item.word_id}
                      onClick={() => selectWord(item.word)}
                      className="word-card text-sm p-3"
                    >
                      {item.word.word}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card">
                <h3 className="font-bold mb-3">질문 유형 선택</h3>
                <div className="mb-4 text-center">
                  <div className="text-2xl font-bold text-primary-400 mb-2">
                    {selectedWord.word}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => selectQuestionType('meaning')}
                    className={`btn-secondary py-4 ${questionType === 'meaning' ? 'ring-2 ring-primary-500' : ''}`}
                  >
                    뜻
                  </button>
                  <button
                    onClick={() => selectQuestionType('synonym')}
                    className={`btn-secondary py-4 ${questionType === 'synonym' ? 'ring-2 ring-primary-500' : ''}`}
                  >
                    동의어
                  </button>
                  <button
                    onClick={() => selectQuestionType('antonym')}
                    className={`btn-secondary py-4 ${questionType === 'antonym' ? 'ring-2 ring-primary-500' : ''}`}
                  >
                    반의어
                  </button>
                </div>
                
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      selectWord(null)
                      selectQuestionType(null)
                    }}
                    className="flex-1 btn-secondary"
                  >
                    다시 선택
                  </button>
                  <button
                    onClick={submitAttack}
                    disabled={!questionType}
                    className="flex-1 btn-primary"
                  >
                    공격!
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : showQuestion && isAnswering ? (
          // 방어 UI
          <motion.div
            key="defend"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="card"
          >
            <div className="text-center mb-4">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-xl font-bold mb-2">상대방의 공격!</h3>
              <div className="text-3xl font-bold text-primary-400 mb-2">
                {currentQuestion?.word_text}
              </div>
              <div className="text-lg text-slate-300">
                {currentQuestion?.question_type === 'meaning' && '이 단어의 뜻은?'}
                {currentQuestion?.question_type === 'synonym' && '이 단어의 동의어는?'}
                {currentQuestion?.question_type === 'antonym' && '이 단어의 반의어는?'}
              </div>
            </div>

            <div className="space-y-3">
              {/* 5지선다 선택지 */}
              {choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedChoice(choice)}
                  className={`w-full p-4 text-left rounded-lg transition-all ${
                    selectedChoice === choice
                      ? 'bg-primary-600 ring-2 ring-primary-400'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">{choice}</div>
                  </div>
                </button>
              ))}

              <button
                onClick={submitAnswer}
                disabled={!selectedChoice}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
              >
                <Send className="w-5 h-5" />
                답변 제출
              </button>
            </div>
          </motion.div>
        ) : (
          // 대기 중
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card text-center py-8"
          >
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
            <p className="text-slate-400">상대방의 차례입니다...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 게임 종료 모달 */}
      <AnimatePresence>
        {showGameEnd && gameResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`card max-w-md w-full text-center ${
                gameResult.won
                  ? 'bg-gradient-to-br from-yellow-900/50 to-primary-900/50 border-2 border-yellow-500'
                  : 'bg-gradient-to-br from-red-900/50 to-slate-900/50 border-2 border-red-500'
              }`}
            >
              {gameResult.won ? (
                <>
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
                  </motion.div>
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl font-bold text-yellow-400 mb-2"
                  >
                    🎉 승리! 🎉
                  </motion.h2>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl text-white mb-4"
                  >
                    축하합니다!
                  </motion.p>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="bg-yellow-500/20 rounded-lg p-4 mb-4"
                  >
                    <div className="text-3xl font-bold text-yellow-400">
                      +{gameResult.betPoints}
                    </div>
                    <div className="text-sm text-yellow-300">포인트 획득</div>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ rotate: 180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <Skull className="w-24 h-24 text-red-400 mx-auto mb-4" />
                  </motion.div>
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl font-bold text-red-400 mb-2"
                  >
                    💀 패배... 💀
                  </motion.h2>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl text-white mb-4"
                  >
                    다음엔 더 잘할 수 있어요!
                  </motion.p>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="bg-red-500/20 rounded-lg p-4 mb-4"
                  >
                    <div className="text-3xl font-bold text-red-400">
                      -{gameResult.betPoints}
                    </div>
                    <div className="text-sm text-red-300">포인트 차감</div>
                  </motion.div>
                </>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-slate-400 text-sm"
              >
                홈 화면으로 이동 중...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Battle
