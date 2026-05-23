import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, Search, MoreHorizontal, Plus, Users, Trash2, Edit, Eye, ChevronDown, ChevronLeft, ChevronRight, X, MapPin, Upload, Mail,
  User, AlertTriangle, Loader2, Filter
} from 'lucide-react';
import Facility from './Facility'; 
import { supabase } from '../supabaseAdmin'; 
import logger from '../auditlogger'; 
import CalendarReserve from './CalendarReserve'; // --- ADDED: Imported separated Calendar Component ---

// --- ADDED: RequireRole Component ---
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') {
    return children;
  }
  return null; 
};

const logActivity = async (supabase, userEmail, activity, severity, details) => {
  try {
    await supabase.from('system_logs').insert([{
      user_email: userEmail,
      activity: activity,
      severity: severity,
      details: details,
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

const formatTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  if (timeStr.includes('-')) {
    return timeStr.split('-').map(t => formatTo12Hour(t.trim())).join(' - ');
  }
  
  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

// --- ADDED: Date Formatter Utility for DD/MM/YYYY ---
const formatDateToDMY = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Fallback if string matches raw custom names like 'May 22'
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <HelpCircle className="w-12 h-12 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-8">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-200 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const TransactionModal = ({ status, message, onClose }) => {
  if (!status) return null;

  const configs = {
    loading: {
      icon: <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />,
      title: "Processing...",
      bgColor: "bg-indigo-50"
    },
    success: {
      icon: <CheckCircle2 className="w-12 h-12 text-green-600" />,
      title: "Success!",
      bgColor: "bg-green-50"
    },
    error: {
      icon: <AlertCircle className="w-12 h-12 text-red-600" />,
      title: "Action Failed",
      bgColor: "bg-red-50"
    }
  };

  const current = configs[status];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className={`w-20 h-20 ${current.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
          {current.icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{current.title}</h3>
        <p className="text-slate-500 text-sm mb-8">{message}</p>
        
        {status !== 'loading' && (
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

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
  const [residentFilter, setResidentFilter] = useState('All');
  const [residentsList, setResidentsList] = useState([]);
  
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  const fetchResidentsList = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (!error && data) {
        setResidentsList(data);
      }
    } catch (error) {
      console.error("Error fetching residents options:", error.message);
    }
  };

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
    fetchResidentsList(); 
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    logger.info(`Attempting to update status for reservation ${id} to ${newStatus}`);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setReservations(prev => prev.map(res => 
        res.id === id ? { ...res, status: newStatus } : res
      ));
      logger.info(`Successfully updated reservation ${id} to ${newStatus}`);
    } catch (error) {
      logger.error(`Error updating status for ${id}:`, error);
      alert("Error updating status: " + error.message);
    }
  };

  const handleDelete = (id) => {
    setReservationToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!reservationToDelete) return;
    logger.info(`Confirming deletion of reservation ${reservationToDelete}`);
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationToDelete);

      if (error) throw error;

      setReservations(prev => prev.filter(res => res.id !== reservationToDelete));
      setIsDeleteModalOpen(false);
      setReservationToDelete(null);
      logger.info(`Successfully deleted reservation ${reservationToDelete}`);
    } catch (error) {
      logger.error(`Error deleting reservation ${reservationToDelete}:`, error);
      alert("Error deleting: " + error.message);
    }
  };

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'Pending').length,
    approved: reservations.filter(r => r.status === 'Approved').length,
    rejected: reservations.filter(r => r.status === 'Rejected').length,
  };

  const filteredReservations = reservations.filter((res) => {
    const name = res.profiles?.full_name || 'Unknown User';
    const matchesSearch = name.toLowerCase().includes(reservationSearch.toLowerCase()) || 
                          (res.facilities?.name?.toLowerCase().includes(reservationSearch.toLowerCase()));
    let matchesTab = filterTab === 'all' || (res.status && res.status.toLowerCase() === filterTab.toLowerCase());
    const matchesResident = residentFilter === 'All' || res.user_id === residentFilter;

    return matchesSearch && matchesTab && matchesResident;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-600';
      case 'Pending': return 'bg-orange-100 text-orange-600';
      case 'Rejected': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
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
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Reservations..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={reservationSearch}
                  onChange={(e) => setReservationSearch(e.target.value)}
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <select 
                  className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
                  value={residentFilter}
                  onChange={(e) => setResidentFilter(e.target.value)}
                >
                  <option value="All">All Residents</option>
                  {residentsList.map(res => (
                    <option key={res.id} value={res.id}>{res.full_name}</option>
                  ))}
                </select>
              </div>
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
                className="text-sm font-bold text-slate-900 px-4 hover:text-indigo-600 transition-colors transition-all cursor-pointer"
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
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-16">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
                          <p className="text-[#006837] font-semibold animate-pulse tracking-wide">Loading reservations...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredReservations.length > 0 ? (
                    filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{res.profiles?.full_name || 'No Name'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{res.facilities?.name || 'Unknown Facility'}</td>
                        {/* --- UPDATED: Date formatting logic added here --- */}
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDateToDMY(res.date)}</td>
                        {/* --- UPDATED: Time formatting logic added here --- */}
                        <td className="px-6 py-4 text-sm text-slate-600">{formatTo12Hour(res.start_time)}</td>
                        {/* --- UPDATED: Time formatting logic added here --- */}
                        <td className="px-6 py-4 text-sm text-slate-600">{formatTo12Hour(res.end_time)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(res.status)}`}>
                            {res.status}
                          </span>
                        </td>
                        {/* --- UPDATED: Requested On Date formatting logic added here --- */}
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {res.created_at ? formatDateToDMY(res.created_at) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                          
                          <button onClick={() => setSelectedReservation(res)} title="View Details" className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-blue-500 border border-transparent hover:border-slate-200 cursor-pointer">
                            <Eye size={18} />
                          </button>
                          
                          <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
                            <button onClick={() => handleUpdateStatus(res.id, 'Approved')} title="Approve" className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-green-500 border border-transparent hover:border-slate-200 cursor-pointer">
                              <CheckCircle2 size={18} />
                            </button>
                          </RequireRole>

                          <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
                            <button onClick={() => handleUpdateStatus(res.id, 'Rejected')} title="Reject" className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-orange-500 border border-transparent hover:border-slate-200 cursor-pointer">
                              <XCircle size={18} />
                            </button>
                          </RequireRole>

                          <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary']}>
                            <button onClick={() => handleDelete(res.id)} title="Delete" className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-red-500 border border-transparent hover:border-slate-200 cursor-pointer">
                              <Trash2 size={18} />
                            </button>
                          </RequireRole>

                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search size={32} className="text-slate-200" />
                          <p className="text-sm font-bold text-slate-400">No reservations found matching criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
        </div>
      </section>

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
                      {/* --- UPDATED: Date formatting logic added here --- */}
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Clock size={14} className="text-indigo-500 shrink-0" /> {selectedReservation.created_at ? formatDateToDMY(selectedReservation.created_at) : 'N/A'}</p>
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
                       {/* --- UPDATED: Date formatting logic added here --- */}
                       <span className="text-slate-900 font-bold">{formatDateToDMY(selectedReservation.date)}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-medium">
                       <span className="text-slate-500">Time Slot:</span>
                       {/* --- UPDATED: Time formatting logic added here --- */}
                       <span className="text-slate-900 font-bold">{formatTo12Hour(selectedReservation.start_time)} - {formatTo12Hour(selectedReservation.end_time)}</span>
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

      {/* --- ADDED: Separated Calendar Component Injection --- */}
      <CalendarReserve 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        reservations={reservations} 
        setSelectedReservation={setSelectedReservation} 
      />

      {/* --- ADDED: DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
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