import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import {
  Plus, Printer, Search, X, CheckCircle2, AlertCircle,
  RefreshCw, Calendar, Clock, Users, Eye, ChevronDown,
  Trash2, User, MapPin,
} from 'lucide-react';
import ChateauLogo from '../../assets/ChataueLogo.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 || 12;
  return `${display}:${m} ${ampm}`;
};

const statusCfg = {
  pending:           { label: 'Pending',          badge: 'bg-amber-50 text-amber-700 border-amber-200',           dot: 'bg-amber-400'   },
  approved:          { label: 'Approved',         badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',     dot: 'bg-emerald-400' },
  'approved and paid':{ label: 'Approved & Paid', badge: 'bg-blue-50 text-blue-700 border-blue-200',             dot: 'bg-blue-400'    },
  completed:         { label: 'Completed',        badge: 'bg-[#006837]/10 text-[#006837] border-[#006837]/20',    dot: 'bg-[#006837]'   },
  rejected:          { label: 'Rejected',         badge: 'bg-red-50 text-red-600 border-red-200',                 dot: 'bg-red-400'     },
  cancelled:         { label: 'Cancelled',        badge: 'bg-slate-100 text-slate-500 border-slate-200',          dot: 'bg-slate-300'   },
};

const StatusBadge = ({ status }) => {
  const s   = (status || '').toLowerCase();
  const cfg = statusCfg[s] || { label: status || '—', badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-300' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast.show) return null;
  return (
    <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-top-4 duration-300
      ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
      {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
      <p className="text-sm font-bold">{toast.message}</p>
    </div>
  );
};

// ─── Printable Permit ─────────────────────────────────────────────────────────
const PrintPermit = React.forwardRef(({ permit, names }, ref) => {
  if (!permit) return null;
  const rows = Array.from({ length: 14 }, (_, i) => names[i] || { name: '', address: '' });

  return (
    <div ref={ref} className="bg-white p-10 font-serif text-black" style={{ width: '794px', minHeight: '1123px' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <img src={ChateauLogo} alt="Chateau Real" style={{ height: '70px', width: 'auto' }} />
        <div className="text-center flex-1">
          <p className="font-bold text-sm">Chateau Real Executive Village Homeowners Association Inc.</p>
          <p className="font-bold text-sm">(CREVHAI)</p>
        </div>
      </div>

      <h2 className="font-bold text-lg underline mb-8">COURT PERMIT</h2>

      <p className="mb-6 text-sm font-bold">To the guard on duty,</p>

      <p className="text-sm mb-4 leading-relaxed">
        The following names who appeared below are scheduled to rent the covered court of Chateau
        Real on <span className="font-bold">{fmtDate(permit.date)}</span> from{' '}
        <span className="font-bold">{fmtTime(permit.start_time)}</span> to{' '}
        <span className="font-bold">{fmtTime(permit.end_time)}</span>.
      </p>

      <p className="text-sm mb-8 leading-relaxed font-bold">
        We had paid the amount of Php{' '}
        <span className="font-normal">____________</span>{' '}
        as rental fee. We will abide by the guidelines of Chateau Real that governs the use of the court.
        Any incident that may happen CREVHAI has no obligation to the renting party.
      </p>

      {/* Names table */}
      <table className="w-full border-collapse border border-black text-sm mb-8">
        <thead>
          <tr>
            <th className="border border-black p-2 w-8"></th>
            <th className="border border-black p-2 font-bold text-center">NAME</th>
            <th className="border border-black p-2 font-bold text-center w-28">SIGNATURE</th>
            <th className="border border-black p-2 font-bold text-center">ADDRESS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="border border-black p-2 text-center">{i + 1}.</td>
              <td className="border border-black p-2">{row.name}</td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2">{row.address}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-sm font-bold mb-6">Issued By:</p>
      <div className="mt-6">
        <div className="border-t border-black w-40 mb-1" />
        <p className="text-sm font-bold">Daisy Jimenez</p>
        <p className="text-sm font-bold">Sports Committee</p>
      </div>
    </div>
  );
});

// ─── Permit Form Modal ────────────────────────────────────────────────────────
const PermitFormModal = ({ permit, onClose, onSave, isSaving }) => {
  const [names, setNames] = useState(
    Array.from({ length: 14 }, (_, i) =>
      permit?.permit_names?.[i] || { name: '', address: '' }
    )
  );

  const updateRow = (i, field, value) => {
    setNames(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only save rows that have at least a name
    const filled = names.filter(r => r.name.trim());
    onSave(filled);
  };

  const inputCls = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900">Court Permit — Participant Names</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {permit.date ? `${fmtDate(permit.date)} · ${fmtTime(permit.start_time)} – ${fmtTime(permit.end_time)}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 mb-1">
              <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">#</div>
              <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Name</div>
              <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Address</div>
            </div>

            {names.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1 text-xs font-bold text-slate-400 text-center">{i + 1}.</div>
                <div className="col-span-6">
                  <input
                    value={row.name}
                    onChange={e => updateRow(i, 'name', e.target.value)}
                    placeholder="Full name"
                    className={inputCls}
                  />
                </div>
                <div className="col-span-5">
                  <input
                    value={row.address}
                    onChange={e => updateRow(i, 'address', e.target.value)}
                    placeholder="Block / Lot / Street"
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-3 bg-[#006837] hover:bg-[#004d29] text-white font-bold rounded-2xl text-sm shadow-lg shadow-[#006837]/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> Save Names</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── View + Print Modal ───────────────────────────────────────────────────────
const ViewPermitModal = ({ permit, onClose, onEditNames }) => {
  const printRef  = useRef();
  const names     = permit?.permit_names || [];
  const hasNames  = names.length > 0;

  const handlePrint = () => {
    const content  = printRef.current.innerHTML;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(`
      <html>
        <head>
          <title>Court Permit — ${fmtDate(permit.date)}</title>
          <style>
            body { margin: 0; font-family: serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 6px 8px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 400);
  };

  if (!permit) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900">Court Permit Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">{permit.profiles?.full_name || 'Unknown Resident'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Permit info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Calendar, label: 'Date',       value: fmtDate(permit.date)                           },
              { icon: Clock,    label: 'Start Time',  value: fmtTime(permit.start_time)                    },
              { icon: Clock,    label: 'End Time',    value: fmtTime(permit.end_time)                      },
            ].map(f => (
              <div key={f.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <f.icon size={13} className="text-[#006837]" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</p>
                </div>
                <p className="text-sm font-bold text-slate-800">{f.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={permit.status} />
            </div>
            <button onClick={() => onEditNames(permit)}
              className="flex items-center gap-2 px-4 py-2 bg-[#006837]/10 hover:bg-[#006837]/20 text-[#006837] rounded-xl text-xs font-bold cursor-pointer transition-all">
              <Users size={13} /> {hasNames ? 'Edit Names' : 'Add Names'}
            </button>
          </div>

          {/* Names list */}
          {hasNames ? (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Users size={14} className="text-[#006837]" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Participants ({names.length})</h4>
              </div>
              <div className="divide-y divide-slate-100">
                {names.map((n, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 w-5 text-right">{i + 1}.</span>
                    <User size={12} className="text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 flex-1">{n.name}</span>
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500">{n.address || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Users size={28} className="text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No participants added yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Click "Add Names" to fill in participants</p>
            </div>
          )}

          {/* Hidden printable area */}
          <div className="hidden">
            <PrintPermit ref={printRef} permit={permit} names={names} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 shrink-0 border-t border-slate-100 pt-4">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm cursor-pointer">
            Close
          </button>
          {hasNames && (
            <button onClick={handlePrint}
              className="flex-1 py-3 bg-[#006837] hover:bg-[#004d29] text-white font-bold rounded-2xl text-sm shadow-lg shadow-[#006837]/20 cursor-pointer flex items-center justify-center gap-2">
              <Printer size={15} /> Print Permit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CourtPermit = () => {
  const [reservations,  setReservations]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [viewPermit,    setViewPermit]    = useState(null);
  const [editTarget,    setEditTarget]    = useState(null);  // permit being edited for names
  const [isSaving,      setIsSaving]      = useState(false);
  const [toast,         setToast]         = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // ── Fetch — only Covered Court reservations ───────────────────────────────
  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      // First get the facility id for covered court
      const { data: facilities } = await supabase
        .from('facilities')
        .select('id, name')
        .ilike('name', '%court%');

      const courtIds = (facilities || []).map(f => f.id);

      let query = supabase
        .from('reservations')
        .select(`
          *,
          facilities ( id, name ),
          profiles!user_id ( full_name, email, block, lot, street )
        `)
        .order('date', { ascending: false });

      // Filter to court reservations only if we found any
      if (courtIds.length > 0) {
        query = query.in('facility_id', courtIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReservations(data || []);
    } catch (e) {
      showToast('Failed to load permits: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // ── Save participant names ─────────────────────────────────────────────────
  const handleSaveNames = async (names) => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ permit_names: names })
        .eq('id', editTarget.id);
      if (error) throw error;
      await logAudit('UPDATE_COURT_PERMIT', `Updated participant names for reservation ID: ${editTarget.id}`);
      showToast('Participant names saved successfully.');
      setEditTarget(null);
      fetchReservations();
    } catch (e) {
      showToast('Failed to save: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = reservations.filter(r => {
    const name  = (r.profiles?.full_name || '').toLowerCase();
    const fname = (r.facilities?.name    || '').toLowerCase();
    const term  = search.toLowerCase();
    const matchSearch  = !term || name.includes(term) || fname.includes(term);
    const matchStatus  = statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = reservations.reduce((acc, r) => {
    const s = (r.status || 'pending').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const withNames    = reservations.filter(r => (r.permit_names || []).length > 0).length;
  const withoutNames = reservations.filter(r => (r.permit_names || []).length === 0).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      <Toast toast={toast} />

      {/* Name edit modal */}
      {editTarget && (
        <PermitFormModal
          permit={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveNames}
          isSaving={isSaving}
        />
      )}

      {/* View + print modal */}
      {viewPermit && !editTarget && (
        <ViewPermitModal
          permit={viewPermit}
          onClose={() => setViewPermit(null)}
          onEditNames={(p) => { setViewPermit(null); setEditTarget(p); }}
        />
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-[#006837]" />
            Court Permits
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Covered Court reservation permits — Sports Committee
          </p>
        </div>
        <button onClick={fetchReservations} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Permits',   value: reservations.length, icon: Calendar, bg: 'bg-slate-100',    color: 'text-slate-600'    },
          { title: 'Approved',        value: counts.approved || 0,icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { title: 'Names Filled',    value: withNames,           icon: Users,    bg: 'bg-[#006837]/10', color: 'text-[#006837]'   },
          { title: 'Needs Names',     value: withoutNames,        icon: AlertCircle, bg: 'bg-amber-50',  color: 'text-amber-600'   },
        ].map(k => (
          <div key={k.title} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k.title}</p>
                <p className="text-3xl font-black text-slate-900">{k.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${k.bg}`}><k.icon size={18} className={k.color} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search resident or facility…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/30 focus:border-[#006837] transition-all" />
          </div>
          {/* Status filter pills */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-wrap ml-auto">
            {['all','pending','approved','completed','rejected'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap capitalize
                  ${statusFilter === s ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {s === 'all' ? `All (${reservations.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s] || 0})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium animate-pulse">Loading permits…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Calendar size={36} className="text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-400">No court permits found</p>
              <p className="text-xs text-slate-300 mt-1">Court reservations will appear here once submitted by residents</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Resident','Facility','Date','Time Slot','Status','Participants','Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(r => {
                  const names    = r.permit_names || [];
                  const hasNames = names.length > 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Resident */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">{r.profiles?.full_name || '—'}</p>
                        <p className="text-xs text-slate-400">
                          {[r.profiles?.block && `Blk ${r.profiles.block}`, r.profiles?.lot && `Lot ${r.profiles.lot}`].filter(Boolean).join(' ')}
                        </p>
                      </td>
                      {/* Facility */}
                      <td className="px-5 py-4 text-sm text-slate-600">{r.facilities?.name || '—'}</td>
                      {/* Date */}
                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                      {/* Time */}
                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {fmtTime(r.start_time)} – {fmtTime(r.end_time)}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                      {/* Participants */}
                      <td className="px-5 py-4">
                        {hasNames
                          ? <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#006837]/10 text-[#006837] border border-[#006837]/20">
                              <Users size={11} /> {names.length} added
                            </span>
                          : <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              <AlertCircle size={11} /> Needs names
                            </span>}
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setViewPermit(r)} title="View & Print"
                            className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer transition-colors">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => setEditTarget(r)} title="Add/Edit Names"
                            className="p-2 hover:bg-[#006837]/10 text-slate-400 hover:text-[#006837] rounded-lg cursor-pointer transition-colors">
                            <Users size={15} />
                          </button>
                          {hasNames && (
                            <button
                              title="Print Permit"
                              onClick={() => {
                                setViewPermit(r);
                                // slight delay so modal opens first
                                setTimeout(() => {
                                  document.querySelector('[data-print]')?.click();
                                }, 300);
                              }}
                              className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer transition-colors">
                              <Printer size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">{filtered.length} permit{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtPermit;
