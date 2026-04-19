import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, Search, MoreHorizontal, Plus, Users, Trash2, Edit, Eye, ChevronDown, ChevronLeft, ChevronRight, X, MapPin, Upload, Mail,
  User, AlertTriangle
} from 'lucide-react';
import Facility from './Facility'; 
import { supabase } from '../supabaseAdmin'; 
import logger from '../auditlogger'; 

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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 }); 
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDateReservations, setHoveredDateReservations] = useState(null); 
  const [selectedDateDetails, setSelectedDateDetails] = useState(null); 
  
  // NEW STATES FOR DELETE CONFIRMATION
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);

  const menuRef = useRef(null);

  // UPDATED STATE FOR DATABASE DATA
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH DATA FROM SUPABASE
  const fetchReservations = async () => {
    logger.info('Fetching reservations data...');
    setLoading(true);
    const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      facilities (
        name
      ),
      profiles!user_id (  
        full_name,
        username
      )
    `);

    if (error) {
      logger.error('Error fetching reservations:', error);
      console.error('Error fetching:', error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // --- ADDED: HANDLERS FOR APPROVE, REJECT, AND DELETE ---
  const handleUpdateStatus = async (id, newStatus) => {
    logger.info(`Attempting to update status for reservation ${id} to ${newStatus}`);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state to reflect change immediately
      setReservations(prev => prev.map(res => 
        res.id === id ? { ...res, status: newStatus } : res
      ));
      setActiveMenuId(null);
      logger.info(`Successfully updated reservation ${id} to ${newStatus}`);
    } catch (error) {
      logger.error(`Error updating status for ${id}:`, error);
      alert("Error updating status: " + error.message);
    }
  };

  // UPDATED DELETE HANDLER TO TRIGGER MODAL
  const handleDelete = (id) => {
    setReservationToDelete(id);
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  // ACTUAL DELETE EXECUTION
  const confirmDelete = async () => {
    if (!reservationToDelete) return;
    logger.info(`Confirming deletion of reservation ${reservationToDelete}`);
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationToDelete);

      if (error) throw error;

      // Remove from local state
      setReservations(prev => prev.filter(res => res.id !== reservationToDelete));
      setIsDeleteModalOpen(false);
      setReservationToDelete(null);
      logger.info(`Successfully deleted reservation ${reservationToDelete}`);
    } catch (error) {
      logger.error(`Error deleting reservation ${reservationToDelete}:`, error);
      alert("Error deleting: " + error.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // STAT CALCULATIONS BASED ON FETCHED DATA
  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'Pending').length,
    approved: reservations.filter(r => r.status === 'Approved').length,
    rejected: reservations.filter(r => r.status === 'Rejected').length,
  };

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
    const name = res.profiles?.full_name || 'Unknown User';
    const matchesSearch = name.toLowerCase().includes(reservationSearch.toLowerCase()) || 
                          (res.facilities?.name?.toLowerCase().includes(reservationSearch.toLowerCase()));
    let matchesTab = filterTab === 'all' || (res.status && res.status.toLowerCase() === filterTab.toLowerCase());
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
          <StatCard title="Total Reservations" value={stats.total} icon={Calendar} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
          <StatCard title="Pending Approval" value={stats.pending} icon={Clock} iconColor="text-blue-600" bgColor="bg-blue-50" />
          <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} iconColor="text-green-600" bgColor="bg-green-50" />
          <StatCard title="Rejected" value={stats.rejected} icon={XCircle} iconColor="text-red-500" bgColor="bg-red-50" />
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
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterTab === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'} cursor-pointer`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterTab('pending')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterTab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'} cursor-pointer`}
                >
                  Pendings
                </button>
              </div>
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="text-sm font-bold text-slate-900 px-4 hover:text-indigo-600 transition-colors cursor-pointer"
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
                    <th className="px-6 py-4">Facility</th>
                    <th className="px-6 py-4">Requested Date</th>
                    <th className="px-6 py-4">Start Time</th>
                    <th className="px-6 py-4">End Time</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Requested On</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="8" className="px-6 py-8 text-center text-slate-400">Loading reservations...</td></tr>
                  ) : filteredReservations.length > 0 ? (
                    filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{res.profiles?.full_name || 'No Name'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{res.facilities?.name || 'Unknown Facility'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{res.date}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{res.start_time}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{res.end_time}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(res.status)}`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {res.created_at ? new Date(res.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => handleToggleMenu(e, res.id)} 
                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          >
                            < MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
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
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          {(() => {
            const res = reservations.find(r => r.id === activeMenuId);
            return (
              <>
                <button onClick={() => { setSelectedReservation(res); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 cursor-pointer">
                  View Details
                </button>
                {/* UPDATED BUTTONS WITH LIVE FUNCTIONS */}
                <button 
                  onClick={() => handleUpdateStatus(activeMenuId, 'Approved')}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-green-600 hover:bg-green-50 flex items-center gap-3 border-t border-slate-50 cursor-pointer"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleUpdateStatus(activeMenuId, 'Rejected')}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-3 cursor-pointer"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleDelete(activeMenuId)}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-slate-50 cursor-pointer"
                >
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
                     <h2 className="text-2xl font-bold text-slate-900">{selectedReservation.profiles?.full_name}</h2>
                     <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(selectedReservation.status)}`}>
                       {selectedReservation.status}
                     </span>
                   </div>
                </div>
                <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all cursor-pointer"><X size={24} /></button>
            </div>
            <div className="px-8 pb-10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2 truncate"><Mail size={14} className="text-indigo-500 shrink-0" /> {selectedReservation.profiles?.email || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested On</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Clock size={14} className="text-indigo-500 shrink-0" /> {selectedReservation.created_at ? new Date(selectedReservation.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Reservation Details</h4>
                   <div className="space-y-4">
                     <div className="flex justify-between items-center text-sm font-medium border-b border-slate-200 pb-2">
                       <span className="text-slate-500">Facility / Item:</span>
                       <span className="text-slate-900 font-bold">{selectedReservation.facilities?.name || 'Unknown Facility'}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-medium border-b border-slate-200 pb-2">
                       <span className="text-slate-500">Scheduled Date:</span>
                       <span className="text-slate-900 font-bold">{selectedReservation.date}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-medium">
                       <span className="text-slate-500">Time Slot:</span>
                       <span className="text-slate-900 font-bold">{selectedReservation.start_time} - {selectedReservation.end_time}</span>
                     </div>
                   </div>
                </div>
              </div>
              <div className="mt-8">
                <button onClick={() => setSelectedReservation(null)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl cursor-pointer">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR MODAL WITH UPDATED MAPPING LOGIC */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCalendarOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Reservation Calendar</h2>
              <button onClick={() => setIsCalendarOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} className='cursor-pointer' /></button>
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
                  if (!dateObj.day) return <div key={idx} className="min-h-[80px]"></div>;

                  // NEW LOGIC INTEGRATED HERE
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
                      className={`min-h-[80px] p-2 flex flex-col items-center justify-start rounded-2xl text-lg font-bold relative transition-all
                        ${dateObj.day ? 'hover:bg-indigo-50 cursor-pointer border border-transparent hover:border-indigo-100' : ''}
                        ${hasReservation && !isToday ? 'bg-yellow-100 text-yellow-700' : 'text-slate-700'}
                        ${isToday ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : ''}
                      `}
                    >
                      {dateObj.day}
                      
                      {hasReservation && (
                        <div className="flex flex-col items-center mt-1">
                          <span className={`text-[10px] uppercase tracking-tighter font-black ${isToday ? 'text-indigo-200' : 'text-orange-600'}`}>
                            Marked
                          </span>
                          <div className={`mt-1 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-orange-500'}`}></div>
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
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedDateDetails.date}</h2>
                    <p className="text-sm text-slate-500 font-medium">{selectedDateDetails.items.length} Reservations</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4">
                  {selectedDateDetails.items.map((item) => (
                    <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><User size={20} /></div>
                        <div>
                          <h4 className="font-bold text-slate-900">{item.profiles?.full_name}</h4>
                          <p className="text-xs font-medium text-slate-500">{item.facilities?.name || 'Unknown Facility'} • {item.start_time}</p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedReservation(item); setSelectedDateDetails(null); setIsCalendarOpen(false); }} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 transition-all"><Eye size={18} className="cursor-pointer" /></button>
                    </div>
                  ))}
                </div>
                <div className="p-8 border-t border-slate-100">
                  <button onClick={() => setSelectedDateDetails(null)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl cursor-pointer">Back to Calendar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ADDED: DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Delete</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Are you sure you want to delete this reservation? This action cannot be undone and will remove the data permanently.
              </p>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-100 cursor-pointer"
                >
                  Yes, Delete Permanently
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <hr className="border-slate-200 mb-12" />
      <Facility />
    </div>
  );
};

export default Reservation;