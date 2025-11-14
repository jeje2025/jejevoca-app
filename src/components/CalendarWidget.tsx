import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 한글 월 이름
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  
  const daysInWeek = [
    { id: 'mon', label: '월' },
    { id: 'tue', label: '화' },
    { id: 'wed', label: '수' },
    { id: 'thu', label: '목' },
    { id: 'fri', label: '금' },
    { id: 'sat', label: '토' },
    { id: 'sun', label: '일' }
  ];
  
  // 현재 주의 날짜들 계산
  const getWeekDates = () => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    const monday = new Date(curr.setDate(diff));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        id: `date-${i}`,
        date: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isToday: date.toDateString() === today.toDateString()
      });
    }
    return weekDates;
  };
  
  const weekDates = getWeekDates();
  
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="p-6 bg-card-glass backdrop-blur-lg rounded-[20px] shadow-card border border-white/20"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-section-header text-[#091A7A]">{year}년 {monthNames[month]}</h3>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goToPreviousWeek}
            className="w-8 h-8 flex items-center justify-center rounded-[12px] transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4 text-[#091A7A] stroke-[1.5]" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goToNextWeek}
            className="w-8 h-8 flex items-center justify-center rounded-[12px] transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4 text-[#091A7A] stroke-[1.5]" />
          </motion.button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {daysInWeek.map((day) => (
          <div key={day.id} className="text-center text-tiny text-[#6B7280] font-medium py-2">
            {day.label}
          </div>
        ))}
        
        {weekDates.map((dateObj, index) => (
          <motion.button
            key={dateObj.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 + index * 0.04, type: "spring", stiffness: 300 }}
            whileTap={{ scale: 0.95 }}
            className={`w-9 h-9 flex items-center justify-center rounded-[18px] text-small font-medium transition-all duration-200 ${
              dateObj.isToday
                ? 'bg-[#ADC8FF] text-[#091A7A] shadow-interactive border border-white/20'
                : dateObj.month !== month
                ? 'text-[#D1D5DB]'
                : 'text-[#6B7280]'
            }`}
          >
            {dateObj.date}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}