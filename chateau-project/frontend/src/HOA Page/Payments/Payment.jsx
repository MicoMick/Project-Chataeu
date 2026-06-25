import React, { useState, useEffect } from 'react';
import {
  Search, Plus, CreditCard, AlertCircle, CheckCircle2, DollarSign,
  Edit2, Trash2, X, Filter, Loader2, Download,
  Calendar, Users, ChevronDown, LayoutList, TableProperties, Printer, Mail,
} from 'lucide-react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import ChateauLogo from '../../assets/ChataueLogo.png';

// ─── Pagination hook ─────────────────────────────────────────────────────────
const usePagination = (items, rowsPerPage = 10) => {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
  // Reset to page 1 whenever the list changes (filter/search)
  React.useEffect(() => { setPage(1); }, [items.length]);
  const paginated = items.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  return { paginated, page, setPage, totalPages, total: items.length };
};

// ─── Pagination bar ───────────────────────────────────────────────────────────
const PaginationBar = ({ page, totalPages, setPage, total, rowsPerPage }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * rowsPerPage + 1;
  const to   = Math.min(page * rowsPerPage, total);
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
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
        {pages.map((p, i) =>
          p === '…'
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


// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHLY_DUE_AMOUNT = 150; // ₱150 standard monthly HOA due (total of line items below)

// ─── Standard monthly bill breakdown ──────────────────────────────────────────
// The ₱150 monthly due is not one flat charge — it's the sum of these
// operating costs, split per resident (~280 residents in Chateau).
// Electricity has no fixed cost (it's an actual utility bill that varies),
// so its per-resident share is computed at generation time from the total.
const BILL_LINE_ITEMS_BASE = [
  { label: 'Security Guard',  category: 'Salaries',    fixedTotal: 22000 },
  { label: 'Electricity',     category: 'Utilities',   fixedTotal: 14000 }, // variable bill — see note above
  { label: 'Street Sweepers', category: 'Maintenance', fixedTotal: 1200  },
  { label: 'Water',           category: 'Utilities',   fixedTotal: 400   },
];
const ESTIMATED_RESIDENT_COUNT = 280;

// Builds the per-resident breakdown for one month's bill.
// Each resident's ₱150 is divided proportionally across the 4 categories,
// so the SOA can show exactly what portion of their due funds what.
const buildLineItemBreakdown = () => {
  const totalBase = BILL_LINE_ITEMS_BASE.reduce((s, i) => s + i.fixedTotal, 0); // ₱37,600
  return BILL_LINE_ITEMS_BASE.map(item => ({
    label:    item.label,
    category: item.category,
    // Proportional share of ₱150 based on this item's % of total monthly cost
    amount: Math.round((item.fixedTotal / totalBase) * MONTHLY_DUE_AMOUNT * 100) / 100,
  }));
};


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

// ─── Local date helper ────────────────────────────────────────────────────────
// Returns today's date as YYYY-MM-DD in the device's local timezone.
// Using toISOString() would return UTC, which is 8 hours behind PHT and shows
// the wrong date late at night (e.g. 06/07 instead of 06/08 at 1 AM PHT).
const localToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ─── Address label helper ──────────────────────────────────────────────────────
// Block/Lot values in the DB sometimes already include the word "Blk"/"Lot"
// (e.g. "Blk 55") and sometimes don't (e.g. "55"). This strips any existing
// label before re-prefixing, so we never get "Blk Blk 55".
const stripLabel = (val, label) => {
  if (!val) return '';
  const re = new RegExp(`^${label}\\.?\\s*`, 'i');
  return String(val).replace(re, '').trim();
};

const buildFullAddress = (block, lot, street) => {
  const parts = [];
  const b = stripLabel(block, 'blk|block');
  const l = stripLabel(lot, 'lot');
  if (b) parts.push(`Blk ${b}`);
  if (l) parts.push(`Lot ${l}`);
  if (street) parts.push(street);
  return parts.join(', ') || 'N/A';
};

// ─── Statement of Account (SOA) printer ───────────────────────────────────────
// Generates a printable per-resident billing statement, similar in spirit to
// AuditorDashboard's printFinancialReport — opens a new window, builds HTML,
// then triggers the browser print dialog.
const printSOA = (resident, paidHistory = []) => {
  const fmtCurrency = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtMonth = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

  const unpaidList = (resident.unpaidList || []).slice().sort((a, b) => new Date(a.due_date||0) - new Date(b.due_date||0));
  const totalDue   = unpaidList.reduce((s, p) => s + Number(p.amount || 0), 0);
  const today      = localToday();
  const isSettled  = unpaidList.length === 0;
  // Statement date: most recent bill issue date among unpaid items (when this SOA reflects billing from)
  // Due date: the earliest unpaid due date — the most urgent deadline
  // If the account has no outstanding balance, there's no real bill/deadline to show —
  // so we display "N/A" instead of silently falling back to today's date for both.
  const latestStatementDate = isSettled
    ? null
    : unpaidList.reduce((latest, p) => (p.statement_date && p.statement_date > latest ? p.statement_date : latest), unpaidList[0]?.statement_date || today);
  const earliestDueDate = isSettled ? null : unpaidList[0]?.due_date;

  const unpaidRows = unpaidList.map((p, i) => `
    <tr style="background:${i % 2 === 0 ? '#fef2f2' : '#fff'}">
      <td>${fmtMonth(p.due_date)}</td>
      <td>Monthly HOA Dues</td>
      <td>${fmtDate(p.statement_date)}</td>
      <td>${fmtDate(p.due_date)}</td>
      <td>${p.reference_no || '—'}</td>
      <td style="text-align:center;font-weight:bold;color:${p.status === 'overdue' ? '#dc2626' : '#d97706'};text-transform:capitalize;">${p.status || 'unpaid'}</td>
      <td style="text-align:right;font-weight:bold;">${fmtCurrency(p.amount)}</td>
    </tr>`).join('');

  // ── Itemized breakdown of what the ₱150 monthly due actually covers ──────
  // Uses line_items stored on the most recent unpaid bill (or falls back to
  // a fresh breakdown if older bills don't have it stored).
  // Only shown when the resident actually has an outstanding balance —
  // showing a "× 1 Month" breakdown for a ₱0.00 settled account is misleading.
  const sampleLineItems = unpaidList.find(p => Array.isArray(p.line_items) && p.line_items.length)?.line_items
    || buildLineItemBreakdown();
  const monthsUnpaidCount = unpaidList.length;
  const breakdownRows = isSettled ? '' : sampleLineItems.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
      <td>${item.label}</td>
      <td>${item.category}</td>
      <td style="text-align:right;">${fmtCurrency(item.amount)}</td>
      <td style="text-align:right;font-weight:bold;">${fmtCurrency(item.amount * monthsUnpaidCount)}</td>
    </tr>`).join('');

  const paidRows = paidHistory.slice(0, 12).map((p, i) => `
    <tr style="background:${i % 2 === 0 ? '#f0fdf4' : '#fff'}">
      <td>${fmtMonth(p.due_date)}</td>
      <td>${fmtDate(p.paid_at)}</td>
      <td>${p.payer_reference_no || '—'}</td>
      <td>${p.reference_no || '—'}</td>
      <td style="text-align:right;font-weight:bold;color:#166534;">${fmtCurrency(p.amount)}</td>
    </tr>`).join('');

  const html = `
  <html><head><title>Statement of Account — ${resident.full_name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1e293b; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #006837; padding-bottom: 14px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; margin: 0; color: #006837; }
    .header p { font-size: 11px; color: #64748b; margin: 2px 0 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; }
    .meta-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
    .meta-val { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px; }
    .date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .date-box { border-radius: 10px; padding: 12px 16px; border: 1px solid; }
    .date-box.statement { background: #eff6ff; border-color: #bfdbfe; }
    .date-box.due { background: #fef2f2; border-color: #fecaca; }
    .date-box .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .date-box.statement .lbl { color: #1d4ed8; }
    .date-box.due .lbl { color: #b91c1c; }
    .date-box .val { font-size: 15px; font-weight: 900; margin-top: 2px; }
    .date-box.statement .val { color: #1e3a8a; }
    .date-box.due .val { color: #991b1b; }
    .balance-banner { background: linear-gradient(135deg, #fef2f2, #fff); border: 2px solid #fecaca; border-radius: 14px; padding: 18px 22px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .balance-banner .amt { font-size: 28px; font-weight: 900; color: #dc2626; }
    .balance-banner .lbl { font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: .05em; }
    h2 { font-size: 13px; color: #006837; margin: 22px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #006837; color: #fff; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
    td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; }
    .footer-note { margin-top: 28px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print { body { padding: 16px; } }
  </style></head>
  <body>
    <div class="header">
      <div>
        <h1>HOA Statement of Account</h1>
        <p>Chateau Real Executive Village Homeowners Association Inc. (CREVHAI) · Generated ${fmtDate(today)}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-label">Resident</div>
        <div class="meta-val">${resident.full_name}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Address</div>
        <div class="meta-val">${resident.fullAddress || resident.street || 'N/A'}</div>
      </div>
    </div>

    <div class="date-grid">
      <div class="date-box statement" style="${isSettled ? 'background:#f0fdf4;border-color:#bbf7d0;' : ''}">
        <div class="lbl" style="${isSettled ? 'color:#15803d;' : ''}">Statement Date — Bill Issued</div>
        <div class="val" style="${isSettled ? 'color:#166534;font-size:13px;' : ''}">${isSettled ? 'N/A — Fully Settled' : fmtDate(latestStatementDate)}</div>
      </div>
      <div class="date-box due" style="${isSettled ? 'background:#f0fdf4;border-color:#bbf7d0;' : ''}">
        <div class="lbl" style="${isSettled ? 'color:#15803d;' : ''}">Due Date — Payment Deadline</div>
        <div class="val" style="${isSettled ? 'color:#166534;font-size:13px;' : ''}">${isSettled ? 'No Pending Dues' : fmtDate(earliestDueDate)}</div>
      </div>
    </div>

    <div class="balance-banner">
      <div>
        <div class="lbl">Total Outstanding Balance</div>
        <div class="amt">${fmtCurrency(totalDue)}</div>
      </div>
      <div style="text-align:right">
        <div class="lbl">Months Unpaid</div>
        <div style="font-size:22px;font-weight:900;color:#b91c1c;">${unpaidList.length}</div>
      </div>
    </div>

    <h2>Monthly Due Breakdown — What Your ₱${MONTHLY_DUE_AMOUNT}/month Covers</h2>
    ${isSettled ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;font-size:12px;color:#166534;">
      No outstanding months to bill right now. Next month's ₱${MONTHLY_DUE_AMOUNT} due will be itemized here once issued.
    </div>` : `
    <table>
      <thead><tr><th>Item</th><th>Category</th><th style="text-align:right;">Per Month</th><th style="text-align:right;">× ${monthsUnpaidCount} Month${monthsUnpaidCount !== 1 ? 's' : ''}</th></tr></thead>
      <tbody>${breakdownRows}</tbody>
      <tfoot><tr><td colspan="3" style="text-align:right;font-weight:bold;background:#f8fafc;">Total:</td><td style="text-align:right;font-weight:900;background:#f8fafc;color:#006837;">${fmtCurrency(totalDue)}</td></tr></tfoot>
    </table>`}

    <h2>Outstanding Charges</h2>
    <table>
      <thead><tr><th>Period</th><th>Description</th><th>Statement Date</th><th>Due Date</th><th>Reference #</th><th style="text-align:center;">Status</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>${unpaidRows || `<tr><td colspan="7" style="text-align:center;color:#16a34a;font-weight:bold;padding:14px;">No outstanding balance — account is fully settled.</td></tr>`}</tbody>
      ${unpaidRows ? `<tfoot><tr><td colspan="6" style="text-align:right;font-weight:bold;background:#fef2f2;">Total Amount Due:</td><td style="text-align:right;font-weight:900;background:#fef2f2;color:#dc2626;">${fmtCurrency(totalDue)}</td></tr></tfoot>` : ''}
    </table>

    ${paidHistory.length ? `
    <h2>Recent Payment History</h2>
    <table>
      <thead><tr><th>Period</th><th>Date Paid</th><th>Your Payment Ref #</th><th>HOA Ref #</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>${paidRows}</tbody>
    </table>` : ''}

    <p class="footer-note">
      This statement reflects account balance as of ${fmtDate(today)}. The statement date shows when this bill was issued;
      the due date is your payment deadline. Please settle outstanding dues at the HOA office or through your designated treasurer
      on or before the due date to avoid late status. For questions regarding this statement, please contact the HOA Treasurer's office.
    </p>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) { alert('Please allow popups to print the Statement of Account.'); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
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
  const [streetFilter,    setStreetFilter]    = useState('All');
  const [standingFilter,  setStandingFilter]  = useState('All');

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
      // Accumulated balance — sum of ALL unpaid dues (grace period adds up)
      unpaidBalance: rPayments
        .filter(p => ['unpaid','pending','overdue'].includes((p.status||'').toLowerCase()))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    };
  });

  // Unique streets for filter dropdown
  const streets = ['All', ...new Set(rows.map(r => r.street).filter(s => s && s !== '—').sort())];

  const filtered = rows.filter(r =>
    (streetFilter === 'All' || r.street === streetFilter) &&
    (standingFilter === 'All' || r.standing === standingFilter) &&
    (!search || r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.block.toLowerCase().includes(search.toLowerCase()) ||
    r.lot.toLowerCase().includes(search.toLowerCase()))
  );
  const { paginated: paginatedPayment, page: payPage, setPage: setPayPage, totalPages: payTotalPages, total: filteredTotal } = usePagination(filtered, 5);

  const printLedger = () => {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const rowsToUse = filtered.length > 0 ? filtered : rows;

    // ── Group residents by street — preserving the order they appear ──────────
    const streetGroups = [];
    const seen = {};
    rowsToUse.forEach(r => {
      const st = r.street || 'Unknown Street';
      if (!seen[st]) { seen[st] = true; streetGroups.push({ street: st, residents: [] }); }
      streetGroups.find(g => g.street === st).residents.push(r);
    });
    // Sort groups alphabetically by street name
    streetGroups.sort((a, b) => a.street.localeCompare(b.street));

    // ── Build table rows — street header + resident rows per group ────────────
    let globalIdx = 1;
    const tableRows = streetGroups.map(group => {
      const streetHeader = `
        <tr>
          <td colspan="8"
            style="background:#FFF200;color:#006837;font-weight:bold;font-size:12px;
                   padding:6px 10px;border:1px solid #006837;letter-spacing:0.5px;
                   text-transform:uppercase;">
            ${group.street}
          </td>
        </tr>`;
      const residentRows = group.residents.map(r => {
        const idx = globalIdx++;
        const isEven = idx % 2 === 0;
        const standingColor =
          r.standing === 'Good'    ? '#166534' :
          r.standing === 'Overdue' ? '#dc2626' :
          r.standing === 'Pending' ? '#92400e' : '#64748b';
        return `
        <tr style="background:${isEven ? '#f0fdf4' : '#ffffff'};">
          <td style="padding:5px 8px;font-size:11px;text-align:center;border:1px solid #e2e8f0;">${idx}</td>
          <td style="padding:5px 8px;font-size:11px;border:1px solid #e2e8f0;">${r.block}</td>
          <td style="padding:5px 8px;font-size:11px;border:1px solid #e2e8f0;">${r.lot}</td>
          <td style="padding:5px 8px;font-size:11px;border:1px solid #e2e8f0;">${r.full_name.split(' ').slice(-1)[0]}</td>
          <td style="padding:5px 8px;font-size:11px;border:1px solid #e2e8f0;">${r.full_name.split(' ').slice(0,-1).join(' ')}</td>
          <td style="padding:5px 8px;font-size:11px;text-transform:capitalize;border:1px solid #e2e8f0;">${r.resident_type}</td>
          <td style="padding:5px 8px;font-size:11px;font-weight:bold;color:${standingColor};border:1px solid #e2e8f0;">${r.standing}</td>
          <td style="padding:5px 8px;font-size:11px;border:1px solid #e2e8f0;">${r.lastPaidDate}</td>
          <td style="padding:5px 8px;font-size:11px;font-weight:bold;color:${r.unpaidBalance > 0 ? '#dc2626' : '#166534'};text-align:right;border:1px solid #e2e8f0;">${r.unpaidBalance > 0 ? '₱' + r.unpaidBalance.toLocaleString('en-PH') : '—'}</td>
        </tr>`;
      }).join('');
      return streetHeader + residentRows;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Monthly Dues Ledger — ${today}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h2 { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 4px; }
      p.subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #006837; }
      th { background: #006837; color: #FFF200; padding: 7px 8px; font-size: 11px; font-weight: bold; border: 1px solid #004d29; text-align: left; }
      @media print { body { margin: 8px; } @page { size: landscape; margin: 10mm; } }
    </style>
    </head><body>
    <h2>Updated Monthly Dues Payment as of ${today}</h2>
    <p class="subtitle">Chateau Real Executive Village Homeowners Association Inc. (CREVHAI) — Standing Ledger</p>
    <table>
      <thead>
        <tr>
          <th style="width:30px;">#</th>
          <th>Block</th>
          <th>Lot</th>
          <th>Last Name</th>
          <th>First Name</th>
          <th>Status</th>
          <th>Standing</th>
          <th>Date of Last Payment</th>
          <th>Balance Owed</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    </body></html>`;

    const w = window.open('', '_blank', 'width=1100,height=750');
    w.document.write(html);
    w.document.close();
    w.focus();
    // Trigger the print dialog but DON'T auto-close the tab afterward —
    // closing unconditionally also closes the tab if the person clicks
    // "Cancel" in the print dialog, losing the ledger. The person can close
    // the tab themselves once they're done (same behavior as the SOA printer).
    w.onload = () => { w.print(); };
  };

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
        <div className="flex items-start justify-between gap-4 mb-3">
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
          <button
            onClick={printLedger}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all shrink-0"
          >
            <Printer size={13} /> Print Ledger
          </button>
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search resident, block, lot…"
              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
          </div>
          <select
            value={streetFilter}
            onChange={e => setStreetFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer shrink-0"
          >
            {streets.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Streets' : s}</option>
            ))}
          </select>
          <select
            value={standingFilter}
            onChange={e => setStandingFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer shrink-0"
          >
            <option value="All">All Standings</option>
            <option value="Good">Good</option>
            <option value="Overdue">Overdue</option>
            <option value="Pending">Pending</option>
            <option value="No Record">No Record</option>
          </select>
        </div>
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
            ) : paginatedPayment.map(r => (
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
                  {r.unpaidBalance > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-black text-red-600">
                        ₱{r.unpaidBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-red-400 font-semibold">
                        {r.unpaidCount} month{r.unpaidCount !== 1 ? 's' : ''} overdue
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-600 font-bold">Settled</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <>
          <PaginationBar page={payPage} totalPages={payTotalPages} setPage={setPayPage} total={filtered.length} rowsPerPage={10} />
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">{filtered.length} of {rows.length} residents</p>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Payment Component ───────────────────────────────────────────────────
const Payment = () => {
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('All');
  const [residentFilter,   setResidentFilter]   = useState('All');
  const [activeView,       setActiveView]       = useState('transactions'); // 'transactions' | 'paid' | 'standing'

  // Paid tab filters
  const [paidSearchTerm,     setPaidSearchTerm]     = useState('');
  const [paidResidentFilter, setPaidResidentFilter] = useState('All');

  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [selectedPayment,       setSelectedPayment]       = useState(null);
  const [isConfirmVoidOpen,     setIsConfirmVoidOpen]     = useState(false);
  const [isUnpaidBreakdownOpen, setIsUnpaidBreakdownOpen] = useState(false);
  const [breakdownPayments,     setBreakdownPayments]     = useState([]);
  const [residentsList,     setResidentsList]     = useState([]);

  const [transaction,          setTransaction]          = useState({ status: null, message: '' });
  const [editFormData,         setEditFormData]         = useState({ amount: '', status: '', due_date: '', reference_no: '', paid_at: '', payer_reference_no: '' });
  const [payments,             setPayments]             = useState([]);
  const [loading,              setLoading]              = useState(true);

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  // ── Bulk-send SOA emails to every resident with an outstanding balance ──
  // Calls the 'send-soa-emails' Supabase Edge Function (see
  // supabase/functions/send-soa-emails/index.ts). Requires RESEND_API_KEY
  // to be set as an Edge Function secret before this will actually deliver mail.
  const [sendingSOA,        setSendingSOA]        = useState(false);
  const [showSendConfirm,   setShowSendConfirm]   = useState(false);
  const [sendSOAResult,     setSendSOAResult]     = useState(null);

  const handleSendAllSOA = async () => {
    setSendingSOA(true);
    setSendSOAResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-soa-emails');
      if (error) throw error;
      setSendSOAResult({ type: 'success', ...data });
      await logAudit('BULK_SEND_SOA', `Sent ${data.sent || 0} SOA email(s), ${data.failed || 0} failed.`);
    } catch (e) {
      setSendSOAResult({ type: 'error', error: e.message });
    } finally {
      setSendingSOA(false);
      setShowSendConfirm(false);
    }
  };

  useEffect(() => { fetchPayments(); fetchResidentsList(); }, []);

  // ── Extracted: generate dues for current month ──────────────────────────────
  // Called automatically on the 1st, OR manually via the demo test button.
  // force=true skips the "already generated this month" check.
  //
  // statement_date = the day the bill is issued (today, when this runs)
  // due_date       = the deadline to pay — last day of the SAME month
  // This keeps "when was I billed" clearly separate from "when must I pay".
  const runGenerateDues = async (force = false) => {
    const today          = new Date();
    today.setHours(0, 0, 0, 0);
    const month          = today.getMonth();
    const year           = today.getFullYear();
    const statementDate  = localToday();                                   // today — when the bill is issued
    const monthEnd        = new Date(year, month + 1, 0).toISOString().split('T')[0]; // due date — end of month
    const monthStart      = new Date(year, month,     1).toISOString().split('T')[0];

    if (!force) {
      const { data: existing } = await supabase
        .from('payments').select('id')
        .gte('due_date', monthStart).lte('due_date', monthEnd).limit(1);
      if (existing?.length) return { skipped: true, reason: 'Already generated for this month.' };
    }

    const { data: residents } = await supabase
      .from('profiles').select('id, full_name')
      .eq('account_status', 'active').order('full_name');
    if (!residents?.length) return { skipped: true, reason: 'No active residents found.' };

    const lineItems = buildLineItemBreakdown();

    const rows = residents.map(r => ({
      user_id:        r.id,
      amount:         MONTHLY_DUE_AMOUNT,
      statement_date: statementDate,
      due_date:       monthEnd,
      status:         'unpaid',
      reference_no:   generateRefNo(month, year),
      line_items:     lineItems,
    }));

    const { error } = await supabase.from('payments').insert(rows);
    if (error) return { success: false, error: error.message };

    await logAudit('AUTO_MONTHLY_DUE',
      `Generated ₱${MONTHLY_DUE_AMOUNT} monthly dues for ${rows.length} residents — ${MONTHS[month]} ${year}. Statement: ${statementDate}, Due: ${monthEnd}.`);
    fetchPayments();
    return { success: true, count: rows.length, month: MONTHS[month], year };
  };

  // ── Balance-based delinquency check ──────────────────────────────────────
  // Flags any active resident whose total unpaid balance is ≥ ₱450 (3 months).
  // The graceDays param is kept for backward-compat but no longer used.
  const runDelinquencyCheck = async (graceDays = null) => {
    const DELINQUENT_THRESHOLD = MONTHLY_DUE_AMOUNT * 3; // ₱450

    // Fetch all unpaid payments grouped by resident
    const { data: unpaidPayments, error: fetchErr } = await supabase
      .from('payments')
      .select('user_id, amount')
      .in('status', ['unpaid', 'overdue', 'pending']);

    if (fetchErr || !unpaidPayments?.length) return { success: true, count: 0 };

    // Sum balance per resident — flag those >= threshold
    const balanceMap = {};
    unpaidPayments.forEach(p => {
      balanceMap[p.user_id] = (balanceMap[p.user_id] || 0) + Number(p.amount || 0);
    });

    const eligibleIds = Object.entries(balanceMap)
      .filter(([, bal]) => bal >= DELINQUENT_THRESHOLD)
      .map(([id]) => id);

    if (!eligibleIds.length) return { success: true, count: 0 };

    // Only flag those who are currently active (don't re-flag already delinquent)
    const { data: activeResidents } = await supabase
      .from('profiles').select('id, full_name')
      .in('id', eligibleIds).eq('account_status', 'active');

    if (!activeResidents?.length) return { success: true, count: 0 };

    const idsToFlag = activeResidents.map(r => r.id);
    const { error } = await supabase.from('profiles')
      .update({ account_status: 'delinquent' }).in('id', idsToFlag);

    if (error) return { success: false, error: error.message };

    await logAudit('AUTO_DELINQUENT',
      `Marked ${idsToFlag.length} resident(s) as delinquent — unpaid balance ≥ ₱${DELINQUENT_THRESHOLD}. Residents: ${activeResidents.map(r => r.full_name).join(', ')}`);
    return { success: true, count: idsToFlag.length, names: activeResidents.map(r => r.full_name) };
  };

  // NOTE: Monthly dues generation + delinquency checks used to auto-run here
  // on every Payments page load. That's now handled server-side by the
  // `generate-monthly-dues` Edge Function, scheduled via Supabase Cron to run
  // every midnight (PHT) — independent of whether anyone opens this page.
  // runGenerateDues() and runDelinquencyCheck() below are kept for the manual
  // "force generate" test button and other UI actions that still call them directly.

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
    setEditFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-fill paid_at with today when status is switched to 'paid'
      // Clear it if status is switched away from 'paid'
      ...(name === 'status' && value === 'paid' && !prev.paid_at
        ? { paid_at: localToday() }
        : name === 'status' && value !== 'paid'
        ? { paid_at: '' }
        : {}),
    }));
  };

  const submitEditTransaction = async () => {
    if (!selectedPayment) return;
    if (editFormData.status === 'paid' && !editFormData.payer_reference_no?.trim()) {
      setTransaction({ status: 'error', message: 'Please enter the resident\'s payment reference number (GCash/bank transfer #) before marking as paid.' });
      return;
    }
    setTransaction({ status: 'loading', message: 'Updating transaction…' });
    try {
      const payload = {
        amount: editFormData.amount ? Number(editFormData.amount) : null,
        status: editFormData.status, due_date: editFormData.due_date || null, reference_no: editFormData.reference_no || null,
        paid_at: editFormData.status === 'paid' ? (editFormData.paid_at ? new Date(editFormData.paid_at).toISOString() : new Date().toISOString()) : null,
        payer_reference_no: editFormData.status === 'paid' ? (editFormData.payer_reference_no?.trim() || null) : null,
      };

      const { error } = await supabase.from('payments').update(payload).eq('id', selectedPayment.id);
      if (error) throw error;
      await logAudit('EDIT_PAYMENT', `Updated Ref: ${payload.reference_no || selectedPayment.reference_no} → ${payload.status}.`);

      // ── Auto-reactivate delinquent resident if all dues are now paid ────
      // Only runs when the payment being updated is marked as 'paid'
      if (payload.status === 'paid' && selectedPayment.user_id) {
        // Check if the resident is currently delinquent
        const { data: residentData } = await supabase
          .from('profiles')
          .select('id, full_name, account_status')
          .eq('id', selectedPayment.user_id)
          .single();

        if (residentData?.account_status === 'delinquent') {
          // Check if this resident still has any remaining unpaid dues
          const { data: remainingUnpaid } = await supabase
            .from('payments')
            .select('id')
            .eq('user_id', selectedPayment.user_id)
            .in('status', ['unpaid', 'overdue', 'pending'])
            .neq('id', selectedPayment.id) // exclude the one we just paid
            .limit(1);

          // No more unpaid dues — reactivate the account
          if (!remainingUnpaid?.length) {
            const { error: reactivateErr } = await supabase
              .from('profiles')
              .update({ account_status: 'active' })
              .eq('id', selectedPayment.user_id);

            if (!reactivateErr) {
              await logAudit(
                'AUTO_REACTIVATE',
                `${residentData.full_name} auto-reactivated — all dues are now paid.`
              );
              setIsEditTransactionOpen(false);
              fetchPayments();
              setTransaction({
                status: 'success',
                message: `Payment recorded. ${residentData.full_name}'s account has been automatically reactivated — all dues are now settled.`,
              });
              return;
            }
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────

      setIsEditTransactionOpen(false);
      fetchPayments();
      setTransaction({ status: 'success', message: 'Transaction updated successfully.' });
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

  // ── Mark ALL unpaid dues for a resident as paid in one click ────────────────
  const [markAllPaidDate, setMarkAllPaidDate] = useState(localToday());
  const [payerReferenceNo, setPayerReferenceNo] = useState('');

  const submitMarkAllPaid = async () => {
    if (!breakdownPayments.length) return;
    if (!payerReferenceNo.trim()) {
      setTransaction({ status: 'error', message: 'Please enter the resident\'s payment reference number (GCash/bank transfer #) before marking as paid.' });
      return;
    }
    const paidAt = markAllPaidDate
      ? new Date(markAllPaidDate).toISOString()
      : new Date().toISOString();

    setIsUnpaidBreakdownOpen(false);
    setTransaction({ status: 'loading', message: `Marking ${breakdownPayments.length} payment(s) as paid…` });

    try {
      const ids = breakdownPayments.map(p => p.id);
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_at: paidAt, payer_reference_no: payerReferenceNo.trim() })
        .in('id', ids);
      if (error) throw error;

      const residentName = (Array.isArray(breakdownPayments[0]?.profiles)
        ? breakdownPayments[0]?.profiles[0]?.full_name
        : breakdownPayments[0]?.profiles?.full_name) || 'Resident';

      await logAudit(
        'BULK_MARK_PAID',
        `Marked ${ids.length} due(s) as paid for ${residentName}. IDs: ${ids.join(', ')}.`
      );

      // ── Auto-reactivate if resident was delinquent ──────────────────────
      const userId = breakdownPayments[0]?.user_id;
      if (userId) {
        const { data: residentData } = await supabase
          .from('profiles').select('id, full_name, account_status')
          .eq('id', userId).single();

        if (residentData?.account_status === 'delinquent') {
          // Re-query remaining unpaid AFTER the update so the count is accurate
          const { data: stillUnpaid } = await supabase
            .from('payments').select('id')
            .eq('user_id', userId)
            .in('status', ['unpaid', 'overdue', 'pending'])
            .limit(1);

          if (!stillUnpaid?.length) {
            await supabase.from('profiles')
              .update({ account_status: 'active' }).eq('id', userId);
            await logAudit('AUTO_REACTIVATE',
              `${residentData.full_name} auto-reactivated — all dues are now paid (bulk).`);
            fetchPayments();
            fetchResidentsList();
            setTransaction({
              status: 'success',
              message: `All ${ids.length} due(s) marked as paid. ${residentData.full_name}'s account has been automatically reactivated.`,
            });
            return;
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────

      fetchPayments();
      setTransaction({
        status: 'success',
        message: `${breakdownPayments.length} due(s) marked as paid successfully.`,
      });
    } catch (e) {
      setTransaction({ status: 'error', message: 'Failed: ' + e.message });
    }
  };

  // ── Resident-based table rows — one row per resident, always ─────────────────
  // Amount = unpaid balance (grows as months are generated, resets to ₱0 when paid).
  // Paid receipts are NOT shown as separate rows — the table is resident-centric.
  const residentRows = residentsList.map(r => {
    const rPayments = payments.filter(p => p.user_id === r.id);
    const unpaidList = rPayments.filter(p =>
      ['unpaid','overdue','pending'].includes((p.status || '').toLowerCase())
    ).sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));

    const balance = unpaidList.reduce((s, p) => s + Number(p.amount || 0), 0);
    const months  = unpaidList.length;
    const oldest  = unpaidList[0]?.due_date || null;
    const newest  = unpaidList[unpaidList.length - 1]?.due_date || null;

    // Determine standing badge
    const hasAnyPayment = rPayments.length > 0;
    let standing = 'No Record';
    if (hasAnyPayment) {
      standing = months > 0 ? 'Unpaid' : 'Settled';
    }

    return {
      _residentRow: true,
      user_id:      r.id,
      full_name:    r.full_name || '—',
      street:       r.street || 'N/A',
      fullAddress:  buildFullAddress(r.block, r.lot, r.street),
      block:        r.block || '',
      lot:          r.lot   || '',
      balance,
      months,
      oldest,
      newest,
      standing,
      unpaidList,
    };
  });

  // Apply search + resident filter to resident rows
  const consolidatedPayments = residentRows.filter(r => {
    const nameMatch = r.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const residentMatch = residentFilter === 'All' || r.user_id === residentFilter;
    const statusMatch = statusFilter === 'All'
      || (statusFilter === 'Paid'    && r.standing === 'Settled')
      || (statusFilter === 'Unpaid'  && r.months > 0)
      || (statusFilter === 'Overdue' && r.months > 0)
      || (statusFilter === 'Pending' && r.months > 0);
    return nameMatch && residentMatch && statusMatch;
  });

  const { paginated: paginatedPayments, page: transPage, setPage: setTransPage, totalPages: transTotalPages } = usePagination(consolidatedPayments, 5);

  // ── Paid tab rows — one row per resident with at least one paid due ──────────
  const paidRows = residentsList.map(r => {
    const rPayments  = payments.filter(p => p.user_id === r.id);
    const paidList   = rPayments.filter(p => (p.status || '').toLowerCase() === 'paid')
      .sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0));
    const totalPaid  = paidList.reduce((s, p) => s + Number(p.amount || 0), 0);
    const lastPaid   = paidList[0]?.paid_at || null;
    const stillUnpaid = rPayments.filter(p =>
      ['unpaid','overdue','pending'].includes((p.status || '').toLowerCase())
    ).length;
    return {
      user_id:    r.id,
      full_name:  r.full_name || '—',
      street:     r.street || 'N/A',
      fullAddress: buildFullAddress(r.block, r.lot, r.street),
      totalPaid,
      paidMonths: paidList.length,
      lastPaid,
      stillUnpaid,
    };
  }).filter(r => r.paidMonths > 0);

  const filteredPaid = paidRows.filter(r => {
    const nameMatch     = r.full_name.toLowerCase().includes(paidSearchTerm.toLowerCase());
    const residentMatch = paidResidentFilter === 'All' || r.user_id === paidResidentFilter;
    return nameMatch && residentMatch;
  });

  const { paginated: paginatedPaid, page: paidPage, setPage: setPaidPage, totalPages: paidTotalPages } =
    usePagination(filteredPaid, 5);

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

      {/* ── Unpaid Breakdown / Mark All Paid Modal ── */}
      {isUnpaidBreakdownOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsUnpaidBreakdownOpen(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-10">
            <div className="p-7">

              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Mark as Paid</h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {(() => {
                      const p0 = breakdownPayments[0];
                      if (!p0) return 'Resident';
                      if (p0.profiles) {
                        const pr = Array.isArray(p0.profiles) ? p0.profiles[0] : p0.profiles;
                        return pr?.full_name || 'Resident';
                      }
                      return residentsList.find(r => r.id === p0.user_id)?.full_name || 'Resident';
                    })()}
                  </p>
                </div>
                <button onClick={() => setIsUnpaidBreakdownOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer"><X size={18} /></button>
              </div>

              {/* Summary banner */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-0.5">Total Unpaid Balance</p>
                  <p className="text-2xl font-black text-red-600">
                    ₱{breakdownPayments.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-0.5">Months Unpaid</p>
                  <p className="text-2xl font-black text-red-600">{breakdownPayments.length}</p>
                </div>
              </div>

              {/* Individual month list (read-only reference) */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 mb-5">
                {breakdownPayments.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <div>
                        <span className="text-sm font-semibold text-slate-700">
                          {p.due_date ? new Date(p.due_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Billed {p.statement_date ? new Date(p.statement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          {' · '}Due {p.due_date ? new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800">₱{Number(p.amount).toLocaleString()}</span>
                      <button
                        onClick={() => {
                          setSelectedPayment(p);
                          setEditFormData({ amount: p.amount || '', status: p.status || 'unpaid', due_date: p.due_date?.split('T')[0] || '', reference_no: p.reference_no || '', paid_at: p.paid_at?.split('T')[0] || '', payer_reference_no: p.payer_reference_no || '' });
                          setIsUnpaidBreakdownOpen(false);
                          setIsEditTransactionOpen(true);
                        }}
                        className="text-slate-300 hover:text-[#006837] p-1 hover:bg-[#006837]/10 rounded-lg transition-all cursor-pointer" title="Edit this month only">
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPayment(p);
                          setIsUnpaidBreakdownOpen(false);
                          setIsConfirmVoidOpen(true);
                        }}
                        className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Void this month only">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payer's payment reference number — mandatory proof of payment */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Resident's Payment Ref # <span className="text-red-500">*required</span>
                </label>
                <input
                  type="text"
                  value={payerReferenceNo}
                  onChange={e => setPayerReferenceNo(e.target.value)}
                  placeholder="e.g. GCash ref # or bank transfer #"
                  className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 placeholder-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">This is the resident's own GCash/bank transaction number — proof that they actually paid.</p>
              </div>

              {/* Date paid picker */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Paid (defaults to today)</label>
                <input
                  type="date"
                  value={markAllPaidDate}
                  onChange={e => setMarkAllPaidDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button onClick={() => setIsUnpaidBreakdownOpen(false)}
                  className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold cursor-pointer transition-all">
                  Cancel
                </button>
                <button onClick={submitMarkAllPaid}
                  disabled={!payerReferenceNo.trim()}
                  className="flex-1 px-5 py-3 bg-[#006837] hover:bg-[#004d29] text-white rounded-2xl font-bold shadow-lg shadow-[#006837]/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  <CheckCircle2 size={16} />
                  Mark All {breakdownPayments.length} as Paid
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

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
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Resident's Payment Ref # <span className="text-red-500">*required</span>
                </label>
                <input type="text" name="payer_reference_no" value={editFormData.payer_reference_no || ''} onChange={handleEditChange}
                  placeholder="GCash ref # or bank transfer #"
                  className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 placeholder-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Paid</label>
                <input type="date" name="paid_at" value={editFormData.paid_at} onChange={handleEditChange}
                  className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer" />
              </div>
            </>
          )}
        </div>
      </ModalOverlay>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage dues, issue bills, and track resident standing</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <RequireRole userRole={currentUserRole} allowedRoles={['treasurer']}>
            <button onClick={() => setShowSendConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer">
              <Mail size={13} /> Send SOA to All
            </button>
          </RequireRole>
          {/* View toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
            <button onClick={() => setActiveView('transactions')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${activeView === 'transactions' ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutList size={13} /> Transactions
            </button>
            <button onClick={() => setActiveView('paid')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${activeView === 'paid' ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <CheckCircle2 size={13} /> Paid
            </button>
            <button onClick={() => setActiveView('standing')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${activeView === 'standing' ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <TableProperties size={13} /> Standing Ledger
            </button>
          </div>
        </div>
      </div>

      {/* ── Send SOA confirmation modal ── */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Send SOA to All Residents?</h2>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              This will email a Statement of Account to every resident who currently has an outstanding balance.
              Residents who are fully settled will not receive an email. This action is logged in the audit trail.
            </p>

            {sendSOAResult && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${
                sendSOAResult.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {sendSOAResult.type === 'success'
                  ? `✓ Sent ${sendSOAResult.sent} email(s)${sendSOAResult.failed ? `, ${sendSOAResult.failed} failed` : ''}.`
                  : `Failed: ${sendSOAResult.error}`}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowSendConfirm(false); setSendSOAResult(null); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold cursor-pointer transition-all">
                Cancel
              </button>
              <button onClick={handleSendAllSOA} disabled={sendingSOA}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {sendingSOA ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</> : <><Mail size={15} /> Send Now</>}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Paid view — one row per resident who has at least one paid due ── */}
      {activeView === 'paid' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px] flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input type="text" placeholder="Search resident…" value={paidSearchTerm}
                  onChange={e => setPaidSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
              </div>
              <select value={paidResidentFilter} onChange={e => setPaidResidentFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer">
                <option value="All">All Residents</option>
                {residentsList.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Name','Street','Total Paid','Months Paid','Last Payment','Standing'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPaid.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-300 text-sm">No paid records found</td></tr>
                ) : paginatedPaid.map(r => (
                  <tr key={r.user_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${r.stillUnpaid === 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span className="text-sm font-bold text-slate-800">{r.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 max-w-[180px] truncate">{r.street}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-emerald-600">
                        ₱{r.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {r.paidMonths} month{r.paidMonths !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {r.lastPaid ? new Date(r.lastPaid).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {r.stillUnpaid === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Fully Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Has Unpaid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPaid.length > 0 && (
            <>
              <PaginationBar page={paidPage} totalPages={paidTotalPages} setPage={setPaidPage} total={filteredPaid.length} rowsPerPage={10} />
              <div className="px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">{filteredPaid.length} resident{filteredPaid.length !== 1 ? 's' : ''} with paid records</p>
              </div>
            </>
          )}
        </div>
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

            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Name','Street','Unpaid Balance','Due Period','Status',''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {consolidatedPayments.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-300 text-sm">No residents found</td></tr>
                ) : paginatedPayments.map(r => {
                  const hasBalance = r.balance > 0;
                  return (
                    <tr key={r.user_id}
                      className={`hover:bg-slate-50/60 transition-colors ${hasBalance ? 'bg-red-50/30' : ''}`}>

                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${hasBalance ? 'bg-red-400' : 'bg-emerald-400'}`} />
                          <span className="text-sm font-bold text-slate-800">{r.full_name}</span>
                        </div>
                      </td>

                      {/* Street */}
                      <td className="px-5 py-4 text-sm text-slate-500 max-w-[180px] truncate">{r.street}</td>

                      {/* Unpaid Balance — ₱0.00 when settled */}
                      <td className="px-5 py-4">
                        {hasBalance ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-red-600">
                              ₱{r.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-red-400 font-semibold">
                              {r.months} month{r.months !== 1 ? 's' : ''} unpaid
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-emerald-600">₱0.00</span>
                            <span className="text-[10px] text-emerald-500 font-semibold">Settled</span>
                          </div>
                        )}
                      </td>

                      {/* Due Period */}
                      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {hasBalance && r.oldest && r.newest
                          ? r.oldest === r.newest
                            ? new Date(r.oldest).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : `${new Date(r.oldest).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(r.newest).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                          : '—'}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        {hasBalance ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Unpaid Balance
                          </span>
                        ) : r.standing === 'Settled' ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            No Record
                          </span>
                        )}
                      </td>

                      {/* Actions — Pay/Edit when balance exists, Statement always available */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const paidHistory = payments
                                .filter(p => p.user_id === r.user_id && (p.status || '').toLowerCase() === 'paid')
                                .sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0));
                              printSOA(r, paidHistory);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#006837] hover:text-[#006837] text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                            title="Print Statement of Account">
                            <Printer size={12} /> SOA
                          </button>
                          {hasBalance && (
                            <RequireRole userRole={currentUserRole} allowedRoles={['treasurer']}>
                              <button
                                onClick={() => {
                                  setBreakdownPayments(r.unpaidList.map(p => ({
                                    ...p,
                                    profiles: payments.find(x => x.id === p.id)?.profiles
                                      ?? residentsList.find(res => res.id === r.user_id) ?? null,
                                  })));
                                  setMarkAllPaidDate(localToday());
                                  setPayerReferenceNo('');
                                  setIsUnpaidBreakdownOpen(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006837] hover:bg-[#004d29] text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap">
                                <Edit2 size={12} /> Pay / Edit
                              </button>
                            </RequireRole>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {consolidatedPayments.length > 0 && (
            <>
              <PaginationBar page={transPage} totalPages={transTotalPages} setPage={setTransPage} total={consolidatedPayments.length} rowsPerPage={10} />
              <div className="px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">{consolidatedPayments.length} resident{consolidatedPayments.length !== 1 ? 's' : ''}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Payment;