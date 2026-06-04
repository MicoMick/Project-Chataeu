import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger'; // AUDIT TRAIL // Ensure this path is correct based on your folder structure
import { 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Check,
  AlertTriangle,
  Filter,
  Download // --- ADDED: Icon for Download button ---
} from 'lucide-react';
import AuditSummary from './AuditSummary'; // --- ADDED: Import the new Summary Component ---

// --- Reusable Role Component ---
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') {
    return children;
  }
  return (
    <div className="p-8 flex flex-col items-center justify-center text-slate-400 min-h-[60vh]">
      <ShieldCheck size={64} className="mb-4 text-slate-300" />
      <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
      <p className="text-sm">You do not have permission to view the Auditor Workspace.</p>
    </div>
  ); 
};

// --- Reusable Stat Card ---
const StatCard = ({ title, value, icon: Icon, iconBg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between transition-shadow flex-1 min-w-[240px]">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>
        <Icon size={24} className="text-slate-700" />
      </div>
    </div>
  </div>
);

const AuditorDashboard = () => {
  const [activeTab, setActiveTab] = useState('collectibles'); // 'collectibles', 'payables', 'aging'
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [collectibles, setCollectibles] = useState([]); 
  const [payables, setPayables] = useState([]); 
  const [agingReport, setAgingReport] = useState([]);
  const [residentsList, setResidentsList] = useState([]); 
  const [currentUserId, setCurrentUserId] = useState(null);

  // Filter States
  const [residentFilter, setResidentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // --- ADDED: State to manage Report Summary Modal ---
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- Audit Logger ---
  // logActivity replaced by logAudit from auditLogger.js
  useEffect(() => {
    const initializeAuditor = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      await Promise.all([
        fetchCollectibles(),
        fetchPayables(),
        fetchAgingReport(),
        fetchResidentsList() 
      ]);
      setLoading(false);
    };

    initializeAuditor();
  }, []);

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

  const fetchCollectibles = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`*, profiles(full_name)`)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });

      if (error) throw error;
      setCollectibles(data || []);
    } catch (error) {
      console.error("Error fetching collectibles:", error);
    }
  };

  const fetchPayables = async () => {
    try {
      const { data, error } = await supabase
        .from('payables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayables(data || []);
    } catch (error) {
      console.error("Error fetching payables:", error);
    }
  };

  const fetchAgingReport = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`*, profiles(full_name)`)
        .ilike('status', 'overdue')
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAgingReport(data || []);
    } catch (error) {
      console.error("Error fetching aging report:", error);
    }
  };

  // --- ACTIONS ---

  const verifyCollectible = async (payment) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          audited: true,
          audited_by: currentUserId 
        })
        .eq('id', payment.id);

      if (error) throw error;

      await logAudit('VERIFY_PAYMENT', `Auditor verified payment Ref: ${payment.reference_no} for ${payment.profiles?.full_name}`);
      showToast("Payment verified successfully!", "success");
      fetchCollectibles(); 
    } catch (error) {
      showToast("Failed to verify payment: " + error.message, "error");
    }
  };

  const verifyPayable = async (payable) => {
    try {
      const { error } = await supabase
        .from('payables')
        .update({ 
          status: 'verified',
          audited_by: currentUserId,
          audited_at: new Date().toISOString()
        })
        .eq('id', payable.id);

      if (error) throw error;

      await logAudit('VERIFY_PAYABLE', `Auditor verified expense: ${payable.description} to ${payable.payee}`);
      showToast("Expense verified successfully!", "success");
      fetchPayables(); 
    } catch (error) {
      showToast("Failed to verify expense: " + error.message, "error");
    }
  };

  const calculateDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = Math.abs(today - due);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredCollectibles = collectibles.filter(item => {
    const matchesResident = residentFilter === 'All' || item.user_id === residentFilter;
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Verified' ? item.audited === true : item.audited === false);
    return matchesResident && matchesStatus;
  });

  const filteredPayables = payables.filter(item => {
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Verified' ? item.status === 'verified' : item.status !== 'verified');
    return matchesStatus;
  });

  const filteredAging = agingReport.filter(item => {
    const matchesResident = residentFilter === 'All' || item.user_id === residentFilter;
    return matchesResident;
  });

  const unverifiedCollectiblesCount = collectibles.filter(c => !c.audited).length;
  const unverifiedPayablesCount = payables.filter(p => p.status !== 'verified').length;


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
          <p className="text-[#006837] font-semibold animate-pulse tracking-wide">Loading Auditor Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <RequireRole userRole={currentUserRole} allowedRoles={['auditor', 'super_admin']}>
      <div className="p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
        
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed bottom-8 right-8 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 ${
            toast.type === 'success' ? 'bg-[#006837] text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        )}

        {/* --- ADDED: Modal Component render --- */}
        <AuditSummary 
          isOpen={isSummaryOpen} 
          onClose={() => setIsSummaryOpen(false)} 
          collectibles={collectibles}
          payables={payables}
          agingReport={agingReport}
        />

        {/* Header - FIXED to include Report button side-by-side */}
        <div className="mb-8 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <ShieldCheck className="text-[#006837]" size={28} /> Auditor Workspace
            </h1>
            <p className="text-slate-500 text-sm mt-1">Review collectibles, verify payables, and monitor aging reports to ensure financial integrity.</p>
          </div>
          
          {/* --- ADDED: Generate Report Button --- */}
          <button 
            onClick={() => setIsSummaryOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006837] text-white rounded-xl font-bold text-sm hover:bg-[#004d29] transition-all shadow-md cursor-pointer"
          >
            <Download size={18} /> Generate Report Summary
          </button>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-wrap gap-6 mb-8">
          <StatCard title="Unverified Collectibles" value={unverifiedCollectiblesCount} icon={DollarSign} iconBg="bg-blue-50" />
          <StatCard title="Unverified Payables" value={unverifiedPayablesCount} icon={FileText} iconBg="bg-orange-50" />
          <StatCard title="Overdue Accounts" value={agingReport.length} icon={Clock} iconBg="bg-red-50" />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative w-full max-w-xs">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <select 
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 appearance-none cursor-pointer hover:bg-slate-50 transition-all shadow-sm" 
              value={residentFilter} 
              onChange={(e) => setResidentFilter(e.target.value)} 
              disabled={activeTab === 'payables'} 
            >
              <option value="All">All Residents</option>
              {residentsList.map(res => (
                <option key={res.id} value={res.id}>{res.full_name}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full max-w-xs">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <select 
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 appearance-none cursor-pointer hover:bg-slate-50 transition-all shadow-sm" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              disabled={activeTab === 'aging'} 
            >
              <option value="All">All Verification Status</option>
              <option value="Verified">Verified</option>
              <option value="Unverified">Unverified</option>
            </select>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab('collectibles')}
              className={`px-8 py-5 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${activeTab === 'collectibles' ? 'border-[#006837] text-[#006837] bg-green-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Collectibles Verification (Payments)
            </button>
            <button 
              onClick={() => setActiveTab('payables')}
              className={`px-8 py-5 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${activeTab === 'payables' ? 'border-[#006837] text-[#006837] bg-green-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Expense Audit (Payables)
            </button>
            <button 
              onClick={() => setActiveTab('aging')}
              className={`px-8 py-5 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${activeTab === 'aging' ? 'border-red-500 text-red-600 bg-red-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Aging Report (Overdue)
            </button>
          </div>

          <div className="p-0">
            {/* TAB 1: Collectibles Verification */}
            {activeTab === 'collectibles' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resident</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ref No.</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date Paid</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCollectibles.length > 0 ? filteredCollectibles.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-sm font-bold text-slate-700">{item.profiles?.full_name || 'Unknown'}</td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-mono text-xs">{item.reference_no || 'N/A'}</td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-900">₱{Number(item.amount).toLocaleString()}</td>
                        <td className="px-8 py-5 text-sm text-slate-600">{item.paid_at ? new Date(item.paid_at).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-8 py-5 text-right">
                          {item.audited ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-lg">
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          ) : (
                            <button 
                              onClick={() => verifyCollectible(item)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                              <Check size={14} /> Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="px-8 py-12 text-center text-sm text-slate-400 italic">No collectibles match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Payables Audit */}
            {activeTab === 'payables' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payee (Vendor)</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPayables.length > 0 ? filteredPayables.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-sm font-bold text-slate-700">{item.description}</td>
                        <td className="px-8 py-5 text-sm text-slate-600 font-medium">{item.payee}</td>
                        <td className="px-8 py-5 text-sm font-bold text-orange-600">₱{Number(item.amount).toLocaleString()}</td>
                        <td className="px-8 py-5 text-sm text-slate-600">{new Date(item.due_date).toLocaleDateString()}</td>
                        <td className="px-8 py-5 text-right">
                          {item.status === 'verified' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-lg">
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          ) : (
                            <button 
                              onClick={() => verifyPayable(item)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-xl hover:bg-green-100 transition-colors cursor-pointer"
                            >
                              <ShieldCheck size={14} /> Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="px-8 py-12 text-center text-sm text-slate-400 italic">No expenses match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: Aging Report */}
            {activeTab === 'aging' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-red-50/30">
                      <th className="px-8 py-4 text-[11px] font-bold text-red-400 uppercase tracking-wider">Resident</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-red-400 uppercase tracking-wider">Ref No.</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-red-400 uppercase tracking-wider">Amount Due</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-red-400 uppercase tracking-wider">Original Due Date</th>
                      <th className="px-8 py-4 text-[11px] font-bold text-red-400 uppercase tracking-wider text-right">Aging Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredAging.length > 0 ? filteredAging.map((item) => {
                      const daysOverdue = calculateDaysOverdue(item.due_date);
                      return (
                        <tr key={item.id} className="hover:bg-red-50/10 transition-colors">
                          <td className="px-8 py-5 text-sm font-bold text-slate-700 flex items-center gap-2">
                            {item.profiles?.full_name || 'Unknown'}
                          </td>
                          <td className="px-8 py-5 text-sm text-slate-500 font-mono text-xs">{item.reference_no || 'N/A'}</td>
                          <td className="px-8 py-5 text-sm font-bold text-slate-900">₱{Number(item.amount).toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm text-slate-600">{new Date(item.due_date).toLocaleDateString()}</td>
                          <td className="px-8 py-5 text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-lg">
                              <AlertTriangle size={12} /> {daysOverdue} Days Overdue
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="5" className="px-8 py-12 text-center text-sm text-slate-400 italic">Excellent! There are no overdue accounts matching the filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>
    </RequireRole>
  );
};

export default AuditorDashboard;