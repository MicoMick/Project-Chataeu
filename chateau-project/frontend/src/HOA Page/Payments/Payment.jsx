import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Plus, MoreHorizontal, 
  CreditCard, AlertCircle, CheckCircle2, DollarSign,
  Edit2, Trash2, Bell, FileText, Upload, XCircle, X, Filter, Loader2, Printer
} from 'lucide-react';
import { supabase } from '../supabaseAdmin'; // IMPORTED SUPABASE
import ChateauLogo from '../../assets/ChataueLogo.png'; // IMPORTED CHATEAU REAL LOGO ASSET
import PaymentReports from './PaymentReports'; // --- IMPORTED SEPARATED COMPONENT ---
import AddPayable from './AddPayable'; // --- ADDED: Import for AddPayable modal ---

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
        <p className="text-slate-500 text-sm mb-8">{current.message}</p>
        
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
            <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all cursor-pointer">
              Cancel
            </button>
            <button 
              onClick={onAction} 
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all cursor-pointer"
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
  // --- ADDED: State for Resident Filter ---
  const [residentFilter, setResidentFilter] = useState('All'); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Modal States
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false); 
  const [selectedPayment, setSelectedPayment] = useState(null); 
  
  // --- ADDED: State for Confirm Void Modal ---
  const [isConfirmVoidOpen, setIsConfirmVoidOpen] = useState(false);
  // --- ADDED: State for Add Payable Modal ---
  const [isAddPayableOpen, setIsAddPayableOpen] = useState(false);

  // --- FIXED: Updated Create Form Data to include particular breakdowns ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [residentsList, setResidentsList] = useState([]);
  const [createFormData, setCreateFormData] = useState({
    user_id: '',
    monthly_due: '',        // Utilities, Security, Waste
    amenities_fee: '',      // Events
    repairs_infrastructure: '', // Bumps, maintenance
    due_date: '',
    reference_no: 'Monthly HOA Due'
  });

  // --- ADDED: State for Invoice/Statement PDF Modal ---
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementResId, setStatementResId] = useState('');

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
    fetchResidentsList(); 
  }, []);

  // --- FIXED: Fetch Residents updated to use 'phone' ---
  const fetchResidentsList = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone') 
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

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        return;
      }

      // --- ADDED: Auto-Overdue Check Logic ---
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate day comparison
      const idsToUpdate = [];

      paymentsData.forEach(p => {
        // Only check items that are not already paid or overdue
        if (p.status !== 'paid' && p.status !== 'overdue' && p.due_date) {
          const dueDate = new Date(p.due_date);
          if (dueDate < today) {
            idsToUpdate.push(p.id);
            p.status = 'overdue'; // Update local array immediately
          }
        }
      });

      // If any items are past due, update them in the Supabase database in bulk
      if (idsToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ status: 'overdue' })
          .in('id', idsToUpdate);
          
        if (updateError) {
          console.error("Failed to auto-update overdue statuses:", updateError);
        } else {
          await logActivity('System Auto-Update', `Automatically updated ${idsToUpdate.length} payment(s) to Overdue status.`);
        }
      }
      // --- END ADDED AUTO-OVERDUE LOGIC ---

      const userIds = [...new Set(paymentsData.map(p => p.user_id).filter(Boolean))];
      let profilesData = [];

      if (userIds.length > 0) {
        // --- FIXED: Updated to use 'phone' ---
        const { data: pData, error: pError } = await supabase
          .from('profiles')
          .select('id, full_name, address, street, email, phone')
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
      const menuHeight = 120;
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

  const submitCreateBill = async () => {
    const totalAmount = Number(createFormData.monthly_due || 0) + Number(createFormData.amenities_fee || 0) + Number(createFormData.repairs_infrastructure || 0);

    if (!createFormData.user_id || totalAmount <= 0 || !createFormData.due_date) {
      setTransaction({ status: 'error', message: 'Please select a resident, provide a due date, and ensure the total amount is greater than 0.' });
      return;
    }
    setTransaction({ status: 'loading', message: 'Issuing new due...' });
    try {
      const payload = {
        user_id: createFormData.user_id,
        amount: totalAmount, // Automatically sum up all breakdown particulars to map perfectly with your base amount numeric column rule
        due_date: createFormData.due_date,
        status: 'unpaid',
        reference_no: createFormData.reference_no || `BILL-${Date.now().toString().slice(-6)}`
      };
      const { error = null } = await supabase.from('payments').insert([payload]);
      if (error) throw error;
      await logActivity('Issued New Due', `Created a new bill (Ref: ${payload.reference_no}) for amount ₱${payload.amount}.`);
      setIsCreateModalOpen(false);
      setCreateFormData({ user_id: '', monthly_due: '', amenities_fee: '', repairs_infrastructure: '', due_date: '', reference_no: 'Monthly HOA Due' });
      fetchPayments();
      setTransaction({ status: 'success', message: 'New bill successfully issued to resident.' });
    } catch (error) {
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
      if (editFormData.status === 'paid') {
        updatePayload.paid_at = editFormData.paid_at ? new Date(editFormData.paid_at).toISOString() : new Date().toISOString();
      } else {
        updatePayload.paid_at = null;
      }
      const { error } = await supabase
        .from('payments')
        .update(updatePayload)
        .eq('id', selectedPayment.id);
      if (error) throw error;
      await logActivity('Edited Transaction', `Updated transaction details for Ref: ${updatePayload.reference_no || selectedPayment.reference_no}. New status: ${updatePayload.status}.`);
      setIsEditTransactionOpen(false);
      fetchPayments();
      setTransaction({ status: 'success', message: 'Transaction has been successfully updated.' });
    } catch (error) {
      setTransaction({ status: 'error', message: "Failed to update transaction: " + error.message });
    }
  };

  // --- FIXED: Handle Void Transaction maps correctly to the DB schema columns ---
  const handleVoidTransaction = async () => {
    if (!selectedPayment) return;
    setIsConfirmVoidOpen(false);
    
    // If user is Super Admin, bypass approval and delete immediately
    if (currentUserRole === 'super_admin') {
      setTransaction({ status: 'loading', message: 'Voiding transaction...' });
      try {
        const { error } = await supabase
          .from('payments')
          .delete()
          .eq('id', selectedPayment.id);
        if (error) throw error;
        await logActivity('Voided Transaction', `Deleted/Voided transaction Ref: ${selectedPayment.reference_no} for amount ₱${selectedPayment.amount}.`);
        setOpenMenuId(null);
        fetchPayments();
        setTransaction({ status: 'success', message: 'Transaction has been successfully voided.' });
      } catch (error) {
        setTransaction({ status: 'error', message: "Failed to void transaction: " + error.message });
      }
    } else {
      // For standard Admins (Treasurer, President, etc), send a request to approval_requests table
      setTransaction({ status: 'loading', message: 'Submitting void request to Super Admin...' });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // --- FIXED: Mapped to exact schema: target_table, target_id, action_type, requested_data (jsonb), status, requested_by (uuid) ---
        const { error } = await supabase
          .from('approval_requests')
          .insert([{
            target_table: 'payments',
            target_id: selectedPayment.id,
            action_type: 'DELETE',
            requested_data: {
              reference_no: selectedPayment.reference_no,
              amount: selectedPayment.amount,
              details: `Requested to void payment Ref: ${selectedPayment.reference_no} for amount ₱${selectedPayment.amount}.`
            },
            status: 'PENDING',
            requested_by: user?.id || null // Must pass user UUID, not email string
          }]);
          
        if (error) throw error;
        
        await logActivity('Requested Payment Void', `Submitted approval request to void transaction Ref: ${selectedPayment.reference_no}.`);
        setOpenMenuId(null);
        setTransaction({ status: 'success', message: 'Void request has been successfully sent to the Super Admin for approval.' });
      } catch (error) {
        setTransaction({ status: 'error', message: "Failed to submit request: " + error.message });
      }
    }
  };

  const filteredPayments = payments.filter(p => {
    const name = p.profiles?.full_name || 'Unknown Resident';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (p.status && p.status.toLowerCase() === statusFilter.toLowerCase());
    // --- ADDED: Resident Filtering Logic ---
    const matchesResident = residentFilter === 'All' || p.user_id === residentFilter;
    
    return matchesSearch && matchesStatus && matchesResident;
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

  const totalCollected = payments.filter(p => (p.status || '').toLowerCase() === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingCount = payments.filter(p => { const s = (p.status || '').toLowerCase(); return s === 'pending' || s === 'unpaid'; }).length;
  const overdueCount = payments.filter(p => (p.status || '').toLowerCase() === 'overdue').length;
  const paidCount = payments.filter(p => (p.status || '').toLowerCase() === 'paid').length;

  const residentPayments = payments.filter(p => p.user_id === statementResId);
  const residentProfile = statementResId ? residentsList.find(r => r.id === statementResId) : null;
  const selectedPaymentProfile = residentPayments.length > 0 ? residentPayments[0].profiles : null; 
  const invTotalPaid = residentPayments.filter(p => p.status?.toLowerCase() === 'paid').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const invTotalOverdue = residentPayments.filter(p => p.status?.toLowerCase() === 'overdue').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const invTotalDue = residentPayments.filter(p => ['pending', 'unpaid', 'overdue'].includes(p.status?.toLowerCase())).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Calculate live total for Create Form Display
  const currentCreateTotal = Number(createFormData.monthly_due || 0) + Number(createFormData.amenities_fee || 0) + Number(createFormData.repairs_infrastructure || 0);

  // --- ADDED: Restored Full Screen Loading Screen Block ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
          <p className="text-[#006837] font-semibold animate-pulse tracking-wide">Loading payments tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <TransactionModal status={transaction.status} message={transaction.message} onClose={() => setTransaction({ status: null, message: '' })} />
      <PaymentReports 
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        statementResId={statementResId}
        setStatementResId={setStatementResId}
        residentsList={residentsList}
        residentPayments={residentPayments}
        residentProfile={residentProfile}
        selectedPaymentProfile={selectedPaymentProfile}
        invTotalPaid={invTotalPaid}
        invTotalOverdue={invTotalOverdue}
        invTotalDue={invTotalDue}
      />
      
      {/* --- ADDED: AddPayable Modal --- */}
      <AddPayable 
        isOpen={isAddPayableOpen} 
        onClose={() => setIsAddPayableOpen(false)} 
        onPayableAdded={() => fetchPayments()} // Refreshes payments view
      />
      
      {/* --- FIXED: Modal Overlay dynamically adjusts text/labels based on current role --- */}
      <ModalOverlay 
        isOpen={isConfirmVoidOpen} 
        onClose={() => setIsConfirmVoidOpen(false)} 
        title={currentUserRole === 'super_admin' ? "Void Transaction" : "Request Void Approval"} 
        subtitle={currentUserRole === 'super_admin' ? "Are you sure you want to void/delete this transaction?" : "This action requires Super Admin approval."} 
        actionLabel={currentUserRole === 'super_admin' ? "Yes, Void It" : "Submit Request"} 
        onAction={handleVoidTransaction} 
      >
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-semibold">
            {currentUserRole === 'super_admin' 
              ? "This action is permanent and cannot be undone." 
              : "The Super Admin will be notified to review and approve this deletion."}
          </p>
        </div>
      </ModalOverlay>

      <ModalOverlay isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Issue New Due" subtitle="Create a structured bill based on HOA Statement guidelines" actionLabel={`Create Bill (₱${currentCreateTotal.toLocaleString()})`} onAction={submitCreateBill} >
        <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Resident</label>
            <select name="user_id" value={createFormData.user_id} onChange={(e) => setCreateFormData({...createFormData, user_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">-- Choose a Resident --</option>
              {residentsList.map(res => (<option key={res.id} value={res.id}>{res.full_name}</option>))}
            </select>
          </div>
          
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">HOA Particulars Breakdown</h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Utilities, Security, & Waste (₱)</label>
              <p className="text-[10px] text-slate-500 mb-2">Electricity, water, guard salaries, checkpoint operations, and weekly trash collection.</p>
              <input type="number" name="monthly_due" value={createFormData.monthly_due} onChange={(e) => setCreateFormData({...createFormData, monthly_due: e.target.value})} placeholder="0.00" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amenities Fee (₱)</label>
              <p className="text-[10px] text-slate-500 mb-2">Funding for community events and seasonal gatherings (e.g., Christmas party).</p>
              <input type="number" name="amenities_fee" value={createFormData.amenities_fee} onChange={(e) => setCreateFormData({...createFormData, amenities_fee: e.target.value})} placeholder="0.00" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Repairs & Infrastructure (₱)</label>
              <p className="text-[10px] text-slate-500 mb-2">Installing and maintaining road safety features (e.g., speed bumps).</p>
              <input type="number" name="repairs_infrastructure" value={createFormData.repairs_infrastructure} onChange={(e) => setCreateFormData({...createFormData, repairs_infrastructure: e.target.value})} placeholder="0.00" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-700">Total Calculated Amount:</span>
              <span className="text-lg font-black text-[#006837]">₱{currentCreateTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
              <input type="date" name="due_date" value={createFormData.due_date} onChange={(e) => setCreateFormData({...createFormData, due_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Reference Name</label>
              <input type="text" name="reference_no" value={createFormData.reference_no} onChange={(e) => setCreateFormData({...createFormData, reference_no: e.target.value})} placeholder="e.g., Monthly HOA Due" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
        </div>
      </ModalOverlay>

      <ModalOverlay isOpen={isEditTransactionOpen} onClose={() => setIsEditTransactionOpen(false)} title="Edit Transaction" subtitle="Update Resident Payment Details" actionLabel="Update Transaction" onAction={submitEditTransaction} >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Resident Name</label>
            <input type="text" readOnly defaultValue={(Array.isArray(selectedPayment?.profiles) ? selectedPayment?.profiles[0]?.full_name : selectedPayment?.profiles?.full_name) || "Unknown Resident"} className="w-full px-4 py-3 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl focus:outline-none cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₱)</label>
              <input type="number" name="amount" value={editFormData.amount} onChange={handleEditChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Payment Status</label>
              <select name="status" value={editFormData.status} onChange={handleEditChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
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
              <input type="date" name="due_date" value={editFormData.due_date} onChange={handleEditChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Reference No.</label>
              <input type="text" name="reference_no" value={editFormData.reference_no} onChange={handleEditChange} placeholder="Ref Number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
          {editFormData.status === 'paid' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Date Paid</label>
              <input type="date" name="paid_at" value={editFormData.paid_at} onChange={handleEditChange} className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          )}
        </div>
      </ModalOverlay>

      {/* Header, Stats, Content area... */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
        <p className="text-slate-500 text-sm">Manage dues, issue bills, and generate financial reports.</p>
      </div>

      <div className="flex flex-wrap gap-6 mb-8">
        <StatCard title="Total Collected" value={`₱${totalCollected.toLocaleString()}`} icon={DollarSign} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
        <StatCard title="Pending Payments" value={pendingCount} icon={CreditCard} iconColor="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Overdue" value={overdueCount} icon={AlertCircle} iconColor="text-red-600" bgColor="bg-red-50" />
        <StatCard title="Paid This Month" value={paidCount} icon={CheckCircle2} iconColor="text-indigo-600" bgColor="bg-indigo-50" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search Payments..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select 
                className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-slate-50 transition-all shadow-sm" 
                value={residentFilter} 
                onChange={(e) => setResidentFilter(e.target.value)} 
              >
                <option value="All">All Residents</option>
                {residentsList.map(res => (
                  <option key={res.id} value={res.id}>{res.full_name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-slate-50 transition-all shadow-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* --- ADDED: + Add Expense Button --- */}
            <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer']}>
                <button 
                  onClick={() => setIsAddPayableOpen(true)}
                  className="bg-[#006837] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#004d29] shadow-sm transition-all cursor-pointer"
                >
                  + Add Expense
                </button>
            </RequireRole>

            <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer', 'vice_president', 'auditor']}>
              <button onClick={() => { setStatementResId(''); setIsStatementModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all cursor-pointer">
                <FileText size={18} /> Generate Statement
              </button>
            </RequireRole>
            <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer']}>
              <button onClick={() => { setCreateFormData({ user_id: '', monthly_due: '', amenities_fee: '', repairs_infrastructure: '', due_date: '', reference_no: 'Monthly HOA Due' }); setIsCreateModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#006837] border border-[#006837] rounded-xl text-sm font-bold text-white hover:bg-[#004d29] shadow-sm transition-all cursor-pointer">
                <Plus size={18} /> Issue New Due
              </button>
            </RequireRole>
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
                {filteredPayments.map((p) => {
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
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyle(p.status)}`}>{p.status || 'unpaid'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '---'}</td>
                      <td className="px-6 py-4 text-right border-b border-slate-50">
                        <div className="flex items-center justify-end gap-3">
                          <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer']}>
                            <button onClick={() => { setSelectedPayment(p); setEditFormData({ amount: p.amount || '', status: p.status || 'unpaid', due_date: p.due_date ? p.due_date.split('T')[0] : '', reference_no: p.reference_no || '', paid_at: p.paid_at ? p.paid_at.split('T')[0] : '' }); setIsEditTransactionOpen(true); }} title="Edit Transaction" className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"><Edit2 size={16} /></button>
                          </RequireRole>
                          <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer', 'super_admin']}>
                            <button onClick={() => { setSelectedPayment(p); setIsConfirmVoidOpen(true); }} title="Void / Cancel" className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer"><Trash2 size={16} /></button>
                          </RequireRole>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payment;