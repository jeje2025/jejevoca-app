import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Plus, Download, Upload, Trash2, Search, ChevronDown, ChevronRight, Edit2, FileSpreadsheet } from 'lucide-react';
import { WordData } from '../types/word';
import { WordEditModal } from '../WordEditModal';
import { BulkUploadModal } from '../BulkUploadModal';
import { Fragment } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { authService } from '../../utils/auth';

interface WordDataTabProps {
  accessToken?: string;
}

export function WordDataTab({ accessToken }: WordDataTabProps) {
  const [selectedVol, setSelectedVol] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingWord, setEditingWord] = useState<WordData | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Start with empty words array - will be loaded from server
  const [words, setWords] = useState<WordData[]>([]);

  // Load words from server on mount
  useEffect(() => {
    fetchAllWords();
  }, [accessToken]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleAddWord = () => {
    const newWord: WordData = {
      id: String(Date.now()),
      vol: selectedVol,
      day: selectedDay === 'all' ? 1 : selectedDay,
      number: words.filter(w => w.vol === selectedVol && (selectedDay === 'all' || w.day === selectedDay)).length + 1,
      word: '',
      koreanMeaning: '',
      pronunciation: '',
      koreanPronunciation: '',
      derivatives: [],
      example: '',
      story: '',
      englishDefinition: '',
      confusionWords: [],
      synonyms: [],
      antonyms: []
    };
    setEditingWord(newWord);
  };

  const handleSaveWord = (word: WordData) => {
    const existingIndex = words.findIndex(w => w.id === word.id);
    if (existingIndex >= 0) {
      setWords(words.map(w => w.id === word.id ? word : w));
    } else {
      setWords([...words, word]);
    }
  };

  const handleDeleteWord = (id: string) => {
    if (confirm('이 단어를 삭제하시겠습니까?')) {
      setWords(words.filter(w => w.id !== id));
    }
  };

  const handleExportCSV = () => {
    const filteredWords = getFilteredWords();
    const headers = ['VOL', 'Day', '번호', '단어', '한글뜻', '발음', '한글발음', '파생어', '예문', '썰', '영어정의', '혼동단어', '동의어', '반의어'];
    const csvContent = [
      headers.join('\t'),
      ...filteredWords.map(w => 
        [
          w.vol,
          w.day,
          w.number,
          w.word,
          `"${w.koreanMeaning}"`,
          w.pronunciation,
          w.koreanPronunciation,
          `"${w.derivatives.map(d => `${d.word}(${d.partOfSpeech}):${d.meaning}`).join('; ')}"`,
          `"${w.example}"`,
          `"${w.story}"`,
          `"${w.englishDefinition}"`,
          `"${w.confusionWords.map(c => `${c.word}:${c.meaning}-${c.explanation}`).join('; ')}"`,
          w.synonyms.join(', '),
          w.antonyms.join(', ')
        ].join('\t')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `갓생보카_VOL${selectedVol}${selectedDay !== 'all' ? `_Day${selectedDay}` : ''}.csv`;
    link.click();
  };

  const getFilteredWords = () => {
    return words
      .filter(w => {
        // Type-safe comparisons - convert to numbers
        const matchesVol = Number(w.vol) === Number(selectedVol);
        const matchesDay = selectedDay === 'all' || Number(w.day) === Number(selectedDay);
        const matchesSearch = searchQuery === '' || 
          w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.koreanMeaning.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesVol && matchesDay && matchesSearch;
      })
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.number - b.number;
      });
  };

  const handleBulkUpload = async (uploadedWords: WordData[], deleteExisting: boolean = false) => {
    setUploading(true);
    try {
      // Use accessToken from props or authService
      const token = accessToken || authService.getAccessToken();
      
      console.log('🔑 Access Token:', token ? `${token.substring(0, 20)}...` : 'NULL');
      console.log('📦 Uploading words count:', uploadedWords.length);
      console.log('🗑️ Delete existing:', deleteExisting);
      
      if (!token) {
        alert('로그인이 필요합니다. 관리자로 다시 로그인해주세요.');
        return;
      }

      // Upload to server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/bulk-upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ words: uploadedWords, deleteExisting }),
        }
      );

      const data = await response.json();
      
      console.log('📡 Server response:', response.status, data);

      if (!response.ok) {
        console.error('❌ Upload error:', data);
        alert(`업로드 실패: ${data.error || '알 수 없는 오류'}`);
        return;
      }

      // Success!
      console.log('Upload successful:', data);
      alert(`✅ ${data.count}개 단어 업로드/수정 성공!`);
      
      // Refresh data from server
      await fetchAllWords();
      setShowBulkUpload(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert('업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  const fetchAllWords = async () => {
    try {
      const token = accessToken || (window as any).authService?.getAccessToken() || localStorage.getItem('access_token');
      
      if (!token) {
        console.warn('⚠️ No access token available for fetching words');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/all`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.words) {
        setWords(data.words);
        
        // VOL별 단어 개수 확인
        const volCounts = data.words.reduce((acc: any, w: any) => {
          acc[w.vol] = (acc[w.vol] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`✅ Loaded ${data.count} words from database`);
        console.log('📊 VOL별 단어 개수:', volCounts);
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  };

  const handleDownloadFromDB = async () => {
    try {
      const token = accessToken || (window as any).authService?.getAccessToken() || localStorage.getItem('access_token');
      
      if (!token) {
        alert('로그인이 필요합니다. 관리자로 다시 로그인해주세요.');
        return;
      }

      // Fetch all words from server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/all`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(`다운로드 실패: ${data.error || '알 수 없는 오류'}`);
        return;
      }

      const dbWords = data.words as WordData[];

      // Format derivatives
      const formatDerivatives = (derivatives: any[]) => {
        if (!derivatives || derivatives.length === 0) return '-';
        return derivatives.map(d => `${d.word} (${d.partOfSpeech}) - ${d.meaning}`).join(', ');
      };

      // Format confusion words
      const formatConfusionWords = (confusionWords: any[]) => {
        if (!confusionWords || confusionWords.length === 0) return '-';
        return confusionWords.map(c => `${c.word} (${c.meaning})`).join(', ');
      };

      // Create TSV content
      const headers = ['권수', 'Day', '번호', '단어', '뜻', '썰', '영어 예문', '번역', '갓생예문', '파생어', '동의어', '반의어', '혼동어', '영영정의'];
      const csvContent = [
        headers.join('\t'),
        ...dbWords.map(w => 
          [
            w.vol,
            w.day,
            w.number,
            w.word,
            w.koreanMeaning,
            w.story || '-',
            w.example || '-',
            '-', // 번역 (사용 안 함)
            '-', // 갓생예문 (example에 이미 포함)
            formatDerivatives(w.derivatives),
            w.synonyms && w.synonyms.length > 0 ? w.synonyms.join(', ') : '-',
            w.antonyms && w.antonyms.length > 0 ? w.antonyms.join(', ') : '-',
            formatConfusionWords(w.confusionWords),
            w.englishDefinition || '-'
          ].join('\t')
        )
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `갓생보카_전체데이터_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      alert(`✅ ${dbWords.length}개 단어 다운로드 완료!`);
    } catch (error) {
      console.error('Download error:', error);
      alert('다운로드 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const filteredWords = getFilteredWords();

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 mb-4">
        {/* VOL + Day Filters */}
        <div className="flex items-center gap-3">
          {/* VOL Filter */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(vol => (
              <motion.button
                key={vol}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedVol(vol)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedVol === vol
                    ? 'bg-[#091A7A] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                VOL. {vol}
              </motion.button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Day Filter */}
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all bg-white"
          >
            <option value="all">📅 전체 Day</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>📅 Day {day}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="단어/뜻 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#091A7A] focus:ring-1 focus:ring-[#091A7A]/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddWord}
            className="px-4 py-2 bg-[#091A7A] text-white rounded-lg flex items-center gap-2 hover:bg-[#1A2FB8] transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            단어 추가
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowBulkUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            CSV 업로드
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadFromDB}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            DB 다운로드
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            현재 필터 내보내기
          </motion.button>

          <div className="flex-1" />

          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span className="font-medium text-gray-700">{filteredWords.length}</span>
            <span>개 단어</span>
          </div>
        </div>
      </div>

      {/* Expandable Table */}
      <div className="flex-1 bg-white rounded-lg border-2 border-gray-300 overflow-hidden shadow-sm">
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-b from-gray-100 to-gray-50 sticky top-0 z-10 border-b-2 border-gray-300">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 border-r border-gray-300 w-12"></th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 border-r border-gray-300 w-16">번호</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-r border-gray-300 w-40">단어</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-r border-gray-300 flex-1">한글 뜻 및 설명</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 w-24">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((word, index) => {
                const isExpanded = expandedRows.has(word.id);
                return (
                  <Fragment key={word.id}>
                    {/* Main Row */}
                    <tr
                      className={`border-b border-gray-200 hover:bg-blue-50/30 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td 
                        className="px-3 py-3 text-center border-r border-gray-200"
                        onClick={() => toggleRow(word.id)}
                      >
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600 mx-auto" />
                        </motion.div>
                      </td>
                      <td className="px-3 py-3 text-center border-r border-gray-200 font-medium text-gray-700">
                        {String(word.number).padStart(3, '0')}
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200">
                        <div className="font-bold text-[#091A7A]">{word.word}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{word.pronunciation} {word.koreanPronunciation}</div>
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200">
                        <div className="text-gray-800">{word.koreanMeaning}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setEditingWord(word)}
                            className="w-7 h-7 bg-blue-50 hover:bg-blue-100 rounded flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteWord(word.id)}
                            className="w-7 h-7 bg-red-50 hover:bg-red-100 rounded flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </motion.button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={index % 2 === 0 ? 'bg-blue-50/50' : 'bg-blue-50/70'}
                        >
                          <td colSpan={5} className="px-6 py-4 border-b border-gray-200">
                            <div className="space-y-4 text-sm">
                              {/* 파생어 */}
                              {word.derivatives.length > 0 && (
                                <div>
                                  <div className="font-bold text-gray-700 mb-2">📝 파생어</div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {word.derivatives.map((deriv, i) => (
                                      <div key={i} className="bg-white px-3 py-2 rounded border border-gray-200">
                                        <span className="font-medium text-[#091A7A]">{deriv.word}</span>
                                        <span className="text-gray-500 text-xs ml-1">{deriv.partOfSpeech}</span>
                                        <div className="text-gray-600 text-xs mt-0.5">{deriv.meaning}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 예문 */}
                              {word.example && (
                                <div>
                                  <div className="font-bold text-gray-700 mb-2">💬 예문</div>
                                  <div className="bg-white px-4 py-3 rounded border border-gray-200 italic text-gray-700">
                                    {word.example}
                                  </div>
                                </div>
                              )}

                              {/* 썰 */}
                              {word.story && (
                                <div>
                                  <div className="font-bold text-gray-700 mb-2">💡 썰 (어원/이미지)</div>
                                  <div className="bg-amber-50 px-4 py-3 rounded border border-amber-200 text-gray-700 whitespace-pre-wrap">
                                    {word.story}
                                  </div>
                                </div>
                              )}

                              {/* 영어 정의 */}
                              {word.englishDefinition && (
                                <div>
                                  <div className="font-bold text-gray-700 mb-2">🔤 영어 정의</div>
                                  <div className="bg-white px-4 py-3 rounded border border-gray-200 italic text-gray-700">
                                    {word.englishDefinition}
                                  </div>
                                </div>
                              )}

                              {/* 혼동 단어 */}
                              {word.confusionWords.length > 0 && (
                                <div>
                                  <div className="font-bold text-gray-700 mb-2">⚠️ 혼동 주의 단어</div>
                                  <div className="space-y-2">
                                    {word.confusionWords.map((confusion, i) => (
                                      <div key={i} className="bg-orange-50 px-4 py-3 rounded border border-orange-200">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-orange-700">{confusion.word}</span>
                                          <span className="text-gray-600">{confusion.meaning}</span>
                                        </div>
                                        <div className="text-gray-700 text-xs">{confusion.explanation}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 동의어 & 반의어 */}
                              <div className="grid grid-cols-2 gap-4">
                                {word.synonyms.length > 0 && (
                                  <div>
                                    <div className="font-bold text-gray-700 mb-2">🔄 동의어</div>
                                    <div className="bg-green-50 px-4 py-2 rounded border border-green-200">
                                      {word.synonyms.join(', ')}
                                    </div>
                                  </div>
                                )}
                                {word.antonyms.length > 0 && (
                                  <div>
                                    <div className="font-bold text-gray-700 mb-2">↔️ 반의어</div>
                                    <div className="bg-red-50 px-4 py-2 rounded border border-red-200">
                                      {word.antonyms.join(', ')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })}

              {/* Empty state */}
              {filteredWords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-12 h-12 text-gray-300" />
                      <p className="text-sm">단어가 없습니다</p>
                      <p className="text-xs text-gray-400">단어 추가 버튼을 눌러 새 단어를 추가하세요</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Bar */}
      <div className="mt-3 flex gap-3">
        <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
          <div className="text-xs text-blue-700">현재 교재</div>
          <div className="text-lg font-bold text-blue-900">VOL. {selectedVol}</div>
        </div>
        <div className="flex-1 bg-purple-50 rounded-lg px-3 py-2 border border-purple-200">
          <div className="text-xs text-purple-700">현재 Day</div>
          <div className="text-lg font-bold text-purple-900">{selectedDay === 'all' ? '전체' : `Day ${selectedDay}`}</div>
        </div>
        <div className="flex-1 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <div className="text-xs text-green-700">표시 중</div>
          <div className="text-lg font-bold text-green-900">{filteredWords.length}개</div>
        </div>
        <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          <div className="text-xs text-amber-700">전체 단어</div>
          <div className="text-lg font-bold text-amber-900">{words.length}개</div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingWord && (
          <WordEditModal
            isOpen={!!editingWord}
            word={editingWord}
            onSave={handleSaveWord}
            onClose={() => setEditingWord(null)}
          />
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkUpload && (
          <BulkUploadModal
            isOpen={showBulkUpload}
            onClose={() => setShowBulkUpload(false)}
            onUpload={handleBulkUpload}
          />
        )}
      </AnimatePresence>
    </div>
  );
}