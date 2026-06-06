import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle2, XCircle, Search, Users, Trash2,
  Eye, X, Mail, User, AlertTriangle, Loader2, Filter,
  DollarSign, CalendarDays, MapPin, ChevronRight, RefreshCw,
} from 'lucide-react';
import Facility from './Facility';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import CalendarReserve from './CalendarReserve';

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


// ─── Role guard ───────────────────────────────────────────────────────────────
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') return children;
  return null;
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt12 = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

const fmtDate = (d) => {
  if (!d) return 'N/A';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  pending:          { label: 'Pending',          dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 border-amber-200',           gradient: 'from-amber-400 to-amber-500'    },
  approved:         { label: 'Approved',         dot: 'bg-[#006837]',   pill: 'bg-emerald-50 text-[#006837] border-emerald-200',       gradient: 'from-[#006837] to-[#34a853]'   },
  'approved and paid':{ label: 'Approved & Paid',dot: 'bg-teal-500',    pill: 'bg-teal-50 text-teal-700 border-teal-200',              gradient: 'from-teal-500 to-teal-600'      },
  completed:        { label: 'Completed',        dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 border-blue-200',              gradient: 'from-blue-500 to-blue-600'      },
  rejected:         { label: 'Rejected',         dot: 'bg-red-500',     pill: 'bg-red-50 text-red-600 border-red-200',                 gradient: 'from-red-500 to-red-600'        },
  cancelled:        { label: 'Cancelled',        dot: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-500 border-slate-200',          gradient: 'from-slate-400 to-slate-500'    },
};

const getStatus = (s) => STATUS[(s || '').toLowerCase()] || { label: s || '—', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-500 border-slate-200', gradient: 'from-slate-400 to-slate-500' };

const StatusPill = ({ status }) => {
  const st = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide ${st.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, color, bg, onClick, active }) => (
  <button onClick={onClick}
    className={`w-full text-left p-5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md
      ${active ? `${bg} border-current shadow-sm` : 'bg-white border-slate-100 hover:border-slate-200'}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${active ? color : 'text-slate-400'}`}>{label}</p>
        <p className={`text-3xl font-black ${active ? color : 'text-slate-800'}`}>{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-white/60' : bg}`}>
        <Icon size={18} className={active ? color : color} />
      </div>
    </div>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Reservation = () => {
  const [reservations,      setReservations]      = useState([]);
  const [residentsList,     setResidentsList]      = useState([]);
  const [loading,           setLoading]            = useState(true);
  const [search,            setSearch]             = useState('');
  const [statusFilter,      setStatusFilter]       = useState('all');
  const [residentFilter,    setResidentFilter]     = useState('All');
  const [selectedRes,       setSelectedRes]        = useState(null);
  const [isCalendarOpen,    setIsCalendarOpen]     = useState(false);
  const [deleteTarget,      setDeleteTarget]       = useState(null);

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: res }, { data: profiles }] = await Promise.all([
      supabase.from('reservations').select('*, facilities(name), profiles!user_id(full_name, email, username)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ]);
    setReservations(res || []);
    setResidentsList(profiles || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('reservations').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedRes?.id === id) setSelectedRes(prev => ({ ...prev, status: newStatus }));
      logAudit('Reservation ' + id + ' → ' + newStatus);
    } catch (e) { alert('Error: ' + e.message); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('reservations').delete().eq('id', deleteTarget);
      if (error) throw error;
      setReservations(prev => prev.filter(r => r.id !== deleteTarget));
      setDeleteTarget(null);
      logAudit('Deleted reservation ' + deleteTarget);
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    all:              reservations.length,
    pending:          reservations.filter(r => r.status === 'Pending').length,
    approved:         reservations.filter(r => r.status === 'Approved').length,
    'approved and paid': reservations.filter(r => r.status === 'Approved and Paid').length,
    completed:        reservations.filter(r => r.status === 'Completed').length,
    rejected:         reservations.filter(r => r.status === 'Rejected').length,
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = reservations.filter(r => {
    const name = (r.profiles?.full_name || '').toLowerCase();
    const fac  = (r.facilities?.name || '').toLowerCase();
    const term = search.toLowerCase();
    const matchSearch   = !term || name.includes(term) || fac.includes(term);
    const matchStatus   = statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter;
    const matchResident = residentFilter === 'All' || r.user_id === residentFilter;
    return matchSearch && matchStatus && matchResident;
  });
  const { paginated: paginatedRes, page: resPage, setPage: setResPage, totalPages: resTotalPages, total: filteredTotal } = usePagination(filtered, 10);

  const kpiCards = [
    { key: 'all',              label: 'Total',           icon: Calendar,    color: 'text-slate-600',    bg: 'bg-slate-100'    },
    { key: 'pending',          label: 'Pending',         icon: Clock,       color: 'text-amber-600',    bg: 'bg-amber-50'     },
    { key: 'approved',         label: 'Approved',        icon: CheckCircle2,color: 'text-[#006837]',    bg: 'bg-emerald-50'   },
    { key: 'approved and paid',label: 'Paid',            icon: DollarSign,  color: 'text-teal-600',     bg: 'bg-teal-50'      },
    { key: 'completed',        label: 'Completed',       icon: CheckCircle2,color: 'text-blue-600',     bg: 'bg-blue-50'      },
    { key: 'rejected',         label: 'Rejected',        icon: XCircle,     color: 'text-red-500',      bg: 'bg-red-50'       },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6 lg:p-8 space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <CalendarDays size={22} className="text-[#006837]" />
            Reservation Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">View and manage amenity reservations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#006837] hover:bg-[#004d29] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#006837]/20 cursor-pointer transition-all">
            <Calendar size={14} /> Calendar View
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <KpiCard key={k.key} label={k.label} value={stats[k.key] || 0}
            icon={k.icon} color={k.color} bg={k.bg}
            active={statusFilter === k.key}
            onClick={() => setStatusFilter(statusFilter === k.key ? 'all' : k.key)}
          />
        ))}
      </div>

      {/* ── Table card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search name or facility…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
          </div>

          {/* Resident filter */}
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select value={residentFilter} onChange={e => setResidentFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer appearance-none">
              <option value="All">All Residents</option>
              {residentsList.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>

          {/* Status pill filter */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl ml-auto">
            {['all', 'pending', 'approved', 'completed', 'rejected'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap
                  ${statusFilter === s ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {s === 'all' ? `All (${stats.all})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${stats[s] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Resident', 'Facility', 'Date', 'Time Slot', 'Status', 'Requested On', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
                    <p className="text-sm text-[#006837] font-semibold animate-pulse">Loading reservations…</p>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="py-16 text-center">
                  <CalendarDays size={36} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-sm font-bold text-slate-400">No reservations found</p>
                  <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filter</p>
                </td></tr>
              ) : paginatedRes.map(res => {
                const st = getStatus(res.status);
                return (
                  <tr key={res.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedRes(res)}>
                    {/* Resident */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-xs font-black uppercase shrink-0`}>
                          {res.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{res.profiles?.full_name || '—'}</p>
                          <p className="text-[10px] text-slate-400">{res.profiles?.username ? `@${res.profiles.username}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    {/* Facility */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 font-medium">{res.facilities?.name || '—'}</span>
                      </div>
                    </td>
                    {/* Date */}
                    <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">{fmtDate(res.date)}</td>
                    {/* Time Slot */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600">{fmt12(res.start_time)} – {fmt12(res.end_time)}</span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <StatusPill status={res.status} />
                    </td>
                    {/* Requested On */}
                    <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">{fmtDate(res.created_at)}</td>
                    {/* Actions */}
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedRes(res)} title="View"
                          className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all cursor-pointer">
                          <Eye size={15} />
                        </button>
                        <RequireRole userRole={currentUserRole} allowedRoles={['president','vice_president','secretary']}>
                          {res.status === 'Pending' && (
                            <>
                              <button onClick={() => updateStatus(res.id, 'Approved')} title="Approve"
                                className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-[#006837] rounded-lg transition-all cursor-pointer">
                                <CheckCircle2 size={15} />
                              </button>
                              <button onClick={() => updateStatus(res.id, 'Rejected')} title="Reject"
                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all cursor-pointer">
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          {res.status === 'Approved and Paid' && (
                            <button onClick={() => updateStatus(res.id, 'Completed')} title="Mark Completed"
                              className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all cursor-pointer">
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button onClick={() => setDeleteTarget(res.id)} title="Delete"
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all cursor-pointer">
                            <Trash2 size={15} />
                          </button>
                        </RequireRole>
                        <RequireRole userRole={currentUserRole} allowedRoles={['treasurer','president']}>
                          {res.status === 'Approved' && (
                            <button onClick={() => updateStatus(res.id, 'Approved and Paid')} title="Confirm Cash Payment"
                              className="p-2 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-lg transition-all cursor-pointer">
                              <DollarSign size={15} />
                            </button>
                          )}
                        </RequireRole>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <PaginationBar page={resPage} totalPages={resTotalPages} setPage={setResPage} total={filtered.length} rowsPerPage={10} />
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {selectedRes && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          onClick={() => setSelectedRes(null)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>

            {/* Status gradient header */}
            <div className={`bg-gradient-to-br ${getStatus(selectedRes.status).gradient} px-6 pt-5 pb-6`}>
              <div className="flex items-start justify-between mb-4">
                <StatusPill status={selectedRes.status} />
                <button onClick={() => setSelectedRes(null)}
                  className="p-1.5 hover:bg-white/20 rounded-xl text-white/80 hover:text-white cursor-pointer transition-all">
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 rounded-2xl border-2 border-white/30 flex items-center justify-center text-white text-2xl font-black uppercase shrink-0">
                  {selectedRes.profiles?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white leading-tight">{selectedRes.profiles?.full_name || '—'}</h2>
                  <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
                    <Mail size={11} /> {selectedRes.profiles?.email || 'No email'}
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-3">
              {[
                { icon: MapPin,      label: 'Facility',       value: selectedRes.facilities?.name || '—' },
                { icon: CalendarDays,label: 'Scheduled Date', value: fmtDate(selectedRes.date)           },
                { icon: Clock,       label: 'Time Slot',      value: `${fmt12(selectedRes.start_time)} – ${fmt12(selectedRes.end_time)}` },
                { icon: Calendar,    label: 'Requested On',   value: fmtDate(selectedRes.created_at)     },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-[#006837]/10 flex items-center justify-center shrink-0">
                    <f.icon size={14} className="text-[#006837]" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</p>
                    <p className="text-sm font-bold text-slate-800">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6 flex flex-col gap-2.5">
              <RequireRole userRole={currentUserRole} allowedRoles={['president','vice_president','secretary']}>
                {selectedRes.status === 'Pending' && (
                  <div className="flex gap-2.5">
                    <button onClick={() => updateStatus(selectedRes.id, 'Approved')}
                      className="flex-1 py-3 bg-[#006837] hover:bg-[#004d29] text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#006837]/20 transition-all">
                      <CheckCircle2 size={15} /> Approve
                    </button>
                    <button onClick={() => updateStatus(selectedRes.id, 'Rejected')}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/20 transition-all">
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                )}
                {selectedRes.status === 'Approved and Paid' && (
                  <button onClick={() => updateStatus(selectedRes.id, 'Completed')}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 transition-all">
                    <CheckCircle2 size={15} /> Mark as Completed
                  </button>
                )}
              </RequireRole>
              <RequireRole userRole={currentUserRole} allowedRoles={['treasurer','president']}>
                {selectedRes.status === 'Approved' && (
                  <button onClick={() => updateStatus(selectedRes.id, 'Approved and Paid')}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-600/20 transition-all">
                    <DollarSign size={15} /> Confirm Cash Payment Received
                  </button>
                )}
              </RequireRole>
              <button onClick={() => setSelectedRes(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar ─────────────────────────────────────────────────────────── */}
      <CalendarReserve isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)}
        reservations={reservations} setSelectedReservation={setSelectedRes} />

      {/* ── Delete confirm ────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-7 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle size={26} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1.5">Delete Reservation?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">This permanently removes the reservation. This cannot be undone.</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 cursor-pointer transition-all">
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-100 cursor-pointer transition-all">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Facility section ──────────────────────────────────────────────────── */}
      <div className="border-t-2 border-dashed border-slate-200 pt-8">
        <Facility />
      </div>
    </div>
  );
};

export default Reservation;
