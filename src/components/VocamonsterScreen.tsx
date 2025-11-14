import { useState } from 'react'
import { motion } from 'motion/react'
import { Swords, Trophy, Zap, Bot, ArrowLeft } from 'lucide-react'

interface VocamonsterScreenProps {
  onBack: () => void
}

export function VocamonsterScreen({ onBack }: VocamonsterScreenProps) {
  const [userPoints, setUserPoints] = useState(1000)
  const [userWins, setUserWins] = useState(0)
  const [userLosses, setUserLosses] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-32">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>뒤로가기</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary-600 to-purple-600 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Vocamonster Battle!</h1>
              <p className="text-white/80">영어 단어로 배틀을 펼쳐보세요</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{userPoints}</div>
              <div className="text-sm text-white/80">포인트</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <Trophy className="w-5 h-5 mb-1 text-yellow-400" />
              <div className="text-xl font-bold text-white">{userWins}</div>
              <div className="text-sm text-white/80">승리</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <Zap className="w-5 h-5 mb-1 text-red-400" />
              <div className="text-xl font-bold text-white">{userLosses}</div>
              <div className="text-sm text-white/80">패배</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Game Modes */}
      <div className="px-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-bold text-white mb-3">게임 모드</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg hover:scale-105 transition-transform"
              onClick={() => alert('대전 기능은 곧 추가됩니다!')}
            >
              <Swords className="w-8 h-8 text-white" />
              <span className="font-bold text-white">PVP 대전</span>
              <span className="text-xs text-white/80">다른 플레이어와</span>
            </button>
            <button
              className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg hover:scale-105 transition-transform"
              onClick={() => alert('봇 대전 기능은 곧 추가됩니다!')}
            >
              <Bot className="w-8 h-8 text-white" />
              <span className="font-bold text-white">봇 대전</span>
              <span className="text-xs text-white/80">AI와 연습하기</span>
            </button>
          </div>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-white mb-3">게임 방법</h3>
          <ul className="space-y-2 text-white/80 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary-400">1.</span>
              <span>자신의 단어 덱에서 단어를 선택해 상대를 공격하세요</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">2.</span>
              <span>상대의 질문에 5지선다로 답하세요 (뜻/동의어/반의어)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">3.</span>
              <span>틀리면 HP가 감소하고, 맞추면 반격 기회를 얻습니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">4.</span>
              <span>상대의 HP를 0으로 만들면 승리!</span>
            </li>
          </ul>
        </motion.div>

        {/* Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🚧</div>
            <h3 className="text-lg font-bold text-yellow-400 mb-2">개발 중입니다</h3>
            <p className="text-white/70 text-sm">
              Vocamonster 배틀 시스템이 곧 완성됩니다!<br />
              조금만 기다려주세요.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
