import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, Shuffle, Link2, Lightbulb, Smile, ArrowLeft } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AITutorScreenProps {
  onBack: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

const tutorFeatures = [
  { 
    icon: Shuffle, 
    text: "무슨 단어랑 헷갈린걸까?", 
    category: "혼동어휘",
    prompt: "이 단어와 헷갈리는 유사한 영어 단어들을 찾아주고, 어떻게 구분해야 하는지 알려줘:"
  },
  { 
    icon: Link2, 
    text: "무슨 전치사랑 같이 쓰일까?", 
    category: "콜로케이션",
    prompt: "이 단어와 자주 함께 쓰이는 전치사 콜로케이션을 알려주고 예문도 보여줘:"
  },
  { 
    icon: Lightbulb, 
    text: "이 단어가 도저히 안외워져.", 
    category: "암기법",
    prompt: "이 단어를 쉽게 외울 수 있는 창의적인 연상법이나 어원, 스토리를 만들어줘:"
  },
  { 
    icon: Smile, 
    text: "이 단어는 긍정적? 부정적?", 
    category: "톤분석",
    prompt: "이 단어의 톤과 뉘앙스를 분석해줘. 긍정적인지 부정적인지, 중립적인지, 그리고 어떤 상황에서 사용하면 좋은지 알려줘:"
  }
];

export function AITutorScreen({ onBack }: AITutorScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "안녕하세요! 💙 저는 천개의 바람 AI튜터입니다. 영어 단어 학습과 편입 준비를 돕기 위해 여기 있어요. 위 기능 중 하나를 선택하시거나, 자유롭게 질문해주세요!",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showWordInput, setShowWordInput] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<typeof tutorFeatures[0] | null>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    try {
      // 대화 히스토리를 Gemini API 형식으로 변환
      const history = messages
        .filter(msg => !msg.isLoading) // 로딩 메시지 제외
        .map(msg => ({
          role: msg.isUser ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      // 현재 사용자 메시지 추가
      const conversationHistory = [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e2f98fad/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            conversationHistory 
          })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error || 'API request failed');
      }

      console.log('API Success Response:', data);
      return data.response || '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.';
    } catch (error) {
      console.error('Gemini API Error:', error);
      return '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요. 에러: ' + (error instanceof Error ? error.message : String(error));
    }
  };

  const handleFeatureClick = (feature: typeof tutorFeatures[0]) => {
    setSelectedFeature(feature);
    
    // 멘탈케어는 단어 입력 없이 바로 실행
    if (feature.category === "멘탈케어") {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: feature.text,
        isUser: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      
      sendToGemini(feature.prompt);
    } else {
      setShowWordInput(true);
      setInputValue('');
    }
  };

  const handleWordSubmit = () => {
    if (!inputValue.trim() || !selectedFeature) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: `${selectedFeature.text}\n단어: "${inputValue}"`,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    const fullPrompt = `${selectedFeature.prompt} "${inputValue}"`;
    sendToGemini(fullPrompt);
    
    setInputValue('');
    setShowWordInput(false);
    setSelectedFeature(null);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue;
    setInputValue('');

    sendToGemini(userInput);
  };

  const sendToGemini = async (prompt: string) => {
    setIsTyping(true);

    // Add loading message
    const loadingMessage: Message = {
      id: 'loading-' + Date.now(),
      text: '생각 중...',
      isUser: false,
      timestamp: new Date(),
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    const aiResponse = await callGeminiAPI(prompt);

    // Remove loading message and add real response
    setMessages(prev => prev.filter(msg => !msg.isLoading));
    
    const aiMessage: Message = {
      id: Date.now().toString(),
      text: aiResponse,
      isUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ADC8FF] to-[#6B8FFF] flex items-center justify-center">
          <Bot className="w-4 h-4 text-[#091A7A]" />
        </div>
        <div className="bg-white/80 border border-white/60 rounded-2xl rounded-tl-md p-4">
          <div className="flex space-x-1">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 bg-[#091A7A]/60 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 bg-[#091A7A]/60 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 bg-[#091A7A]/60 rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'transparent' }}>
        <div className="flex items-center justify-between p-6 backdrop-blur-xl border-b border-white/20">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: '#353F54' }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
          
          <div className="text-center">
            <h1 className="text-lg" style={{ fontWeight: 700, color: '#091A7A' }}>
              천개의 바람 AI튜터
            </h1>
            <p className="text-xs" style={{ color: '#6B7280' }}>온라인 • 도움 준비 완료</p>
          </div>
          
          <div className="w-11" />
        </div>
      </div>

      {/* Feature Cards - Only show at start */}
      <AnimatePresence>
        {messages.length === 1 && !showWordInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 space-y-4"
          >
            <div className="text-center space-y-2">
              <p className="text-sm" style={{ fontWeight: 600, color: '#091A7A' }}>
                어떤 도움이 필요하신가요?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tutorFeatures.map((feature, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleFeatureClick(feature)}
                  className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#ADC8FF]/30 shadow-md active:shadow-lg transition-all duration-300 flex flex-col items-center justify-center text-center"
                >
                  <feature.icon className="w-6 h-6 mb-2" style={{ color: '#091A7A' }} />
                  <p className="text-xs mb-2" style={{ fontWeight: 600, color: '#091A7A' }}>
                    {feature.text}
                  </p>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(9, 26, 122, 0.15)', color: '#091A7A' }}
                  >
                    {feature.category}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word Input Modal */}
      <AnimatePresence>
        {showWordInput && selectedFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => {
              setShowWordInput(false);
              setSelectedFeature(null);
              setInputValue('');
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 border border-[#ADC8FF]/30 shadow-2xl w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <selectedFeature.icon className="w-6 h-6" style={{ color: '#091A7A' }} />
                <div>
                  <h3 className="text-sm" style={{ fontWeight: 700, color: '#091A7A' }}>
                    {selectedFeature.category}
                  </h3>
                  <p className="text-xs" style={{ color: '#091A7A' }}>
                    {selectedFeature.text}
                  </p>
                </div>
              </div>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleWordSubmit()}
                placeholder="단어를 입력하세요 (예: ambiguous)"
                className="w-full p-3 mb-3 bg-white border-2 rounded-xl focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: '#ADC8FF',
                  color: '#091A7A'
                }}
                autoFocus
              />
              
              <div className="flex gap-2 justify-end">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowWordInput(false);
                    setSelectedFeature(null);
                    setInputValue('');
                  }}
                  className="px-5 py-2 rounded-lg"
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
                >
                  취소
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWordSubmit}
                  disabled={!inputValue.trim()}
                  className="px-5 py-2 rounded-lg text-white"
                  style={{ 
                    backgroundColor: inputValue.trim() ? '#091A7A' : '#D1D5DB',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
                >
                  확인
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${message.isUser ? 'order-1' : 'order-2'}`}>
              <div className={`flex items-start gap-3 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.isUser 
                    ? 'bg-[#091A7A]' 
                    : 'bg-gradient-to-br from-[#ADC8FF] to-[#6B8FFF]'
                }`}>
                  {message.isUser ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-[#091A7A]" />
                  )}
                </div>
                
                <div className={`p-4 rounded-2xl shadow-sm ${
                  message.isUser
                    ? 'bg-[#091A7A] text-white rounded-tr-md'
                    : 'bg-white/90 rounded-tl-md border border-white/60'
                }`}
                  style={!message.isUser ? { color: '#091A7A' } : {}}
                >
                  <div className="leading-relaxed whitespace-pre-wrap text-[12px]">{message.text}</div>
                  <div className={`text-xs mt-2 ${
                    message.isUser ? 'text-white/70' : 'opacity-50'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-white/30 px-[20px] py-[16px]">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="자유롭게 질문하세요..."
              className="w-full p-4 pr-12 bg-white border-2 rounded-2xl focus:outline-none focus:ring-2 transition-all duration-200"
              style={{
                borderColor: '#ADC8FF',
                color: '#091A7A'
              }}
              disabled={isTyping || showWordInput}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || showWordInput}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
              inputValue.trim() && !isTyping && !showWordInput
                ? 'bg-gradient-to-br from-[#091A7A] to-[#4A5FC4] text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: '#091A7A', opacity: 0.6 }}>
          AI가 실수할 수 있습니다. 중요한 정보는 확인하세요.
        </p>
      </div>
    </div>
  );
}
