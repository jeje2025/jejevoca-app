import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { Trophy, Zap, ArrowLeft, Loader2, Coins, Users, Clock, Copy, UserPlus, RefreshCw } from 'lucide-react'
import { authService } from '../utils/auth'
import { supabase } from '../utils/supabase-client'
import './VocamonsterScreen.css'

const BOT_USER_ID = '00000000-0000-0000-0000-000000000000'

interface VocamonsterScreenProps {
  onBack: () => void
  onStartBattle?: (matchId: string) => void
  onOpenDeck?: () => void
  userPoints?: number // App.tsx에서 전달받는 포인트
}

interface BattleSummary {
  id: string
  player1_id: string
  player2_id: string | null
  bet_points: number
  status: 'waiting' | 'active' | 'finished'
  is_bot_match?: boolean
  created_at?: string
  current_turn?: string | null
}

interface WaitingMatchSummary extends BattleSummary {
  player1_name?: string
  player1_points?: number | null
  player1_wins?: number | null
}

export function VocamonsterScreen({ onBack, onStartBattle, onOpenDeck, userPoints: propUserPoints }: VocamonsterScreenProps) {
  const user = authService.getUser()
  const [userPoints, setUserPoints] = useState(propUserPoints || 0)
  const [userWins, setUserWins] = useState(0)
  const [userLosses, setUserLosses] = useState(0)
  const [creatingMatch, setCreatingMatch] = useState(false)
  const [betPoints, setBetPoints] = useState(100)
  const [waitingMatches, setWaitingMatches] = useState<WaitingMatchSummary[]>([])
  const [waitingMatchesLoading, setWaitingMatchesLoading] = useState(true)
  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null)
  const [myWaitingMatch, setMyWaitingMatch] = useState<BattleSummary | null>(null)
  const [autoLaunchMatchId, setAutoLaunchMatchId] = useState<string | null>(null)
  const [waitingActionLoading, setWaitingActionLoading] = useState(false)

  useEffect(() => {
    // propUserPoints가 변경되면 업데이트
    if (propUserPoints !== undefined) {
      setUserPoints(propUserPoints)
    }
  }, [propUserPoints])

  useEffect(() => {
    loadUserProfile()
    
    // 실시간 포인트 업데이트 구독 (wins, losses만)
    if (user) {
      const channel = supabase
        .channel(`user-stats-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            const updatedUser = payload.new as any
            // 포인트는 propUserPoints에서 받으므로 여기서는 wins, losses만 업데이트
            if (updatedUser.wins !== undefined) {
              setUserWins(updatedUser.wins || 0)
            }
            if (updatedUser.losses !== undefined) {
              setUserLosses(updatedUser.losses || 0)
            }
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [user])

  useEffect(() => {
    if (autoLaunchMatchId && onStartBattle) {
      onStartBattle(autoLaunchMatchId)
      setAutoLaunchMatchId(null)
    }
  }, [autoLaunchMatchId, onStartBattle])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('wins, losses')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        // 포인트는 propUserPoints에서 받으므로 wins, losses만 업데이트
        setUserWins(data.wins || 0)
        setUserLosses(data.losses || 0)
      }
    } catch (error) {
      console.error('프로필 로드 오류:', error)
    }
  }

  const loadWaitingMatches = useCallback(async () => {
    if (!user) {
      setWaitingMatches([])
      setWaitingMatchesLoading(false)
      return
    }

    setWaitingMatchesLoading(true)
    try {
      const { data, error } = await supabase
        .from('battles')
        .select('id, player1_id, player2_id, bet_points, status, is_bot_match, created_at')
        .eq('status', 'waiting')
        .is('player2_id', null)
        .eq('is_bot_match', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const filtered = (data || []).filter(match => match.player1_id !== user.id)
      const playerIds = Array.from(new Set(filtered.map(match => match.player1_id)))
      let usersMap = new Map<string, any>()

      if (playerIds.length > 0) {
        const { data: playerRows, error: usersError } = await supabase
          .from('users')
          .select('id, name, username, points, wins')
          .in('id', playerIds)

        if (usersError) {
          console.error('플레이어 정보 로드 오류:', usersError)
        } else if (playerRows) {
          usersMap = new Map(playerRows.map((row) => [row.id, row]))
        }
      }

      const enriched = filtered.map(match => {
        const player = usersMap.get(match.player1_id)
        return {
          ...match,
          player1_name: player?.name || player?.username || '플레이어',
          player1_points: player?.points ?? null,
          player1_wins: player?.wins ?? null,
        } as WaitingMatchSummary
      })

      setWaitingMatches(enriched)
    } catch (error) {
      console.error('대기 매치 로드 오류:', error)
    } finally {
      setWaitingMatchesLoading(false)
    }
  }, [user?.id])

  const loadMyMatches = useCallback(async () => {
    if (!user) {
      setMyWaitingMatch(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!data) {
        setMyWaitingMatch(null)
        return
      }

      const waiting = data.find(match => match.status === 'waiting' && match.player1_id === user.id)
      setMyWaitingMatch(waiting || null)

      const active = data.find(match => match.status === 'active')
      if (active) {
        setAutoLaunchMatchId(active.id)
      }
    } catch (error) {
      console.error('내 매치 로드 오류:', error)
    }
  }, [user?.id])

  const ensureNoWaitingMatch = useCallback(async () => {
    if (!user) return true

    try {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('player1_id', user.id)
        .eq('status', 'waiting')
        .limit(1)

      if (error) {
        console.error('대기 매치 확인 오류:', error)
        return true
      }

      if (data && data.length > 0) {
        setMyWaitingMatch(data[0])
        return false
      }

      return true
    } catch (error) {
      console.error('대기 매치 확인 실패:', error)
      return true
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    loadWaitingMatches()
    loadMyMatches()
  }, [user?.id, loadWaitingMatches, loadMyMatches])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`battles-live-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles' },
        (payload) => {
          const battle = payload.new as BattleSummary | null
          const involvesUser = battle && (battle.player1_id === user.id || battle.player2_id === user.id)

          if (involvesUser) {
            loadMyMatches()
          }

          const wasWaiting = (payload.old as BattleSummary | null)?.status === 'waiting'
          if ((battle?.status === 'waiting' && battle.player1_id !== user.id) || wasWaiting) {
            loadWaitingMatches()
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id, loadMyMatches, loadWaitingMatches])

  const createMatch = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (betPoints > userPoints) {
      alert('포인트가 부족합니다!')
      return
    }

    const canCreate = await ensureNoWaitingMatch()
    if (!canCreate) {
      alert('이미 대기 중인 매치가 있습니다. 기존 매치를 먼저 사용하거나 취소해주세요.')
      return
    }

    setCreatingMatch(true)
    try {
      const { data: match, error } = await supabase
        .from('battles')
        .insert({
          player1_id: user.id,
          player2_id: null,
          player1_hearts: 5,
          player2_hearts: 5,
          current_turn: user.id,
          status: 'waiting',
          bet_points: betPoints
        })
        .select()
        .single()

      if (error) throw error

      if (match) {
        setMyWaitingMatch(match)
        loadWaitingMatches()
      }
    } catch (error: any) {
      console.error('매치 생성 오류:', error)
      alert(error.message || '매치 생성에 실패했습니다.')
    } finally {
      setCreatingMatch(false)
    }
  }

  const createBotMatch = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (betPoints > userPoints) {
      alert('포인트가 부족합니다!')
      return
    }

    const canCreate = await ensureNoWaitingMatch()
    if (!canCreate) {
      alert('대기 중인 매치를 먼저 취소하거나 시작해주세요.')
      return
    }

    setCreatingMatch(true)
    try {
      const { data: match, error } = await supabase
        .from('battles')
        .insert({
          player1_id: user.id,
          player2_id: BOT_USER_ID,
          player1_hearts: 5,
          player2_hearts: 5,
          current_turn: user.id,
          status: 'active',
          bet_points: betPoints,
          is_bot_match: true
        })
        .select()
        .single()

      if (error) throw error

      if (onStartBattle && match) {
        onStartBattle(match.id)
      }
    } catch (error: any) {
      console.error('봇 매치 생성 오류:', error)
      alert(error.message || '봇 매치 생성에 실패했습니다.')
    } finally {
      setCreatingMatch(false)
    }
  }

  const joinMatch = async (matchId: string) => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setJoiningMatchId(matchId)
    try {
      const { data: match, error } = await supabase
        .from('battles')
        .select('id, player1_id, player2_id, bet_points, status')
        .eq('id', matchId)
        .single()

      if (error) throw error

      if (match.player1_id === user.id) {
        alert('자신이 만든 매치입니다. 상대를 기다려주세요.')
        return
      }

      if (match.player2_id) {
        alert('이미 다른 플레이어가 참가했습니다.')
        loadWaitingMatches()
        return
      }

      if (match.bet_points > userPoints) {
        alert('포인트가 부족합니다!')
        return
      }

      const { data: updated, error: updateError } = await supabase
        .from('battles')
        .update({
          player2_id: user.id,
          status: 'active',
          current_turn: Math.random() > 0.5 ? user.id : match.player1_id
        })
        .eq('id', matchId)
        .eq('status', 'waiting')
        .is('player2_id', null)
        .select()
        .single()

      if (updateError) throw updateError

      loadWaitingMatches()
      loadMyMatches()

      if (onStartBattle && updated) {
        onStartBattle(updated.id)
      }
    } catch (error: any) {
      console.error('매치 참가 오류:', error)
      alert(error.message || '매치 참가에 실패했습니다.')
    } finally {
      setJoiningMatchId(null)
    }
  }

  const cancelWaitingMatch = async () => {
    if (!user || !myWaitingMatch) return

    setWaitingActionLoading(true)
    try {
      await supabase
        .from('battles')
        .delete()
        .eq('id', myWaitingMatch.id)
        .eq('player1_id', user.id)
        .eq('status', 'waiting')

      setMyWaitingMatch(null)
      loadWaitingMatches()
    } catch (error) {
      console.error('매치 취소 오류:', error)
      alert('매치를 취소할 수 없습니다.')
    } finally {
      setWaitingActionLoading(false)
    }
  }

  const convertWaitingMatchToBot = async () => {
    if (!user || !myWaitingMatch) return

    setWaitingActionLoading(true)
    try {
      const { data, error } = await supabase
        .from('battles')
        .update({
          player2_id: BOT_USER_ID,
          status: 'active',
          is_bot_match: true,
          current_turn: user.id,
          player2_hearts: 5
        })
        .eq('id', myWaitingMatch.id)
        .eq('player1_id', user.id)
        .eq('status', 'waiting')
        .select()
        .single()

      if (error) throw error

      setMyWaitingMatch(null)
      if (onStartBattle && data) {
        onStartBattle(data.id)
      }
    } catch (error) {
      console.error('봇 대전 전환 오류:', error)
      alert('봇 대전으로 전환할 수 없습니다.')
    } finally {
      setWaitingActionLoading(false)
    }
  }

  const copyInviteCode = async () => {
    if (!myWaitingMatch?.id) return
    if (!navigator?.clipboard) {
      alert('클립보드 복사를 지원하지 않는 환경입니다.')
      return
    }
    try {
      await navigator.clipboard.writeText(myWaitingMatch.id)
      alert('매치 코드가 복사되었습니다!')
    } catch (error) {
      console.error('코드 복사 오류:', error)
      alert('코드를 복사할 수 없습니다.')
    }
  }

  return (
    <div className="vocamonster-container">
      <div className="w-full max-w-sm mx-auto relative">
        {/* Header */}
        <div className="vocamonster-header">
          <div className="flex items-center justify-between h-full px-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="w-6 h-6 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 vocamonster-text-primary" />
            </motion.button>
            <h1 className="text-center vocamonster-text-primary text-xl font-bold">VOCAMONSTER</h1>
            <div className="w-6 h-6" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="vocamonster-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 vocamonster-text-primary" />
              <span className="vocamonster-text-secondary text-xs font-normal">포인트</span>
            </div>
            <div className="vocamonster-text-primary text-lg font-bold">
              {userPoints.toLocaleString()}
            </div>
          </div>
          
          <div className="vocamonster-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 vocamonster-text-primary" />
              <span className="vocamonster-text-secondary text-xs font-normal">승리</span>
            </div>
            <div className="vocamonster-text-primary text-lg font-bold">
              {userWins}
            </div>
          </div>
          
          <div className="vocamonster-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 vocamonster-text-primary" />
              <span className="vocamonster-text-secondary text-xs font-normal">패배</span>
            </div>
            <div className="vocamonster-text-primary text-lg font-bold">
              {userLosses}
            </div>
          </div>
        </div>

        {/* Game Mode Selection */}
        <div>
          <div className="vocamonster-text-primary text-lg font-bold mb-4">게임 모드</div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createMatch}
              disabled={creatingMatch}
              className="vocamonster-card p-6 flex flex-col items-center gap-3 touch-manipulation disabled:opacity-50 relative overflow-hidden"
            >
              {creatingMatch ? (
                <Loader2 className="w-12 h-12 vocamonster-text-primary animate-spin" />
              ) : (
                <>
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <img src="/vocamonster/1to1-icon.png" alt="1:1 대전" className="w-20 h-20 object-contain vocamonster-icon-transparent" />
                  </motion.div>
                  <div className="text-center">
                    <div className="vocamonster-text-primary text-base font-bold">1:1 대전</div>
                    <div className="vocamonster-text-secondary text-xs font-normal">다른 플레이어와</div>
                  </div>
                </>
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createBotMatch}
              disabled={creatingMatch}
              className="vocamonster-card p-6 flex flex-col items-center gap-3 touch-manipulation disabled:opacity-50 relative overflow-hidden"
            >
              {creatingMatch ? (
                <Loader2 className="w-12 h-12 vocamonster-text-primary animate-spin" />
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 0.6 }}
                  >
                    <img src="/vocamonster/bot-icon.png" alt="봇 대전" className="w-20 h-20 object-contain vocamonster-icon-transparent" />
                  </motion.div>
                  <div className="text-center">
                    <div className="vocamonster-text-primary text-base font-bold">봇 대전</div>
                    <div className="vocamonster-text-secondary text-xs font-normal">AI와 연습하기</div>
                  </div>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Bet Points */}
        <div>
          <div className="vocamonster-text-primary text-lg font-bold mb-4">베팅 포인트</div>
          <div className="grid grid-cols-4 gap-3">
            {[50, 100, 200, 500].map((points) => (
              <motion.button
                key={points}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setBetPoints(points)}
                className={`vocamonster-card px-4 py-3 font-bold text-base touch-manipulation transition-all ${
                  betPoints === points
                    ? 'vocamonster-text-primary vocamonster-card-border-active'
                    : 'vocamonster-text-secondary opacity-50'
                }`}
              >
                {points}
              </motion.button>
            ))}
          </div>
        </div>

        {/* My Waiting Match */}
        {myWaitingMatch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="vocamonster-card p-4 border border-yellow-500/40 bg-yellow-500/5 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-yellow-300">상대방을 기다리는 중</p>
                <p className="text-white text-lg font-bold">{myWaitingMatch.bet_points} P 배틀</p>
              </div>
              <Clock className="w-6 h-6 text-yellow-300" />
            </div>
            <p className="text-xs text-white/90">
              친구에게 아래 코드를 공유하면 바로 참가할 수 있어요.
            </p>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
              <code className="text-white font-mono text-xs flex-1 truncate">{myWaitingMatch.id}</code>
              <button
                type="button"
                onClick={copyInviteCode}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Copy className="w-4 h-4 text-yellow-300" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={convertWaitingMatchToBot}
                disabled={waitingActionLoading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold text-sm border border-white/20 disabled:opacity-50"
              >
                {waitingActionLoading ? '처리 중...' : '봇과 바로 시작'}
              </button>
              <button
                type="button"
                onClick={cancelWaitingMatch}
                disabled={waitingActionLoading}
                className="bg-white/10 text-white py-3 rounded-xl font-bold text-sm border border-white/20 hover:bg-white/20 disabled:opacity-50"
              >
                대기 취소
              </button>
            </div>
          </motion.div>
        )}

        {/* Waiting Matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 vocamonster-text-primary" />
              <div className="vocamonster-text-primary text-lg font-bold">대기 중인 매치</div>
            </div>
            <button
              type="button"
              onClick={loadWaitingMatches}
              disabled={waitingMatchesLoading}
              className="flex items-center gap-1 text-xs text-white/90 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${waitingMatchesLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>

          {waitingMatchesLoading ? (
            <div className="vocamonster-card py-6 text-center flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <p className="text-xs text-white/90">매치 정보를 불러오는 중...</p>
            </div>
          ) : waitingMatches.length === 0 ? (
            <div className="vocamonster-card py-6 text-center text-white/90 text-sm">
              현재 참가 가능한 매치가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {waitingMatches.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="vocamonster-card p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="text-white font-bold">{match.player1_name || '플레이어'}</div>
                    <div className="text-xs text-white/90 mt-1">
                      승 {match.player1_wins ?? 0} ·{' '}
                      {match.player1_points !== null ? `${match.player1_points.toLocaleString()}P` : '포인트 비공개'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="vocamonster-points-text font-black text-lg drop-shadow-lg">{match.bet_points} P</div>
                    <button
                      type="button"
                      onClick={() => joinMatch(match.id)}
                      disabled={joiningMatchId === match.id}
                      className="mt-2 flex items-center justify-center gap-1 bg-white/10 px-3 py-2 rounded-lg border border-white/20 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                    >
                      {joiningMatchId === match.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          참가
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Deck Management */}
        {onOpenDeck && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenDeck}
            className="vocamonster-card w-full p-5 flex items-center gap-4 touch-manipulation relative"
          >
            <motion.div
              whileHover={{ y: [-2, 2, -2], rotate: [0, -3, 3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <img src="/vocamonster/deck-icon.png" alt="카드 덱" className="w-20 h-20 object-contain vocamonster-icon-transparent" />
            </motion.div>
            <div className="flex-1 text-left">
              <div className="vocamonster-text-primary text-lg font-bold">카드 덱 관리</div>
              <div className="vocamonster-text-secondary text-xs font-normal">단어를 추가하고 관리하세요</div>
            </div>
            <div className="w-1.5 h-2 bg-slate-400" />
          </motion.button>
        )}

        {/* Game Rules */}
        <div className="vocamonster-card p-5">
          <div className="vocamonster-text-primary text-lg font-bold mb-4">게임 방법</div>
          <div className="space-y-3">
            {[
              { num: '1', text: '자신의 단어 덱에서 단어를 선택해 상대를 공격하세요' },
              { num: '2', text: '상대의 질문에 5지선다로 답하세요 (뜻/동의어/반의어)' },
              { num: '3', text: '틀리면 하트가 감소하고, 맞추면 반격 기회를 얻습니다' },
              { num: '4', text: '상대의 하트를 모두 없애면 승리!' },
            ].map((rule, index) => (
              <div
                key={index}
                className="flex items-start gap-3 py-2"
              >
                <div className="w-8 h-8 vocamonster-number-bg flex items-center justify-center flex-shrink-0">
                  <span className="vocamonster-text-primary text-sm font-bold">{rule.num}</span>
                </div>
                <div className="flex-1">
                  <span className="vocamonster-text-primary text-sm font-normal">{rule.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
