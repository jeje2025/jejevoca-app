import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  studentName: string;
  note: string;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function NoteModal({ isOpen, studentName, note, onNoteChange, onSave, onClose }: NoteModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {studentName} - 비고
            </h3>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </motion.button>
          </div>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="비고 내용을 입력하세요..."
            className="w-full h-32 p-3 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all resize-none"
          />
          <div className="flex gap-2 mt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onSave}
              className="flex-1 px-4 py-2 bg-[#091A7A] text-white rounded-lg hover:bg-[#1A2FB8] transition-colors text-sm font-medium"
            >
              저장
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              취소
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
