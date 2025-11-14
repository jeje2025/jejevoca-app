import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Swords, Users, Trophy, Zap, Loader2, Bot } from 'lucide-react'
import toast from 'react-hot-toast'
import useGameStore from '../store/gameStore'
import { supabase, gameService } from '../lib/supabase'

const Home = () => {
  const navigate = useNavigate()
  const { user, profile, loadUserDeck, loadProfile } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [waitingMatches, setWaitingMatches] = useState([])
  const [betPoints, setBetPoints] = useState(100)
  const [showCreateMatch, setShowCreateMatch] = useState(false)

  useEffect(() => {
    loadProfile()
    loadUserDeck()
    loadWaitingMatches()

    // 실시간 매치 목록 구독 (모든 매치 변경 감지)
    const subscription = supabase
      .channel('all-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        (payload) => {
          console.log('🔔 실시간 매치 변경 감지:', payload)
          // waiting 상태 매치만 다시 로드
          loadWaitingMatches()
        }
      )
      .subscribe((status) => {
        console.log('📡 실시간 구독 상태:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ 실시간 구독 성공!')
        }
      })

    return () => {
      console.log('🔌 실시간 구독 해제')
      subscription.unsubscribe()
    }
  }, [])

  const loadWaitingMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('매치 목록 로딩 오류:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return
      }

      console.log('Loaded matches:', data)

      if (data) {
        // 플레이어 정보를 별도로 가져오기
        const matchesWithPlayers = await Promise.all(
          data.map(async (match) => {
            const { data: player1 } = await supabase
              .from('users')
              .select('username, points')
              .eq('id', match.player1_id)
              .single()

            return {
              ...match,
              player1
            }
          })
        )

        console.log('Matches with players:', matchesWithPlayers)
        setWaitingMatches(matchesWithPlayers)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const createMatch = async () => {
    if (!profile) {
      toast.error('프로필을 불러오는 중입니다. 잠시만 기다려주세요.')
      return
    }

    if (betPoints > (profile.points || 0)) {
      toast.error('포인트가 부족합니다!')
      return
    }

    setLoading(true)
    try {
      const match = await gameService.createMatch(betPoints)
      toast.success('매치를 생성했습니다!')
      navigate(`/battle/${match.id}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const joinMatch = async (matchId) => {
    setLoading(true)
    try {
      await gameService.joinMatch(matchId)
      toast.success('매치에 참가했습니다!')
      navigate(`/battle/${matchId}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createBotMatch = async () => {
    if (!profile) {
      toast.error('프로필을 불러오는 중입니다. 잠시만 기다려주세요.')
      return
    }

    setLoading(true)
    try {
      // 봇 유저 ID (고정값 또는 시스템 봇)
      const BOT_USER_ID = '00000000-0000-0000-0000-000000000000'

      const { data: match, error } = await supabase
        .from('matches')
        .insert({
          player1_id: user.id,
          player2_id: BOT_USER_ID,
          bet_points: 50, // 봇 대전은 50포인트 고정
          status: 'playing',
          player1_hp: 100,
          player2_hp: 100,
          current_turn: user.id,
          is_bot_match: true
        })
        .select()
        .single()

      if (error) throw error

      toast.success('봇 대전 시작!')
      navigate(`/battle/${match.id}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-primary-600 to-purple-600"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">안녕하세요, {profile?.username || user?.user_metadata?.username || '플레이어'}님!</h1>
            <p className="text-white/80">오늘도 영어 실력을 겨뤄보세요</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{profile?.points || 1000}</div>
            <div className="text-sm text-white/80">포인트</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <Trophy className="w-5 h-5 mb-1 text-yellow-400" />
            <div className="text-xl font-bold">{profile?.wins || 0}</div>
            <div className="text-sm text-white/80">승리</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <Zap className="w-5 h-5 mb-1 text-red-400" />
            <div className="text-xl font-bold">{profile?.losses || 0}</div>
            <div className="text-sm text-white/80">패배</div>
          </div>
        </div>
      </motion.div>

      {/* 매치 버튼들 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <button
          onClick={() => setShowCreateMatch(true)}
          className="btn-primary flex items-center justify-center gap-2 py-4"
        >
          <Swords className="w-5 h-5" />
          <span className="font-bold text-lg">대전</span>
        </button>
        <button
          onClick={createBotMatch}
          disabled={loading}
          className="btn-secondary flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700"
        >
          <Bot className="w-5 h-5" />
          <span className="font-bold text-lg">봇 대전</span>
        </button>
      </motion.div>

      {/* 매치 생성 모달 */}
      {showCreateMatch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCreateMatch(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="card max-w-sm w-full"
          >
            <h3 className="text-xl font-bold mb-4">매치 생성</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">베팅 포인트</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBetPoints(Math.max(10, betPoints - 50))}
                  className="btn-secondary px-3 py-2"
                >
                  -50
                </button>
                <input
                  type="number"
                  value={betPoints}
                  onChange={(e) => setBetPoints(Number(e.target.value))}
                  className="flex-1 text-center bg-slate-700 rounded-lg py-2"
                  min="10"
                  max={profile?.points || 1000}
                />
                <button
                  onClick={() => setBetPoints(Math.min(profile?.points || 1000, betPoints + 50))}
                  className="btn-secondary px-3 py-2"
                >
                  +50
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                현재 포인트: {profile?.points || 1000}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateMatch(false)}
                className="flex-1 btn-secondary"
              >
                취소
              </button>
              <button
                onClick={createMatch}
                disabled={loading}
                className="flex-1 btn-primary"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '생성'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 대기 중인 매치 목록 */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          대기 중인 매치
        </h2>

        {waitingMatches.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-slate-400">현재 대기 중인 매치가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingMatches.map((match) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card hover:bg-slate-700 transition-colors cursor-pointer"
                onClick={() => joinMatch(match.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{match.player1?.username}</div>
                    <div className="text-sm text-slate-400">
                      레벨: {Math.floor((match.player1?.points || 1000) / 100)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary-400">{match.bet_points} P</div>
                    <div className="text-sm text-slate-400">베팅</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
