import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Users, Clock, Calendar, Eye, Edit, Trash2, 
  ChevronDown, X, Upload, CheckCircle2, AlertCircle, Loader2, HelpCircle
} from 'lucide-react';
import { supabase } from '../supabaseAdmin'; 
import { Pannellum } from "pannellum-react";
import logger from '../auditLogger'; 

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

// ... [Keep your existing ConfirmModal and TransactionModal components exactly as they were] ...
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <HelpCircle className="w-12 h-12 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-8">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-200"
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className={`w-20 h-20 ${current.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
          {current.icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{current.title}</h3>
        <p className="text-slate-500 text-sm mb-8">{message}</p>
        
        {status !== 'loading' && (
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
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

const Facility = () => {
  const [facilitySearch, setFacilitySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [isAddAmenityItemOpen, setIsAddAmenityItemOpen] = useState(false);
  
  const [viewingFacility, setViewingFacility] = useState(null);
  const [editingFacility, setEditingFacility] = useState(null);

  const [isFacilityAvailable, setIsFacilityAvailable] = useState(true);
  const [isItemAvailable, setIsItemAvailable] = useState(true);

  const [transaction, setTransaction] = useState({ status: null, message: '' });
  const [confirmData, setConfirmData] = useState({ isOpen: false, id: null });
  
  const [file, setFile] = useState(null);
  const [newFacility, setNewFacility] = useState({
    name: '', description: '', capacity: '', rate: '', opening_time: '', closing_time: ''
  });
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching:', error);
      else setFacilities(data);
    };
    fetchFacilities();
  }, []);

  const handleAddFacility = async () => {
    setTransaction({ status: 'loading', message: 'Creating your new facility...' });
    // Get user email
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;

    try {
      let publicUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('amenity-images')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('amenity-images').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      const facilityData = {
        name: newFacility.name,
        description: newFacility.description,
        capacity: newFacility.capacity,
        rate: `₱ ${newFacility.rate}`,
        hours: `${newFacility.opening_time} - ${newFacility.closing_time}`,
        status: isFacilityAvailable ? 'Available' : 'Not Available',
        category: 'Amenity Facility',
        image_360_url: publicUrl
      };

      const { data, error } = await supabase.from('facilities').insert([facilityData]).select();
      if (error) throw error;

      await logActivity(supabase, userEmail, 'Create Facility', 'info', `Created facility: ${newFacility.name}`);

      setFacilities([data[0], ...facilities]);
      setIsAddFacilityOpen(false);
      setFile(null);
      setNewFacility({ name: '', description: '', capacity: '', rate: '', opening_time: '', closing_time: '' });
      setTransaction({ status: 'success', message: 'Facility has been created successfully!' });
    } catch (error) {
      await logActivity(supabase, userEmail, 'Create Facility Failed', 'error', error.message);
      setTransaction({ status: 'error', message: error.message });
    }
  };

  const handleAddAmenityItem = async () => {
    setTransaction({ status: 'loading', message: 'Adding your new item...' });
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;

    try {
      let publicUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('amenity-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('amenity-images').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      const itemData = {
        name: newItem.name,
        description: newItem.description,
        status: isItemAvailable ? 'Available' : 'Not Available',
        category: 'Amenity Item',
        image_360_url: publicUrl
      };

      const { data, error } = await supabase.from('facilities').insert([itemData]).select();
      if (error) throw error;

      await logActivity(supabase, userEmail, 'Add Amenity Item', 'info', `Added item: ${newItem.name}`);

      setFacilities([data[0], ...facilities]);
      setIsAddAmenityItemOpen(false);
      setFile(null);
      setNewItem({ name: '', description: '' });
      setTransaction({ status: 'success', message: 'Amenity item added successfully!' });
    } catch (error) {
      await logActivity(supabase, userEmail, 'Add Amenity Item Failed', 'error', error.message);
      setTransaction({ status: 'error', message: error.message });
    }
  };

  const handleUpdateFacility = async () => {
    setTransaction({ status: 'loading', message: 'Updating details...' });
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;

    try {
      let publicUrl = editingFacility.image_360_url;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('amenity-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('amenity-images').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      const updatedData = { ...editingFacility, image_360_url: publicUrl };
      const { error } = await supabase.from('facilities').update(updatedData).eq('id', editingFacility.id);
      if (error) throw error;

      await logActivity(supabase, userEmail, 'Update Facility', 'info', `Updated: ${editingFacility.name}`);

      setFacilities(facilities.map(f => f.id === editingFacility.id ? updatedData : f));
      setEditingFacility(null);
      setFile(null);
      setTransaction({ status: 'success', message: 'Changes have been saved!' });
    } catch (error) {
      await logActivity(supabase, userEmail, 'Update Facility Failed', 'error', error.message);
      setTransaction({ status: 'error', message: error.message });
    }
  };

  const handleDelete = (id) => {
    setConfirmData({ isOpen: true, id: id });
  };

  const executeDelete = async () => {
    const idToDelete = confirmData.id;
    const itemToDelete = facilities.find(f => f.id === idToDelete); // Find item for log details
    
    setConfirmData({ isOpen: false, id: null });
    setTransaction({ status: 'loading', message: 'Deleting item from database...' });
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email;
    
    try {
      const { error } = await supabase.from('facilities').delete().eq('id', idToDelete);
      if (error) throw error;

      await logActivity(supabase, userEmail, 'Delete Facility/Item', 'info', `Deleted: ${itemToDelete?.name || idToDelete}`);

      setFacilities(prev => prev.filter(f => f.id !== idToDelete));
      setTransaction({ 
        status: 'success', 
        message: 'The item has been permanently removed from the system.' 
      });
    } catch (error) {
      await logActivity(supabase, userEmail, 'Delete Failed', 'error', error.message);
      setTransaction({ 
        status: 'error', 
        message: `Failed to delete: ${error.message}` 
      });
    }
  };

  // ... [The rest of your JSX remains exactly as it was] ...
  const filteredFacilities = facilities.filter((fac) => {
    const matchesSearch = fac.name.toLowerCase().includes(facilitySearch.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || fac.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="pb-12">
      <TransactionModal 
        status={transaction.status} 
        message={transaction.message} 
        onClose={() => setTransaction({ status: null, message: '' })} 
      />

      <ConfirmModal 
        isOpen={confirmData.isOpen}
        title="Are you sure?"
        message="This action cannot be undone. This item will be permanently removed from the database."
        onConfirm={executeDelete}
        onCancel={() => setConfirmData({ isOpen: false, id: null })}
      />
      {/* --- HEADER --- */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Amenity Management</h1>
          <p className="text-slate-500 text-sm">Manage community amenities, set rates, and availability rules.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddAmenityItemOpen(true)} 
            className="bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={18} /> Add Amenity Item
          </button>
          <button 
            onClick={() => setIsAddFacilityOpen(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 cursor-pointer"
          >
            <Plus size={18} /> Add Facility
          </button>
        </div>
      </div>

      {/* --- STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Amenities" value={facilities.length} icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
        <StatCard title="Available" value={facilities.filter(f => f.status === 'Available').length} icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
        <StatCard title="Under Maintenance" value={facilities.filter(f => f.status === 'Under Maintenance').length} icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
        <StatCard title="Fully Booked" value={facilities.filter(f => f.status === 'Fully Booked').length} icon={Eye} iconColor="text-slate-700" bgColor="bg-slate-50" />
      </div>

     {/* --- FILTERS --- */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search Amenities..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-text"
              value={facilitySearch} onChange={(e) => setFacilitySearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none font-medium text-slate-600 min-w-[160px] cursor-pointer transition-all"
            >
              <option value="All">All Types</option>
              <option value="Amenity Item">Amenity Item</option>
              <option value="Amenity Facility">Amenity Facility</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* --- GRID --- */}
      {filteredFacilities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFacilities.map((fac) => (
            <div key={fac.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group transition-all hover:shadow-md">
              <div className="aspect-video bg-slate-200 relative flex items-center justify-center overflow-hidden">
                {fac.image_360_url ? (
                  <img src={fac.image_360_url} alt={fac.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-16 h-16 border-2 border-slate-400 rounded-lg flex items-center justify-center text-slate-400 font-bold text-[8px] uppercase tracking-tighter">No Image</div>
                )}
                <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold ${fac.status === 'Available' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {fac.status}
                </span>
                <span className="absolute bottom-3 left-3 bg-slate-900/50 text-white backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">{fac.category}</span>
              </div>
              <div className="p-5 flex-1">
                <h4 className="font-bold text-slate-900">{fac.name}</h4>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{fac.description}</p>
                {fac.category !== "Amenity Item" && (
                  <div className="mt-4 space-y-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2"><Users size={14} /> {fac.capacity} <Clock size={14} className="ml-2" /> {fac.rate}</div>
                    <div className="flex items-center gap-2"><Calendar size={14} /> {formatTo12Hour(fac.hours)}</div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-50 grid grid-cols-3 gap-2">
                <button onClick={() => setViewingFacility(fac)} className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg text-slate-600 text-xs font-bold transition-all cursor-pointer"><Eye size={14} /> View</button>
                <button onClick={() => setEditingFacility(fac)} className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg text-slate-600 text-xs font-bold transition-all cursor-pointer"><Edit size={14} /> Edit</button>
                <button onClick={() => handleDelete(fac.id)} className="flex items-center justify-center py-2 bg-red-50 hover:bg-red-100 active:scale-95 rounded-lg text-red-500 transition-all border border-red-100 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Search size={32} className="text-slate-300 mb-4" />
            <p className="text-slate-900 font-bold text-center px-4">There is no Amenities "{facilitySearch}"</p>
        </div>
      )}

      {/* --- ADD FACILITY MODAL --- */}
      {isAddFacilityOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add New Facility</h2>
              <button onClick={() => setIsAddFacilityOpen(false)} className="p-2 hover:bg-slate-100 active:scale-90 rounded-full transition-all cursor-pointer">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facility Name</label>
                <input 
                  type="text" 
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-text"
                  placeholder="e.g. Grand Ballroom"
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({...newFacility, name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea 
                  rows="3"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-text"
                  placeholder="Describe the facility..."
                  value={newFacility.description}
                  onChange={(e) => setNewFacility({...newFacility, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity</label>
                  <input 
                    type="text" 
                    className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-text"
                    placeholder="e.g. 150 pax"
                    value={newFacility.capacity}
                    onChange={(e) => setNewFacility({...newFacility, capacity: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hourly Rate (₱)</label>
                  <input 
                    type="number" 
                    className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-text"
                    placeholder="0.00"
                    value={newFacility.rate}
                    onChange={(e) => setNewFacility({...newFacility, rate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opening Time</label>
                  <input 
                    type="time" 
                    className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none hover:bg-slate-100 transition-colors cursor-pointer"
                    value={newFacility.opening_time}
                    onChange={(e) => setNewFacility({...newFacility, opening_time: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Closing Time</label>
                  <input 
                    type="time" 
                    className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none hover:bg-slate-100 transition-colors cursor-pointer"
                    value={newFacility.closing_time}
                    onChange={(e) => setNewFacility({...newFacility, closing_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:bg-slate-100 transition-colors">
                <input 
                  type="file" 
                  id="facility-image" 
                  className="hidden" 
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <label htmlFor="facility-image" className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="text-slate-400 mb-2" />
                  <span className="text-sm font-bold text-slate-500 text-center">
                    {file ? file.name : "Upload 360° Image or Photo"}
                  </span>
                </label>
              </div>
            </div>

            <button 
              onClick={handleAddFacility}
              className="w-full mt-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-100 cursor-pointer"
            >
              Create Facility
            </button>
          </div>
        </div>
      )}

      {/* --- ADD AMENITY ITEM MODAL --- */}
      {isAddAmenityItemOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add Amenity Item</h2>
              <button onClick={() => setIsAddAmenityItemOpen(false)} className="p-2 hover:bg-slate-100 active:scale-90 rounded-full transition-all cursor-pointer">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</label>
                <input 
                  type="text" 
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none cursor-text"
                  placeholder="e.g. Folding Chairs"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea 
                  rows="3"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none cursor-text"
                  placeholder="Small description of the item..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Status</label>
                <div className="relative mt-1.5">
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none appearance-none font-medium text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    value={newItem.status || 'Available'}
                    onChange={(e) => setNewItem({...newItem, status: e.target.value})}
                  >
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:bg-slate-100 transition-colors">
                <input 
                  type="file" 
                  id="item-image" 
                  className="hidden" 
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <label htmlFor="item-image" className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="text-slate-400 mb-1" size={20} />
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {file ? file.name : "Upload Item Photo"}
                  </span>
                </label>
              </div>
            </div>

            <button 
              onClick={handleAddAmenityItem}
              className="w-full mt-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg cursor-pointer"
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* --- EDIT FACILITY/ITEM MODAL --- */}
      {editingFacility && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Edit Details</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{editingFacility.category}</p>
              </div>
              <button onClick={() => setEditingFacility(null)} className="p-2 hover:bg-slate-100 active:scale-90 rounded-full transition-all cursor-pointer">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                <input 
                  type="text" 
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none cursor-text"
                  value={editingFacility.name}
                  onChange={(e) => setEditingFacility({...editingFacility, name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea 
                  rows="3"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none cursor-text"
                  value={editingFacility.description}
                  onChange={(e) => setEditingFacility({...editingFacility, description: e.target.value})}
                />
              </div>

              {editingFacility.category === 'Amenity Facility' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity</label>
                    <input 
                      type="text" 
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none cursor-text"
                      value={editingFacility.capacity}
                      onChange={(e) => setEditingFacility({...editingFacility, capacity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rate</label>
                    <input 
                      type="text" 
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none cursor-text"
                      value={editingFacility.rate}
                      onChange={(e) => setEditingFacility({...editingFacility, rate: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <div className="relative mt-1.5">
                  <select 
                    value={editingFacility.status}
                    onChange={(e) => setEditingFacility({...editingFacility, status: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none appearance-none font-medium text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Fully Booked">Fully Booked</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setEditingFacility(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                Discard
              </button>
              <button 
                onClick={handleUpdateFacility}
                className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

{/* --- VIEW FACILITY MODAL --- */}
      {viewingFacility && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] overflow-hidden w-full max-w-5xl shadow-2xl relative">
            <button 
              onClick={() => setViewingFacility(null)} 
              className="absolute top-6 right-6 z-[410] p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md active:scale-90 rounded-full text-white transition-all cursor-pointer"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col lg:flex-row h-[80vh]">
              <div className="lg:w-2/3 bg-slate-100 relative group">
                <div className="absolute top-6 left-6 z-[410] flex gap-2">
                   <button 
                    onClick={() => setViewingFacility({...viewingFacility, show360: !viewingFacility.show360})}
                    className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg cursor-pointer ${viewingFacility.show360 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-slate-900 hover:bg-slate-50'}`}
                   >
                     {viewingFacility.show360 ? 'Exit 360° View' : 'Switch to 360° View'}
                   </button>
                </div>

                {viewingFacility.image_360_url ? (
                  viewingFacility.show360 ? (
                    <Pannellum
                      width="100%"
                      height="100%"
                      image={viewingFacility.image_360_url}
                      pitch={10}
                      yaw={180}
                      hfov={110}
                      autoLoad
                      showZoomCtrl={false}
                    />
                  ) : (
                    <img 
                      src={viewingFacility.image_360_url} 
                      alt={viewingFacility.name} 
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Eye size={48} className="opacity-20" />
                    <span className="font-bold text-sm uppercase tracking-tighter">No Preview Available</span>
                  </div>
                )}
              </div>

              <div className="lg:w-1/3 p-8 overflow-y-auto bg-white flex flex-col">
                <div className="flex-1">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {viewingFacility.category}
                  </span>
                  <h2 className="text-3xl font-bold text-slate-900 mt-4">{viewingFacility.name}</h2>
                  <p className="text-slate-500 mt-4 text-sm leading-relaxed">{viewingFacility.description}</p>
                  
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-500">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Capacity</p>
                        <p className="font-bold text-slate-900">{viewingFacility.capacity || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-500">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Schedule</p>
                        <p className="font-bold text-slate-900">{viewingFacility.hours || 'Always Open'}</p>
                      </div>
                    </div>

                    {viewingFacility.category === 'Amenity Facility' && (
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-500">
                          <span className="font-black text-xs">₱</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Rate</p>
                          <p className="font-bold text-slate-900">{viewingFacility.rate ? `${viewingFacility.rate}/hr` : 'Free / Not Specified'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50">
                  <button 
                    onClick={() => setViewingFacility(null)}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    Back to Management
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Facility;