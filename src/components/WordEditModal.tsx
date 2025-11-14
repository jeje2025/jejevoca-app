import { motion } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
import { WordData, DerivativeWord, ConfusionWord } from './types/word';
import { useState, useEffect } from 'react';

interface WordEditModalProps {
  isOpen: boolean;
  word: WordData | null;
  onSave: (word: WordData) => void;
  onClose: () => void;
}

export function WordEditModal({ isOpen, word, onSave, onClose }: WordEditModalProps) {
  const [editedWord, setEditedWord] = useState<WordData | null>(null);

  // Update local state when word prop changes
  useEffect(() => {
    if (word) {
      setEditedWord({ ...word });
    }
  }, [word]);

  if (!isOpen || !editedWord) return null;

  const handleSave = () => {
    onSave(editedWord);
    onClose();
  };

  const updateField = <K extends keyof WordData>(field: K, value: WordData[K]) => {
    setEditedWord({ ...editedWord, [field]: value });
  };

  const addDerivative = () => {
    updateField('derivatives', [...editedWord.derivatives, { word: '', partOfSpeech: '', meaning: '' }]);
  };

  const updateDerivative = (index: number, field: keyof DerivativeWord, value: string) => {
    const newDerivatives = [...editedWord.derivatives];
    newDerivatives[index] = { ...newDerivatives[index], [field]: value };
    updateField('derivatives', newDerivatives);
  };

  const removeDerivative = (index: number) => {
    updateField('derivatives', editedWord.derivatives.filter((_, i) => i !== index));
  };

  const addConfusionWord = () => {
    updateField('confusionWords', [...editedWord.confusionWords, { word: '', meaning: '', explanation: '' }]);
  };

  const updateConfusionWord = (index: number, field: keyof ConfusionWord, value: string) => {
    const newWords = [...editedWord.confusionWords];
    newWords[index] = { ...newWords[index], [field]: value };
    updateField('confusionWords', newWords);
  };

  const removeConfusionWord = (index: number) => {
    updateField('confusionWords', editedWord.confusionWords.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#091A7A] to-[#1A2FB8]">
          <h3 className="text-xl font-bold text-white">
            단어 편집 - {editedWord.word || '새 단어'}
          </h3>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">VOL</label>
                <input
                  type="number"
                  value={editedWord.vol}
                  onChange={(e) => updateField('vol', parseInt(e.target.value) || 1)}
                  min={1}
                  max={8}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Day</label>
                <input
                  type="number"
                  value={editedWord.day}
                  onChange={(e) => updateField('day', parseInt(e.target.value) || 1)}
                  min={1}
                  max={16}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">번호</label>
                <input
                  type="number"
                  value={editedWord.number}
                  onChange={(e) => updateField('number', parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                />
              </div>
            </div>

            {/* 단어 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">단어 *</label>
              <input
                type="text"
                value={editedWord.word}
                onChange={(e) => updateField('word', e.target.value)}
                placeholder="prohibit"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none font-medium"
              />
            </div>

            {/* 한글 뜻 + 설명 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">한글 뜻 및 핵심 설명 *</label>
              <textarea
                value={editedWord.koreanMeaning}
                onChange={(e) => updateField('koreanMeaning', e.target.value)}
                placeholder="금지하다 - 권위나 규칙으로 어떤 행동을 못하게 '딱' 막아버림"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none resize-none"
              />
            </div>

            {/* 발음 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">발음 기호</label>
                <input
                  type="text"
                  value={editedWord.pronunciation}
                  onChange={(e) => updateField('pronunciation', e.target.value)}
                  placeholder="[prəˈhɪbɪt]"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">한글 발음</label>
                <input
                  type="text"
                  value={editedWord.koreanPronunciation}
                  onChange={(e) => updateField('koreanPronunciation', e.target.value)}
                  placeholder="(프러히빗)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                />
              </div>
            </div>

            {/* 파생어 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">파생어</label>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addDerivative}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </motion.button>
              </div>
              <div className="space-y-2">
                {editedWord.derivatives.map((deriv, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={deriv.word}
                      onChange={(e) => updateDerivative(index, 'word', e.target.value)}
                      placeholder="prohibition"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                    />
                    <input
                      type="text"
                      value={deriv.partOfSpeech}
                      onChange={(e) => updateDerivative(index, 'partOfSpeech', e.target.value)}
                      placeholder="n."
                      className="w-16 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                    />
                    <input
                      type="text"
                      value={deriv.meaning}
                      onChange={(e) => updateDerivative(index, 'meaning', e.target.value)}
                      placeholder="금지, 금지령"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeDerivative(index)}
                      className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>

            {/* 예문 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">예문</label>
              <textarea
                value={editedWord.example}
                onChange={(e) => updateField('example', e.target.value)}
                placeholder="우리 학교는 교내에서 스마트폰 사용을 엄격히 prohibit한다."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none resize-none"
              />
            </div>

            {/* 썰 (어원 이야기) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">썰 (어원/이미지 설명)</label>
              <textarea
                value={editedWord.story}
                onChange={(e) => updateField('story', e.target.value)}
                placeholder="이 단어, 알고 보면 그림이 그려지는 되게 재밌는 단어야..."
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none resize-none"
              />
            </div>

            {/* 영어 정의 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">영어 정의</label>
              <input
                type="text"
                value={editedWord.englishDefinition}
                onChange={(e) => updateField('englishDefinition', e.target.value)}
                placeholder="to formally forbid by law or rule"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none italic"
              />
            </div>

            {/* 혼동 단어 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">혼동 단어</label>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addConfusionWord}
                  className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </motion.button>
              </div>
              <div className="space-y-2">
                {editedWord.confusionWords.map((confusion, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={confusion.word}
                      onChange={(e) => updateConfusionWord(index, 'word', e.target.value)}
                      placeholder="inhibit"
                      className="w-32 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                    />
                    <input
                      type="text"
                      value={confusion.meaning}
                      onChange={(e) => updateConfusionWord(index, 'meaning', e.target.value)}
                      placeholder="억제하다"
                      className="w-32 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                    />
                    <input
                      type="text"
                      value={confusion.explanation}
                      onChange={(e) => updateConfusionWord(index, 'explanation', e.target.value)}
                      placeholder="prohibit은 외부 규칙이 막는 거, inhibit은 내부에서 억누르는 거"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeConfusionWord(index)}
                      className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>

            {/* 동의어 & 반의어 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">동의어 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={editedWord.synonyms.join(', ')}
                  onChange={(e) => updateField('synonyms', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="forbid, ban, outlaw"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">반의어 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={editedWord.antonyms.join(', ')}
                  onChange={(e) => updateField('antonyms', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="permit, allow, authorize"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-[#091A7A] text-white rounded-lg hover:bg-[#1A2FB8] transition-colors font-medium"
          >
            저장
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            취소
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}