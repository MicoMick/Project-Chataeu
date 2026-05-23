import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, User, Eye } from 'lucide-react';

const CalendarReserve = ({ isOpen, onClose, reservations, setSelectedReservation }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);

  if (!isOpen) return null;

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];
    const firstDay = firstDayOfMonth(year, month);
    const totalDays = daysInMonth(year, month);

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, currentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, currentMonth: true });
    }
    return days;
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      {/* FIXED UI: Added max-h-[90vh] and flex-col so it fits on laptop screens and scrolls internally if needed */}
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">Reservation Calendar</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center justify-between mb-6">
            <span className="font-bold text-xl md:text-2xl text-slate-900">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex gap-2 md:gap-3">
              <button onClick={() => changeMonth(-1)} className="p-2 md:p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => changeMonth(1)} className="p-2 md:p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 cursor-pointer">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] md:text-xs font-black uppercase text-slate-400 py-2">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
            {generateCalendarDays().map((dateObj, idx) => {
              // FIXED UI: Changed min-h-[80px] to min-h-[60px] so grid doesn't stretch past laptop screens vertically
              if (!dateObj.day) return <div key={idx} className="min-h-[60px] md:min-h-[70px]"></div>;

              const dayDisplay = `${currentDate.toLocaleString('default', { month: 'short' })} ${dateObj.day}`;
              const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dateObj.day);
              
              const dayReservations = reservations.filter(r => {
                if (!r.date) return false;
                const isoMatch = r.date.startsWith(cellDate.toISOString().split('T')[0]);
                const stringMatch = r.date.includes(dayDisplay);
                return isoMatch || stringMatch;
              });

              const hasReservation = dayReservations.length > 0;
              const isToday = dateObj.day === new Date().getDate() && 
                              currentDate.getMonth() === new Date().getMonth() &&
                              currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div key={idx} 
                  onClick={() => hasReservation && setSelectedDateDetails({ date: dayDisplay, items: dayReservations })}
                  className={`min-h-[60px] md:min-h-[70px] p-2 flex flex-col items-center justify-start rounded-2xl text-base md:text-lg font-bold relative transition-all
                    ${dateObj.day ? 'hover:bg-indigo-50 cursor-pointer border border-transparent hover:border-indigo-100' : ''}
                    ${hasReservation && !isToday ? 'bg-yellow-100 text-yellow-700' : 'text-slate-700'}
                    ${isToday ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : ''}
                  `}
                >
                  {dateObj.day}
                  
                  {hasReservation && (
                    <div className="flex flex-col items-center mt-0.5 md:mt-1">
                      <span className={`text-[8px] md:text-[10px] uppercase tracking-tighter font-black ${isToday ? 'text-indigo-200' : 'text-orange-600'}`}>
                        Marked
                      </span>
                      <div className={`mt-0.5 md:mt-1 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-orange-500'}`}></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Date Details Overlay */}
        {selectedDateDetails && (
          <div className="absolute inset-0 z-[10005] bg-white flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedDateDetails.date}</h2>
                <p className="text-sm text-slate-500 font-medium">{selectedDateDetails.items.length} Reservations</p>
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              {selectedDateDetails.items.map((item) => (
                <div key={item.id} className="p-4 md:p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base">{item.profiles?.full_name}</h4>
                      <p className="text-xs font-medium text-slate-500">{item.facilities?.name || 'Unknown Facility'} • {item.start_time}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { 
                      setSelectedReservation(item); 
                      setSelectedDateDetails(null); 
                      onClose(); 
                    }} 
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 transition-all cursor-pointer shrink-0"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-6 md:p-8 border-t border-slate-100 shrink-0">
              <button 
                onClick={() => setSelectedDateDetails(null)} 
                className="w-full py-3 md:py-4 bg-slate-900 text-white font-bold rounded-2xl cursor-pointer hover:bg-slate-800 transition-colors"
              >
                Back to Calendar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarReserve;