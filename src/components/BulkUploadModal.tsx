import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { X, FileSpreadsheet, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { WordData } from './types/word';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (words: WordData[], deleteExisting: boolean) => void;
}

export function BulkUploadModal({ isOpen, onClose, onUpload }: BulkUploadModalProps) {
  const [pastedData, setPastedData] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedWords, setParsedWords] = useState<WordData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteExisting, setDeleteExisting] = useState(true); // Default to true for clean upload

  const handleParse = () => {
    try {
      setParseError(null);
      
      // Split by newlines and filter out empty lines
      const lines = pastedData.trim().split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        setParseError('데이터가 비어있습니다.');
        return;
      }

      console.log('📊 Total lines:', lines.length);
      console.log('📝 First line (header):', lines[0]);
      console.log('📝 Second line (first data):', lines[1]);

      // Skip header row
      const dataLines = lines.slice(1);
      
      let skippedCount = 0;
      const words: WordData[] = [];
      
      dataLines.forEach((line, index) => {
        const columns = line.split('\t');
        
        console.log(`\n🔍 Parsing line ${index + 2}:`, {
          columnCount: columns.length,
          firstThreeColumns: columns.slice(0, 3),
          allColumns: columns.map((col, i) => `[${i}]: "${col.substring(0, 30)}${col.length > 30 ? '...' : ''}"`),
          rawLine: line.substring(0, 100)
        });
        
        // 컬럼 순서: 권수, Day, 번호, 단어, 뜻, 썰, 영어 예문, 번역, 갓생예문, 파생어, 동의어, 반의어, 혼동어, 영영정의
        const [
          volStr,
          dayStr,
          numberStr,
          word,
          meaning,
          story,
          englishExample,
          translation,
          godlifeExample,
          derivativesStr,
          synonymsStr,
          antonymsStr,
          confusablesStr,
          englishDefinition
        ] = columns;

        // Parse volume, day, and number
        const vol = parseInt(volStr?.trim() || '0');
        const day = parseInt(dayStr?.trim() || '0');
        const number = parseInt(numberStr?.trim() || '0');

        console.log(`📋 Parsed values:`, { 
          vol, day, number, 
          word: word?.substring(0, 20),
          isVolValid: vol >= 1 && vol <= 8,
          isDayValid: day >= 1 && day <= 16,
          isNumberValid: number >= 1
        });

        // Validate required fields
        if (!vol || isNaN(vol) || vol < 1 || vol > 8) {
          console.warn(`❌ Invalid vol at line ${index + 2}:`, volStr, '→', vol);
          skippedCount++;
          return;
        }
        if (!day || isNaN(day) || day < 1 || day > 16) {
          console.warn(`❌ Invalid day at line ${index + 2}:`, dayStr, '→', day);
          skippedCount++;
          return;
        }
        if (!number || isNaN(number) || number < 1) {
          console.warn(`❌ Invalid number at line ${index + 2}:`, numberStr, '→', number);
          skippedCount++;
          return;
        }
        if (!word || word.trim() === '') {
          console.warn(`❌ Missing word at line ${index + 2}`);
          skippedCount++;
          return;
        }

        console.log(`✅ Valid word at line ${index + 2}`);

        // Parse derivatives
        const derivatives = derivativesStr && derivativesStr.trim() !== '-' && derivativesStr.trim() !== ''
          ? derivativesStr.split(',').map(d => {
              const trimmed = d.trim();
              // Format: "abandonment (n) - 포기, 유기"
              const match = trimmed.match(/(.+?)\s*\((.+?)\)\s*-\s*(.+)/);
              if (match) {
                return {
                  word: match[1].trim(),
                  partOfSpeech: match[2].trim(),
                  meaning: match[3].trim()
                };
              }
              return null;
            }).filter(Boolean) as { word: string; partOfSpeech: string; meaning: string }[]
          : [];

        // Parse synonyms
        const synonyms = synonymsStr && synonymsStr.trim() !== '-' && synonymsStr.trim() !== ''
          ? synonymsStr.split(',').map(s => s.trim())
          : [];

        // Parse antonyms
        const antonyms = antonymsStr && antonymsStr.trim() !== '-' && antonymsStr.trim() !== ''
          ? antonymsStr.split(',').map(s => s.trim())
          : [];

        // Parse confusables
        const confusionWords = confusablesStr && confusablesStr.trim() !== '-' && confusablesStr.trim() !== ''
          ? confusablesStr.split(',').map(c => {
              const trimmed = c.trim();
              // Format: "abound (풍부하다)"
              const match = trimmed.match(/(.+?)\s*\((.+?)\)/);
              if (match) {
                return {
                  word: match[1].trim(),
                  meaning: match[2].trim(),
                  explanation: ''
                };
              }
              return null;
            }).filter(Boolean) as { word: string; meaning: string; explanation: string }[]
          : [];

        // Use 갓생예문 if available, otherwise use 영어 예문
        const example = godlifeExample && godlifeExample.trim() !== '' 
          ? godlifeExample.trim() 
          : englishExample && englishExample.trim() !== ''
          ? englishExample.trim()
          : '';

        words.push({
          id: String(Date.now() + index),
          vol,
          day,
          number,
          word: word?.trim() || '',
          koreanMeaning: meaning?.trim() || '',
          pronunciation: '', // Not in excel data
          koreanPronunciation: '', // Not in excel data
          derivatives,
          example,
          story: story?.trim() || '',
          englishDefinition: englishDefinition?.trim() || '',
          confusionWords,
          synonyms,
          antonyms
        });
      });

      console.log(`\n📊 Parsing complete:`, {
        total: dataLines.length,
        valid: words.length,
        skipped: skippedCount,
        volBreakdown: words.reduce((acc, w) => {
          acc[`VOL.${w.vol}`] = (acc[`VOL.${w.vol}`] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });

      if (words.length === 0) {
        setParseError(`유효한 데이터가 없습니다. ${skippedCount}개 행을 건너뛰었습니다. 컬럼 순서를 확인해주세요.`);
        return;
      }

      if (skippedCount > 0) {
        alert(`⚠️ ${skippedCount}개의 잘못된 행을 건너뛰었습니다. 콘솔에서 자세한 내용을 확인하세요.`);
      }

      setParsedWords(words);
      setParseError(null);
    } catch (err) {
      console.error('Parse error:', err);
      setParseError('데이터 파싱 중 오류가 발생했습니다. 형식을 확인해주세요.');
    }
  };

  const handleUpload = async () => {
    if (parsedWords.length > 0) {
      setUploading(true);
      setUploadError(null);
      try {
        onUpload(parsedWords, deleteExisting);
        onClose();
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError('업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleClear = () => {
    setPastedData('');
    setParsedWords([]);
    setParseError(null);
    setUploadError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#091A7A] to-[#1A2FB8] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-white" />
                <h2 className="text-white font-bold text-xl">엑셀 데이터 업로드</h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-900 mb-2">📋 사용 방법</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>엑셀에서 헤더 포함한 데이터를 선택하고 복사 (Ctrl+C)</li>
                  <li>아래 텍스트 영역에 붙여넣기 (Ctrl+V)</li>
                  <li>"데이터 미리보기" 버튼을 눌러 확인</li>
                  <li>문제없으면 "업로드" 버튼 클릭</li>
                </ol>
                <div className="mt-2 text-xs text-blue-700">
                  <strong>컬럼 순서:</strong> 권수 | Day | 번호 | 단어 | 뜻 | 썰 | 영어 예문 | 번역 | 갓생예문 | 파생어 | 동의어 | 반의어 | 혼동어 | 영영정의
                </div>
              </div>

              {/* Paste Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  엑셀 데이터 붙여넣기
                </label>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="엑셀에서 복사한 데이터를 여기에 붙여넣으세요... (Ctrl+V)

예시 (헤더 포함):
권수	Day	번호	단어	뜻	썰	영어 예문	번역	갓생예문	파생어	동의어	반의어	혼동어	영영정의
1	1	1	through	~을 통해	썰 내용...			예문 내용...					from one end to the other"
                  className="w-full h-64 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none font-mono text-sm resize-none"
                />
              </div>

              {/* Parse Button */}
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleParse}
                  disabled={!pastedData.trim()}
                  className="px-6 py-3 bg-[#091A7A] text-white rounded-lg font-medium hover:bg-[#1A2FB8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  데이터 미리보기
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClear}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  초기화
                </motion.button>
              </div>

              {/* Error Display */}
              {parseError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-900">오류</h4>
                    <p className="text-sm text-red-700">{parseError}</p>
                  </div>
                </motion.div>
              )}

              {/* Preview */}
              {parsedWords.length > 0 && !parseError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-4"
                >
                  <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    파싱 성공! {parsedWords.length}개 단어 준비됨
                  </h4>
                  
                  {/* Delete existing option */}
                  <div className="mb-3 bg-white rounded-lg p-3 border border-green-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteExisting}
                        onChange={(e) => setDeleteExisting(e.target.checked)}
                        className="w-4 h-4 text-[#091A7A] rounded focus:ring-2 focus:ring-[#091A7A]/20"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        기존 DB 데이터 모두 삭제 후 업로드 (권장)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6 mt-1">
                      {deleteExisting 
                        ? '✅ 기존 모든 단어를 삭제하고 새로 업로드합니다 (깔끔한 재업로드)' 
                        : '⚠️ 기존 단어가 있으면 업데이트하고, 없으면 추가합니다'}
                    </p>
                  </div>
                  
                  {/* Preview first 3 words */}
                  <div className="space-y-2">
                    {parsedWords.slice(0, 3).map((word, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#091A7A]">{word.number}.</span>
                          <span className="font-bold text-[#091A7A]">{word.word}</span>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-700">{word.koreanMeaning}</span>
                        </div>
                        {word.derivatives.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            파생어: {word.derivatives.map(d => d.word).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                    {parsedWords.length > 3 && (
                      <div className="text-center text-sm text-green-700">
                        ... 외 {parsedWords.length - 3}개 단어
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                취소
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleUpload}
                disabled={parsedWords.length === 0 || uploading}
                className="px-6 py-2 bg-[#091A7A] text-white rounded-lg font-medium hover:bg-[#1A2FB8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                업로드 ({parsedWords.length}개)
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}