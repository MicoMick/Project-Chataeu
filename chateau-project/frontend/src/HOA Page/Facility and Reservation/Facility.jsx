import React, { useState } from 'react';
import { 
  Search, Plus, Users, Clock, Calendar, Eye, Edit, Trash2, 
  ChevronDown, X, Upload 
} from 'lucide-react';

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

const Facility = () => {
  const [facilitySearch, setFacilitySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [isAddAmenityItemOpen, setIsAddAmenityItemOpen] = useState(false);
  
  // New States for Actions
  const [viewingFacility, setViewingFacility] = useState(null);
  const [editingFacility, setEditingFacility] = useState(null);

  const [isFacilityAvailable, setIsFacilityAvailable] = useState(true);
  const [isItemAvailable, setIsItemAvailable] = useState(true);

  const [facilities, setFacilities] = useState([
    { id: 1, name: "Basketball Court", description: "Spacious venue for events and gatherings", capacity: "30 pax", rate: "₱ 150/hr", hours: "6:00AM - 10:00PM", bookings: 2, status: "Available", category: "Amenity Facility" },
    { id: 2, name: "Tent", description: "Heavy-duty outdoor tent for garden events", status: "Available", category: "Amenity Item" }
  ]);

  const handleDelete = (id) => {
    if(window.confirm("Are you sure you want to remove this item?")) {
        setFacilities(facilities.filter(f => f.id !== id));
    }
  };

  const filteredFacilities = facilities.filter((fac) => {
    const matchesSearch = fac.name.toLowerCase().includes(facilitySearch.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || fac.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="pb-12">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Amenity Management</h1>
          <p className="text-slate-500 text-sm">Manage community amenities, set rates, and availability rules.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAddAmenityItemOpen(true)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm">
            <Plus size={18} /> Add Amenity Item
          </button>
          <button onClick={() => setIsAddFacilityOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-200">
            <Plus size={18} /> Add Facility
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Amenities" value={facilities.length} icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
        <StatCard title="Available" value="2" icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
        <StatCard title="Under Maintenance" value="0" icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
        <StatCard title="Fully Booked" value="0" icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
      </div>

      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search Amenities..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
              value={facilitySearch} onChange={(e) => setFacilitySearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none font-medium text-slate-600 min-w-[160px]">
              <option value="All">All Types</option>
              <option value="Amenity Item">Amenity Item</option>
              <option value="Amenity Facility">Amenity Facility</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredFacilities.map((fac) => (
          <div key={fac.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group">
            <div className="aspect-video bg-slate-200 relative flex items-center justify-center overflow-hidden">
              <div className="w-16 h-16 border-2 border-slate-400 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-400 rotate-45 flex items-center justify-center">
                  <div className="w-4 h-4 border border-slate-400"></div>
                </div>
              </div>
              <span className="absolute top-3 right-3 bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">{fac.status}</span>
              <span className="absolute bottom-3 left-3 bg-slate-900/50 text-white backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">{fac.category}</span>
            </div>
            <div className="p-5 flex-1">
              <h4 className="font-bold text-slate-900">{fac.name}</h4>
              {/* DESCRIPTION SIZED INCREASED TO text-sm */}
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{fac.description}</p>
              
              {/* CONDITION ADDED: Only show icons if it's NOT an Amenity Item */}
              {fac.category !== "Amenity Item" && (
                <div className="mt-4 space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2"><Users size={14} /> {fac.capacity} <Clock size={14} className="ml-2" /> {fac.rate}</div>
                  <div className="flex items-center gap-2"><Calendar size={14} /> {fac.hours}</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-50 grid grid-cols-3 gap-2">
              <button onClick={() => setViewingFacility(fac)} className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-bold transition-all"><Eye size={14} /> View</button>
              <button onClick={() => setEditingFacility(fac)} className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-bold transition-all"><Edit size={14} /> Edit</button>
              <button onClick={() => handleDelete(fac.id)} className="flex items-center justify-center py-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-all border border-red-100"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* --- VIEW FACILITY OVERLAY --- */}
      {viewingFacility && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="relative aspect-video bg-slate-100 flex items-center justify-center shrink-0">
               <button onClick={() => setViewingFacility(null)} className="absolute top-4 right-4 z-10 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"><X size={20}/></button>
               <div className="text-slate-400 flex flex-col items-center">
                  <Upload size={40} className="mb-2 opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-40">3D Model Preview</span>
               </div>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">{viewingFacility.category}</span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-2">{viewingFacility.name}</h2>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                  <span className="text-sm font-bold text-green-600">{viewingFacility.status}</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">{viewingFacility.description}</p>
              
              {/* Conditional Rendering for Tent/Amenity Items */}
              {viewingFacility.category !== "Amenity Item" && (
                <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><Users size={18}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Capacity</p>
                      <p className="text-sm font-bold text-slate-900">{viewingFacility.capacity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><Clock size={18}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Rate</p>
                      <p className="text-sm font-bold text-slate-900">{viewingFacility.rate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><Calendar size={18}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Operating Hours</p>
                      <p className="text-sm font-bold text-slate-900">{viewingFacility.hours}</p>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setViewingFacility(null)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl mt-8 transition-all hover:bg-slate-800">Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT FACILITY OVERLAY (Same style as View) --- */}
      {editingFacility && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="relative aspect-video bg-slate-100 flex items-center justify-center border-b border-slate-100 shrink-0">
               <button onClick={() => setEditingFacility(null)} className="absolute top-4 right-4 z-10 p-2 bg-white/20 backdrop-blur-md rounded-full text-slate-400 hover:bg-slate-200 transition-all"><X size={20}/></button>
               <div className="text-slate-400 flex flex-col items-center cursor-pointer">
                  <Upload size={40} className="mb-2 opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-40"> 3D Model</span>
               </div>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="mb-6">
                 <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md mb-2 inline-block">{editingFacility.category}</label>
                 <input 
                    type="text" 
                    defaultValue={editingFacility.name} 
                    className="w-full text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                 />
              </div>

              {/* NEW STATUS SELECTION DROPDOWN */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                <select 
                   defaultValue={editingFacility.status}
                   className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                   <option value="Available">Available</option>
                   <option value="Not Available">Not Available</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                   defaultValue={editingFacility.description}
                   className="w-full text-slate-500 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none"
                />
              </div>
              
              {editingFacility.category !== "Amenity Item" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Capacity</label>
                    <input type="text" defaultValue={editingFacility.capacity} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Rate</label>
                    <input type="text" defaultValue={editingFacility.rate} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Operating Hours</label>
                    <input type="text" defaultValue={editingFacility.hours} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button onClick={() => setEditingFacility(null)} className="py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={() => setEditingFacility(null)} className="py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD FACILITY MODAL --- */}
      {isAddFacilityOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
             <div className="p-8 overflow-y-auto">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-2xl font-bold text-slate-900">Add New Facility</h2>
                   <p className="text-slate-500 text-sm">Create a new rentable space.</p>
                 </div>
                 <button onClick={() => setIsAddFacilityOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
               </div>
               
               <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Available for Reservation</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Toggle visibility for residents</span>
                    </div>
                    <button 
                      onClick={() => setIsFacilityAvailable(!isFacilityAvailable)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isFacilityAvailable ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFacilityAvailable ? 'left-7' : 'left-1'}`}></div>
                    </button>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Facility Name</label>
                   <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Function Hall" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                   <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-24" placeholder="Brief details about the facility..." />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Capacity</label>
                     <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" placeholder="e.g. 50 pax" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rate (PHP)</label>
                     <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" placeholder="e.g. 150/hr" />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Opening Time</label>
                     <input type="time" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Closing Time</label>
                     <input type="time" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
                   </div>
                 </div>
                 <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                    <Upload className="text-slate-400 mb-2" size={20} />
                    <span className="text-xs font-bold text-slate-500">Upload 3D Model</span>
                 </div>
               </div>

               <button onClick={() => setIsAddFacilityOpen(false)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl mt-8 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                 Create Facility
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- ADD AMENITY ITEM MODAL (Simplified) --- */}
      {isAddAmenityItemOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
             <div className="p-8 overflow-y-auto">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-2xl font-bold text-slate-900">Add Amenity Item</h2>
                   <p className="text-slate-500 text-sm">Add equipment or smaller assets.</p>
                 </div>
                 <button onClick={() => setIsAddAmenityItemOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
               </div>
               
               <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Available for Reservation</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Toggle visibility for residents</span>
                    </div>
                    <button 
                      onClick={() => setIsItemAvailable(!isItemAvailable)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isItemAvailable ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isItemAvailable ? 'left-7' : 'left-1'}`}></div>
                    </button>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Item Name</label>
                   <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Extra Tables" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                   <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-24" placeholder="What is this item for?" />
                 </div>
                 <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                    <Upload className="text-slate-400 mb-2" size={20} />
                    <span className="text-xs font-bold text-slate-500">Upload 3D Model</span>
                 </div>
               </div>

               <button onClick={() => setIsAddAmenityItemOpen(false)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl mt-8 shadow-lg hover:bg-slate-800 transition-all">
                 Save Amenity Item
               </button>
             </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Facility;