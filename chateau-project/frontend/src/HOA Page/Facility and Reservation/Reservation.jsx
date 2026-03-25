import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, Search, MoreHorizontal, Plus, Users, Trash2, Edit, Eye, ChevronDown, ChevronLeft, ChevronRight, X, MapPin,
  Upload,
  Mail,
  User
} from 'lucide-react';
// IMPORT THE NEW COMPONENT
import Facility from './Facility'; 

const StatCard = ({ title, value, icon: Icon, iconColor, bgColor }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bgColor}`}>
      <Icon size={24} className={iconColor} />
    </div>
  </div>
);

const Reservation = () => {
  const [reservationSearch, setReservationSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 }); // Track coordinates
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDateReservations, setHoveredDateReservations] = useState(null); // For Calendar Hover
  const [selectedDateDetails, setSelectedDateDetails] = useState(null); // NEW STATE FOR CLICKED DAY
  
  const menuRef = useRef(null);

  const [reservations] = useState([
    { id: 1, name: "Juan Dela Cruz", email: "juandelacruz@gmail.com", facility: "Clubhouse", date: "Feb 5, 2026", time: "2:00 PM - 5:00 PM", status: "Approved", requested: "Feb 10, 2026" },
    { id: 2, name: "Carlos P Garcia", email: "carlospgarcia@gmail.com", facility: "Clubhouse", date: "Feb 5, 2026", time: "2:00 PM - 6:00 PM", status: "Pending", requested: "Jan 15, 2024" },
    { id: 3, name: "Jose Mang Juan", email: "josemangjuan@gmail.com", facility: "Clubhouse", date: "Feb 5, 2026", time: "2:00 PM - 6:00 PM", status: "Rejected", requested: "Jan 15, 2024" },
    { id: 4, name: "Pedro Sanchez", email: "pedrosanchez@gmail.com", facility: "Clubhouse", date: "Mar 8, 2026", time: "2:00 PM - 6:00 PM", status: "Approved", requested: "Jan 15, 2024" },
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const filteredReservations = reservations.filter((res) => {
    const matchesSearch = res.name.toLowerCase().includes(reservationSearch.toLowerCase()) || 
                          res.facility.toLowerCase().includes(reservationSearch.toLowerCase());
    let matchesTab = filterTab === 'all' || (filterTab === 'pending' && res.status === 'Pending');
    return matchesSearch && matchesTab;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-600';
      case 'Pending': return 'bg-orange-100 text-orange-600';
      case 'Rejected': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleToggleMenu = (e, id) => {
    if (activeMenuId === id) {
      setActiveMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 192, 
      });
      setActiveMenuId(id);
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 p-8 text-slate-900 custom-scrollbar relative">
      
      <section className="mb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Reservation Management</h1>
          <p className="text-slate-500 text-sm">View and manage amenity reservations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Reservations" value="4" icon={Calendar} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
          <StatCard title="Pending Approval" value="1" icon={Clock} iconColor="text-blue-600" bgColor="bg-blue-50" />
          <StatCard title="Approved" value="2" icon={CheckCircle2} iconColor="text-green-600" bgColor="bg-green-50" />
          <StatCard title="Rejected" value="1" icon={XCircle} iconColor="text-red-500" bgColor="bg-red-50" />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-visible">
          <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Reservations..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={reservationSearch}
                onChange={(e) => setReservationSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setFilterTab('all')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterTab === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>All</button>
                <button onClick={() => setFilterTab('pending')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterTab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Pendings</button>
              </div>
              <button 
                onClick={() => setIsCalendarOpen(true)}
                className="text-sm font-bold text-slate-900 px-4 hover:text-indigo-600 transition-colors"
              >
                Calendar View
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[11px] uppercase tracking-widest font-bold border-b border-slate-50">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Amenity</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReservations.length > 0 ? (
                    filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{res.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{res.facility}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{res.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(res.status)}`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => handleToggleMenu(e, res.id)} 
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search size={32} className="text-slate-200" />
                          <p className="text-sm font-bold text-slate-400">No reservations found for "{reservationSearch}"</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      </section>

      {activeMenuId && (
        <div 
          ref={menuRef} 
          className="fixed w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] py-2 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ 
            top: `${menuPosition.top}px`, 
            left: `${menuPosition.left}px` 
          }}
        >
          {(() => {
            const res = reservations.find(r => r.id === activeMenuId);
            return (
              <>
                <button onClick={() => { setSelectedReservation(res); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
                  View Profile
                </button>
                <button className="w-full px-4 py-2.5 text-left text-xs font-bold text-green-600 hover:bg-green-50 flex items-center gap-3 border-t border-slate-50">
                  Approve
                </button>
                <button className="w-full px-4 py-2.5 text-left text-xs font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-3">
                  Reject
                </button>
                <button className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-slate-50">
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}

      {selectedReservation && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedReservation(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 pt-10 pb-6 flex justify-between items-start">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 shadow-inner">
                    <User size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedReservation.name}</h2>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(selectedReservation.status)}`}>
                      {selectedReservation.status}
                    </span>
                  </div>
               </div>
               <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
            </div>
            <div className="px-8 pb-10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate"><Mail size={14} className="text-indigo-500 shrink-0" /> {selectedReservation.email}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested On</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Clock size={14} className="text-indigo-500 shrink-0" /> {selectedReservation.requested}</p>
                   </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Reservation Details</h4>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm font-medium border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Facility / Item:</span>
                        <span className="text-slate-900 font-bold">{selectedReservation.facility}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-medium border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Scheduled Date:</span>
                        <span className="text-slate-900 font-bold">{selectedReservation.date}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-slate-500">Time Slot:</span>
                        <span className="text-slate-900 font-bold">{selectedReservation.time}</span>
                      </div>
                   </div>
                </div>
              </div>
              <div className="mt-8">
                <button onClick={() => setSelectedReservation(null)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR MODAL */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCalendarOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Reservation Calendar</h2>
              <button onClick={() => setIsCalendarOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-2xl text-slate-900">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <div className="flex gap-3">
                  <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200"><ChevronLeft size={20} /></button>
                  <button onClick={() => changeMonth(1)} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200"><ChevronRight size={20} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-black uppercase text-slate-400 py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {generateCalendarDays().map((dateObj, idx) => {
                  const dayString = `${currentDate.toLocaleString('default', { month: 'short' })} ${dateObj.day}`;
                  const dayReservations = reservations.filter(r => r.date.includes(dayString));
                  const hasReservation = dayReservations.length > 0;
                  const isToday = dateObj.day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

                  return (
                    <div 
                      key={idx} 
                      onClick={() => hasReservation && setSelectedDateDetails({ date: dayString, items: dayReservations })}
                      onMouseEnter={() => hasReservation && setHoveredDateReservations(dayReservations)}
                      onMouseLeave={() => setHoveredDateReservations(null)}
                      className={`min-h-[80px] p-2 flex flex-col items-center justify-start rounded-2xl text-lg font-bold relative transition-all
                        ${dateObj.day ? 'hover:bg-indigo-50 cursor-pointer border border-transparent hover:border-indigo-100' : ''}
                        ${hasReservation && !isToday ? 'bg-yellow-100 text-yellow-700' : 'text-slate-700'}
                        ${isToday ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : ''}
                      `}
                    >
                      {dateObj.day}
                      {hasReservation && (
                        <div className={`mt-2 w-2 h-2 rounded-full ${isToday ? 'bg-white' : 'bg-orange-500'}`}></div>
                      )}

                      {/* HOVER TOOLTIP */}
                      {hoveredDateReservations && hoveredDateReservations[0]?.date.includes(dayString) && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-slate-900/90 text-white p-2 rounded-xl shadow-2xl z-[10001] pointer-events-none">
                          <p className="text-[9px] font-bold text-center uppercase">Click to view {dayReservations.length} items</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NEW OVERLAY FOR CLICKED DAY DETAILS */}
            {selectedDateDetails && (
              <div className="absolute inset-0 z-[10005] bg-white flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedDateDetails.date}</h2>
                    <p className="text-sm text-slate-500 font-medium">{selectedDateDetails.items.length} Reservations Found</p>
                  </div>
                  <button 
                    onClick={() => setSelectedDateDetails(null)} 
                    className="p-3 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors text-slate-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                  {selectedDateDetails.items.map((item) => (
                    <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                          <User size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                          <p className="text-xs font-medium text-slate-500">{item.facility} • {item.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(item.status)}`}>
                            {item.status}
                         </span>
                         <button 
                            onClick={() => { setSelectedReservation(item); setSelectedDateDetails(null); }}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
                         >
                            <Eye size={18} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-8 border-t border-slate-100">
                  <button 
                    onClick={() => setSelectedDateDetails(null)}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
                  >
                    Back to Calendar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <hr className="border-slate-200 mb-12" />
      <Facility />
    </div>
  );
};

export default Reservation;