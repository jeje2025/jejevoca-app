// 기존 갓생보카 Supabase 클라이언트 사용
import { supabase } from '../../utils/supabase-client'

// 게임 관련 헬퍼 함수들
export const gameService = {
  // 매치 생성
  async createMatch(betPoints: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
      .from('matches')
      .insert({
        player1_id: user.id,
        bet_points: betPoints,
        status: 'waiting',
        player1_hp: 100,
        player2_hp: 100,
        current_turn: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 매치 참가
  async joinMatch(matchId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
      .from('matches')
      .update({
        player2_id: user.id,
        status: 'playing'
      })
      .eq('id', matchId)
      .eq('status', 'waiting')
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export { supabase }
export default supabase
