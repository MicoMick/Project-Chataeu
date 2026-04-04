import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, UserCheck, UserMinus, Clock, Search, MoreHorizontal, X, User, Mail, MapPin, Calendar,
  Phone,
  ShieldCheck,
  Home,
  Car,
  Dog,
  AlertTriangle
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  // Track menu position to prevent cutoff
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // New states for Toast and Deletion logic
  const [showToast, setShowToast] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState(null);

  const [residents, setResidents] = useState([
    { id: 1, name: "Juan Dela Cruz", email: "juan@email.com", address: "Blk 15 Lot 7, Phase 1", role: "Owner", date: "Jan 15, 2024", status: "approved", phone: "0912-345-6789", houseType: "Single Detached", carDescription: "Toyota Vios (White) - ABC 1234", pets: "2 Dogs (Golden Retriever)" },
    { id: 2, name: "Maria Santos", email: "maria@email.com", address: "Blk 1 Lot 5, Phase 2", role: "Owner", date: "Feb 20, 2024", status: "approved", phone: "0912-345-6780", houseType: "Single Attached", carDescription: "Mitsubishi Mirage (Red) - XYZ 5678", pets: "1 Cat" },
    { id: 3, name: "Pedro Reyes", email: "pedro@email.com", address: "Blk 17 Lot 5, Phase 1", role: "Tenant", date: "Mar 10, 2024", status: "approved", phone: "0912-345-6781", houseType: "Townhouse", carDescription: "None", pets: "None" },
    { id: 4, name: "Ana Garcia", email: "ana@email.com", address: "Blk 6 Lot 17, Phase 1", role: "Owner", date: "Jan 15, 2024", status: "approved", phone: "0912-345-6782", houseType: "Single Detached", carDescription: "Honda Civic (Black) - GHI 9012", pets: "None" },
  ]);

  const handleActionClick = (e, resident) => {
    e.stopPropagation();
    if (openMenuId === resident.id) {
      setOpenMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 160; // Approximate height of the menu
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPosition;
      if (spaceBelow < menuHeight) {
        // Not enough space below, flip it up
        topPosition = rect.top + window.scrollY - menuHeight - 8;
      } else {
        // Enough space, show below
        topPosition = rect.bottom + window.scrollY + 8;
      }

      setMenuPosition({
        top: topPosition,
        left: rect.left + window.scrollX - 140 // Offset to align right
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

  // Updated Remove Logic to use Toast instead of Alert
  const handleRemoveRequest = (id) => {
    setResidentToDelete(id);
    setShowToast(true);
    setOpenMenuId(null);
  };

  const confirmDelete = () => {
    setResidents(residents.filter(r => r.id !== residentToDelete));
    setShowToast(false);
    setResidentToDelete(null);
  };

  const filteredResidents = residents.filter((resident) => {
    const matchesTab = activeTab === 'all' || resident.status === activeTab;
    const matchesSearch = 
      resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = residents.filter(r => r.status === 'pending').length;

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative font-sans text-slate-900">
      
      {/* Warning Center Overlay */}
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
              <button 
                onClick={() => setShowToast(false)}
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 text-sm font-bold bg-red-500 text-white hover:bg-red-600 rounded-xl cursor-pointer transition-all shadow-lg shadow-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resident Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage residents, approve registrations, and assign roles.</p>
        </div>
        <button 
          onClick={() => { setSelectedResident(null); setIsViewingProfile(false); setShowAddModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 cursor-pointer"
        >
          <UserPlus size={18} />
          Add Resident
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Residents" value={residents.length} icon={Users} iconBg="bg-blue-50" />
        <StatCard title="Active" value={residents.filter(r => r.status === 'approved').length} icon={UserCheck} iconBg="bg-green-50" />
        <StatCard title="Inactive" value="0" icon={UserMinus} iconBg="bg-red-50" />
        <StatCard title="Pending Approval" value={pendingCount} icon={Clock} iconBg="bg-orange-50" />
      </div>

      {/* Table Section */}
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

        <div className="px-6 pb-6"> 
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-[11px] uppercase tracking-widest font-bold border-b border-slate-50">
                <th className="py-4 font-bold px-2">Name</th>
                <th className="py-4 font-bold px-2">Phone</th>
                <th className="py-4 font-bold px-2">Home Address</th>
                <th className="py-4 font-bold px-2">House Type</th>
                <th className="py-4 font-bold px-2">Car Description</th>
                <th className="py-4 font-bold px-2">Pets</th>
                <th className="py-4 font-bold px-2">Joined Date</th>
                <th className="py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredResidents.length > 0 ? (
                filteredResidents.map((resident) => (
                  <tr key={resident.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-2">
                        <div className="text-sm font-bold text-slate-800">{resident.name}</div>
                        <div className="text-[11px] text-slate-400">{resident.email}</div>
                    </td>
                    <td className="py-4 px-2 text-sm text-slate-500">{resident.phone}</td>
                    <td className="py-4 px-2 text-sm text-slate-500">{resident.address}</td>
                    <td className="py-4 px-2 text-sm text-slate-500">{resident.houseType}</td>
                    <td className="py-4 px-2 text-sm text-slate-500 max-w-[150px] truncate" title={resident.carDescription}>{resident.carDescription}</td>
                    <td className="py-4 px-2 text-sm text-slate-500">{resident.pets}</td>
                    <td className="py-4 px-2 text-sm text-slate-500">{resident.date}</td>
                    
                    <td className="py-4 text-right">
                      <button 
                        onClick={(e) => handleActionClick(e, resident)}
                        className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200 cursor-pointer"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Clock size={32} className="opacity-20" />
                      <p className="text-sm font-medium">No residents found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Floating Dropdown Menu (Fixed positioned to prevent cutoff) */}
          {openMenuId && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setOpenMenuId(null)}
              ></div>
              
              <div 
                className="fixed w-40 bg-white border border-slate-100 shadow-xl rounded-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 text-left"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <button 
                  onClick={() => handleViewProfile(residents.find(r => r.id === openMenuId))}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  View Profile
                </button>
                <button 
                  onClick={() => handleEdit(residents.find(r => r.id === openMenuId))}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium border-t border-slate-50 cursor-pointer"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleRemoveRequest(openMenuId)}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 font-medium border-t border-slate-50 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resident Profile Overlay */}
      {selectedResident && isViewingProfile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedResident(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-8 text-white relative text-center">
                <button 
                    onClick={() => setSelectedResident(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                    <X size={20} />
                </button>
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-4 border-4 border-white/30 text-3xl font-bold mx-auto">
                    {selectedResident.name.charAt(0)}
                </div>
                <h2 className="text-xl font-bold">{selectedResident.name}</h2>
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium mt-2">Resident #{selectedResident.id}</span>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Mail size={18}/></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</p>
                                <p className="text-sm font-medium text-slate-700">{selectedResident.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone size={18}/></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone Number</p>
                                <p className="text-sm font-medium text-slate-700">{selectedResident.phone || "Not provided"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><MapPin size={18}/></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Home Address</p>
                                <p className="text-sm font-medium text-slate-700">{selectedResident.address}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Calendar size={18}/></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Joined Date</p>
                                <p className="text-sm font-medium text-slate-700">{selectedResident.date}</p>
                            </div>
                        </div>
                    </div>

                    {/* Community Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Home size={18}/></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">House Type</p>
                                <p className="text-sm font-medium text-slate-700">{selectedResident.houseType || "Single Detached"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Car size={18}/></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Car Description</p>
                                <p className="text-sm font-medium text-slate-700">{selectedResident.carDescription || "None registered"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Dog size={18}/></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pets</p>
                                <p className="text-sm font-medium text-slate-700">{selectedResident.pets || "No pets"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => setSelectedResident(null)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all mt-8 cursor-pointer"
                >
                    Close Profile
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Resident Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setSelectedResident(null); }}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                <h3 className="font-bold text-xl text-slate-900">{selectedResident ? "Edit Resident Details" : "Add New Resident"}</h3>
                <button 
                  onClick={() => { setShowAddModal(false); setSelectedResident(null); }}
                  className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 cursor-pointer"
                >
                  <X size={20}/>
                </button>
             </div>
             
             <form className="p-8 max-h-[80vh] overflow-y-auto" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" placeholder="e.g. Juan Dela Cruz" defaultValue={selectedResident?.name || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="email" placeholder="juan@email.com" defaultValue={selectedResident?.email || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" placeholder="0912-345-6789" defaultValue={selectedResident?.phone || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" placeholder="Blk, Lot, Phase" defaultValue={selectedResident?.address || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">House Type</label>
                            <div className="relative">
                                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select defaultValue={selectedResident?.houseType || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all cursor-pointer">
                                    <option value="">Select House Type</option>
                                    <option value="Single Detached">Single Detached</option>
                                    <option value="Single Attached">Single Attached</option>
                                    <option value="Townhouse">Townhouse</option>
                                    <option value="Row house">Row house</option>
                                    <option value="Bungalow">Bungalow</option>
                                    <option value="Duplex">Duplex</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Car Description</label>
                            <div className="relative">
                                <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" placeholder="Make, Model, Color, Plate No." defaultValue={selectedResident?.carDescription || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-slate-400 tracking-widest px-1">Pets</label>
                            <div className="relative">
                                <Dog className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" placeholder="e.g. 2 Dogs, 1 Cat" defaultValue={selectedResident?.pets || ""} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddModal(false); setSelectedResident(null); }}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 cursor-pointer"
                  >
                    {selectedResident ? "Save Changes" : "Create Resident"}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentManage;