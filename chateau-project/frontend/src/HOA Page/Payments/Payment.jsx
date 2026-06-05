import React, { useState, useEffect } from 'react';
import {
  Search, Plus, CreditCard, AlertCircle, CheckCircle2, DollarSign,
  Edit2, Trash2, FileText, X, Filter, Loader2, Download,
  Calendar, Users, ChevronDown, LayoutList, TableProperties,
} from 'lucide-react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import ChateauLogo from '../../assets/ChataueLogo.png';
import PaymentReports from './PaymentReports';
import AddPayable from './AddPayable';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHLY_DUE_AMOUNT = 150; // ₱150 standard monthly HOA due

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') return children;
  return null;
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const getMonthYear = (date) => {
  const d = new Date(date);
  return { month: d.getMonth(), year: d.getFullYear() };
};

// ─── Reference number generator ───────────────────────────────────────────────
// Generates a short unique ref like HOA-062026-A3F9
const generateRefNo = (month, year) => {
  const mm   = String(month + 1).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HOA-${mm}${year}-${rand}`;
};


// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, iconColor, bgColor }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-1 hover:shadow-md transition-shadow">
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 mt-0.5">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bgColor}`}>
      <Icon size={24} className={iconColor} />
    </div>
  </div>
);

// ─── TransactionModal ─────────────────────────────────────────────────────────
const TransactionModal = ({ status, message, onClose }) => {
  if (!status) return null;
  const configs = {
    loading: { icon: <Loader2 className="w-12 h-12 text-[#006837] animate-spin" />, title: 'Processing…',   bg: 'bg-[#006837]/10' },
    success: { icon: <CheckCircle2 className="w-12 h-12 text-emerald-600" />,        title: 'Success!',      bg: 'bg-emerald-50'    },
    error:   { icon: <AlertCircle  className="w-12 h-12 text-red-600" />,            title: 'Action Failed', bg: 'bg-red-50'        },
  };
  const cur = configs[status];
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className={`w-20 h-20 ${cur.bg} rounded-full flex items-center justify-center mx-auto mb-5`}>{cur.icon}</div>
        <h3 className="text-xl font-black text-slate-900 mb-2">{cur.title}</h3>
        <p className="text-slate-500 text-sm mb-7">{message}</p>
        {status !== 'loading' && (
          <button onClick={onClose}
            className="w-full py-3.5 bg-[#006837] hover:bg-[#004d29] text-white font-bold rounded-2xl transition-all cursor-pointer">
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

// ─── ModalOverlay ─────────────────────────────────────────────────────────────
const ModalOverlay = ({ title, subtitle, isOpen, onClose, children, actionLabel, onAction }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-7">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">{title}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer"><X size={18} /></button>
          </div>
          <div className="space-y-5">{children}</div>
          <div className="flex gap-3 mt-8">
            <button onClick={onClose}
              className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold cursor-pointer">
              Cancel
            </button>
            <button onClick={onAction}
              className="flex-1 px-5 py-3 bg-[#006837] hover:bg-[#004d29] text-white rounded-2xl font-bold shadow-lg shadow-[#006837]/20 cursor-pointer">
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── Standing Ledger View ──────────────────────────────────────────────────────
// Mirrors the physical paper ledger: one row per resident, shows standing + last payment date
const StandingLedger = ({ residentsList, payments }) => {
  const [search,          setSearch]          = useState('');
  const [residentFilter,  setResidentFilter]  = useState('All');  // ← new resident filter

  // Build one row per resident
  const rows = residentsList.map(r => {
    const rPayments = payments.filter(p => p.user_id === r.id);
    const paidPayments = rPayments.filter(p => (p.status || '').toLowerCase() === 'paid');

    // Last payment date
    const lastPaid = paidPayments.length > 0
      ? paidPayments.sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at))[0]
      : null;

    // Standing: "Good" if latest due is paid; "No Record" if no payments at all; otherwise "Overdue/Pending"
    const latestDue = rPayments.sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0))[0];
    let standing = 'No Record';
    let standingColor = 'bg-slate-100 text-slate-500 border-slate-200';
    if (latestDue) {
      const s = (latestDue.status || '').toLowerCase();
      if (s === 'paid')                    { standing = 'Good';    standingColor = 'bg-emerald-50 text-emerald-700 border-emerald-100'; }
      else if (s === 'overdue')            { standing = 'Overdue'; standingColor = 'bg-red-50 text-red-600 border-red-100';            }
      else if (s === 'pending' || s === 'unpaid') { standing = 'Pending'; standingColor = 'bg-amber-50 text-amber-700 border-amber-100'; }
    }

    return {
      id:           r.id,
      full_name:    r.full_name || '—',
      block:        r.block || '—',
      lot:          r.lot   || '—',
      street:       r.street || '—',
      resident_type: r.resident_type || '—',
      standing,
      standingColor,
      lastPaidDate: lastPaid?.paid_at
        ? new Date(lastPaid.paid_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'No record',
      totalPaid: paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
      unpaidCount: rPayments.filter(p => ['unpaid','pending','overdue'].includes((p.status||'').toLowerCase())).length,
    };
  });

  const filtered = rows.filter(r =>
    (residentFilter === 'All' || r.id === residentFilter) &&
    (!search || r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.block.toLowerCase().includes(search.toLowerCase()) ||
    r.lot.toLowerCase().includes(search.toLowerCase()))
  );

  const goodCount    = rows.filter(r => r.standing === 'Good').length;
  const overdueCount = rows.filter(r => r.standing === 'Overdue').length;
  const pendingCount = rows.filter(r => r.standing === 'Pending').length;
  const noRecord     = rows.filter(r => r.standing === 'No Record').length;


  // ── Export to CSV — matches physical ledger column order ─────────────────
  const exportToCSV = () => {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const headers = ['Block','Lot','Street','Last Name','First Name','Status','Standing','Date of Last Payment','Unpaid Dues'];

    const csvRows = [
      // Title row like the physical ledger
      [`Updated Monthly Dues Payment as of ${today}`],
      [],
      headers,
      ...filtered.map(r => {
        // Split full_name into Last, First if possible (assumes "First Last" format)
        const parts     = r.full_name.split(' ');
        const lastName  = parts.length > 1 ? parts[parts.length - 1] : r.full_name;
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        return [
          r.block,
          r.lot,
          r.street,
          lastName,
          firstName,
          r.resident_type,
          r.standing,
          r.lastPaidDate,
          r.unpaidCount > 0 ? `${r.unpaidCount} unpaid` : 'Good',
        ];
      }),
    ];

    const csvContent = csvRows
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Monthly_Dues_Standing_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <TableProperties size={15} className="text-[#006837]" />
                  Monthly Dues Standing Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mirrors the physical ledger — one row per resident, showing current standing and last payment date
                </p>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#006837] hover:bg-[#004d29] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#006837]/20 cursor-pointer transition-all shrink-0"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Mini KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Good Standing', value: goodCount,    color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { label: 'Overdue',       value: overdueCount, color: 'bg-red-50 text-red-600 border-red-100'            },
            { label: 'Pending',       value: pendingCount, color: 'bg-amber-50 text-amber-700 border-amber-100'      },
            { label: 'No Record',     value: noRecord,     color: 'bg-slate-100 text-slate-500 border-slate-200'     },
          ].map(k => (
            <div key={k.label} className={`p-3 rounded-xl border text-center ${k.color}`}>
              <p className="text-xl font-black">{k.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search resident, block, lot…"
            className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
        </div>
        <select
          value={residentFilter}
          onChange={e => setResidentFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer"
        >
          <option value="All">All Residents</option>
          {rows.map(r => (
            <option key={r.id} value={r.id}>{r.full_name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Resident','Block','Lot','Street','Type','Standing','Last Payment','Unpaid Dues'].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-300 text-sm">No residents found</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">{r.full_name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{r.block}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{r.lot}</td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-[120px] truncate">{r.street}</td>
                <td className="px-4 py-3 text-sm text-slate-500 capitalize">{r.resident_type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${r.standingColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      r.standing === 'Good' ? 'bg-emerald-400' :
                      r.standing === 'Overdue' ? 'bg-red-400' :
                      r.standing === 'Pending' ? 'bg-amber-400' : 'bg-slate-300'
                    }`} />
                    {r.standing}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{r.lastPaidDate}</td>
                <td className="px-4 py-3">
                  {r.unpaidCount > 0
                    ? <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full">{r.unpaidCount} unpaid</span>
                    : <span className="text-xs text-emerald-600 font-semibold">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">{filtered.length} of {rows.length} residents</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Payment Component ───────────────────────────────────────────────────
const Payment = () => {
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('All');
  const [residentFilter,   setResidentFilter]   = useState('All');
  const [activeView,       setActiveView]       = useState('transactions'); // 'transactions' | 'standing'

  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [selectedPayment,       setSelectedPayment]       = useState(null);
  const [isConfirmVoidOpen,     setIsConfirmVoidOpen]     = useState(false);
  const [isAddPayableOpen,      setIsAddPayableOpen]      = useState(false);
  const [residentsList,     setResidentsList]     = useState([]);

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementResId,       setStatementResId]       = useState('');
  const [transaction,          setTransaction]          = useState({ status: null, message: '' });
  const [editFormData,         setEditFormData]         = useState({ amount: '', status: '', due_date: '', reference_no: '', paid_at: '' });
  const [payments,             setPayments]             = useState([]);
  const [loading,              setLoading]              = useState(true);

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  useEffect(() => { fetchPayments(); fetchResidentsList(); }, []);

  // ── Auto-generate monthly dues on the 1st of each month ──────────────────
  // Runs once on mount. If today is the 1st AND this month hasn't been billed
  // yet, silently bulk-issues ₱150 for every resident and posts an announcement.
  useEffect(() => {
    const runMonthlyAutoGenerate = async () => {
      const today = new Date();
      if (today.getDate() !== 1) return; // Only runs on the 1st

      const month = today.getMonth();
      const year  = today.getFullYear();

      // Check if dues already exist for this month (any resident)
      const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
      const monthEnd   = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .limit(1);

      if (existing?.length) return; // Already generated this month

      // Fetch all residents
      const { data: residents } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (!residents?.length) return;

      // Due date = last day of current month
      const dueDate = monthEnd;

      const rows = residents.map(r => ({
        user_id:      r.id,
        amount:       MONTHLY_DUE_AMOUNT,
        due_date:     dueDate,
        status:       'unpaid',
        reference_no: generateRefNo(month, year),
      }));

      const { error } = await supabase.from('payments').insert(rows);
      if (error) {
        console.error('[AutoGenerate] Failed:', error.message);
        return;
      }

      await logAudit(
        'AUTO_MONTHLY_DUE',
        `Auto-generated ₱${MONTHLY_DUE_AMOUNT} monthly dues for ${rows.length} residents — ${MONTHS[month]} ${year}. Due: ${dueDate}.`
      );

      // Refresh payments list
      fetchPayments();
    };

    runMonthlyAutoGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const fetchResidentsList = async () => {
    try {
      const { data } = await supabase.from('profiles')
        .select('id, full_name, email, phone, block, lot, street, resident_type')
        .order('full_name');
      if (data) setResidentsList(data);
    } catch (e) { console.error(e.message); }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data: pData, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!pData?.length) { setPayments([]); return; }

      // Auto-overdue check
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const toOverdue = pData.filter(p => p.status !== 'paid' && p.status !== 'overdue' && p.due_date && new Date(p.due_date) < today).map(p => p.id);
      if (toOverdue.length) {
        await supabase.from('payments').update({ status: 'overdue' }).in('id', toOverdue);
        await logAudit('SYSTEM_AUTO_UPDATE', `Auto-updated ${toOverdue.length} payment(s) to Overdue.`);
        toOverdue.forEach(id => { const p = pData.find(x => x.id === id); if (p) p.status = 'overdue'; });
      }

      const userIds = [...new Set(pData.map(p => p.user_id).filter(Boolean))];
      let profiles  = [];
      if (userIds.length) {
        const { data: pr } = await supabase.from('profiles').select('id, full_name, address, street, email, phone').in('id', userIds);
        profiles = pr || [];
      }
      setPayments(pData.map(p => ({ ...p, profiles: profiles.find(pr => pr.id === p.user_id) || null })));
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitEditTransaction = async () => {
    if (!selectedPayment) return;
    setTransaction({ status: 'loading', message: 'Updating transaction…' });
    try {
      const payload = {
        amount: editFormData.amount ? Number(editFormData.amount) : null,
        status: editFormData.status, due_date: editFormData.due_date || null, reference_no: editFormData.reference_no || null,
        paid_at: editFormData.status === 'paid' ? (editFormData.paid_at ? new Date(editFormData.paid_at).toISOString() : new Date().toISOString()) : null,
      };
      const { error } = await supabase.from('payments').update(payload).eq('id', selectedPayment.id);
      if (error) throw error;
      await logAudit('EDIT_PAYMENT', `Updated Ref: ${payload.reference_no || selectedPayment.reference_no} → ${payload.status}.`);
      setIsEditTransactionOpen(false);
      fetchPayments();
      setTransaction({ status: 'success', message: 'Transaction updated.' });
    } catch (e) { setTransaction({ status: 'error', message: 'Failed: ' + e.message }); }
  };

  const handleVoidTransaction = async () => {
    if (!selectedPayment) return;
    setIsConfirmVoidOpen(false);
    if (currentUserRole === 'super_admin') {
      setTransaction({ status: 'loading', message: 'Voiding transaction…' });
      try {
        const { error } = await supabase.from('payments').delete().eq('id', selectedPayment.id);
        if (error) throw error;
        await logAudit('VOID_PAYMENT', `Voided Ref: ${selectedPayment.reference_no}.`);
        fetchPayments();
        setTransaction({ status: 'success', message: 'Transaction voided.' });
      } catch (e) { setTransaction({ status: 'error', message: 'Failed: ' + e.message }); }
    } else {
      setTransaction({ status: 'loading', message: 'Submitting void request…' });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('approval_requests').insert([{
          target_table: 'payments', target_id: selectedPayment.id, action_type: 'DELETE',
          requested_data: { reference_no: selectedPayment.reference_no, amount: selectedPayment.amount },
          status: 'PENDING', requested_by: user?.id || null,
        }]);
        if (error) throw error;
        await logAudit('REQUEST_VOID_PAYMENT', `Void request for Ref: ${selectedPayment.reference_no}.`);
        setTransaction({ status: 'success', message: 'Void request sent to the President for approval.' });
      } catch (e) { setTransaction({ status: 'error', message: 'Failed: ' + e.message }); }
    }
  };

  const filteredPayments = payments.filter(p => {
    const name = p.profiles?.full_name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter   === 'All' || (p.status || '').toLowerCase() === statusFilter.toLowerCase()) &&
      (residentFilter === 'All' || p.user_id === residentFilter);
  });

  const getStatusStyle = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'paid':    return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'overdue': return 'bg-red-50 text-red-600 border border-red-100';
      case 'unpaid':  return 'bg-slate-100 text-slate-600 border border-slate-200';
      default:        return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
  };

  const totalCollected = payments.filter(p => p.status?.toLowerCase() === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingCount   = payments.filter(p => ['pending','unpaid'].includes(p.status?.toLowerCase())).length;
  const overdueCount   = payments.filter(p => p.status?.toLowerCase() === 'overdue').length;
  const paidCount      = payments.filter(p => p.status?.toLowerCase() === 'paid').length;

  const residentPayments   = payments.filter(p => p.user_id === statementResId);
  const residentProfile    = statementResId ? residentsList.find(r => r.id === statementResId) : null;
  const selProfile         = residentPayments[0]?.profiles || null;
  const invTotalPaid       = residentPayments.filter(p => p.status?.toLowerCase() === 'paid').reduce((a, c) => a + Number(c.amount || 0), 0);
  const invTotalOverdue    = residentPayments.filter(p => p.status?.toLowerCase() === 'overdue').reduce((a, c) => a + Number(c.amount || 0), 0);
  const invTotalDue        = residentPayments.filter(p => ['pending','unpaid','overdue'].includes(p.status?.toLowerCase())).reduce((a, c) => a + Number(c.amount || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
        <p className="text-[#006837] font-semibold animate-pulse">Loading payment data…</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen space-y-6">

      <TransactionModal status={transaction.status} message={transaction.message}
        onClose={() => { setTransaction({ status: null, message: '' }); fetchPayments(); }} />

      <PaymentReports
        isOpen={isStatementModalOpen} onClose={() => setIsStatementModalOpen(false)}
        statementResId={statementResId} setStatementResId={setStatementResId}
        residentsList={residentsList} residentPayments={residentPayments}
        residentProfile={residentProfile} selectedPaymentProfile={selProfile}
        invTotalPaid={invTotalPaid} invTotalOverdue={invTotalOverdue} invTotalDue={invTotalDue}
      />

      <AddPayable isOpen={isAddPayableOpen} onClose={() => setIsAddPayableOpen(false)}
        onPayableAdded={() => fetchPayments()} />



      {/* ── Void confirm ── */}
      <ModalOverlay
        isOpen={isConfirmVoidOpen} onClose={() => setIsConfirmVoidOpen(false)}
        title="Request Void Approval"
        subtitle="This requires President approval before the transaction is removed."
        actionLabel="Submit Request"
        onAction={handleVoidTransaction}
      >
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm font-semibold">
            The President will review and approve this deletion.
          </p>
        </div>
      </ModalOverlay>



      {/* ── Edit transaction ── */}
      <ModalOverlay isOpen={isEditTransactionOpen} onClose={() => setIsEditTransactionOpen(false)}
        title="Edit Transaction" subtitle="Update resident payment details"
        actionLabel="Update Transaction" onAction={submitEditTransaction}>
        <div className="grid gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Resident</label>
            <input readOnly value={(Array.isArray(selectedPayment?.profiles) ? selectedPayment?.profiles[0]?.full_name : selectedPayment?.profiles?.full_name) || 'Unknown'}
              className="w-full px-4 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₱)</label>
              <input type="number" name="amount" value={editFormData.amount} onChange={handleEditChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select name="status" value={editFormData.status} onChange={handleEditChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due Date</label>
              <input type="date" name="due_date" value={editFormData.due_date} onChange={handleEditChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reference No.</label>
              <input type="text" name="reference_no" value={editFormData.reference_no} onChange={handleEditChange} placeholder="Ref Number"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 transition-all" />
            </div>
          </div>
          {editFormData.status === 'paid' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Paid</label>
              <input type="date" name="paid_at" value={editFormData.paid_at} onChange={handleEditChange}
                className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer" />
            </div>
          )}
        </div>
      </ModalOverlay>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage dues, issue bills, and track resident standing</p>
        </div>
        {/* View toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
          <button onClick={() => setActiveView('transactions')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${activeView === 'transactions' ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <LayoutList size={13} /> Transactions
          </button>
          <button onClick={() => setActiveView('standing')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${activeView === 'standing' ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <TableProperties size={13} /> Standing Ledger
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="flex flex-wrap gap-4">
        <StatCard title="Total Collected"  value={`₱${totalCollected.toLocaleString()}`} icon={DollarSign}  iconColor="text-[#006837]" bgColor="bg-[#006837]/10" />
        <StatCard title="Pending Payments" value={pendingCount}                           icon={CreditCard}  iconColor="text-blue-600"  bgColor="bg-blue-50"       />
        <StatCard title="Overdue"          value={overdueCount}                           icon={AlertCircle} iconColor="text-red-600"   bgColor="bg-red-50"        />
        <StatCard title="Paid This Month"  value={paidCount}                              icon={CheckCircle2}iconColor="text-emerald-600"bgColor="bg-emerald-50"    />
      </div>

      {/* ── Standing Ledger view ── */}
      {activeView === 'standing' && (
        <StandingLedger residentsList={residentsList} payments={payments} />
      )}

      {/* ── Transactions view ── */}
      {activeView === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px] flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input type="text" placeholder="Search payments…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
              </div>
              <select value={residentFilter} onChange={e => setResidentFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer">
                <option value="All">All Residents</option>
                {residentsList.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer">
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RequireRole userRole={currentUserRole} allowedRoles={['treasurer']}>
                <button onClick={() => setIsAddPayableOpen(true)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  + Add Expense
                </button>
              </RequireRole>
              <RequireRole userRole={currentUserRole} allowedRoles={['president','treasurer','vice_president','auditor']}>
                <button onClick={() => { setStatementResId(''); setIsStatementModalOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer transition-all">
                  <FileText size={14} /> Statement
                </button>
              </RequireRole>

            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Name','Address','Amount','Due Date','Ref No.','Status','Paid Date',''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-300 text-sm">No payments found</td></tr>
                ) : filteredPayments.map(p => {
                  const prof  = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                  const name  = prof?.full_name || 'Unknown Resident';
                  const addr  = prof ? `${prof.address || ''} ${prof.street || ''}`.trim() : 'N/A';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 text-sm font-bold text-slate-800">{name}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 max-w-[160px] truncate">{addr || 'N/A'}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-900">₱{Number(p.amount).toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{p.due_date ? new Date(p.due_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{p.reference_no || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${getStatusStyle(p.status)}`}>
                          {p.status || 'unpaid'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <RequireRole userRole={currentUserRole} allowedRoles={['treasurer']}>
                            <button
                              onClick={() => { setSelectedPayment(p); setEditFormData({ amount: p.amount || '', status: p.status || 'unpaid', due_date: p.due_date?.split('T')[0] || '', reference_no: p.reference_no || '', paid_at: p.paid_at?.split('T')[0] || '' }); setIsEditTransactionOpen(true); }}
                              className="text-slate-400 hover:text-[#006837] p-1.5 hover:bg-[#006837]/10 rounded-lg transition-all cursor-pointer" title="Edit">
                              <Edit2 size={15} />
                            </button>
                          </RequireRole>
                          <RequireRole userRole={currentUserRole} allowedRoles={['treasurer']}>
                            <button onClick={() => { setSelectedPayment(p); setIsConfirmVoidOpen(true); }}
                              className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Void">
                              <Trash2 size={15} />
                            </button>
                          </RequireRole>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPayments.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">{filteredPayments.length} transaction{filteredPayments.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Payment;
