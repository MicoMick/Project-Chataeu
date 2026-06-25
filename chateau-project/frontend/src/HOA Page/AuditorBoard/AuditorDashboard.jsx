import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import {
  DollarSign, TrendingUp, TrendingDown, FileText, Printer,
  CheckCircle2, AlertCircle, Clock, Search, RefreshCw,
  Plus, X, Calendar, ChevronDown, Shield, CreditCard,
  Building2, Receipt, BarChart3, AlertTriangle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtMonth    = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : '—';

// ─── Pagination ───────────────────────────────────────────────────────────────
const usePagination = (items, perPage = 10) => {
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { setPage(1); }, [items.length]);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const paginated  = items.slice((page - 1) * perPage, page * perPage);
  return { paginated, page, setPage, totalPages, total: items.length };
};

const PaginationBar = ({ page, totalPages, setPage, total, perPage }) => {
  if (totalPages <= 1) return null;
  const from  = (page - 1) * perPage + 1;
  const to    = Math.min(page * perPage, total);
  const pages = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
  else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }
  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-xs text-slate-400 font-medium">
        Showing <span className="font-bold text-slate-600">{from}–{to}</span> of <span className="font-bold text-slate-600">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm font-bold transition-all">‹</button>
        {pages.map((p, i) => p === '…'
          ? <span key={i} className="w-8 h-8 flex items-center justify-center text-slate-300 text-sm">…</span>
          : <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer
                ${page === p ? 'bg-[#006837] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{p}</button>
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm font-bold transition-all">›</button>
      </div>
    </div>
  );
};
const Toast = ({ toast }) => {
  if (!toast.show) return null;
  return (
    <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-in fade-in duration-300
      ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
      {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
      <p className="text-sm font-bold">{toast.message}</p>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, bg, color, sub }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
      <Icon size={19} className={color} />
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-[#006837]/10 rounded-xl flex items-center justify-center">
        <Icon size={16} className="text-[#006837]" />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// ─── Add Expense Modal ────────────────────────────────────────────────────────
const AddExpenseModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ description: '', amount: '', category: 'Maintenance', expense_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const categories = ['Salaries', 'Utilities', 'Maintenance', 'Supplies', 'Events', 'Legal', 'Insurance', 'Other'];
  const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837]";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('hoa_expenses').insert([{
        description:  form.description,
        amount:       Number(form.amount),
        category:     form.category,
        expense_date: form.expense_date,
        recorded_by:  user?.id,
      }]);
      if (error) throw error;
      await logAudit('ADD_HOA_EXPENSE', `Auditor recorded expense: ${form.description} — ${fmtCurrency(form.amount)}`);
      onSave();
      onClose();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Record HOA Expense</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Description</label><input className={inputCls} placeholder="e.g. Electricity bill — June" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Amount (₱)</label><input type="number" className={inputCls} placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} /></div>
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.expense_date} onChange={e => setForm(p => ({...p, expense_date: e.target.value}))} /></div>
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <div className="relative">
              <select className={inputCls + ' appearance-none pr-8'} value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-[#006837] hover:bg-[#004d29] text-white font-bold rounded-2xl cursor-pointer text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><Plus size={14} /> Record Expense</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Print Summary ────────────────────────────────────────────────────────────
// Mirrors the physical "FINANCIAL STATEMENT" ledger sheet used by the HOA:
// Income (Monthly Dues, Court Rental) → Total Income
// Expenses (Salary Wages, Maintenance, Utility/Bills) → Total Expenses
// Summary (Net Income, Beginning Balance, Ending Balance)
const printFinancialReport = ({ duesIncome, courtIncome, expenses, unpaid, period, beginningBalance = 0 }) => {
  const today   = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  // ── Income — only Monthly Dues and Court Rental, per the physical form ───
  const totalIncome  = duesIncome.total + courtIncome.total;

  // ── Expenses — bucketed into Salary Wages / Maintenance Repair / Utility ──
  // matching the physical form's expense line items. Anything not matching
  // one of these three keywords falls under "Utility" as a catch-all bill,
  // since the form only tracks these three categories.
  const matchKeyword = (desc, keyword) => (desc || '').toLowerCase().includes(keyword);
  const salaryWages = (expenses.records || [])
    .filter(e => matchKeyword(e.description, 'security') || matchKeyword(e.description, 'salary') || matchKeyword(e.description, 'wage') || e.category === 'Salaries')
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const maintenanceRepair = (expenses.records || [])
    .filter(e => matchKeyword(e.description, 'sweep') || matchKeyword(e.description, 'maintenance') || matchKeyword(e.description, 'repair') || e.category === 'Maintenance')
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const utilityBills = (expenses.records || [])
    .filter(e => matchKeyword(e.description, 'electric') || matchKeyword(e.description, 'water') || e.category === 'Utilities')
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExpense = salaryWages + maintenanceRepair + utilityBills;

  // ── Summary ────────────────────────────────────────────────────────────
  const netIncome    = totalIncome - totalExpense;
  const beginBal     = Number(beginningBalance) || 0;
  const endingBal    = beginBal + netIncome;

  // ── Consolidate dues: one row per resident ──────────────────────────────
  const duesMap = {};
  (duesIncome.records || []).forEach(p => {
    const name = p.profiles?.full_name || '—';
    if (!duesMap[p.user_id]) {
      duesMap[p.user_id] = { full_name: name, total: 0, count: 0, last_paid: p.paid_at, audited: true, isDelinquent: p.profiles?.account_status === 'delinquent' };
    }
    duesMap[p.user_id].total += Number(p.amount || 0);
    duesMap[p.user_id].count += 1;
    if (!p.audited) duesMap[p.user_id].audited = false;
    if (!duesMap[p.user_id].last_paid || (p.paid_at && p.paid_at > duesMap[p.user_id].last_paid))
      duesMap[p.user_id].last_paid = p.paid_at;
  });
  const consolidatedDuesPrint = Object.values(duesMap).sort((a, b) => a.full_name.localeCompare(b.full_name));

  const duesRows = consolidatedDuesPrint.map((r, i) => {
    const statusLabel = r.audited ? '✓ Verified' : r.isDelinquent ? '⚠ Needs Review' : 'Pending';
    const statusColor  = r.audited ? '#166534' : r.isDelinquent ? '#c2410c' : '#64748b';
    return `
    <tr style="background:${i%2===0?'#f0fdf4':'#fff'}">
      <td>${r.full_name}</td>
      <td style="text-align:center;">${r.count} month${r.count !== 1 ? 's' : ''}</td>
      <td>${fmtDate(r.last_paid)}</td>
      <td style="text-align:center;font-weight:bold;color:${statusColor};">${statusLabel}</td>
      <td style="text-align:right;font-weight:bold;">${fmtCurrency(r.total)}</td>
    </tr>`;
  }).join('');

  const courtRows = courtIncome.records.map((r, i) => `
    <tr style="background:${i%2===0?'#f0fdf4':'#fff'}">
      <td>${fmtDate(r.date)}</td>
      <td>${r.profiles?.full_name || '—'}</td>
      <td>${r.facilities?.name || '—'}</td>
      <td style="text-align:right;font-weight:bold;">${fmtCurrency(r.amount || 0)}</td>
    </tr>`).join('');

  const expenseRows = expenses.records.map((e, i) => `
    <tr style="background:${i%2===0?'#fff5f5':'#fff'}">
      <td>${fmtDate(e.expense_date)}</td>
      <td>${e.description}</td>
      <td>${e.category}</td>
      <td style="text-align:right;font-weight:bold;color:#dc2626;">${fmtCurrency(e.amount)}</td>
    </tr>`).join('');

  const colHeaders = (cols) => `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;

  const html = `<!DOCTYPE html><html><head><title>HOA Financial Statement — ${today}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:20px;color:#1a1a1a;}
    h1{text-align:center;font-size:16px;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;}
    h2{font-size:12px;color:#006837;margin:18px 0 6px;border-bottom:2px solid #006837;padding-bottom:4px;text-transform:uppercase;}
    p.sub{text-align:center;font-size:11px;color:#666;margin-bottom:18px;}
    table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:11px;}
    th{background:#006837;color:#FFF200;padding:6px 8px;text-align:left;font-weight:bold;}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0;}
    .statement-table td{padding:7px 10px;font-size:12px;border-bottom:1px solid #e2e8f0;}
    .statement-table .label{color:#334155;}
    .statement-table .amt{text-align:right;font-weight:bold;font-family:monospace,Arial;}
    .statement-table .total-row td{border-top:2px solid #006837;border-bottom:2px solid #006837;font-weight:900;background:#f0fdf4;}
    .statement-table .section-title{background:#006837;color:#FFF200;font-weight:bold;padding:7px 10px;text-transform:uppercase;letter-spacing:0.5px;}
    .summary-box{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:16px 0;}
    .box{border:2px solid;border-radius:8px;padding:12px;text-align:center;}
    .box .amt{font-size:18px;font-weight:900;}
    .box .lbl{font-size:10px;font-weight:bold;text-transform:uppercase;margin-top:3px;}
    .income{border-color:#006837;background:#f0fdf4;color:#006837;}
    .expense{border-color:#dc2626;background:#fef2f2;color:#dc2626;}
    .net{border-color:${netIncome>=0?'#0369a1':'#dc2626'};background:${netIncome>=0?'#eff6ff':'#fef2f2'};color:${netIncome>=0?'#0369a1':'#dc2626'};}
    .summary-final{border:2px solid #006837;border-radius:10px;padding:14px 18px;margin:18px 0;background:#fafafa;}
    .summary-final .row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;}
    .summary-final .row.endbal{border-top:2px solid #006837;margin-top:6px;padding-top:10px;font-size:15px;font-weight:900;color:#006837;}
    @media print{body{margin:8px;}@page{margin:10mm;}}
  </style></head><body>
  <h1>Financial Statement</h1>
  <p class="sub">Chateau Real Executive Village Homeowners Association Inc. (CREVHAI)<br>Generated: ${today}${period ? ' · Period: ' + period : ''}</p>

  <!-- ── Statement layout matching the physical ledger sheet ── -->
  <table class="statement-table">
    <tr><td colspan="2" class="section-title">Income</td></tr>
    <tr><td class="label">Monthly Dues</td><td class="amt">${fmtCurrency(duesIncome.total)}</td></tr>
    <tr><td class="label">Court Rental</td><td class="amt">${fmtCurrency(courtIncome.total)}</td></tr>
    <tr class="total-row"><td>Total Income</td><td class="amt">${fmtCurrency(totalIncome)}</td></tr>

    <tr><td colspan="2" class="section-title" style="background:#dc2626;">Expenses</td></tr>
    <tr><td class="label">Salary Wages</td><td class="amt">${fmtCurrency(salaryWages)}</td></tr>
    <tr><td class="label">Maintenance Repair</td><td class="amt">${fmtCurrency(maintenanceRepair)}</td></tr>
    <tr><td class="label">Utility (Electricity &amp; Water Bills)</td><td class="amt">${fmtCurrency(utilityBills)}</td></tr>
    <tr class="total-row" style="background:#fef2f2;border-color:#dc2626;"><td>Total Expenses</td><td class="amt" style="color:#dc2626;">${fmtCurrency(totalExpense)}</td></tr>
  </table>

  <div class="summary-final">
    <div class="row"><span>Beginning Balance</span><span>${fmtCurrency(beginBal)}</span></div>
    <div class="row"><span>Net Income (Total Income − Total Expenses)</span><span style="color:${netIncome>=0?'#166534':'#dc2626'};font-weight:bold;">${netIncome >= 0 ? '' : '-'}${fmtCurrency(Math.abs(netIncome))}</span></div>
    <div class="row endbal"><span>Ending Balance as of ${today}</span><span>${fmtCurrency(endingBal)}</span></div>
  </div>

  <div class="summary-box">
    <div class="box income"><div class="amt">${fmtCurrency(totalIncome)}</div><div class="lbl">Total Income</div></div>
    <div class="box expense"><div class="amt">${fmtCurrency(totalExpense)}</div><div class="lbl">Total Expenses</div></div>
    <div class="box net"><div class="amt">${fmtCurrency(Math.abs(netIncome))}</div><div class="lbl">${netIncome>=0?'Net Income':'Net Deficit'}</div></div>
  </div>

  <h2>Monthly Dues Collected (${consolidatedDuesPrint.length} resident${consolidatedDuesPrint.length !== 1 ? 's' : ''} · ${duesIncome.records.length} total payments)</h2>
  <table><thead>${colHeaders(['Resident','Months Paid','Last Payment','Audit Status','Total Paid'])}</thead><tbody>${duesRows || '<tr><td colspan="5" style="text-align:center;color:#999">No records</td></tr>'}</tbody>
  <tfoot><tr><td colspan="4" style="font-weight:bold;text-align:right;padding:6px 8px;background:#f8fafc;">Total Dues Collected:</td><td style="font-weight:900;text-align:right;padding:6px 8px;background:#f8fafc;color:#006837;">${fmtCurrency(duesIncome.total)}</td></tr></tfoot>
  </table>

  <h2>Court Rental Income (${courtIncome.records.length} completed reservations)</h2>
  <table><thead>${colHeaders(['Date','Resident','Facility','Amount'])}</thead><tbody>${courtRows || '<tr><td colspan="4" style="text-align:center;color:#999">No records</td></tr>'}</tbody>
  <tfoot><tr><td colspan="3" style="font-weight:bold;text-align:right;padding:6px 8px;background:#f8fafc;">Total Court Income:</td><td style="font-weight:900;text-align:right;padding:6px 8px;background:#f8fafc;color:#006837;">${fmtCurrency(courtIncome.total)}</td></tr></tfoot>
  </table>

  <h2>Itemized Expenses (${expenses.records.length} entries)</h2>
  <table><thead>${colHeaders(['Date','Description','Category','Amount'])}</thead><tbody>${expenseRows || '<tr><td colspan="4" style="text-align:center;color:#999">No records</td></tr>'}</tbody>
  <tfoot><tr><td colspan="3" style="font-weight:bold;text-align:right;padding:6px 8px;background:#f8fafc;">Total Expenses:</td><td style="font-weight:900;text-align:right;padding:6px 8px;background:#fef2f2;color:#dc2626;">${fmtCurrency(expenses.total)}</td></tr></tfoot>
  </table>
  </body></html>`;

  const w = window.open('', '_blank', 'width=1100,height=800');
  w.document.write(html);
  w.document.close();
  w.focus();
  // Trigger the print dialog but DON'T auto-close the tab afterward —
  // closing unconditionally also closes the tab if the person clicks
  // "Cancel" in the print dialog, losing the report. The person can close
  // the tab themselves once they're done (same behavior as the SOA printer).
  w.onload = () => { w.print(); };
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AuditorDashboard = () => {
  const [activeTab,    setActiveTab]    = useState('dues');
  const [loading,      setLoading]      = useState(true);
  const [showExpModal, setShowExpModal] = useState(false);
  const [search,       setSearch]       = useState('');
  const [toast,        setToast]        = useState({ show: false, message: '', type: 'success' });

  // ── Report filter — applies to the printed report only ──────────────────
  // Lets the auditor narrow the report by date range and/or resident name
  // before printing, instead of always printing every record on file.
  const [reportFrom,    setReportFrom]    = useState('');
  const [reportTo,      setReportTo]      = useState('');
  const [reportSearch,  setReportSearch]  = useState('');
  const [showReportFilter, setShowReportFilter] = useState(false);
  const [beginningBalance, setBeginningBalance] = useState('');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [duesIncome,   setDuesIncome]   = useState({ records: [], total: 0 });
  const [courtIncome,  setCourtIncome]  = useState({ records: [], total: 0 });
  const [expenses,     setExpenses]     = useState({ records: [], total: 0 });
  const [unpaid,       setUnpaid]       = useState({ records: [], total: 0 });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Monthly dues — paid
      const { data: paidDues } = await supabase
        .from('payments')
        .select('*, profiles(full_name, account_status)')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });

      const duesTotal = (paidDues || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      setDuesIncome({ records: paidDues || [], total: duesTotal });

      // 2. Court rental income — completed reservations (only court facilities)
      const { data: courtFacilities } = await supabase
        .from('facilities')
        .select('id, name')
        .ilike('name', '%court%');

      const courtIds = (courtFacilities || []).map(f => f.id);

      let courtRes = [];
      if (courtIds.length > 0) {
        const { data } = await supabase
          .from('reservations')
          .select('*, profiles!user_id(full_name), facilities(name, rate)')
          .in('facility_id', courtIds)
          .eq('status', 'Completed')
          .order('date', { ascending: false });
        courtRes = data || [];
      }

      // Parse rate from facility (e.g. "₱500" → 500)
      courtRes = courtRes.map(r => ({
        ...r,
        amount: parseFloat((r.facilities?.rate || '0').toString().replace(/[^0-9.]/g, '')) || 0,
      }));
      const courtTotal = courtRes.reduce((s, r) => s + r.amount, 0);
      setCourtIncome({ records: courtRes, total: courtTotal });

      // 3. HOA Expenses
      const { data: exp } = await supabase
        .from('hoa_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      const expTotal = (exp || []).reduce((s, e) => s + Number(e.amount || 0), 0);
      setExpenses({ records: exp || [], total: expTotal });

      // 4. Unpaid / Overdue dues
      const { data: upd } = await supabase
        .from('payments')
        .select('*, profiles(full_name)')
        .in('status', ['unpaid', 'overdue', 'pending'])
        .order('due_date', { ascending: true });

      const updTotal = (upd || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      setUnpaid({ records: upd || [], total: updTotal });

    } catch (e) {
      showToast('Failed to load financial data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Verify all payments for a resident ──────────────────────────────────
  // Sets audited=true on every paid payment for this user_id
  const [verifyingId, setVerifyingId] = useState(null);
  const handleVerifyResident = async (userId, fullName) => {
    setVerifyingId(userId);
    try {
      const ids = duesIncome.records
        .filter(p => p.user_id === userId && !p.audited)
        .map(p => p.id);
      if (!ids.length) { showToast(`${fullName} is already fully verified.`); return; }
      const { error } = await supabase
        .from('payments')
        .update({ audited: true })
        .in('id', ids);
      if (error) throw error;
      await logAudit('VERIFY_PAYMENTS', `Auditor verified ${ids.length} payment(s) for ${fullName}.`);
      showToast(`${ids.length} payment(s) verified for ${fullName}.`);
      fetchAll();
    } catch (e) {
      showToast('Failed to verify: ' + e.message, 'error');
    } finally {
      setVerifyingId(null);
    }
  };
  const getFiltered = () => {
    const term = search.toLowerCase();
    const filter = (records, fields) =>
      !term ? records : records.filter(r => fields.some(f => {
        const val = f.split('.').reduce((o, k) => o?.[k], r);
        return (val || '').toString().toLowerCase().includes(term);
      }));

    switch (activeTab) {
      case 'dues':    return filter(duesIncome.records,  ['profiles.full_name', 'reference_no']);
      case 'court':   return filter(courtIncome.records, ['profiles.full_name', 'facilities.name']);
      case 'expenses':return filter(expenses.records,    ['description', 'category']);
      case 'unpaid':  return filter(unpaid.records,      ['profiles.full_name', 'reference_no']);
      default:        return [];
    }
  };
  const filteredRecords = getFiltered();

  // ── Filter records for the printable report (date range + search) ────────
  // The report can be narrowed independently of the on-screen tab filters,
  // so the auditor can e.g. print "June only" or "just Kurt Manipis" without
  // changing what they're currently viewing on screen.
  const filterForReport = (records, dateKey, nameFields) => {
    return (records || []).filter(r => {
      if (reportFrom && r[dateKey] && r[dateKey] < reportFrom) return false;
      if (reportTo   && r[dateKey] && r[dateKey] > reportTo)   return false;
      if (reportSearch) {
        const term = reportSearch.toLowerCase();
        const matches = nameFields.some(f => {
          const val = f.split('.').reduce((o, k) => o?.[k], r);
          return (val || '').toString().toLowerCase().includes(term);
        });
        if (!matches) return false;
      }
      return true;
    });
  };

  const handlePrintReport = () => {
    const filteredDues    = filterForReport(duesIncome.records,  'paid_at',      ['profiles.full_name', 'reference_no']);
    const filteredCourt   = filterForReport(courtIncome.records, 'date',         ['profiles.full_name', 'facilities.name']);
    const filteredExpense = filterForReport(expenses.records,    'expense_date', ['description', 'category']);
    const filteredUnpaid  = filterForReport(unpaid.records,      'due_date',     ['profiles.full_name', 'reference_no']);

    const periodLabel = (reportFrom || reportTo || reportSearch)
      ? [
          reportFrom && reportTo ? `${fmtDate(reportFrom)} – ${fmtDate(reportTo)}` : reportFrom ? `From ${fmtDate(reportFrom)}` : reportTo ? `Up to ${fmtDate(reportTo)}` : null,
          reportSearch ? `Filtered: "${reportSearch}"` : null,
        ].filter(Boolean).join(' · ')
      : null;

    printFinancialReport({
      duesIncome:  { records: filteredDues,    total: filteredDues.reduce((s, p) => s + Number(p.amount || 0), 0) },
      courtIncome: { records: filteredCourt,   total: filteredCourt.reduce((s, r) => s + Number(r.amount || 0), 0) },
      expenses:    { records: filteredExpense, total: filteredExpense.reduce((s, e) => s + Number(e.amount || 0), 0) },
      unpaid:      { records: filteredUnpaid,  total: filteredUnpaid.reduce((s, p) => s + Number(p.amount || 0), 0) },
      period: periodLabel,
      beginningBalance: Number(beginningBalance) || 0,
    });
  };


  // ── Consolidated dues: one row per resident, total paid ─────────────────
  // Groups all individual paid due receipts → single row per resident
  const consolidatedDues = React.useMemo(() => {
    const map = {};
    const term = search.toLowerCase();
    (duesIncome.records || []).forEach(p => {
      const name = p.profiles?.full_name || '—';
      if (term && !name.toLowerCase().includes(term) && !(p.reference_no || '').toLowerCase().includes(term)) return;
      if (!map[p.user_id]) {
        map[p.user_id] = {
          user_id:      p.user_id,
          full_name:    name,
          total:        0,
          count:        0,
          last_paid:    p.paid_at,
          audited:      true,
          isDelinquent: p.profiles?.account_status === 'delinquent',
        };
      }
      map[p.user_id].total  += Number(p.amount || 0);
      map[p.user_id].count  += 1;
      if (!map[p.user_id].last_paid || (p.paid_at && p.paid_at > map[p.user_id].last_paid))
        map[p.user_id].last_paid = p.paid_at;
      if (!p.audited) map[p.user_id].audited = false;
    });
    return Object.values(map).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [duesIncome.records, search]);

  // ── Auto-verify clean residents ──────────────────────────────────────────
  // Any resident with NO red flags (not delinquent) gets their pending paid
  // dues auto-marked audited=true. Delinquent residents are skipped — those
  // still need a manual "Verify" click since they're a higher-risk case.
  const [autoVerifying, setAutoVerifying] = useState(false);
  useEffect(() => {
    if (!duesIncome.records?.length || autoVerifying) return;

    const idsToAutoVerify = duesIncome.records
      .filter(p => !p.audited && p.profiles?.account_status !== 'delinquent')
      .map(p => p.id);

    if (!idsToAutoVerify.length) return;

    (async () => {
      setAutoVerifying(true);
      try {
        const { error } = await supabase
          .from('payments')
          .update({ audited: true })
          .in('id', idsToAutoVerify);
        if (error) throw error;

        const namesAffected = [...new Set(
          duesIncome.records.filter(p => idsToAutoVerify.includes(p.id)).map(p => p.profiles?.full_name)
        )];
        await logAudit('AUTO_VERIFY_PAYMENTS',
          `System auto-verified ${idsToAutoVerify.length} payment(s) for ${namesAffected.length} resident(s) with no red flags: ${namesAffected.join(', ')}.`);
        fetchAll();
      } catch (e) {
        // Silent fail — manual Verify button on delinquent rows still works as fallback
      } finally {
        setAutoVerifying(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duesIncome.records]);

  // ── Consolidated unpaid: one row per resident, total balance ────────────
  const consolidatedUnpaid = React.useMemo(() => {
    const map = {};
    const term = search.toLowerCase();
    (unpaid.records || []).forEach(p => {
      const name = p.profiles?.full_name || '—';
      if (term && !name.toLowerCase().includes(term)) return;
      if (!map[p.user_id]) {
        map[p.user_id] = {
          user_id:   p.user_id,
          full_name: name,
          balance:   0,
          months:    0,
          oldest:    p.due_date,
          newest:    p.due_date,
          hasOverdue: false,
        };
      }
      map[p.user_id].balance += Number(p.amount || 0);
      map[p.user_id].months  += 1;
      if (p.due_date < map[p.user_id].oldest) map[p.user_id].oldest = p.due_date;
      if (p.due_date > map[p.user_id].newest) map[p.user_id].newest = p.due_date;
      if (p.status === 'overdue') map[p.user_id].hasOverdue = true;
    });
    return Object.values(map).sort((a, b) => b.balance - a.balance);
  }, [unpaid.records, search]);

  // ── Pagination for each tab ──────────────────────────────────────────────
  const duesPag     = usePagination(consolidatedDues,    10);
  const courtPag    = usePagination(activeTab === 'court'    ? filteredRecords : [], 10);
  const expensesPag = usePagination(activeTab === 'expenses' ? filteredRecords : [], 10);
  const unpaidPag   = usePagination(consolidatedUnpaid,  10);

  // ── Net balance ──────────────────────────────────────────────────────────
  const totalIncome  = duesIncome.total + courtIncome.total;
  const netBalance       = totalIncome - expenses.total;
  const MONTHLY_EXPENSE  = 37600;  // ₱22k security + ₱14k electricity + ₱1.2k sweepers + ₱0.4k water
  const MONTHLY_INCOME   = 280 * 150; // 280 residents × ₱150

  const tabs = [
    { key: 'dues',     label: 'Dues Collected',  icon: CreditCard,   count: duesIncome.records.length,  color: 'text-[#006837]'   },
    { key: 'court',    label: 'Court Income',     icon: Building2,    count: courtIncome.records.length, color: 'text-teal-600'    },
    { key: 'expenses', label: 'HOA Expenses',     icon: Receipt,      count: expenses.records.length,    color: 'text-red-500'     },
    { key: 'unpaid',   label: 'Unpaid Dues',      icon: AlertTriangle,count: consolidatedUnpaid.length,   color: 'text-amber-600'   },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      <Toast toast={toast} />
      {showExpModal && <AddExpenseModal onClose={() => setShowExpModal(false)} onSave={fetchAll} />}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Shield size={22} className="text-[#006837]" /> Auditor Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Financial monitoring — dues, court income, expenses, and uncollected accounts</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 relative">
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setShowReportFilter(p => !p)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer transition-all">
            <Printer size={14} /> Print Report
          </button>

          {/* ── Report filter popover ── */}
          {showReportFilter && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-slate-800">Filter Report Before Printing</p>
                <button onClick={() => setShowReportFilter(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X size={14} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Resident / Description</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={reportSearch} onChange={e => setReportSearch(e.target.value)}
                      placeholder="Search by name or description…"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006837]/20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">From</label>
                    <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#006837]/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To</label>
                    <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#006837]/20" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Beginning Balance (₱)</label>
                  <input type="number" value={beginningBalance} onChange={e => setBeginningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 text-blue-800 placeholder-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
                  <p className="text-[10px] text-slate-400 mt-1">Carried-over balance from last month's report — used to compute Ending Balance.</p>
                </div>
                {(reportFrom || reportTo || reportSearch) && (
                  <button onClick={() => { setReportFrom(''); setReportTo(''); setReportSearch(''); }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">Clear filters</button>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowReportFilter(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button onClick={() => { handlePrintReport(); setShowReportFilter(false); }}
                  className="flex-1 py-2.5 bg-[#006837] hover:bg-[#004d29] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                  <Printer size={12} /> Print
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Dues Collected"   value={fmtCurrency(duesIncome.total)}  icon={TrendingUp}   bg="bg-[#006837]/10" color="text-[#006837]"  sub={`${duesIncome.records.length} payments`}   />
        <KpiCard label="Court Income"     value={fmtCurrency(courtIncome.total)} icon={Building2}    bg="bg-teal-50"      color="text-teal-600"   sub={`${courtIncome.records.length} reservations`} />
        <KpiCard label="Total Expenses"   value={fmtCurrency(expenses.total)}    icon={TrendingDown} bg="bg-red-50"       color="text-red-500"    sub={`${expenses.records.length} entries`}      />
        <KpiCard
          label={netBalance >= 0 ? 'Net Surplus' : 'Net Deficit'}
          value={fmtCurrency(Math.abs(netBalance))}
          icon={BarChart3}
          bg={netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}
          color={netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}
          sub={`Total income: ${fmtCurrency(totalIncome)}`}
        />
      </div>

      {/* ── Uncollected alert ── */}
      {unpaid.records.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-black text-amber-800">{unpaid.records.length} accounts with unpaid/overdue dues</p>
              <p className="text-xs text-amber-600 mt-0.5">Total uncollected: <span className="font-black">{fmtCurrency(unpaid.total)}</span></p>
            </div>
          </div>
          <button onClick={() => setActiveTab('unpaid')}
            className="text-xs font-black text-amber-700 underline underline-offset-2 cursor-pointer whitespace-nowrap hover:text-amber-900">
            View All
          </button>
        </div>
      )}

      {/* ── Expense Breakdown Summary ── */}
      {activeTab === 'expenses' && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Security Guards',  keyword: 'security',   icon: '👮', color: 'bg-blue-50 border-blue-100',    text: 'text-blue-700'   },
            { label: 'Electricity',      keyword: 'electric',   icon: '⚡', color: 'bg-yellow-50 border-yellow-100', text: 'text-yellow-700' },
            { label: 'Street Sweepers',  keyword: 'sweep',      icon: '🧹', color: 'bg-slate-50 border-slate-200',  text: 'text-slate-600'  },
            { label: 'Water Bill',       keyword: 'water',      icon: '💧', color: 'bg-cyan-50 border-cyan-100',    text: 'text-cyan-700'   },
          ].map(item => {
            // Match by keyword in the description, NOT category — Electricity and
            // Water both share category "Utilities", so filtering by category alone
            // double-counts both as the same total. Description text distinguishes them.
            const catTotal = expenses.records
              .filter(e => (e.description || '').toLowerCase().includes(item.keyword))
              .reduce((s, e) => s + Number(e.amount || 0), 0);
            const pct = expenses.total > 0 ? ((catTotal / expenses.total) * 100).toFixed(1) : 0;
            return (
              <div key={item.label} className={`rounded-2xl border p-4 ${item.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{item.icon}</span>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${item.text}`}>{item.label}</p>
                </div>
                <p className={`text-xl font-black ${item.text}`}>{fmtCurrency(catTotal)}</p>
                <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-current ${item.text}`} style={{ width: pct + '%', opacity: 0.5 }} />
                </div>
                <p className={`text-[10px] mt-1 font-bold ${item.text} opacity-70`}>{pct}% of total expenses</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab navigation + search ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap
                  ${activeTab === t.key ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <t.icon size={12} />
                {t.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-[#006837]/10 text-[#006837]' : 'bg-slate-200 text-slate-500'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search + action button */}
          <div className="flex items-center gap-2 ml-auto">
            {activeTab === 'expenses' && (
              <button onClick={() => setShowExpModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#006837] hover:bg-[#004d29] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all whitespace-nowrap">
                <Plus size={13} /> Record Expense
              </button>
            )}
            <div className="relative sm:w-56 w-full">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
              <p className="text-sm text-slate-400 animate-pulse">Loading financial records…</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText size={36} className="text-slate-200 mb-2" />
              <p className="text-sm font-bold text-slate-400">No records found</p>
            </div>
          ) : (
            <>
              {/* ── Tab: Dues Collected — one row per resident ── */}
              {activeTab === 'dues' && (
                <>
                  <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                    <p className="text-[11px] text-blue-700 font-medium">
                      Payments are auto-verified for residents in good standing. Only delinquent residents require manual review.
                    </p>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>{['Resident','Months Paid','Total Paid','Last Payment','Status','Action'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {duesPag.paginated.map(r => (
                        <tr key={r.user_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 text-sm font-bold text-slate-800">{r.full_name}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{r.count} month{r.count !== 1 ? 's' : ''}</td>
                          <td className="px-5 py-4 text-sm font-black text-[#006837]">{fmtCurrency(r.total)}</td>
                          <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{fmtDate(r.last_paid)}</td>
                          <td className="px-5 py-4">
                            {r.audited
                              ? <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={10} /> Verified</span>
                              : r.isDelinquent
                                ? <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100"><AlertTriangle size={10} /> Needs Review</span>
                                : <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200"><Clock size={10} /> Pending</span>}
                          </td>
                          <td className="px-5 py-4">
                            {r.audited ? (
                              <span className="text-xs text-slate-300 font-semibold">—</span>
                            ) : r.isDelinquent ? (
                              <button
                                onClick={() => handleVerifyResident(r.user_id, r.full_name)}
                                disabled={verifyingId === r.user_id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap">
                                {verifyingId === r.user_id
                                  ? <><RefreshCw size={11} className="animate-spin" /> Verifying…</>
                                  : <><CheckCircle2 size={11} /> Verify</>}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300 font-semibold italic">Auto-verifying…</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={2} className="px-5 py-3 text-xs font-black text-slate-600 text-right">{consolidatedDues.length} resident{consolidatedDues.length !== 1 ? 's' : ''}</td>
                        <td className="px-5 py-3 text-sm font-black text-[#006837]">{fmtCurrency(duesIncome.total)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                  <PaginationBar page={duesPag.page} totalPages={duesPag.totalPages} setPage={duesPag.setPage} total={duesPag.total} perPage={10} />
                </>
              )}

              {/* ── Tab: Court Income ── */}
              {activeTab === 'court' && (
                <>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>{['Date','Resident','Facility','Time Slot','Amount'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {courtPag.paginated.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-800">{r.profiles?.full_name || '—'}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{r.facilities?.name || '—'}</td>
                          <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{r.start_time} – {r.end_time}</td>
                          <td className="px-5 py-4 text-sm font-black text-teal-600">{fmtCurrency(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={4} className="px-5 py-3 text-xs font-black text-slate-600 text-right">Total Court Income:</td>
                        <td className="px-5 py-3 text-sm font-black text-teal-600">{fmtCurrency(courtIncome.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <PaginationBar page={courtPag.page} totalPages={courtPag.totalPages} setPage={courtPag.setPage} total={courtPag.total} perPage={10} />
                </>
              )}

              {/* ── Tab: Expenses ── */}
              {activeTab === 'expenses' && (
                <>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>{['Date','Description','Category','Amount'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {expensesPag.paginated.map(e => (
                        <tr key={e.id} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">{fmtDate(e.expense_date)}</td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-800">{e.description}</td>
                          <td className="px-5 py-4">
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{e.category}</span>
                          </td>
                          <td className="px-5 py-4 text-sm font-black text-red-600">{fmtCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-red-50 border-t-2 border-red-100">
                      <tr>
                        <td colSpan={3} className="px-5 py-3 text-xs font-black text-slate-600 text-right">Total Expenses:</td>
                        <td className="px-5 py-3 text-sm font-black text-red-600">{fmtCurrency(expenses.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <PaginationBar page={expensesPag.page} totalPages={expensesPag.totalPages} setPage={expensesPag.setPage} total={expensesPag.total} perPage={10} />
                </>
              )}

              {/* ── Tab: Unpaid Dues — one row per resident ── */}
              {activeTab === 'unpaid' && (
                <>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>{['Resident','Months Unpaid','Due Period','Total Balance','Status'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {unpaidPag.paginated.map(r => (
                        <tr key={r.user_id} className={`hover:bg-amber-50/40 transition-colors ${r.hasOverdue ? 'bg-red-50/20' : ''}`}>
                          <td className="px-5 py-4 text-sm font-bold text-slate-800">{r.full_name}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{r.months} month{r.months !== 1 ? 's' : ''}</td>
                          <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                            {r.oldest === r.newest
                              ? fmtMonth(r.oldest)
                              : `${fmtMonth(r.oldest)} – ${fmtMonth(r.newest)}`}
                          </td>
                          <td className="px-5 py-4 text-sm font-black text-amber-700">{fmtCurrency(r.balance)}</td>
                          <td className="px-5 py-4">
                            {r.hasOverdue
                              ? <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Overdue
                                </span>
                              : <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Unpaid
                                </span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-amber-50 border-t-2 border-amber-100">
                      <tr>
                        <td colSpan={3} className="px-5 py-3 text-xs font-black text-slate-600 text-right">{consolidatedUnpaid.length} resident{consolidatedUnpaid.length !== 1 ? 's' : ''}</td>
                        <td className="px-5 py-3 text-sm font-black text-amber-700">{fmtCurrency(unpaid.total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                  <PaginationBar page={unpaidPag.page} totalPages={unpaidPag.totalPages} setPage={unpaidPag.setPage} total={unpaidPag.total} perPage={10} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditorDashboard;
