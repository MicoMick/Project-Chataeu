import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Plus, MoreHorizontal, 
  CreditCard, AlertCircle, CheckCircle2, DollarSign,
  Edit2, Trash2, Bell, FileText, Upload, XCircle, X, Filter, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseAdmin'; // IMPORTED SUPABASE

// --- ADDED: RequireRole Component ---
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') {
    return children;
  }
  return null; 
};

const StatCard = ({ title, value, icon: Icon, iconColor, bgColor }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-1">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bgColor}`}>
      <Icon size={24} className={iconColor} />
    </div>
  </div>
);

// ADDED: TransactionModal component definition so it can be used below
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
    // --- FIXED: Increased z-index from 10000 to 99999 so it sits IN FRONT of the ModalOverlay ---
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
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

// --- FIXED: Moved ModalOverlay OUTSIDE the Payment component so it stops losing focus ---
const ModalOverlay = ({ title, subtitle, isOpen, onClose, children, actionLabel, onAction }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
              <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-6">
            {children}
          </div>

          <div className="flex gap-3 mt-10">
            <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button 
              onClick={onAction} 
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Payment = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Modal States
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false); 
  const [selectedPayment, setSelectedPayment] = useState(null); 
  
  // --- ADDED: State for Confirm Void Modal ---
  const [isConfirmVoidOpen, setIsConfirmVoidOpen] = useState(false);

  // --- ADDED: State for Creating New Due/Bill ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [residentsList, setResidentsList] = useState([]);
  const [createFormData, setCreateFormData] = useState({
    user_id: '',
    amount: '',
    due_date: '',
    reference_no: ''
  });

  // State for managing the transaction popup message
  const [transaction, setTransaction] = useState({ status: null, message: '' });

  // State for managing the edit form data
  const [editFormData, setEditFormData] = useState({
    amount: '',
    status: '',
    due_date: '',
    reference_no: '',
    paid_at: '' // --- ADDED: Paid Date Field ---
  });

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- ADDED: Get Current Role ---
  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  // --- ADDED: Helper for Audit Logs ---
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

  useEffect(() => {
    fetchPayments();
    fetchResidentsList(); // --- ADDED: Fetch residents on load for the creation dropdown ---
  }, []);

  // --- ADDED: Fetch Residents for Issuing Dues ---
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
      console.error("Error fetching residents:", error.message);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      console.log("Supabase returned this data for payments:", paymentsData);

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        return;
      }

      const userIds = [...new Set(paymentsData.map(p => p.user_id).filter(Boolean))];
      let profilesData = [];

      if (userIds.length > 0) {
        const { data: pData, error: pError } = await supabase
          .from('profiles')
          .select('id, full_name, address, street')
          .in('id', userIds);

        if (!pError) {
          profilesData = pData || [];
        }
      }

      const mergedData = paymentsData.map(payment => {
        const profile = profilesData.find(p => p.id === payment.user_id);
        return {
          ...payment,
          profiles: profile || null
        };
      });

      console.log("Merged data with profiles:", mergedData);
      setPayments(mergedData);
    } catch (error) {
      console.error("Error fetching payments:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleActionClick = (e, id, paymentRecord) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 120; // Reduced height since there are fewer buttons
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPosition;
      if (spaceBelow < menuHeight) {
        topPosition = rect.top + window.scrollY - menuHeight - 8;
      } else {
        topPosition = rect.bottom + window.scrollY + 8;
      }

      setMenuPosition({
        top: topPosition,
        left: rect.left + window.scrollX - 190 
      });
      setOpenMenuId(id);
      setSelectedPayment(paymentRecord); 
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // --- ADDED: Handle Creation of New Due/Bill ---
  const submitCreateBill = async () => {
    if (!createFormData.user_id || !createFormData.amount || !createFormData.due_date) {
      setTransaction({ status: 'error', message: 'Please fill in all required fields (Resident, Amount, Due Date).' });
      return;
    }

    setTransaction({ status: 'loading', message: 'Issuing new due...' });

    try {
      const payload = {
        user_id: createFormData.user_id,
        amount: Number(createFormData.amount),
        due_date: createFormData.due_date,
        status: 'unpaid',
        reference_no: createFormData.reference_no || `BILL-${Date.now().toString().slice(-6)}`
      };

      const { error } = await supabase.from('payments').insert([payload]);

      if (error) throw error;

      // --- ADDED: Audit Trail ---
      await logActivity('Issued New Due', `Created a new bill (Ref: ${payload.reference_no}) for amount ₱${payload.amount}.`);

      setIsCreateModalOpen(false);
      setCreateFormData({ user_id: '', amount: '', due_date: '', reference_no: '' });
      fetchPayments();
      
      setTransaction({ status: 'success', message: 'New bill successfully issued to resident.' });

    } catch (error) {
      console.error("Error creating bill:", error.message);
      setTransaction({ status: 'error', message: "Failed to issue bill: " + error.message });
    }
  };

  const submitEditTransaction = async () => {
    if (!selectedPayment) return;

    setTransaction({ status: 'loading', message: 'Updating transaction details...' });

    try {
      const updatePayload = {
        amount: editFormData.amount ? Number(editFormData.amount) : null,
        status: editFormData.status,
        due_date: editFormData.due_date || null,
        reference_no: editFormData.reference_no || null,
      };

      // --- ADDED: Paid Date payload injection ---
      if (editFormData.status === 'paid') {
        updatePayload.paid_at = editFormData.paid_at ? new Date(editFormData.paid_at).toISOString() : new Date().toISOString();
      } else {
        updatePayload.paid_at = null; // Clear paid_at if status changes back to unpaid
      }

      const { error } = await supabase
        .from('payments')
        .update(updatePayload)
        .eq('id', selectedPayment.id);

      if (error) throw error;

      // --- ADDED: Audit Trail ---
      await logActivity('Edited Transaction', `Updated transaction details for Ref: ${updatePayload.reference_no || selectedPayment.reference_no}. New status: ${updatePayload.status}.`);

      setIsEditTransactionOpen(false);
      fetchPayments();
      
      setTransaction({ status: 'success', message: 'Transaction has been successfully updated.' });

    } catch (error) {
      console.error("Error updating transaction:", error.message);
      setTransaction({ status: 'error', message: "Failed to update transaction: " + error.message });
    }
  };

  // --- UPDATED: Void Functionality with custom Modal ---
  const handleVoidTransaction = async () => {
    if (!selectedPayment) return;

    // --- Close the confirmation modal and trigger loading ---
    setIsConfirmVoidOpen(false);
    setTransaction({ status: 'loading', message: 'Voiding transaction...' });

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', selectedPayment.id);

      if (error) throw error;

      // --- ADDED: Audit Trail ---
      await logActivity('Voided Transaction', `Deleted/Voided transaction Ref: ${selectedPayment.reference_no} for amount ₱${selectedPayment.amount}.`);

      setOpenMenuId(null);
      fetchPayments();
      
      setTransaction({ status: 'success', message: 'Transaction has been successfully voided.' });
    } catch (error) {
      console.error("Error voiding transaction:", error.message);
      setTransaction({ status: 'error', message: "Failed to void transaction: " + error.message });
    }
  };

  const openEditModal = () => {
    if (selectedPayment) {
      setEditFormData({
        amount: selectedPayment.amount || '',
        status: selectedPayment.status || 'unpaid',
        // --- ADDED: Formatting dates so the input type="date" displays them correctly ---
        due_date: selectedPayment.due_date ? selectedPayment.due_date.split('T')[0] : '',
        reference_no: selectedPayment.reference_no || '',
        paid_at: selectedPayment.paid_at ? selectedPayment.paid_at.split('T')[0] : '' 
      });
      setIsEditTransactionOpen(true);
      setOpenMenuId(null);
    }
  };

  const filteredPayments = payments.filter(p => {
    const name = p.profiles?.full_name || 'Unknown Resident';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || 
                          (p.status && p.status.toLowerCase() === statusFilter.toLowerCase());
    
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'paid': return 'bg-green-100 text-green-600';
      case 'pending': return 'bg-orange-100 text-orange-600';
      case 'overdue': return 'bg-red-100 text-red-600';
      case 'unpaid': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const totalCollected = payments
    .filter(p => (p.status || '').toLowerCase() === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingCount = payments.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'pending' || s === 'unpaid';
  }).length;
  
  const overdueCount = payments.filter(p => (p.status || '').toLowerCase() === 'overdue').length;
  const paidCount = payments.filter(p => (p.status || '').toLowerCase() === 'paid').length;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      <TransactionModal 
        status={transaction.status} 
        message={transaction.message} 
        onClose={() => setTransaction({ status: null, message: '' })} 
      />

      {/* --- ADDED: Confirm Void Modal --- */}
      <ModalOverlay 
        isOpen={isConfirmVoidOpen} 
        onClose={() => setIsConfirmVoidOpen(false)}
        title="Void Transaction"
        subtitle="Are you sure you want to void/delete this transaction?"
        actionLabel="Yes, Void It"
        onAction={handleVoidTransaction} 
      >
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-semibold">This action is permanent and cannot be undone.</p>
        </div>
      </ModalOverlay>

      {/* --- ADDED: Create New Bill Modal --- */}
      <ModalOverlay 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Issue New Due"
        subtitle="Create a new payment bill for a resident"
        actionLabel="Create Bill"
        onAction={submitCreateBill} 
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Resident</label>
            <select 
              name="user_id"
              value={createFormData.user_id} 
              onChange={(e) => setCreateFormData({...createFormData, user_id: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- Choose a Resident --</option>
              {residentsList.map(res => (
                <option key={res.id} value={res.id}>{res.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₱)</label>
              <input 
                type="number" 
                name="amount"
                value={createFormData.amount} 
                onChange={(e) => setCreateFormData({...createFormData, amount: e.target.value})}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
              <input 
                type="date" 
                name="due_date"
                value={createFormData.due_date} 
                onChange={(e) => setCreateFormData({...createFormData, due_date: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Reference / Note (Optional)</label>
            <input 
              type="text" 
              name="reference_no"
              value={createFormData.reference_no} 
              onChange={(e) => setCreateFormData({...createFormData, reference_no: e.target.value})}
              placeholder="e.g., May 2026 HOA Dues" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
            />
          </div>
        </div>
      </ModalOverlay>

      <ModalOverlay 
        isOpen={isEditTransactionOpen} 
        onClose={() => setIsEditTransactionOpen(false)}
        title="Edit Transaction"
        subtitle="Update Resident Payment Details"
        actionLabel="Update Transaction"
        onAction={submitEditTransaction} 
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Resident Name</label>
            <input type="text" readOnly defaultValue={(Array.isArray(selectedPayment?.profiles) ? selectedPayment?.profiles[0]?.full_name : selectedPayment?.profiles?.full_name) || "Unknown Resident"} className="w-full px-4 py-3 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl focus:outline-none cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₱)</label>
              <input 
                type="number" 
                name="amount"
                value={editFormData.amount} 
                onChange={handleEditChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Payment Status</label>
              <select 
                name="status"
                value={editFormData.status} 
                onChange={handleEditChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
              <input 
                type="date" 
                name="due_date"
                value={editFormData.due_date} 
                onChange={handleEditChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Reference No.</label>
              <input 
                type="text" 
                name="reference_no"
                value={editFormData.reference_no} 
                onChange={handleEditChange}
                placeholder="Ref Number" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
            </div>
          </div>
          
          {/* --- ADDED: Paid Date (Only shows when Status is 'Paid') --- */}
          {editFormData.status === 'paid' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Date Paid</label>
              <input 
                type="date" 
                name="paid_at"
                value={editFormData.paid_at} 
                onChange={handleEditChange}
                className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
          )}

        </div>
      </ModalOverlay>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
        <p className="text-slate-500 text-sm">Manage dues, issue bills, and generate financial reports.</p>
      </div>

      {/* Updated Stats Grid */}
      <div className="flex flex-wrap gap-6 mb-8">
        <StatCard title="Total Collected" value={`₱${totalCollected.toLocaleString()}`} icon={DollarSign} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
        <StatCard title="Pending Payments" value={pendingCount} icon={CreditCard} iconColor="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Overdue" value={overdueCount} icon={AlertCircle} iconColor="text-red-600" bgColor="bg-red-50" />
        <StatCard title="Paid This Month" value={paidCount} icon={CheckCircle2} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search Payments..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Status Sort Dropdown */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  <select 
                    className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              {/* --- ADDED: Action Buttons Wrapper --- */}
              <div className="flex items-center gap-3">
                <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer']}>
                  <button 
                    onClick={() => {
                      // --- ADDED: Pre-fill auto-generated reference number when opening ---
                      setCreateFormData({
                        user_id: '',
                        amount: '',
                        due_date: '',
                        reference_no: `BILL-${Math.floor(100000 + Math.random() * 900000)}` 
                      });
                      setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#006837] border border-[#006837] rounded-xl text-sm font-bold text-white hover:bg-[#004d29] shadow-sm transition-all cursor-pointer"
                  >
                    <Plus size={18} /> Issue New Due
                  </button>
                </RequireRole>
                {/* --- FIXED: Removed Export CSV Button from here --- */}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ref No.</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                       <td colSpan="8" className="px-6 py-12 text-center">
                         <div className="flex flex-col items-center justify-center gap-3">
                           <div className="w-8 h-8 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
                           <p className="text-[#006837] font-semibold animate-pulse tracking-wide text-xs">Loading records...</p>
                         </div>
                       </td>
                    </tr>
                  ) : filteredPayments.length > 0 ? (
                    filteredPayments.map((p) => {
                      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                      const fullName = profile?.full_name || 'Unknown Resident';
                      const fullAddress = profile ? `${profile.address || ''} ${profile.street || ''}`.trim() : 'N/A';
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">{fullName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">{fullAddress || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-bold">₱{Number(p.amount).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.due_date ? new Date(p.due_date).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.reference_no || '---'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyle(p.status)}`}>
                              {p.status || 'unpaid'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '---'}
                          </td>
                          <td className="px-6 py-4 text-right border-b border-slate-50">
                            {/* --- REMOVED 3-DOT DROP DOWN OVERLAY BUTTONS & REVEALED INLINE ICONS INSTEAD --- */}
                            <div className="flex items-center justify-end gap-3">
                              <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer']}>
                                <button 
                                  onClick={() => {
                                    setSelectedPayment(p);
                                    setEditFormData({
                                      amount: p.amount || '',
                                      status: p.status || 'unpaid',
                                      due_date: p.due_date ? p.due_date.split('T')[0] : '',
                                      reference_no: p.reference_no || '',
                                      paid_at: p.paid_at ? p.paid_at.split('T')[0] : ''
                                    });
                                    setIsEditTransactionOpen(true);
                                  }} 
                                  title="Edit Transaction"
                                  className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <Edit2 size={16} />
                                </button>
                              </RequireRole>

                              <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer']}>
                                <button 
                                  onClick={() => {
                                    setSelectedPayment(p);
                                    setIsConfirmVoidOpen(true); // --- OPEN THE CUSTOM MODAL ---
                                  }}
                                  title="Void / Cancel"
                                  className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </RequireRole>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8">
                        <div className="p-12 text-center">
                          <p className="text-slate-500 font-medium">No payments found matching your criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
      </div>
    </div>
  );
};

export default Payment;