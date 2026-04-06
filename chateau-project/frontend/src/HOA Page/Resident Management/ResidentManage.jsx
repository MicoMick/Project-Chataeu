import React, { useState, useEffect } from 'react';
// This is your "connector" - we will use this exclusively
import { supabase } from '../supabaseAdmin'; 
import { 
  Users, UserPlus, UserCheck, UserMinus, Clock, Search, MoreHorizontal, X, User, Mail, MapPin, Calendar,
  Phone, ShieldCheck, Home, Car, Dog, AlertTriangle
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, iconBg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>
        <Icon size={22} className="text-slate-700" />
      </div>
    </div>
  </div>
);

const ResidentManage = () => {
  const [residents, setResidents] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showToast, setShowToast] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState(null);

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      console.error('Error fetching residents:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (e, resident) => {
    e.stopPropagation();
    if (openMenuId === resident.id) {
      setOpenMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 160; 
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPosition;
      if (spaceBelow < menuHeight) {
        topPosition = rect.top + window.scrollY - menuHeight - 8;
      } else {
        topPosition = rect.bottom + window.scrollY + 8;
      }

      setMenuPosition({
        top: topPosition,
        left: rect.left + window.scrollX - 140 
      });
      setOpenMenuId(resident.id);
    }
  };

  const handleEdit = (resident) => {
    setSelectedResident(resident);
    setIsViewingProfile(false);
    setShowAddModal(true); 
    setOpenMenuId(null);
  };

  const handleViewProfile = (resident) => {
    setSelectedResident(resident);
    setIsViewingProfile(true);
    setOpenMenuId(null);
  }

  const handleRemoveRequest = (id) => {
    setResidentToDelete(id);
    setShowToast(true);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    setResidents(residents.filter(r => r.id !== residentToDelete));
    setShowToast(false);
    setResidentToDelete(null);
  };

  const filteredResidents = residents.filter((resident) => {
    const matchesTab = activeTab === 'all' || resident.status === activeTab;
    
    const matchesSearch = searchTerm === '' || (
      (resident.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (resident.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (resident.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (resident.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return matchesTab && matchesSearch;
  });

  const pendingCount = residents.filter(r => r.status === 'pending').length;

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative font-sans text-slate-900">
      
      {showToast && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowToast(false)}></div>
          <div className="relative bg-white shadow-2xl rounded-3xl p-8 flex flex-col items-center text-center gap-4 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="bg-red-50 p-4 rounded-full text-red-500 mb-2">
              <AlertTriangle size={40} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">Confirm Deletion</p>
              <p className="text-sm text-slate-500 mt-2">Are you sure you want to remove this resident? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <button onClick={() => setShowToast(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-3 text-sm font-bold bg-red-500 text-white hover:bg-red-600 rounded-xl cursor-pointer transition-all shadow-lg shadow-red-200">Remove</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resident Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage residents, approve registrations, and assign roles.</p>
        </div>
        {/* Add Resident Button Removed */}
      </div>

      {/* Grid changed to md:grid-cols-2 for better layout with only two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard title="Total Residents" value={residents.length} icon={Users} iconBg="bg-blue-50" />
        <StatCard title="Pending Approval" value={pendingCount} icon={Clock} iconBg="bg-orange-50" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100"> 
        <div className="flex gap-4 p-6 border-b border-slate-50">
          <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${activeTab === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>All Residents</button>
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${activeTab === 'pending' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Pending Approval ({pendingCount})</button>
        </div>

        <div className="px-6 py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search Residents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
          </div>
        </div>

        <div className="px-6 pb-6 overflow-x-auto"> 
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-slate-400 text-[11px] uppercase tracking-widest font-bold border-b border-slate-50">
                <th className="py-4 font-bold px-2">Resident</th>
                <th className="py-4 font-bold px-2">Phone</th>
                <th className="py-4 font-bold px-2">Address</th>
                <th className="py-4 font-bold px-2">Joined Date</th>
                <th className="py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 <tr><td colSpan="5" className="py-12 text-center text-slate-400">Loading data...</td></tr>
              ) : filteredResidents.length > 0 ? (
                filteredResidents.map((resident) => (
                  <tr key={resident.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                            {resident.avatar_url ? (
                                <img 
                                    src={resident.avatar_url} 
                                    alt={resident.full_name} 
                                    className="w-10 h-10 rounded-full object-cover border border-slate-100"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
                                    {resident.full_name?.charAt(0) || resident.username?.charAt(0)}
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-bold text-slate-800">{resident.full_name || resident.username}</div>
                                <div className="text-[11px] text-slate-400">{resident.email}</div>
                            </div>
                        </div>
                    </td>
                    <td className="py-4 px-2 text-sm text-slate-500">{resident.phone || 'N/A'}</td>
                    <td className="py-4 px-2 text-sm text-slate-500">{resident.address || 'N/A'}</td>
                    <td className="py-4 px-2 text-sm text-slate-500">{new Date(resident.created_at).toLocaleDateString()}</td>
                    <td className="py-4 text-right">
                      <button onClick={(e) => handleActionClick(e, resident)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200 cursor-pointer">
                        < MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Clock size={32} className="opacity-20" />
                      <p className="text-sm font-medium">No residents found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {openMenuId && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
              <div 
                className="fixed w-40 bg-white border border-slate-100 shadow-xl rounded-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 text-left"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <button onClick={() => handleViewProfile(residents.find(r => r.id === openMenuId))} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium cursor-pointer">View Profile</button>
                <button onClick={() => handleEdit(residents.find(r => r.id === openMenuId))} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium border-t border-slate-50 cursor-pointer">Edit</button>
                <button onClick={() => handleRemoveRequest(openMenuId)} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 font-medium border-t border-slate-50 cursor-pointer">Remove</button>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedResident && isViewingProfile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedResident(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-8 text-white relative text-center">
                <button onClick={() => setSelectedResident(null)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"><X size={20} /></button>
                {selectedResident.avatar_url ? (
                    <img 
                        src={selectedResident.avatar_url} 
                        alt="" 
                        className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white/30 mx-auto"
                    />
                ) : (
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-4 border-4 border-white/30 text-3xl font-bold mx-auto">
                        {selectedResident.full_name?.charAt(0) || selectedResident.username?.charAt(0)}
                    </div>
                )}
                <h2 className="text-xl font-bold">{selectedResident.full_name || selectedResident.username}</h2>
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium mt-2">{selectedResident.role}</span>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Mail size={18}/></div>
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</p><p className="text-sm font-medium text-slate-700">{selectedResident.email}</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone size={18}/></div>
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone</p><p className="text-sm font-medium text-slate-700">{selectedResident.phone || "N/A"}</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><MapPin size={18}/></div>
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Address</p><p className="text-sm font-medium text-slate-700">{selectedResident.address || "N/A"}</p></div>
                        </div>
                    </div>
                </div>
                <button onClick={() => setSelectedResident(null)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all mt-8 cursor-pointer">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && selectedResident && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setSelectedResident(null); }}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                <h3 className="font-bold text-xl text-slate-900">Edit Resident Details</h3>
                <button onClick={() => { setShowAddModal(false); setSelectedResident(null); }} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 cursor-pointer"><X size={20}/></button>
             </div>
             <form className="p-8 max-h-[80vh] overflow-y-auto" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" defaultValue={selectedResident?.full_name || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="email" defaultValue={selectedResident?.email || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pt-8 flex gap-3">
                  <button type="button" onClick={() => { setShowAddModal(false); setSelectedResident(null); }} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all cursor-pointer">Cancel</button>
                  <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 cursor-pointer">Save Changes</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentManage;