import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import {
  DollarSign, TrendingUp, TrendingDown, FileText, Printer,
  CheckCircle2, AlertCircle, Clock, Search, RefreshCw,
  Plus, X, Calendar, ChevronDown, Shield, CreditCard,
  Building2, Receipt, BarChart3, AlertTriangle, Zap,
  Package, PackageX, RotateCcw, Edit3, ClipboardList,
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



const CONDITIONS = ['Good', 'Fair', 'Needs Repair'];
const UNITS      = ['piece', 'set', 'panel', 'roll', 'box'];
const todayStr   = () => new Date().toISOString().split('T')[0];
// isOverdue removed — borrowing tracked via reservations status

// ─── Damage Report Modal ─────────────────────────────────────────────────────
// Created when a borrowed item is returned in Fair or Needs Repair condition.
// Logs to the `reports` table so it shows up in the maintenance reports feed.
const DamageReportModal = ({ target, onClose, onSave }) => {
  const inputCls_ = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300/30 focus:border-red-400";
  const [form, setForm] = useState({
    condition:   'Fair',
    description: '',
    estimate:    '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const itemName   = target.facilities?.name || 'Unknown item';
      const borrower   = target.profiles?.full_name || 'Unknown resident';
      const detail     = `${itemName} returned by ${borrower} — Condition: ${form.condition}. ${form.description}${form.estimate ? ` Estimated repair cost: ₱${form.estimate}.` : ''}`;
      const { error } = await supabase.from('reports').insert([{
        category:    'maintenance',
        status:      'Pending',
        description: detail,
        created_at:  new Date().toISOString(),
      }]);
      if (error) throw error;
      await logAudit('DAMAGE_REPORT', detail);
      onSave();
      onClose();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Report Damage / Poor Condition</h2>
            <p className="text-xs text-slate-400 mt-0.5">{target.facilities?.name} — borrowed by {target.profiles?.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Condition When Returned</label>
            <div className="flex gap-2">
              {['Fair', 'Needs Repair', 'Lost/Damaged'].map(c => (
                <button key={c} onClick={() => set('condition', c)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 cursor-pointer transition-all
                    ${form.condition === c
                      ? c === 'Lost/Damaged' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Damage Description</label>
            <textarea rows={3} className={inputCls_ + ' resize-none'} placeholder="Describe the damage or condition in detail…"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estimated Repair Cost (₱) — Optional</label>
            <input type="number" min="0" className={inputCls_} placeholder="0.00"
              value={form.estimate} onChange={e => set('estimate', e.target.value)} />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.description.trim()}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl cursor-pointer text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><FileText size={14} /> File Report</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add Expense Modal ────────────────────────────────────────────────────────
const AddExpenseModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ description: '', amount: '', category: 'Maintenance', expense_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const categories = ['Salaries', 'Utilities', 'Maintenance', 'Supplies', 'Events', 'Projects', 'Legal', 'Insurance', 'Other'];
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
const printFinancialReport = ({ duesIncome, courtIncome, expenses, unpaid, advancePayments, monthlyDue, period }) => {
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const isAnnual = period && (period.toLowerCase().includes('year') || period.toLowerCase().includes('annual'));
  const docTitle = isAnnual ? 'Annual Financial Report' : 'Financial Statement';

  // ── Income ────────────────────────────────────────────────────────────────
  const totalIncome = duesIncome.total + courtIncome.total;

  // ── Expenses — ALL categories, bucketed for the summary statement ─────────
  // Using ALL categories ensures the summary total matches the itemized total.
  const sumByCat = (cats) => (expenses.records || [])
    .filter(e => cats.includes(e.category))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const salaryWages       = sumByCat(['Salaries']);
  const maintenanceRepair = sumByCat(['Maintenance']);
  const utilityBills      = sumByCat(['Utilities']);
  const otherExpenses     = sumByCat(['Supplies', 'Events', 'Projects', 'Legal', 'Insurance', 'Other']);
  const totalExpense      = salaryWages + maintenanceRepair + utilityBills + otherExpenses;
  // totalExpense now equals expenses.total — no more accounting discrepancy

  // ── Summary ────────────────────────────────────────────────────────────────
  const netIncome = totalIncome - totalExpense;

  // ── Outstanding Dues ───────────────────────────────────────────────────────
  const totalOutstanding = (unpaid.records || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const unpaidByResident = {};
  (unpaid.records || []).forEach(p => {
    const name = p.profiles?.full_name || '—';
    if (!unpaidByResident[name]) unpaidByResident[name] = { name, total: 0, months: 0 };
    unpaidByResident[name].total  += Number(p.amount || 0);
    unpaidByResident[name].months += 1;
  });
  const unpaidResidents = Object.values(unpaidByResident).sort((a, b) => b.total - a.total);

  // ── Dues rows (one per resident) ──────────────────────────────────────────
  const duesMap = {};
  (duesIncome.records || []).forEach(p => {
    const name = p.profiles?.full_name || '—';
    if (!duesMap[p.user_id]) {
      duesMap[p.user_id] = { full_name: name, total: 0, count: 0, last_paid: p.paid_at };
    }
    duesMap[p.user_id].total += Number(p.amount || 0);
    duesMap[p.user_id].count += 1;
    if (!duesMap[p.user_id].last_paid || (p.paid_at && p.paid_at > duesMap[p.user_id].last_paid))
      duesMap[p.user_id].last_paid = p.paid_at;
  });
  const consolidatedDuesPrint = Object.values(duesMap).sort((a, b) => a.full_name.localeCompare(b.full_name));

  const fmtCur = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  const fmtDt  = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const TH     = (cols) => `<tr>${cols.map(col => `<th>${col}</th>`).join('')}</tr>`;

  const duesRows = consolidatedDuesPrint.map((r, i) => `
    <tr style="background:${i%2===0?'#f0fdf4':'#fff'}">
      <td>${r.full_name}</td>
      <td style="text-align:center;">${r.count} month${r.count!==1?'s':''}</td>
      <td>${fmtDt(r.last_paid)}</td>
      <td style="text-align:right;font-weight:bold;">${fmtCur(r.total)}</td>
    </tr>`).join('');

  // ── Advance payments — dues already approved by the Treasurer whose amount
  // covers more than one month at once ───────────────────────────────────────
  const monthsCoveredBy = (amount) => Math.max(1, Math.round(Number(amount || 0) / (monthlyDue || 1)));
  const advanceRecords  = (advancePayments?.records || []).slice()
    .sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0));
  const advanceRows = advanceRecords.map((p, i) => `
    <tr style="background:${i%2===0?'#faf5ff':'#fff'}">
      <td>${p.profiles?.full_name || '—'}</td>
      <td style="text-align:center;">${monthsCoveredBy(p.amount)} months</td>
      <td>${fmtDt(p.paid_at)}</td>
      <td>${p.reference_no || p.payer_reference_no || '—'}</td>
      <td style="text-align:right;font-weight:bold;">${fmtCur(p.amount)}</td>
    </tr>`).join('');

  const courtRows = (courtIncome.records || []).map((r, i) => `
    <tr style="background:${i%2===0?'#f0fdf4':'#fff'}">
      <td>${fmtDt(r.date)}</td>
      <td>${r.profiles?.full_name || '—'}</td>
      <td>${r.facilities?.name || '—'}</td>
      <td style="text-align:right;font-weight:bold;">${fmtCur(r.amount || 0)}</td>
    </tr>`).join('');

  const expenseRows = (expenses.records || []).map((e, i) => `
    <tr style="background:${i%2===0?'#fff5f5':'#fff'}">
      <td>${fmtDt(e.expense_date)}</td>
      <td>${e.description || '—'}</td>
      <td>${e.category || '—'}</td>
      <td style="text-align:right;font-weight:bold;color:#dc2626;">${fmtCur(e.amount)}</td>
    </tr>`).join('');

  const unpaidRows = unpaidResidents.map((r, i) => `
    <tr style="background:${i%2===0?'#fef2f2':'#fff'}">
      <td>${r.name}</td>
      <td style="text-align:center;">${r.months} month${r.months!==1?'s':''}</td>
      <td style="text-align:right;font-weight:bold;color:#dc2626;">${fmtCur(r.total)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head>
  <title>${docTitle} — ${today}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family:Arial,sans-serif;margin:24px;color:#1a1a1a;font-size:12px;}
    .doc-header{text-align:center;border-bottom:3px solid #006837;padding-bottom:14px;margin-bottom:16px;}
    .doc-header h1{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#006837;margin:0 0 4px;}
    .doc-header .org{font-size:12px;color:#374151;font-weight:bold;margin:2px 0;}
    .doc-header .period{font-size:11px;color:#64748b;margin:4px 0 0;}
    h2{font-size:11.5px;color:#006837;margin:20px 0 6px;border-bottom:2px solid #006837;
       padding-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;}
    table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:11px;}
    th{background:#006837;color:#FFF200;padding:6px 8px;text-align:left;font-weight:bold;font-size:10.5px;}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0;}
    tfoot td{background:#f8fafc;font-weight:bold;padding:6px 8px;}

    /* Statement of Income & Expenditure */
    .stmt td{padding:7px 10px;font-size:12px;border-bottom:1px solid #e2e8f0;}
    .stmt .lbl{color:#334155;}
    .stmt .amt{text-align:right;font-weight:bold;font-family:'Courier New',monospace;}
    .stmt .section-hdr{background:#006837;color:#FFF200;font-weight:900;
      padding:7px 10px;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;}
    .stmt .section-hdr.red{background:#dc2626;}
    .stmt .total-row td{border-top:2.5px solid #006837;border-bottom:2.5px solid #006837;
      font-weight:900;background:#f0fdf4;font-size:13px;}
    .stmt .total-row.exp td{border-color:#dc2626;background:#fef2f2;}
    .stmt .indent{padding-left:22px;}

    /* Summary boxes */
    .summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:16px 0;}
    .sbox{border-radius:10px;padding:12px 14px;text-align:center;border:2px solid;}
    .sbox .amt{font-size:17px;font-weight:900;}
    .sbox .lbl{font-size:9px;font-weight:bold;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;}
    .sbox.income{border-color:#006837;background:#f0fdf4;color:#006837;}
    .sbox.expense{border-color:#dc2626;background:#fef2f2;color:#dc2626;}
    .sbox.net-pos{border-color:#0369a1;background:#eff6ff;color:#0369a1;}
    .sbox.net-neg{border-color:#dc2626;background:#fef2f2;color:#dc2626;}

    /* Net income final line */
    .net-line{display:flex;justify-content:space-between;align-items:center;
      padding:12px 16px;border:2.5px solid ${netIncome>=0?'#006837':'#dc2626'};
      border-radius:10px;margin:16px 0;
      background:${netIncome>=0?'#f0fdf4':'#fef2f2'};}
    .net-line span:first-child{font-size:12px;font-weight:bold;color:#374151;}
    .net-line span:last-child{font-size:17px;font-weight:900;color:${netIncome>=0?'#166534':'#dc2626'};}

    /* Outstanding dues alert */
    .outstanding-banner{background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;
      padding:10px 14px;margin:14px 0;display:flex;justify-content:space-between;align-items:center;}
    .outstanding-banner .label{font-size:11px;font-weight:bold;color:#92400e;}
    .outstanding-banner .amount{font-size:16px;font-weight:900;color:#b45309;}

    /* Certification */
    .cert{margin-top:32px;padding-top:16px;border-top:2px solid #e2e8f0;}
    .cert-text{font-size:10.5px;color:#374151;line-height:1.6;margin-bottom:20px;}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:16px;}
    .sig-box{text-align:center;}
    .sig-line{border-top:1.5px solid #1a1a1a;margin-bottom:4px;margin-top:28px;}
    .sig-name{font-size:11px;font-weight:bold;}
    .sig-role{font-size:10px;color:#64748b;}

    @media print{body{margin:8px;}@page{margin:12mm;size:A4;}}
  </style></head><body>

  <!-- ── Document Header ── -->
  <div class="doc-header">
    <h1>${docTitle}</h1>
    <div class="org">Chateau Real Executive Village Homeowners Association Inc. (CREVHAI)</div>
    ${period
      ? `<div class="period">Period: <strong>${period}</strong> &nbsp;·&nbsp; Generated: ${today}</div>`
      : `<div class="period">Generated: ${today}</div>`}
  </div>

  <!-- ── Statement of Income & Expenditure ── -->
  <h2>Statement of Income &amp; Expenditure${period ? ` — ${period}` : ''}</h2>
  <table class="stmt">
    <tr><td colspan="2" class="section-hdr">Income</td></tr>
    <tr><td class="lbl indent">Monthly Dues Collected</td><td class="amt">${fmtCur(duesIncome.total)}</td></tr>
    <tr><td class="lbl indent">Court / Facility Rental</td><td class="amt">${fmtCur(courtIncome.total)}</td></tr>
    <tr class="total-row"><td class="lbl"><strong>Total Income</strong></td><td class="amt">${fmtCur(totalIncome)}</td></tr>

    <tr><td colspan="2" class="section-hdr red">Expenses</td></tr>
    <tr><td class="lbl indent">Salary Wages</td><td class="amt">${fmtCur(salaryWages)}</td></tr>
    <tr><td class="lbl indent">Maintenance &amp; Repair</td><td class="amt">${fmtCur(maintenanceRepair)}</td></tr>
    <tr><td class="lbl indent">Utility Bills (Electricity &amp; Water)</td><td class="amt">${fmtCur(utilityBills)}</td></tr>
    ${otherExpenses > 0 ? `<tr><td class="lbl indent">Other / Miscellaneous</td><td class="amt">${fmtCur(otherExpenses)}</td></tr>` : ''}
    <tr class="total-row exp"><td class="lbl"><strong>Total Expenses</strong></td><td class="amt">${fmtCur(totalExpense)}</td></tr>
  </table>

  <!-- ── Net Income Summary ── -->
  <div class="net-line">
    <span>Net ${netIncome >= 0 ? 'Income' : 'Deficit'} (Total Income − Total Expenses)</span>
    <span>${netIncome < 0 ? '−' : ''}${fmtCur(Math.abs(netIncome))}</span>
  </div>

  <div class="summary-grid">
    <div class="sbox income"><div class="amt">${fmtCur(totalIncome)}</div><div class="lbl">Total Income</div></div>
    <div class="sbox expense"><div class="amt">${fmtCur(totalExpense)}</div><div class="lbl">Total Expenses</div></div>
    <div class="sbox ${netIncome>=0?'net-pos':'net-neg'}"><div class="amt">${fmtCur(Math.abs(netIncome))}</div><div class="lbl">Net ${netIncome>=0?'Income':'Deficit'}</div></div>
  </div>

  <!-- ── Outstanding Dues Alert ── -->
  ${unpaidResidents.length > 0 ? `
  <h2>Accounts Receivable — Outstanding Dues</h2>
  <div class="outstanding-banner">
    <span class="label">⚠ ${unpaidResidents.length} resident${unpaidResidents.length!==1?'s are':' is'} behind on dues</span>
    <span class="amount">Total Outstanding: ${fmtCur(totalOutstanding)}</span>
  </div>
  <table>
    <thead>${TH(['Resident','Unpaid Months','Outstanding Balance'])}</thead>
    <tbody>${unpaidRows}</tbody>
    <tfoot><tr>
      <td colspan="2" style="text-align:right;">Total Accounts Receivable:</td>
      <td style="text-align:right;color:#b45309;font-weight:900;">${fmtCur(totalOutstanding)}</td>
    </tr></tfoot>
  </table>` : `
  <h2>Accounts Receivable — Outstanding Dues</h2>
  <p style="color:#166534;font-weight:bold;font-size:11px;padding:10px;">✓ All dues are current — no outstanding balances.</p>`}

  <!-- ── Monthly Dues Collected ── -->
  <h2>Monthly Dues Collected — ${consolidatedDuesPrint.length} Resident${consolidatedDuesPrint.length!==1?'s':''} (${duesIncome.records.length} payments)</h2>
  <table>
    <thead>${TH(['Resident','Months Paid','Last Payment','Total Paid'])}</thead>
    <tbody>${duesRows || '<tr><td colspan="4" style="text-align:center;color:#999">No records for this period</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="3" style="text-align:right;">Total Dues Collected:</td>
      <td style="text-align:right;color:#166534;font-weight:900;">${fmtCur(duesIncome.total)}</td>
    </tr></tfoot>
  </table>

  ${advanceRecords.length > 0 ? `
  <!-- ── Advance Payments — included in Dues Collected above, broken out here ── -->
  <h2>Paid in Advance — ${advanceRecords.length} Payment${advanceRecords.length!==1?'s':''} (Treasurer-approved)</h2>
  <table>
    <thead>${TH(['Resident','Months Covered','Date Paid','Reference #','Amount'])}</thead>
    <tbody>${advanceRows}</tbody>
    <tfoot><tr>
      <td colspan="4" style="text-align:right;">Total Paid in Advance:</td>
      <td style="text-align:right;color:#7e22ce;font-weight:900;">${fmtCur(advancePayments?.total)}</td>
    </tr></tfoot>
  </table>` : ''}

  <!-- ── Court / Facility Rental ── -->
  <h2>Court &amp; Facility Rental Income (${(courtIncome.records||[]).length} reservation${(courtIncome.records||[]).length!==1?'s':''})</h2>
  <table>
    <thead>${TH(['Date','Resident','Facility','Amount'])}</thead>
    <tbody>${courtRows || '<tr><td colspan="4" style="text-align:center;color:#999">No court rentals for this period</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="3" style="text-align:right;">Total Rental Income:</td>
      <td style="text-align:right;color:#166534;font-weight:900;">${fmtCur(courtIncome.total)}</td>
    </tr></tfoot>
  </table>

  <!-- ── Itemized Expenses ── -->
  <h2>Itemized Expenses (${(expenses.records||[]).length} entries)</h2>
  <table>
    <thead>${TH(['Date','Description','Category','Amount'])}</thead>
    <tbody>${expenseRows || '<tr><td colspan="4" style="text-align:center;color:#999">No expenses for this period</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="3" style="text-align:right;">Total Expenses:</td>
      <td style="text-align:right;color:#dc2626;font-weight:900;">${fmtCur(totalExpense)}</td>
    </tr></tfoot>
  </table>

  <!-- ── Certification Block ── -->
  <div class="cert">
    <p class="cert-text">
      We, the undersigned officers of the Chateau Real Executive Village Homeowners Association Inc. (CREVHAI),
      hereby certify that the foregoing financial statement is true and correct to the best of our knowledge,
      based on the records of the Association${period ? ` for the period ${period}` : ''}.
      This report was generated from the CREVHAI HOA Management System on ${today}.
    </p>
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">HOA President</div>
        <div class="sig-role">Signature over Printed Name</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">HOA Treasurer</div>
        <div class="sig-role">Signature over Printed Name</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">HOA Auditor</div>
        <div class="sig-role">Signature over Printed Name</div>
      </div>
    </div>
  </div>

  </body></html>`;

  const w = window.open('', '_blank', 'width=1100,height=850');
  w.document.write(html);
  w.document.close();
  w.focus();
  w.onload = () => { w.print(); };
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AuditorDashboard = () => {
  const [activeTab,    setActiveTab]    = useState('dues');
  const [loading,      setLoading]      = useState(true);
  const [showExpModal,     setShowExpModal]     = useState(false);
  const [showUnpaidAlert,  setShowUnpaidAlert]  = useState(true);
  const [showExpFilter,    setShowExpFilter]    = useState(false);
  const [showTabFilter,    setShowTabFilter]    = useState(false);
  const [tabPeriod,        setTabPeriod]        = useState('all');
  const [tabFrom,          setTabFrom]          = useState('');
  const [tabTo,            setTabTo]            = useState('');
  const [expPeriod,        setExpPeriod]        = useState('all');
  const [expFrom,          setExpFrom]          = useState('');
  const [expTo,            setExpTo]            = useState('');
  const [search,       setSearch]       = useState('');
  const [toast,        setToast]        = useState({ show: false, message: '', type: 'success' });

  // ── Report filter — applies to the printed report only ──────────────────
  // Lets the auditor narrow the report by date range and/or resident name
  // before printing, instead of always printing every record on file.
  const [reportFrom,    setReportFrom]    = useState('');
  const [reportTo,      setReportTo]      = useState('');
  const [reportPeriod,  setReportPeriod]  = useState('all'); // all|last7d|this_month|last_month|this_year|last_year|custom
  const [showReportFilter,  setShowReportFilter]  = useState(false);
  const [showFacilFilter,   setShowFacilFilter]   = useState(false);


  // ── Facilities & Amenities state ────────────────────────────────────────────
  const [amenityRes,     setAmenityRes]     = useState([]);
  const [facilSubTab,    setFacilSubTab]    = useState('current');
  const [showDmgModal,   setShowDmgModal]   = useState(false);
  const [dmgTarget,      setDmgTarget]      = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [duesIncome,   setDuesIncome]   = useState({ records: [], total: 0 });
  const [courtIncome,  setCourtIncome]  = useState({ records: [], total: 0 });
  const [expenses,     setExpenses]     = useState({ records: [], total: 0 });
  const [unpaid,       setUnpaid]       = useState({ records: [], total: 0 });
  const [monthlyDue,   setMonthlyDue]   = useState(150); // used to detect advance payments (amount > 1x due)

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 0. Current monthly due amount — used to detect advance payments
      // (a paid due whose amount is a multiple of this). Best-effort: falls
      // back to the existing default if hoa_settings isn't set up yet.
      try {
        const { data: settings } = await supabase.from('hoa_settings').select('monthly_due_amount').eq('id', 1).single();
        if (settings?.monthly_due_amount != null) setMonthlyDue(Number(settings.monthly_due_amount));
      } catch (_e) { /* keep default */ }

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


      // 5. Amenity item reservations (chairs, tents, etc.)
      const { data: amenity } = await supabase
        .from('reservations')
        .select('*, facilities(name, category, amount), profiles!user_id(full_name, email)')
        .order('created_at', { ascending: false });
      setAmenityRes((amenity || []).filter(r => r.facilities?.category === 'Amenity Item'));

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
  const getTabPeriodRange = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    switch (tabPeriod) {
      case 'last7d':     { const f = new Date(now); f.setDate(f.getDate()-7); return { from: ymd(f), to: ymd(now) }; }
      case 'this_month': return { from: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, to: ymd(now) };
      case 'last_month': { const f = new Date(now.getFullYear(), now.getMonth()-1, 1); const t = new Date(now.getFullYear(), now.getMonth(), 0); return { from: ymd(f), to: ymd(t) }; }
      case 'this_year':  return { from: `${now.getFullYear()}-01-01`, to: ymd(now) };
      case 'last_year':  { const ly = now.getFullYear()-1; return { from: `${ly}-01-01`, to: `${ly}-12-31` }; }
      case 'custom':     return { from: tabFrom, to: tabTo };
      default:           return { from: '', to: '' };
    }
  };


  const getTabPeriodLabel = () => {
    const now = new Date();
    switch (tabPeriod) {
      case 'last7d':     return 'Last 7 Days';
      case 'this_month': return now.toLocaleString('default', { month: 'long', year: 'numeric' });
      case 'last_month': { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return d.toLocaleString('default', { month: 'long', year: 'numeric' }); }
      case 'this_year':  return `Year ${now.getFullYear()}`;
      case 'last_year':  return `Year ${now.getFullYear()-1}`;
      case 'custom':     return tabFrom && tabTo ? `${tabFrom} – ${tabTo}` : null;
      default:           return null;
    }
  };


  const getFiltered = () => {
    const term = search.toLowerCase();
    const filter = (records, fields) =>
      !term ? records : records.filter(r => fields.some(f => {
        const val = f.split('.').reduce((o, k) => o?.[k], r);
        return (val || '').toString().toLowerCase().includes(term);
      }));

    // Apply tab date filter for dues/court/unpaid
    const { from: tFrom, to: tTo } = getTabPeriodRange();
    const dateFilter = (records, dateKey) =>
      records.filter(r => {
        const d = (r[dateKey] || '').split('T')[0];
        if (tFrom && d && d < tFrom) return false;
        if (tTo   && d && d > tTo)   return false;
        return true;
      });

    switch (activeTab) {
      case 'dues':    return dateFilter(filter(duesIncome.records,  ['profiles.full_name', 'reference_no']), 'paid_at');
      case 'court':   return dateFilter(filter(courtIncome.records, ['profiles.full_name', 'facilities.name']), 'date');
      case 'expenses':return filter(expenses.records,    ['description', 'category']); // expenses uses filteredExpensesForTab
      case 'unpaid':  return dateFilter(filter(unpaid.records,      ['profiles.full_name', 'reference_no']), 'due_date');
      default:        return [];
    }
  };
  const filteredRecords = getFiltered();

  // Expenses tab: apply both date filter (expPeriod) and text search
  const getExpPeriodLabel = () => {
    const now = new Date();
    switch (expPeriod) {
      case 'last7d':     return 'Last 7 Days';
      case 'this_month': return now.toLocaleString('default', { month: 'long', year: 'numeric' });
      case 'last_month': { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return d.toLocaleString('default', { month: 'long', year: 'numeric' }); }
      case 'this_year':  return `Year ${now.getFullYear()}`;
      case 'last_year':  return `Year ${now.getFullYear()-1}`;
      case 'custom':     return expFrom && expTo ? `${expFrom} – ${expTo}` : null;
      default:           return null;
    }
  };


  const getExpPeriodRange = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    switch (expPeriod) {
      case 'last7d':     { const f = new Date(now); f.setDate(f.getDate()-7); return { from: ymd(f), to: ymd(now) }; }
      case 'this_month': return { from: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, to: ymd(now) };
      case 'last_month': { const f = new Date(now.getFullYear(), now.getMonth()-1, 1); const t = new Date(now.getFullYear(), now.getMonth(), 0); return { from: ymd(f), to: ymd(t) }; }
      case 'this_year':  return { from: `${now.getFullYear()}-01-01`, to: ymd(now) };
      case 'last_year':  { const ly = now.getFullYear()-1; return { from: `${ly}-01-01`, to: `${ly}-12-31` }; }
      case 'custom':     return { from: expFrom, to: expTo };
      default:           return { from: '', to: '' };
    }
  };


  const filteredExpensesForTab = React.useMemo(() => {
    const { from, to } = getExpPeriodRange();
    const term = search.toLowerCase();
    return (expenses.records || []).filter(e => {
      const d = e.expense_date || '';
      if (from && d && d < from) return false;
      if (to   && d && d > to)   return false;
      if (term) {
        const hit = ['description','category'].some(f => (e[f]||'').toLowerCase().includes(term));
        if (!hit) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.records, expPeriod, expFrom, expTo, search]);

  // ── Filter records for the printable report (date range + search) ────────
  // The report can be narrowed independently of the on-screen tab filters,
  // so the auditor can e.g. print "June only" or "just Kurt Manipis" without
  // changing what they're currently viewing on screen.
  // ── Compute from/to dates based on selected period ──────────────────────────
  const getPeriodRange = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    switch (reportPeriod) {
      case 'last7d': {
        const from = new Date(now); from.setDate(from.getDate() - 7);
        return { from: ymd(from), to: ymd(now) };
      }
      case 'this_month':
        return { from: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, to: ymd(now) };
      case 'last_month': {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last  = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: ymd(first), to: ymd(last) };
      }
      case 'this_year':
        return { from: `${now.getFullYear()}-01-01`, to: ymd(now) };
      case 'last_year': {
        const ly = now.getFullYear() - 1;
        return { from: `${ly}-01-01`, to: `${ly}-12-31` };
      }
      case 'custom':
        return { from: reportFrom, to: reportTo };
      default:
        return { from: '', to: '' };
    }
  };

  const getPeriodLabel = () => {
    const now = new Date();
    switch (reportPeriod) {
      case 'last7d':     return 'Last 7 Days';
      case 'this_month': return now.toLocaleString('default', { month: 'long', year: 'numeric' });
      case 'last_month': { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return d.toLocaleString('default', { month: 'long', year: 'numeric' }); }
      case 'this_year':  return `Year ${now.getFullYear()}`;
      case 'last_year':  return `Year ${now.getFullYear() - 1}`;
      case 'custom':     return reportFrom && reportTo ? `${fmtDate(reportFrom)} – ${fmtDate(reportTo)}` : reportFrom ? `From ${fmtDate(reportFrom)}` : reportTo ? `Up to ${fmtDate(reportTo)}` : null;
      default:           return null;
    }
  };

  // ── Dues / Court / Unpaid date filter ────────────────────────────────────────
  // ── Expenses tab date filter (separate from the print report filter) ─────────
  const filterForReport = (records, dateKey) => {
    const { from, to } = getPeriodRange();
    return (records || []).filter(r => {
      if (from && r[dateKey] && r[dateKey] < from) return false;
      if (to   && r[dateKey] && r[dateKey] > to)   return false;
      return true;
    });
  };

  const handlePrintReport = () => {
    const filteredDues    = filterForReport(duesIncome.records,  'paid_at');
    const filteredCourt   = filterForReport(courtIncome.records, 'date');
    const filteredExpense = filterForReport(expenses.records,    'expense_date');
    const filteredUnpaid  = filterForReport(unpaid.records,      'due_date');
    const filteredAdvance = filteredDues.filter(p => Math.max(1, Math.round(Number(p.amount || 0) / (monthlyDue || 1))) > 1);

    printFinancialReport({
      duesIncome:  { records: filteredDues,    total: filteredDues.reduce((s, p) => s + Number(p.amount || 0), 0) },
      courtIncome: { records: filteredCourt,   total: filteredCourt.reduce((s, r) => s + Number(r.amount || 0), 0) },
      expenses:    { records: filteredExpense, total: filteredExpense.reduce((s, e) => s + Number(e.amount || 0), 0) },
      unpaid:      { records: filteredUnpaid,  total: filteredUnpaid.reduce((s, p) => s + Number(p.amount || 0), 0) },
      advancePayments: { records: filteredAdvance, total: filteredAdvance.reduce((s, p) => s + Number(p.amount || 0), 0) },
      monthlyDue,
      period: getPeriodLabel(),
    });
  };


  // A paid due whose amount is a multiple of the current monthly due (e.g.
  // ₱300 against a ₱150 due) covers more than one month, submitted/approved
  // as a single advance payment. Mirrors the same detection used on the
  // Payments page's Standing Ledger.
  const monthsCoveredBy = (amount) => Math.max(1, Math.round(Number(amount || 0) / (monthlyDue || 1)));

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
          hasAdvance:   false,
          advanceAmount: 0,
        };
      }
      map[p.user_id].total  += Number(p.amount || 0);
      map[p.user_id].count  += 1;
      if (!map[p.user_id].last_paid || (p.paid_at && p.paid_at > map[p.user_id].last_paid))
        map[p.user_id].last_paid = p.paid_at;
      if (!p.audited) map[p.user_id].audited = false;
      if (monthsCoveredBy(p.amount) > 1) {
        map[p.user_id].hasAdvance = true;
        map[p.user_id].advanceAmount += Number(p.amount || 0);
      }
    });
    return Object.values(map).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [duesIncome.records, search, monthlyDue]);

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
  const expensesPag = usePagination(activeTab === 'expenses' ? filteredExpensesForTab : [], 10);
  const unpaidPag   = usePagination(consolidatedUnpaid,  10);

  // ── Net balance ──────────────────────────────────────────────────────────
  const totalIncome  = duesIncome.total + courtIncome.total;
  const netBalance       = totalIncome - expenses.total;

  // ── Advance payments — residents who paid more than one month's due at once,
  // already approved by the Treasurer (these are drawn from duesIncome, which
  // only ever contains status === 'paid' rows) ──────────────────────────────
  const advanceResidentCount = consolidatedDues.filter(r => r.hasAdvance).length;
  const advanceTotal = consolidatedDues.reduce((s, r) => s + r.advanceAmount, 0);
  const MONTHLY_EXPENSE  = 37600;  // ₱22k security + ₱14k electricity + ₱1.2k sweepers + ₱0.4k water
  const MONTHLY_INCOME   = 280 * 150; // 280 residents × ₱150


    // ── Facilities computed values ───────────────────────────────────────────────
  const facilCurrent = React.useMemo(() =>
    amenityRes.filter(r => r.status === 'Approved'),
  [amenityRes]);
  const facilHistory = React.useMemo(() =>
    amenityRes.filter(r => r.status === 'Completed'),
  [amenityRes]);
  const facilSearch  = activeTab === 'facilities' ? search : '';
  const filtFacilCurrent = React.useMemo(() => {
    const t = facilSearch.toLowerCase();
    return !t ? facilCurrent : facilCurrent.filter(r =>
      (r.profiles?.full_name||'').toLowerCase().includes(t) ||
      (r.facilities?.name||'').toLowerCase().includes(t));
  }, [facilCurrent, facilSearch]);
  const filtFacilHistory = React.useMemo(() => {
    const t = facilSearch.toLowerCase();
    return !t ? facilHistory : facilHistory.filter(r =>
      (r.profiles?.full_name||'').toLowerCase().includes(t) ||
      (r.facilities?.name||'').toLowerCase().includes(t));
  }, [facilHistory, facilSearch]);
  const facilCurPag  = usePagination(filtFacilCurrent,  10);
  const facilHistPag = usePagination(filtFacilHistory,  10);

  const tabs = [
    { key: 'dues',     label: 'Dues Collected',  icon: CreditCard,   count: duesIncome.records.length,  color: 'text-[#006837]'   },
    { key: 'court',    label: 'Court Income',     icon: Building2,    count: courtIncome.records.length, color: 'text-teal-600'    },
    { key: 'expenses', label: 'HOA Expenses',     icon: Receipt,      count: expenses.records.length,    color: 'text-red-500'     },
    { key: 'unpaid',   label: 'Unpaid Dues',      icon: AlertTriangle,count: consolidatedUnpaid.length,   color: 'text-amber-600'   },
    { key: 'facilities', label: 'Chairs & Tents', icon: Package, count: amenityRes.length, color: 'text-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      <Toast toast={toast} />




      {/* ── Floating unpaid/overdue alert — dismissible, resets on refresh ── */}
      {unpaid.records.length > 0 && showUnpaidAlert && (
        <div className="fixed top-6 left-6 z-[250] max-w-sm w-full animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-200 overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-900">
                    {unpaid.records.length} account{unpaid.records.length !== 1 ? 's' : ''} with unpaid dues
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Total uncollected: <span className="font-black">{fmtCurrency(unpaid.total)}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowUnpaidAlert(false)}
                className="p-1 hover:bg-amber-100 rounded-lg cursor-pointer shrink-0 transition-colors mt-0.5">
                <X size={14} className="text-amber-500" />
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white">
              <p className="text-[10px] text-slate-400">Dismisses until page refresh</p>
              <button
                onClick={() => { setActiveTab('unpaid'); setShowUnpaidAlert(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap transition-colors">
                <AlertTriangle size={11} /> View Unpaid
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpModal && <AddExpenseModal onClose={() => setShowExpModal(false)} onSave={() => { fetchAll(); setExpPeriod('this_month'); }} />}
      {showDmgModal && dmgTarget && <DamageReportModal target={dmgTarget} onClose={() => { setShowDmgModal(false); setDmgTarget(null); }} onSave={fetchAll} />}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Shield size={22} className="text-[#006837]" /> Audit Reports
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Financial monitoring — dues, court income, expenses, uncollected accounts, and amenities</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 relative">
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <div className="relative">
            <button
              onClick={() => setShowReportFilter(p => !p)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer transition-all">
              <Printer size={14} /> Print Report
            </button>

            {showReportFilter && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-slate-800">Select Report Period</p>
                  <button onClick={() => setShowReportFilter(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[
                    { key: 'all',        label: 'All Records'  },
                    { key: 'last7d',     label: 'Last 7 Days'  },
                    { key: 'this_month', label: 'This Month'   },
                    { key: 'last_month', label: 'Last Month'   },
                    { key: 'this_year',  label: 'This Year'    },
                    { key: 'last_year',  label: 'Last Year'    },
                    { key: 'custom',     label: 'Custom Range' },
                  ].map(p => (
                    <button key={p.key} onClick={() => { setReportPeriod(p.key); if (p.key !== 'custom') { setReportFrom(''); setReportTo(''); } }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all text-left
                        ${reportPeriod === p.key ? 'bg-[#006837] border-[#006837] text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-[#006837]/40 hover:text-[#006837]'}
                        ${p.key === 'custom' ? 'col-span-2' : ''}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {reportPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
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
                )}
                <div className="flex gap-2">
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
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Dues Collected"   value={fmtCurrency(duesIncome.total)}  icon={TrendingUp}   bg="bg-[#006837]/10" color="text-[#006837]"  sub={`${duesIncome.records.length} payments`}   />
        <KpiCard label="Paid in Advance"  value={fmtCurrency(advanceTotal)}      icon={Zap}          bg="bg-purple-50"    color="text-purple-600" sub={`${advanceResidentCount} resident${advanceResidentCount !== 1 ? 's' : ''}`} />
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



      {/* ── Action toolbar (replaces statcards) ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-slate-400 font-semibold">
          {activeTab === 'expenses' && expPeriod !== 'all' && (
            <span className="bg-[#006837]/10 text-[#006837] px-2.5 py-1 rounded-full font-bold">
              Filtered: {getExpPeriodLabel()}
            </span>
          )}
          {activeTab !== 'expenses' && activeTab !== 'facilities' && tabPeriod !== 'all' && (
            <span className="bg-[#006837]/10 text-[#006837] px-2.5 py-1 rounded-full font-bold">
              Filtered: {getTabPeriodLabel()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">

          {/* ── Filter button — Dues, Court, Unpaid tabs ── */}
          {['dues','court','unpaid'].includes(activeTab) && (
            <div className="relative">
              <button onClick={() => setShowTabFilter(p => !p)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-xl shadow-sm cursor-pointer whitespace-nowrap">
                <ChevronDown size={14} /> Filter{tabPeriod !== 'all' ? `: ${getTabPeriodLabel()}` : ''}
              </button>
              {showTabFilter && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-[200]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-black text-slate-800">Filter by Period</p>
                    <button onClick={() => setShowTabFilter(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { key: 'all',        label: 'All Records'  },
                      { key: 'last7d',     label: 'Last 7 Days'  },
                      { key: 'this_month', label: 'This Month'   },
                      { key: 'last_month', label: 'Last Month'   },
                      { key: 'this_year',  label: 'This Year'    },
                      { key: 'last_year',  label: 'Last Year'    },
                      { key: 'custom',     label: 'Custom Range' },
                    ].map(p => (
                      <button key={p.key}
                        onClick={() => { setTabPeriod(p.key); if (p.key !== 'custom') { setTabFrom(''); setTabTo(''); } }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all text-left
                          ${tabPeriod === p.key ? 'bg-[#006837] border-[#006837] text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-[#006837]/40 hover:text-[#006837]'}
                          ${p.key === 'custom' ? 'col-span-2' : ''}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {tabPeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">From</label>
                        <input type="date" value={tabFrom} onChange={e => setTabFrom(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#006837]/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To</label>
                        <input type="date" value={tabTo} onChange={e => setTabTo(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#006837]/20" />
                      </div>
                    </div>
                  )}
                  <button onClick={() => setShowTabFilter(false)}
                    className="w-full py-2.5 bg-[#006837] hover:bg-[#004d29] text-white text-xs font-bold rounded-xl cursor-pointer">
                    Apply Filter
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Filter button — HOA Expenses tab ── */}
          {activeTab === 'expenses' && (
            <div className="relative">
              <button onClick={() => setShowExpFilter(p => !p)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-xl shadow-sm cursor-pointer whitespace-nowrap">
                <ChevronDown size={14} /> Filter{expPeriod !== 'all' ? `: ${getExpPeriodLabel()}` : ''}
              </button>
              {showExpFilter && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-[200]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-black text-slate-800">Filter Expenses</p>
                    <button onClick={() => setShowExpFilter(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { key: 'all',        label: 'All Records'  },
                      { key: 'last7d',     label: 'Last 7 Days'  },
                      { key: 'this_month', label: 'This Month'   },
                      { key: 'last_month', label: 'Last Month'   },
                      { key: 'this_year',  label: 'This Year'    },
                      { key: 'last_year',  label: 'Last Year'    },
                      { key: 'custom',     label: 'Custom Range' },
                    ].map(p => (
                      <button key={p.key}
                        onClick={() => { setExpPeriod(p.key); if (p.key !== 'custom') { setExpFrom(''); setExpTo(''); } }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all text-left
                          ${expPeriod === p.key ? 'bg-[#006837] border-[#006837] text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-[#006837]/40 hover:text-[#006837]'}
                          ${p.key === 'custom' ? 'col-span-2' : ''}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {expPeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">From</label>
                        <input type="date" value={expFrom} onChange={e => setExpFrom(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#006837]/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To</label>
                        <input type="date" value={expTo} onChange={e => setExpTo(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#006837]/20" />
                      </div>
                    </div>
                  )}
                  <button onClick={() => setShowExpFilter(false)}
                    className="w-full py-2.5 bg-[#006837] hover:bg-[#004d29] text-white text-xs font-bold rounded-xl cursor-pointer">
                    Apply Filter
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Record New Expenses — only on expenses tab ── */}
          {activeTab === 'expenses' && (
            <button onClick={() => setShowExpModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#006837] hover:bg-[#004d29] text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer transition-all whitespace-nowrap">
              <Plus size={14} /> Record New Expenses
            </button>
          )}
        </div>
      </div>

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
            
            {activeTab === 'facilities' && (
              <div className="relative">
                <button onClick={() => setShowFacilFilter(p => !p)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer whitespace-nowrap">
                  <Printer size={13} /> Print Report
                </button>

                {showFacilFilter && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-[200]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-black text-slate-800">Select Report Period</p>
                      <button onClick={() => setShowFacilFilter(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                        <X size={14} className="text-slate-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {[
                        { key: 'all',        label: 'All Records'  },
                        { key: 'last7d',     label: 'Last 7 Days'  },
                        { key: 'this_month', label: 'This Month'   },
                        { key: 'last_month', label: 'Last Month'   },
                        { key: 'this_year',  label: 'This Year'    },
                        { key: 'last_year',  label: 'Last Year'    },
                        { key: 'custom',     label: 'Custom Range' },
                      ].map(p => (
                        <button key={p.key} onClick={() => { setReportPeriod(p.key); if (p.key !== 'custom') { setReportFrom(''); setReportTo(''); } }}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all text-left
                            ${reportPeriod === p.key ? 'bg-slate-700 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'}
                            ${p.key === 'custom' ? 'col-span-2' : ''}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {reportPeriod === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">From</label>
                          <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To</label>
                          <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setShowFacilFilter(false)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                        Cancel
                      </button>
                      <button onClick={() => {
                        const { from, to } = getPeriodRange();
                        const period = getPeriodLabel();
                        const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
                        const filtered = amenityRes.filter(r => {
                          const d = r.created_at?.split('T')[0] || '';
                          if (from && d && d < from) return false;
                          if (to   && d && d > to)   return false;
                          return true;
                        });
                        const curr = filtered.filter(r => r.status === 'Approved');
                        const hist = filtered.filter(r => r.status === 'Completed');
                        const fd_ = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                        const TH_ = (cols) => `<tr>${cols.map(col => `<th style="background:#006837;color:#FFF200;padding:6px 8px;text-align:left;font-weight:bold;font-size:11px;">${col}</th>`).join('')}</tr>`;
                        const html = `<!DOCTYPE html><html><head><title>Facilities & Amenities Report</title>
                          <style>body{font-family:Arial,sans-serif;margin:20px;}
                          h1{text-align:center;font-size:15px;text-transform:uppercase;margin-bottom:3px;}
                          h2{font-size:12px;color:#006837;margin:18px 0 6px;border-bottom:2px solid #006837;padding-bottom:3px;text-transform:uppercase;}
                          p.sub{text-align:center;font-size:11px;color:#666;margin-bottom:16px;}
                          table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;}
                          td{padding:5px 8px;border-bottom:1px solid #e2e8f0;}
                          @media print{@page{margin:10mm;}}</style></head><body>
                          <h1>Facilities &amp; Amenities Report</h1>
                          <p class="sub">Chateau Real Executive Village Homeowners Association Inc. (CREVHAI)<br>Generated: ${today}${period ? ' · Period: ' + period : ''}</p>
                          <h2>Currently Borrowed (${curr.length})</h2>
                          <table><thead>${TH_(['Resident','Item','Qty','Requested On'])}</thead><tbody>
                          ${curr.map((r,i)=>`<tr style="background:${i%2===0?'#eff6ff':'#fff'}">
                            <td>${r.profiles?.full_name||'—'}</td><td>${r.facilities?.name||'—'}</td>
                            <td style="text-align:center;">${r.quantity||'—'}</td><td>${fd_(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:#999">None currently borrowed</td></tr>'}
                          </tbody></table>
                          <h2>Return History (${hist.length})</h2>
                          <table><thead>${TH_(['Resident','Item','Qty','Borrowed Date','Status'])}</thead><tbody>
                          ${hist.map((r,i)=>`<tr style="background:${i%2===0?'#f0fdf4':'#fff'}">
                            <td>${r.profiles?.full_name||'—'}</td><td>${r.facilities?.name||'—'}</td>
                            <td style="text-align:center;">${r.quantity||'—'}</td><td>${fd_(r.created_at)}</td>
                            <td style="color:#166534;font-weight:bold;">Returned</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#999">No return history yet</td></tr>'}
                          </tbody></table>
                          </body></html>`;
                        const w = window.open('','_blank','width=1100,height=800');
                        w.document.write(html); w.document.close(); w.onload = () => w.print();
                        setShowFacilFilter(false);
                      }}
                        className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                        <Printer size={12} /> Print
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
          ) : (activeTab !== 'facilities' && filteredRecords.length === 0) ? (
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
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-800">{r.full_name}</p>
                            {r.hasAdvance && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                <Zap size={9} /> Paid in Advance ({fmtCurrency(r.advanceAmount)})
                              </span>
                            )}
                          </td>
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
                        <td className="px-5 py-3 text-sm font-black text-red-600">{fmtCurrency(filteredExpensesForTab.reduce((s,e) => s + Number(e.amount||0), 0))}</td>
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

              {/* ── Tab: Facilities & Amenities ── */}
              {activeTab === 'facilities' && (
                <>
                  {/* Sub-tab bar */}
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    {[
                      { key: 'current', label: 'Currently Borrowed', count: facilCurrent.length },
                      { key: 'history', label: 'Return History',     count: facilHistory.length },
                    ].map(st => (
                      <button key={st.key} onClick={() => setFacilSubTab(st.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                          ${facilSubTab === st.key ? 'bg-[#006837] text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}>
                        {st.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black
                          ${facilSubTab === st.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {st.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* ── Currently Borrowed ── */}
                  {facilSubTab === 'current' && (
                    <>
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>{['Resident','Item','Qty','Requested On','Date','Status'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {facilCurPag.paginated.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-300 font-semibold">No items currently borrowed.</td></tr>
                          ) : facilCurPag.paginated.map(r => (
                            <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-black shrink-0">
                                    {r.profiles?.full_name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{r.profiles?.full_name || '—'}</p>
                                    <p className="text-[10px] text-slate-400">{r.profiles?.email || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm font-semibold text-slate-700">{r.facilities?.name || '—'}</td>
                              <td className="px-5 py-4 text-sm text-slate-600 text-center">{r.quantity || '—'}</td>
                              <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                              <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Borrowed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <PaginationBar page={facilCurPag.page} totalPages={facilCurPag.totalPages} setPage={facilCurPag.setPage} total={facilCurPag.total} perPage={10} />
                    </>
                  )}

                  {/* ── Return History ── */}
                  {facilSubTab === 'history' && (
                    <>
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>{['Resident','Item','Qty','Borrowed Date','Status','Report Damage'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {facilHistPag.paginated.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-300 font-semibold">No return history yet.</td></tr>
                          ) : facilHistPag.paginated.map(r => (
                            <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-black shrink-0">
                                    {r.profiles?.full_name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{r.profiles?.full_name || '—'}</p>
                                    <p className="text-[10px] text-slate-400">{r.profiles?.email || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm font-semibold text-slate-700">{r.facilities?.name || '—'}</td>
                              <td className="px-5 py-4 text-sm text-slate-600 text-center">{r.quantity || '—'}</td>
                              <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100">
                                  <CheckCircle2 size={10} /> Returned
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <button onClick={() => { setDmgTarget(r); setShowDmgModal(true); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap">
                                  <AlertTriangle size={11} /> Report Damage
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <PaginationBar page={facilHistPag.page} totalPages={facilHistPag.totalPages} setPage={facilHistPag.setPage} total={facilHistPag.total} perPage={10} />
                    </>
                  )}
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
