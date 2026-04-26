import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseAdmin'; 
import { Search, Plus, MoreVertical, Trash2, Edit2, ShieldAlert, X, Eye, EyeOff, User, AlertTriangle } from 'lucide-react'; 

const AdminControl = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Admin State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Edit Admin State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editName, setEditName] = useState('');

  // --- ADDED: Delete Modal State ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Helper for Audit Logs
  const logActivity = async (action, details) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('system_logs').insert([
        {
          user_email: user?.email || 'System',
          activity: action,
          severity: 'info',
          details: details
        }
      ]);
    } catch (err) {
      console.error('Logging failed:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins') 
        .select('*')
        .neq('role', 'super_admin'); 

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setModalError('');
    
    // Validation Logic
    if (newAdminPassword.length < 8) {
      setModalError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newAdminPassword) || !/[0-9]/.test(newAdminPassword)) {
      setModalError('Password must contain at least one uppercase letter and one number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdminEmail,
        password: newAdminPassword,
        options: { data: { full_name: newAdminName } }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('admins')
        .insert([{ id: authData.user?.id, email: newAdminEmail, display_name: newAdminName, role: newAdminRole }]);

      if (dbError) throw dbError;

      await logActivity('Created Admin', `Created account for ${newAdminEmail}`);
      
      setNewAdminName(''); setNewAdminEmail(''); setNewAdminPassword(''); setIsModalOpen(false);
      fetchAdmins();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('admins')
        .update({ display_name: editName })
        .eq('id', editingAdmin.id);

      if (error) throw error;

      await logActivity('Updated Admin', `Updated profile for ${editingAdmin.email}`);
      setIsEditModalOpen(false);
      fetchAdmins();
    } catch (err) {
      alert('Error updating admin: ' + err.message);
    }
  };

  // --- UPDATED: Handle Delete Logic ---
  const handleDeleteAdmin = (admin) => {
    setAdminToDelete(admin);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    try {
      const { error } = await supabase.from('admins').delete().eq('id', adminToDelete.id);
      if (error) throw error;

      await logActivity('Deleted Admin', `Deleted admin account: ${adminToDelete.email}`);
      setIsDeleteModalOpen(false);
      setAdminToDelete(null);
      fetchAdmins();
    } catch (err) {
      alert('Error deleting admin: ' + err.message);
    }
  };

  const openEditModal = (admin) => {
    setEditingAdmin(admin);
    setEditName(admin.display_name);
    setIsEditModalOpen(true);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Control</h1>
          <p className="text-slate-500 text-sm">Manage system administrators and their permissions</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#006837] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#004d29] transition-all shadow-lg cursor-pointer"
        >
          <Plus size={20} /> Add New Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
            ) : admins.filter(a => a.display_name?.toLowerCase().includes(searchTerm.toLowerCase())).map((admin) => (
              <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-700">{admin.display_name || 'N/A'}</td>
                <td className="px-6 py-4 text-slate-600">{admin.email}</td>
                <td className="px-6 py-4 text-slate-600 capitalize">{admin.role || 'N/A'}</td>
                <td className="px-6 py-4 text-slate-600">
                  {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => openEditModal(admin)} className="p-2 text-slate-400 hover:text-[#006837] cursor-pointer"><Edit2 size={16} /></button>
                  <button onClick={() => handleDeleteAdmin(admin)} className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
{isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Add New Admin</h2>
        <button onClick={() => setIsModalOpen(false)} className="cursor-pointer"><X size={20}/></button>
      </div>
      <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
        {modalError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{modalError}</div>}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Display Name</label>
          <input type="text" required value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
          <input type="email" required value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
          <input 
            type="text" 
            value="Admin" 
            readOnly 
            className="w-full border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 text-slate-500 cursor-not-allowed" 
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              value={newAdminPassword} 
              onChange={(e) => setNewAdminPassword(e.target.value)} 
              className="w-full border rounded-lg px-4 py-2 pr-10" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Must be at least 8 characters with 1 uppercase letter and 1 number.
          </p>
        </div>
        <button type="submit" className="w-full bg-[#006837] text-white py-2 rounded-lg font-bold cursor-pointer">Create Admin</button>
      </form>
    </div>
  </div>
)}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Edit Admin</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="cursor-pointer"><X size={20}/></button>
             </div>
             <form onSubmit={handleEditAdmin} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Display Name</label>
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
                </div>
                <p className="text-xs text-slate-400">Editing profile for: {editingAdmin?.email}</p>
                <button type="submit" className="w-full bg-[#006837] text-white py-2 rounded-lg font-bold cursor-pointer">Save Changes</button>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
             <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
               <AlertTriangle className="text-red-600" size={24} />
             </div>
             <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Admin</h2>
             <p className="text-slate-500 text-sm mb-6">Are you sure you want to delete <strong>{adminToDelete?.display_name}</strong>? This action cannot be undone.</p>
             <div className="flex gap-3">
               <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
               <button onClick={confirmDeleteAdmin} className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 cursor-pointer">Delete Account</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminControl;