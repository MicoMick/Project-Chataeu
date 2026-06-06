import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import {
  UserCheck, UserX, Search, RefreshCw, CheckCircle2,
  AlertCircle, AlertTriangle, XCircle,
} from 'lucide-react';
import ResidentDetailModal, { STATUS_CFG } from '../Resident Management/ResidentDetailModal';

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


const STATUS_TABS = [
  { key: 'pending',     label: 'Pending',     bg: 'bg-amber-50',   dot: 'bg-amber-400'   },
  { key: 'active',      label: 'Approved',    bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
  { key: 'deactivated', label: 'Deactivated', bg: 'bg-red-50',     dot: 'bg-red-400'     },
  { key: 'delinquent',  label: 'Delinquent',  bg: 'bg-orange-50',  dot: 'bg-orange-400'  },
];

const fullName = (p) =>
  [p.first_name, p.middle_initial ? p.middle_initial + '.' : '', p.last_name]
    .filter(Boolean).join(' ') || p.username || 'Unknown';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const Toast = ({ toast }) => {
  if (!toast.show) return null;
  return (
    <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border
      animate-in fade-in slide-in-from-top-4 duration-300
      ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
      {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> : <AlertCircle size={18} className="text-red-500 shrink-0" />}
      <p className="text-sm font-bold">{toast.message}</p>
    </div>
  );
};

const ACTION_CONFIG = {
  approve:    { label: 'Approve Account',    body: 'This will activate the account and allow the resident to log in.',               icon: UserCheck,    style: 'bg-[#006837] hover:bg-[#004d29] shadow-green-900/20' },
  deactivate: { label: 'Deactivate Account', body: 'This will deactivate the account. The resident will no longer be able to log in.',icon: UserX,        style: 'bg-red-500 hover:bg-red-600 shadow-red-500/20'         },
  delinquent: { label: 'Mark as Delinquent', body: 'This will flag the account as delinquent due to unpaid dues.',                   icon: AlertTriangle,style: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' },
  reactivate: { label: 'Re-activate Account',body: 'This will restore the account and allow the resident to log in again.',           icon: UserCheck,    style: 'bg-[#006837] hover:bg-[#004d29] shadow-green-900/20' },
};

const ConfirmDialog = ({ data, onConfirm, onCancel, loading }) => {
  if (!data) return null;
  const cfg  = ACTION_CONFIG[data.action] || ACTION_CONFIG.approve;
  const Icon = cfg.icon;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4
            ${data.action === 'approve' || data.action === 'reactivate' ? 'bg-emerald-50' : data.action === 'delinquent' ? 'bg-orange-50' : 'bg-red-50'}`}>
            <Icon size={26} className={data.action === 'approve' || data.action === 'reactivate' ? 'text-emerald-600' : data.action === 'delinquent' ? 'text-orange-500' : 'text-red-500'} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">{cfg.label}</h3>
          <p className="text-sm text-slate-500 mb-1">{cfg.body}</p>
          <p className="text-sm font-bold text-slate-700 mb-6">{fullName(data.profile)}</p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} disabled={loading} className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className={`flex-1 py-3 rounded-2xl text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 ${cfg.style}`}>
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Processing…</> : <><Icon size={14} /> {cfg.label.split(' ')[0]}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
// embedded=true  → no page wrapper, no standalone header (used as a tab in ResidentManage)
// embedded=false → standalone page with full padding + header
const AccountApproval = ({ embedded = false, onDataChange }) => {
  const [profiles,        setProfiles]        = useState([]);
  const [filtered,        setFiltered]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [actionLoading,   setActionLoading]   = useState(false);
  const [activeTab,       setActiveTab]       = useState('pending');
  const [search,          setSearch]          = useState('');
  const [residentFilter,  setResidentFilter]  = useState('all');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [confirmData,     setConfirmData]     = useState(null);
  const [toast,           setToast]           = useState({ show: false, message: '', type: 'success' });

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
      onDataChange?.();
    } catch (e) { showToast('Failed to load profiles: ' + e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  useEffect(() => {
    const term = search.toLowerCase().trim();
    setFiltered(
      profiles
        .filter(p => p.account_status === activeTab)
        .filter(p => residentFilter === 'all' || p.id === residentFilter)
        .filter(p => !term ||
          fullName(p).toLowerCase().includes(term) ||
          (p.email || '').toLowerCase().includes(term) ||
          (p.username || '').toLowerCase().includes(term) ||
          (p.block || '').toLowerCase().includes(term) ||
          (p.lot || '').toLowerCase().includes(term)
        )
    );
  }, [profiles, activeTab, search, residentFilter]);

  const counts = profiles.reduce((acc, p) => {
    acc[p.account_status] = (acc[p.account_status] || 0) + 1;
    return acc;
  }, {});
  const { paginated: paginatedFiltered, page: accPage, setPage: setAccPage, totalPages: accTotalPages } = usePagination(filtered, 10);

  const runAction = async (newStatus, auditAction, successMsg, errorMsg) => {
    if (!confirmData) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ account_status: newStatus }).eq('id', confirmData.profile.id);
      if (error) throw error;
      await logAudit(auditAction, `${fullName(confirmData.profile)} — ${auditAction}`);
      showToast(successMsg);
      setConfirmData(null); setSelectedProfile(null); fetchProfiles();
    } catch (e) { showToast(errorMsg + e.message, 'error'); }
    finally { setActionLoading(false); }
  };

  const handleApprove    = () => runAction('active',      'APPROVE_ACCOUNT',    `${fullName(confirmData.profile)}'s account has been approved!`,     'Approval failed: ');
  const handleDeactivate = () => runAction('deactivated', 'DEACTIVATE_ACCOUNT', `${fullName(confirmData.profile)}'s account has been deactivated.`,   'Deactivation failed: ');
  const handleDelinquent = () => runAction('delinquent',  'MARK_DELINQUENT',    `${fullName(confirmData.profile)} has been marked as delinquent.`,     'Action failed: ');
  const handleReactivate = () => runAction('active',      'REACTIVATE_ACCOUNT', `${fullName(confirmData.profile)}'s account has been re-activated.`,   'Re-activation failed: ');
  const ACTION_HANDLER   = { approve: handleApprove, deactivate: handleDeactivate, delinquent: handleDelinquent, reactivate: handleReactivate };

  const trigger = (action, profile, e) => { e?.stopPropagation(); setConfirmData({ action, profile }); };

  return (
    <div className={embedded ? 'space-y-5' : 'min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6'}>
      <Toast toast={toast} />
      <ConfirmDialog data={confirmData} onConfirm={ACTION_HANDLER[confirmData?.action]} onCancel={() => setConfirmData(null)} loading={actionLoading} />

      {/* Shared external detail modal */}
      <ResidentDetailModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        currentUserRole={currentUserRole}
        onApprove={p       => { setSelectedProfile(null); setConfirmData({ action: 'approve',    profile: p }); }}
        onDeactivate={p    => { setSelectedProfile(null); setConfirmData({ action: 'deactivate', profile: p }); }}
        onMarkDelinquent={p=> { setSelectedProfile(null); setConfirmData({ action: 'delinquent', profile: p }); }}
        onReactivate={p    => { setSelectedProfile(null); setConfirmData({ action: 'reactivate', profile: p }); }}
        actionLoading={actionLoading}
      />

      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <UserCheck size={22} className="text-[#006837]" /> Account Approval
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Review and manage resident account statuses</p>
          </div>
          <button onClick={fetchProfiles} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      )}

      {/* Embedded refresh button */}
      {embedded && (
        <div className="flex justify-end">
          <button onClick={fetchProfiles} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_TABS.map(tab => (
          <div key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-md
              ${activeTab === tab.key ? 'border-[#006837] shadow-md ring-1 ring-[#006837]/20' : 'border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tab.label}</p>
                <p className="text-3xl font-black text-slate-900">{counts[tab.key] || 0}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${tab.bg} flex items-center justify-center`}>
                <span className={`w-3 h-3 rounded-full ${tab.dot}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {STATUS_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap
                  ${activeTab === tab.key ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
                {tab.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5 ${activeTab === tab.key ? 'bg-[#006837]/10 text-[#006837]' : 'bg-slate-200 text-slate-500'}`}>
                  {counts[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-52 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search name, email, block…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/30 focus:border-[#006837] transition-all" />
          </div>
          {/* Resident filter */}
          <select value={residentFilter} onChange={e => setResidentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] cursor-pointer sm:w-44 w-full">
            <option value="all">All Residents</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{fullName(p)}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium animate-pulse">Loading accounts…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <UserCheck size={40} className="text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-400">{search ? 'No results found' : `No ${activeTab} accounts`}</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Resident','Contact','Block / Lot','Registered','Status','Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedFiltered.map(profile => {
                  const st   = profile.account_status;
                  const scfg = STATUS_CFG[st] || {};
                  return (
                    <tr key={profile.id} onClick={() => setSelectedProfile(profile)} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006837]/80 to-[#34a853]/80 flex items-center justify-center text-white font-bold text-sm uppercase shrink-0 overflow-hidden">
                            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile.first_name?.charAt(0) || '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{fullName(profile)}</p>
                            <p className="text-xs text-slate-400 truncate">@{profile.username || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-600 truncate max-w-[180px]">{profile.email || '—'}</p>
                        <p className="text-xs text-slate-400">{profile.phone || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-700">{[profile.block && `Block ${profile.block}`, profile.lot && `Lot ${profile.lot}`].filter(Boolean).join(', ') || '—'}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[120px]">{profile.street || ''}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(profile.created_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${scfg.badge || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot || 'bg-slate-300'}`} />{scfg.label || st}
                        </span>
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {st === 'pending'     && <><button onClick={e => trigger('deactivate', profile, e)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg cursor-pointer"><UserX size={13} /></button><button onClick={e => trigger('approve', profile, e)} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg cursor-pointer"><UserCheck size={13} /></button></>}
                          {st === 'active'      && <><button onClick={e => trigger('delinquent', profile, e)} className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-500 rounded-lg cursor-pointer"><AlertTriangle size={13} /></button><button onClick={e => trigger('deactivate', profile, e)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg cursor-pointer"><XCircle size={13} /></button></>}
                          {st === 'deactivated' && <><button onClick={e => trigger('delinquent', profile, e)} className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-500 rounded-lg cursor-pointer"><AlertTriangle size={13} /></button><button onClick={e => trigger('reactivate', profile, e)} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg cursor-pointer"><UserCheck size={13} /></button></>}
                          {st === 'delinquent'  && <button onClick={e => trigger('reactivate', profile, e)} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg cursor-pointer"><UserCheck size={13} /></button>}
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
          <PaginationBar page={accPage} totalPages={accTotalPages} setPage={setAccPage} total={filtered.length} rowsPerPage={10} />
        )}
      </div>
    </div>
  );
};

export default AccountApproval;
