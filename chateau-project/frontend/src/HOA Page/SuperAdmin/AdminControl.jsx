import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseAdmin'; 
import { Search, Plus, MoreVertical, Trash2, Edit2, ShieldAlert } from 'lucide-react';

const AdminControl = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Admins from Supabase
  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      // Updated to fetch from 'admins' table
      const { data, error } = await supabase
        .from('admins') 
        .select('*'); 

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Control</h1>
          <p className="text-slate-500 text-sm">Manage system administrators and their permissions</p>
        </div>
        <button className="flex items-center gap-2 bg-[#006837] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#004d29] transition-all shadow-lg">
          <Plus size={20} /> Add New Admin
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search admins by name or email..."
              className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006837]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Admin Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Created At</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10">Loading...</td></tr>
            ) : admins.length > 0 ? (
              admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-700">{admin.display_name || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600">{admin.email}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{admin.role || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-[#006837]"><Edit2 size={16} /></button>
                    <button className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400">No admins found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminControl;