import React, { useState } from 'react';
import { X, Package, Search, User, CheckCircle2, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
};

// ─── Status pill ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved:           { label: 'Borrowed',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'   },
  'approved and paid': { label: 'Borrowed',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'   },
  completed:           { label: 'Returned',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
};
const getCfg = (s) => STATUS_CFG[(s || '').toLowerCase()] || { label: s || '—', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' };

/**
 * Borrowers — lists every resident currently (or previously) borrowing an
 * Amenity Item, derived from `reservations` rows whose linked facility has
 * category === 'Amenity Item'. Rendered as a slide-over panel from
 * Reservation.jsx, so it never needs its own route.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - reservations: array (already fetched + joined with facilities + profiles in Reservation.jsx)
 */
const Borrowers = ({ isOpen, onClose, reservations = [] }) => {
  const [search,    setSearch]    = useState('');
  const [tab,       setTab]       = useState('current'); // 'current' | 'history'
  const [returning, setReturning] = useState(null);

  if (!isOpen) return null;

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  // Only reservations tied to an Amenity Item, with at least a quantity recorded
  const itemBorrows = reservations.filter(r => r.facilities?.category === 'Amenity Item');

  const currentlyBorrowed = itemBorrows.filter(r => ['Approved', 'Approved and Paid'].includes(r.status));
  const history           = itemBorrows.filter(r => ['Completed', 'Rejected', 'Cancelled'].includes(r.status));

  const term = search.toLowerCase();
  const filterRow = (r) =>
    (r.profiles?.full_name || '').toLowerCase().includes(term) ||
    (r.facilities?.name || '').toLowerCase().includes(term);

  const list = (tab === 'current' ? currentlyBorrowed : history).filter(filterRow);

  // ── Mark as returned: bump status to Completed + restock the item ────────
  const handleMarkReturned = async (res) => {
    setReturning(res.id);
    try {
      const { error } = await supabase.from('reservations').update({ status: 'Completed' }).eq('id', res.id);
      if (error) throw error;

      const currentAmount = res.facilities?.amount ?? 0;
      const restoreQty = res.quantity || 1;
      const newAmount = currentAmount + restoreQty;
      await supabase.from('facilities').update({
        amount: newAmount,
        status: newAmount > 0 ? 'Available' : 'Not Available',
      }).eq('id', res.facility_id);

      logAudit(`Marked ${restoreQty} unit(s) of ${res.facilities?.name} as returned by ${res.profiles?.full_name}`);
      // Optimistic local patch — parent re-fetches reservations on its own cadence,
      // but we also nudge the in-memory list so the panel feels responsive.
      res.status = 'Completed';
    } catch (e) {
      alert('Failed to mark as returned: ' + e.message);
    } finally {
      setReturning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#f8f9fb] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Borrowers</h2>
              <p className="text-xs text-slate-400">Residents who borrowed amenity items</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs + search */}
        <div className="bg-white px-6 py-3 border-b border-slate-100 shrink-0 space-y-3">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
            <button onClick={() => setTab('current')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${tab === 'current' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Clock size={13} /> Currently Borrowed ({currentlyBorrowed.length})
            </button>
            <button onClick={() => setTab('history')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${tab === 'history' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <CheckCircle2 size={13} /> History ({history.length})
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search resident or item…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package size={32} className="text-slate-200 mb-2" />
              <p className="text-sm font-bold text-slate-400">
                {tab === 'current' ? 'No items currently borrowed' : 'No borrowing history yet'}
              </p>
              <p className="text-xs text-slate-300 mt-1">Try adjusting your search</p>
            </div>
          ) : list.map(r => {
            const cfg = getCfg(r.status);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-black uppercase shrink-0">
                      {r.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{r.profiles?.full_name || 'Unknown resident'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{r.profiles?.email || ''}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{r.facilities?.name || '—'}</p>
                    <p className="text-[10px] text-slate-400">
                      {r.quantity ? `${r.quantity} unit(s) borrowed` : 'Quantity not recorded'} · Requested {fmtDate(r.created_at)}
                    </p>
                  </div>
                  {tab === 'current' && (
                    <RequireMarkReturned role={currentUserRole}>
                      <button
                        onClick={() => handleMarkReturned(r)}
                        disabled={returning === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap">
                        {returning === r.id
                          ? <><span className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> Saving…</>
                          : <><RotateCcw size={12} /> Mark Returned</>}
                      </button>
                    </RequireMarkReturned>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white shrink-0 flex items-center gap-2">
          <AlertTriangle size={12} className="text-amber-400 shrink-0" />
          <p className="text-[10px] text-slate-400">Marking an item as returned restocks it automatically.</p>
        </div>
      </div>
    </div>
  );
};

// ─── Role guard — only officers can mark items returned ──────────────────────
const RequireMarkReturned = ({ role, children }) => {
  const allowed = ['president', 'vice_president', 'secretary', 'treasurer', 'super_admin'];
  if (allowed.includes(role)) return children;
  return null;
};

export default Borrowers;
