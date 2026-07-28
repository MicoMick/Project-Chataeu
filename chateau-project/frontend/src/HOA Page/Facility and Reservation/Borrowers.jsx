import React, { useState } from 'react';
import {
  Search, Package, Clock, CheckCircle2, ShieldCheck,
  AlertTriangle, X, Wrench, Loader2,
} from 'lucide-react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';

// ─── Pagination ───────────────────────────────────────────────────────────────
const usePagination = (items, rowsPerPage = 10) => {
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { setPage(1); }, [items.length]);
  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const paginated  = items.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  return { paginated, page, setPage, totalPages, total: items.length };
};

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
                  ${page === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{p}</button>
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm font-bold transition-all">›</button>
      </div>
    </div>
  );
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return 'N/A';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  pending:          { label: 'Pending',          dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 border-amber-200'      },
  approved:         { label: 'Approved',         dot: 'bg-[#006837]',   pill: 'bg-emerald-50 text-[#006837] border-emerald-200'  },
  'approved and paid':{ label: 'Approved & Paid',dot: 'bg-teal-500',    pill: 'bg-teal-50 text-teal-700 border-teal-200'         },
  completed:        { label: 'Completed',        dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 border-blue-200'         },
  rejected:         { label: 'Rejected',         dot: 'bg-red-500',     pill: 'bg-red-50 text-red-600 border-red-200'            },
  cancelled:        { label: 'Cancelled',        dot: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-500 border-slate-200'     },
};
const getStatus = (s) => STATUS[(s || '').toLowerCase()] || { label: s || '—', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-500 border-slate-200' };

const StatusPill = ({ status }) => {
  const st = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide ${st.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
};

// ─── Condition badge — shown once a return has been verified ────────────────
const ConditionBadge = ({ r }) => {
  if (!r.returned_at && !r.return_condition) return <span className="text-xs text-slate-300">—</span>;
  const missing = r.return_missing_qty || 0;
  const damaged = r.return_condition === 'Damaged';
  if (!damaged && missing === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide bg-emerald-50 text-emerald-700 border-emerald-200">
        <ShieldCheck size={10} /> Verified Good
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1 items-start">
      {damaged && (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide bg-red-50 text-red-600 border-red-200">
          <Wrench size={10} /> Damaged
        </span>
      )}
      {missing > 0 && (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide bg-amber-50 text-amber-700 border-amber-200">
          <AlertTriangle size={10} /> {missing} missing
        </span>
      )}
    </div>
  );
};

/**
 * Borrowers — the dedicated table for reservations tied to an Amenity Item
 * (borrowed, not rented — e.g. Chairs, Tents). Kept separate from the
 * Facility Reservations table in Reservation.jsx since items never go
 * through the cash-payment confirmation step facilities do.
 *
 * Returning an item goes through a short verification step first — the
 * officer confirms the item came back fixed/undamaged and that nothing is
 * missing before it's restocked, instead of blindly trusting "returned".
 *
 * Props:
 *  - reservations: array (already fetched + joined with facilities + profiles in Reservation.jsx)
 *  - search, setSearch: lifted search state
 *  - tab, setTab: 'current' | 'history'
 *  - returning, setReturning: id of the row currently being marked returned
 *  - currentUserRole: role string for gating the "Mark Returned" action
 *  - onRefresh: refetch callback after a status change
 */
const Borrowers = ({ reservations, search, setSearch, tab, setTab, returning, setReturning, currentUserRole, onRefresh }) => {
  const [verifyTarget,     setVerifyTarget]     = useState(null); // reservation currently being verified
  const [verifyCondition,  setVerifyCondition]  = useState('Good'); // 'Good' | 'Damaged'
  const [verifyMissingQty, setVerifyMissingQty] = useState(0);
  const [verifyNotes,      setVerifyNotes]      = useState('');

  const amenityItems    = reservations.filter(r => r.facilities?.category === 'Amenity Item');
  const currentBorrowed = amenityItems.filter(r => r.status === 'Approved');
  const history         = amenityItems.filter(r => ['Completed', 'Rejected', 'Cancelled'].includes(r.status));

  const term    = search.toLowerCase();
  const filterR = (r) =>
    (r.profiles?.full_name || '').toLowerCase().includes(term) ||
    (r.facilities?.name    || '').toLowerCase().includes(term);

  const list = (tab === 'current' ? currentBorrowed : history).filter(filterR);
  const { paginated, page, setPage, totalPages, total } = usePagination(list, 10);

  const openVerify = (res) => {
    setVerifyTarget(res);
    setVerifyCondition('Good');
    setVerifyMissingQty(0);
    setVerifyNotes('');
  };

  // ── Confirm the return — only units that are both accounted for AND in
  // good condition go back into available stock. Damaged units still count
  // as "returned" (they're physically back) but aren't usable, so they're
  // excluded from the restock the same way missing units are.
  const submitVerifiedReturn = async () => {
    const res = verifyTarget;
    if (!res) return;
    const borrowedQty = res.quantity || 1;
    const missingQty  = Math.min(Math.max(0, Number(verifyMissingQty) || 0), borrowedQty);
    const usableQty    = verifyCondition === 'Good' ? Math.max(0, borrowedQty - missingQty) : 0;

    setReturning(res.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('reservations').update({
        status: 'Completed',
        return_condition:   verifyCondition,
        return_missing_qty: missingQty,
        return_notes:        verifyNotes.trim() || null,
        returned_at:          new Date().toISOString(),
        verified_by:          user?.id || null,
      }).eq('id', res.id);
      if (error) throw error;

      const currentAmount = res.facilities?.amount ?? 0;
      const newAmount = currentAmount + usableQty;
      await supabase.from('facilities').update({
        amount: newAmount,
        status: newAmount > 0 ? 'Available' : 'Not Available',
      }).eq('id', res.facility_id);

      const flags = [
        verifyCondition === 'Damaged' ? 'damaged' : 'good condition',
        missingQty > 0 ? `${missingQty} unit(s) missing` : 'nothing missing',
      ].join(', ');
      logAudit(`Verified return of ${res.facilities?.name} from ${res.profiles?.full_name} — ${flags}. ${usableQty} unit(s) restocked.`);
      setVerifyTarget(null);
      onRefresh();
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setReturning(null); }
  };

  const allowedToReturn = ['president','vice_president','secretary','treasurer','super_admin'];

  return (
    <div className="space-y-4">
      {/* Sub-tab + search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
          <button onClick={() => setTab('current')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${tab === 'current' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Clock size={12} /> Currently Borrowed ({currentBorrowed.length})
          </button>
          <button onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${tab === 'history' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <CheckCircle2 size={12} /> Return History ({history.length})
          </button>
        </div>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search resident or item…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006837]/20 w-56" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['Resident', 'Item', 'Qty', 'Requested On', 'Date', 'Status', ...(tab === 'current' ? ['Action'] : ['Condition', 'Completed On'])].map(h => (
              <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 ? (
              <tr><td colSpan={tab === 'current' ? 7 : 8} className="py-16 text-center">
                <Package size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm font-bold text-slate-400">
                  {tab === 'current' ? 'No items currently borrowed' : 'No return history yet'}
                </p>
              </td></tr>
            ) : paginated.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-black uppercase shrink-0">
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
                  <StatusPill status={r.status} />
                </td>
                {tab === 'current' ? (
                  <td className="px-5 py-4">
                    {allowedToReturn.includes(currentUserRole) && (
                      <button onClick={() => openVerify(r)} disabled={returning === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 whitespace-nowrap">
                        {returning === r.id
                          ? <><span className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> Saving…</>
                          : <><ShieldCheck size={12} /> Verify Return</>}
                      </button>
                    )}
                  </td>
                ) : (
                  <>
                    <td className="px-5 py-4"><ConditionBadge r={r} /></td>
                    <td className="px-5 py-4 text-sm text-emerald-600 font-semibold whitespace-nowrap">
                      {r.status === 'Completed' ? <span className="flex items-center gap-1"><CheckCircle2 size={12} /> {fmtDate(r.returned_at) !== 'N/A' ? fmtDate(r.returned_at) : 'Returned'}</span> : '—'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar page={page} totalPages={totalPages} setPage={setPage} total={total} rowsPerPage={10} />
      </div>

      {/* ── Verify Return modal ─────────────────────────────────────────────── */}
      {verifyTarget && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !returning && setVerifyTarget(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Verify Return</h2>
                  <p className="text-xs text-slate-400">{verifyTarget.facilities?.name} · {verifyTarget.profiles?.full_name}</p>
                </div>
              </div>
              <button onClick={() => !returning && setVerifyTarget(null)} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Units Borrowed</span>
                <span className="text-sm font-bold text-slate-800">{verifyTarget.quantity || 1} unit(s)</span>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Is the item fixed / undamaged?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setVerifyCondition('Good')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 transition-all cursor-pointer
                      ${verifyCondition === 'Good' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <ShieldCheck size={16} /> Good
                  </button>
                  <button onClick={() => setVerifyCondition('Damaged')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 transition-all cursor-pointer
                      ${verifyCondition === 'Damaged' ? 'bg-red-50 border-red-400 text-red-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Wrench size={16} /> Damaged
                  </button>
                </div>
              </div>

              {/* Missing units */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Missing units (not returned)
                </label>
                <input type="number" min="0" max={verifyTarget.quantity || 1} value={verifyMissingQty}
                  onChange={e => setVerifyMissingQty(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Out of {verifyTarget.quantity || 1} unit(s) borrowed. Missing or damaged units won't be added back to available stock.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes (optional)</label>
                <textarea rows={2} value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)}
                  placeholder="e.g. one chair leg bent, tent pole missing…"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all placeholder-slate-400" />
              </div>

              {(verifyCondition === 'Damaged' || Number(verifyMissingQty) > 0) && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 font-semibold">
                    This return will be flagged for follow-up with the borrower and won't fully restock the item.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setVerifyTarget(null)} disabled={returning === verifyTarget.id}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={submitVerifiedReturn} disabled={returning === verifyTarget.id}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50">
                {returning === verifyTarget.id
                  ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                  : <><CheckCircle2 size={15} /> Confirm Return</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Borrowers;
