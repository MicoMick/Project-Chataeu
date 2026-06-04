import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger'; // AUDIT TRAIL
import {
  UserCheck, UserX, Search, RefreshCw, CheckCircle2,
  AlertCircle, Clock, ShieldCheck, XCircle, ChevronDown,
  User, Mail, MapPin, Phone, Home, Eye, X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending',  color: 'text-amber-600',  bg: 'bg-amber-50',  dot: 'bg-amber-400'  },
  { key: 'active',   label: 'Approved', color: 'text-emerald-600',bg: 'bg-emerald-50',dot: 'bg-emerald-400' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-500',    bg: 'bg-red-50',    dot: 'bg-red-400'    },
];

const STATUS_BADGE = {
  pending:  { label: 'Pending',  classes: 'bg-amber-50 text-amber-700 border border-amber-200'   },
  active:   { label: 'Active',   classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  rejected: { label: 'Rejected', classes: 'bg-red-50 text-red-600 border border-red-200'          },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (p) =>
  [p.first_name, p.middle_initial ? p.middle_initial + '.' : '', p.last_name]
    .filter(Boolean).join(' ') || p.username || 'Unknown';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// logActivity replaced by logAudit from auditLogger.js

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast = ({ toast }) => {
  if (!toast.show) return null;
  return (
    <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border
      animate-in fade-in slide-in-from-top-4 duration-300
      ${toast.type === 'success'
        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
        : 'bg-red-50 border-red-100 text-red-800'}`}>
      {toast.type === 'success'
        ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
        : <AlertCircle  size={18} className="text-red-500 shrink-0"     />}
      <p className="text-sm font-bold">{toast.message}</p>
    </div>
  );
};

// ─── Profile Detail Modal ─────────────────────────────────────────────────────

const ProfileModal = ({ profile, onClose, onApprove, onReject, loading }) => {
  if (!profile) return null;

  const fields = [
    { icon: Mail,    label: 'Email',          value: profile.email    },
    { icon: Phone,   label: 'Phone',          value: profile.phone    },
    { icon: Home,    label: 'Block / Lot',    value: [profile.block, profile.lot].filter(Boolean).join(' / ') || null },
    { icon: MapPin,  label: 'Street',         value: profile.street   },
    { icon: MapPin,  label: 'Address',        value: profile.address  },
    { icon: User,    label: 'Resident Type',  value: profile.resident_type   },
    { icon: Clock,   label: 'Duration',       value: profile.duration_of_resid },
    { icon: ShieldCheck, label: 'Role',       value: profile.role     },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#006837] to-[#34a853] flex items-center justify-center text-white font-black text-xl shadow-lg uppercase">
              {profile.first_name?.charAt(0) || profile.username?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">{fullName(profile)}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">@{profile.username || '—'}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                ${STATUS_BADGE[profile.account_status]?.classes || 'bg-slate-100 text-slate-500'}`}>
                {STATUS_BADGE[profile.account_status]?.label || profile.account_status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 py-5 grid grid-cols-1 gap-3">
          {fields.map(({ icon: Icon, label, value }) => value ? (
            <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <Icon size={15} className="text-[#006837] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-slate-700 break-words">{value}</p>
              </div>
            </div>
          ) : null)}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <Clock size={15} className="text-[#006837] mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered</p>
              <p className="text-sm font-semibold text-slate-700">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Actions — only show if pending */}
        {profile.account_status === 'pending' && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => onReject(profile)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100
                text-red-600 font-bold text-sm rounded-2xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              <UserX size={16} /> Reject
            </button>
            <button
              onClick={() => onApprove(profile)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#006837] hover:bg-[#004d29]
                text-white font-bold text-sm rounded-2xl transition-colors disabled:opacity-50 shadow-lg
                shadow-green-900/20 cursor-pointer"
            >
              <UserCheck size={16} /> Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

const ConfirmDialog = ({ data, onConfirm, onCancel, loading }) => {
  if (!data) return null;
  const isApprove = data.action === 'approve';
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4
            ${isApprove ? 'bg-emerald-50' : 'bg-red-50'}`}>
            {isApprove
              ? <UserCheck size={26} className="text-emerald-600" />
              : <UserX     size={26} className="text-red-500"     />}
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">
            {isApprove ? 'Approve Account' : 'Reject Account'}
          </h3>
          <p className="text-sm text-slate-500 mb-1">
            {isApprove
              ? 'This will activate the account and allow the resident to log in.'
              : 'This will reject the account. The resident will be notified.'}
          </p>
          <p className="text-sm font-bold text-slate-700 mb-6">{fullName(data.profile)}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 rounded-2xl text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg
                ${isApprove
                  ? 'bg-[#006837] hover:bg-[#004d29] shadow-green-900/20'
                  : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}
                disabled:opacity-60`}
            >
              {loading
                ? <><RefreshCw size={14} className="animate-spin" /> Processing…</>
                : isApprove ? <><UserCheck size={14} /> Approve</> : <><UserX size={14} /> Reject</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AccountApproval = () => {
  const [profiles,       setProfiles]       = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [activeTab,      setActiveTab]      = useState('pending');
  const [search,         setSearch]         = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [confirmData,    setConfirmData]    = useState(null); // { action, profile }
  const [toast,          setToast]          = useState({ show: false, message: '', type: 'success' });

  // ── Toast helper ──
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // ── Fetch ──
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (e) {
      showToast('Failed to load profiles: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // ── Filter whenever tab / search / profiles change ──
  useEffect(() => {
    const term = search.toLowerCase().trim();
    const result = profiles
      .filter((p) => p.account_status === activeTab)
      .filter((p) => {
        if (!term) return true;
        return (
          fullName(p).toLowerCase().includes(term)   ||
          (p.email     || '').toLowerCase().includes(term) ||
          (p.username  || '').toLowerCase().includes(term) ||
          (p.block     || '').toLowerCase().includes(term) ||
          (p.lot       || '').toLowerCase().includes(term)
        );
      });
    setFiltered(result);
  }, [profiles, activeTab, search]);

  // ── Counts per tab ──
  const counts = profiles.reduce((acc, p) => {
    acc[p.account_status] = (acc[p.account_status] || 0) + 1;
    return acc;
  }, {});

  // ── Approve handler ──
  const handleApprove = async () => {
    if (!confirmData) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', confirmData.profile.id);
      if (error) throw error;

      await logAudit('APPROVE_ACCOUNT', `${fullName(confirmData.profile)} account activated`);
      showToast(`${fullName(confirmData.profile)}'s account has been approved!`, 'success');
      setConfirmData(null);
      setSelectedProfile(null);
      fetchProfiles();
    } catch (e) {
      showToast('Approval failed: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject handler ──
  const handleReject = async () => {
    if (!confirmData) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'rejected' })
        .eq('id', confirmData.profile.id);
      if (error) throw error;

      await logAudit('REJECT_ACCOUNT', `${fullName(confirmData.profile)} account rejected`);
      showToast(`${fullName(confirmData.profile)}'s account has been rejected.`, 'success');
      setConfirmData(null);
      setSelectedProfile(null);
      fetchProfiles();
    } catch (e) {
      showToast('Rejection failed: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Trigger confirm from table row buttons ──
  const triggerApprove = (profile, e) => {
    e?.stopPropagation();
    setConfirmData({ action: 'approve', profile });
  };
  const triggerReject = (profile, e) => {
    e?.stopPropagation();
    setConfirmData({ action: 'reject', profile });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      <Toast toast={toast} />

      {/* Confirm dialog */}
      <ConfirmDialog
        data={confirmData}
        onConfirm={confirmData?.action === 'approve' ? handleApprove : handleReject}
        onCancel={() => setConfirmData(null)}
        loading={actionLoading}
      />

      {/* Profile detail modal */}
      <ProfileModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onApprove={(p) => { setSelectedProfile(null); setConfirmData({ action: 'approve', profile: p }); }}
        onReject ={(p) => { setSelectedProfile(null); setConfirmData({ action: 'reject',  profile: p }); }}
        loading={actionLoading}
      />

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <UserCheck size={22} className="text-[#006837]" />
            Account Approval
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Review and approve resident account registrations
          </p>
        </div>
        <button
          onClick={fetchProfiles}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl
            text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all cursor-pointer
            disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {STATUS_TABS.map((tab) => (
          <div key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md
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

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Table toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                  ${activeTab === tab.key ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
                {tab.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5
                  ${activeTab === tab.key ? 'bg-[#006837]/10 text-[#006837]' : 'bg-slate-200 text-slate-500'}`}>
                  {counts[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, block…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm
                text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/30
                focus:border-[#006837] transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium animate-pulse">Loading accounts…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <UserCheck size={40} className="mb-3" />
              <p className="text-base font-bold text-slate-400">
                {search ? 'No results found' : `No ${activeTab} accounts`}
              </p>
              <p className="text-sm text-slate-300 mt-1">
                {search ? 'Try a different search term' : 'Nothing to review here'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Resident', 'Contact', 'Block / Lot', 'Registered', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((profile) => (
                  <tr
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Resident */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#006837]/80 to-[#34a853]/80
                          flex items-center justify-center text-white font-bold text-sm uppercase shrink-0">
                          {profile.first_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{fullName(profile)}</p>
                          <p className="text-xs text-slate-400 truncate">@{profile.username || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-600 truncate max-w-[180px]">{profile.email || '—'}</p>
                      <p className="text-xs text-slate-400">{profile.phone || '—'}</p>
                    </td>

                    {/* Block / Lot */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-700">
                        {[profile.block && `Block ${profile.block}`, profile.lot && `Lot ${profile.lot}`]
                          .filter(Boolean).join(', ') || '—'}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">{profile.street || ''}</p>
                    </td>

                    {/* Registered */}
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(profile.created_at)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full
                        ${STATUS_BADGE[profile.account_status]?.classes || 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full
                          ${profile.account_status === 'active'   ? 'bg-emerald-500' :
                            profile.account_status === 'rejected'  ? 'bg-red-400'    : 'bg-amber-400'}`} />
                        {STATUS_BADGE[profile.account_status]?.label || profile.account_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>

                        {profile.account_status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => triggerReject(profile, e)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors cursor-pointer"
                              title="Reject account"
                            >
                              <UserX size={14} />
                            </button>
                            <button
                              onClick={(e) => triggerApprove(profile, e)}
                              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title="Approve account"
                            >
                              <UserCheck size={14} />
                            </button>
                          </>
                        )}

                        {profile.account_status === 'active' && (
                          <button
                            onClick={(e) => triggerReject(profile, e)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Revoke account"
                          >
                            <XCircle size={14} />
                          </button>
                        )}

                        {profile.account_status === 'rejected' && (
                          <button
                            onClick={(e) => triggerApprove(profile, e)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Re-approve account"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-600">{filtered.length}</span> {activeTab} account{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountApproval;
