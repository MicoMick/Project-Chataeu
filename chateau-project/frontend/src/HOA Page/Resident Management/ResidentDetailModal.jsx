import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Mail, Phone, Home, MapPin, Users, ShieldCheck, Clock,
  CreditCard, CheckCircle2, AlertCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import { supabase } from '../supabaseAdmin';

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CFG = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       header: 'from-amber-400 to-amber-500'   },
  active:      { label: 'Active',      dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', header: 'from-[#006837] to-[#34a853]'  },
  deactivated: { label: 'Deactivated', dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600 border-red-200',             header: 'from-red-500 to-red-600'       },
  delinquent:  { label: 'Delinquent',  dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200',    header: 'from-orange-500 to-orange-600' },
};

export const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || { label: status || '—', dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500 border-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtMonth = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

const fullName = (p) =>
  [p.first_name, p.middle_initial ? p.middle_initial + '.' : '', p.last_name]
    .filter(Boolean).join(' ') || p.username || 'Unknown';

// ─── Detail row ───────────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-[#006837]/10 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={15} className="text-[#006837]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words leading-snug">{value || '—'}</p>
    </div>
  </div>
);

// ─── Resident Type row ────────────────────────────────────────────────────────
const RESIDENT_TYPE_CFG = {
  owner:     { label: 'Owner',     bg: 'bg-[#006837]/10', text: 'text-[#006837]', border: 'border-[#006837]/20', dot: 'bg-[#006837]' },
  homeowner: { label: 'Homeowner', bg: 'bg-[#006837]/10', text: 'text-[#006837]', border: 'border-[#006837]/20', dot: 'bg-[#006837]' },
  renter:    { label: 'Renter',    bg: 'bg-blue-50',      text: 'text-blue-700',  border: 'border-blue-200',     dot: 'bg-blue-400'  },
  tenant:    { label: 'Tenant',    bg: 'bg-blue-50',      text: 'text-blue-700',  border: 'border-blue-200',     dot: 'bg-blue-400'  },
};

const ResidentTypeRow = ({ value }) => {
  const key = (value || '').toLowerCase().trim();
  const cfg = RESIDENT_TYPE_CFG[key] || { label: value || '—', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-[#006837]/10 flex items-center justify-center shrink-0 mt-0.5">
        <Users size={15} className="text-[#006837]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Resident Type</p>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-black ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
    </div>
  );
};

// ─── Dues Standing Section ────────────────────────────────────────────────────
const DuesStanding = ({ userId }) => {
  const [dues,    setDues]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('payments')
        .select('id, amount, status, due_date, paid_at, reference_no')
        .eq('user_id', userId)
        .order('due_date', { ascending: false })
        .limit(6); // show last 6 months
      setDues(data || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  // Summary counts
  const totalUnpaid = dues.filter(d => ['unpaid','overdue','pending'].includes((d.status||'').toLowerCase())).length;
  const totalPaid   = dues.filter(d => d.status?.toLowerCase() === 'paid').length;
  const totalOwed   = dues.filter(d => ['unpaid','overdue','pending'].includes((d.status||'').toLowerCase()))
                          .reduce((s, d) => s + Number(d.amount || 0), 0);

  const statusStyle = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'paid':    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={12} className="text-emerald-500" /> };
      case 'overdue': return { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     icon: <AlertCircle  size={12} className="text-red-500"     /> };
      case 'unpaid':  return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: <AlertTriangle size={12} className="text-amber-500"  /> };
      default:        return { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   icon: <AlertTriangle size={12} className="text-slate-400"  /> };
    }
  };

  return (
    <div className="px-5 pb-5 pt-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#006837]/10 flex items-center justify-center">
            <CreditCard size={15} className="text-[#006837]" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Monthly Dues Standing</p>
            <p className="text-[10px] text-slate-400">Last 6 months</p>
          </div>
        </div>
        {/* Quick summary badges */}
        {!loading && dues.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              {totalPaid} Paid
            </span>
            {totalUnpaid > 0 && (
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                {totalUnpaid} Unpaid
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 size={16} className="animate-spin text-[#006837]" />
          <p className="text-xs text-slate-400">Loading dues…</p>
        </div>
      )}

      {/* No record */}
      {!loading && dues.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <CreditCard size={24} className="text-slate-300 mb-1.5" />
          <p className="text-xs font-semibold text-slate-400">No payment records found</p>
        </div>
      )}

      {/* Total owed banner — only if there are unpaid */}
      {!loading && totalOwed > 0 && (
        <div className="mb-3 flex items-center justify-between px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs font-bold text-red-700">Total Outstanding Balance</p>
          </div>
          <p className="text-sm font-black text-red-700">₱{totalOwed.toLocaleString()}</p>
        </div>
      )}

      {/* Dues list */}
      {!loading && dues.length > 0 && (
        <div className="space-y-2">
          {dues.map(d => {
            const s   = statusStyle(d.status);
            const isPaid = d.status?.toLowerCase() === 'paid';
            return (
              <div key={d.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.icon}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700">Due: {fmtMonth(d.due_date)}</p>
                    <p className="text-[10px] text-slate-400">
                      {isPaid
                        ? `Paid on ${fmtDate(d.paid_at)}`
                        : `Due by ${fmtDate(d.due_date)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className={`text-xs font-black ${s.text}`}>₱{Number(d.amount || 0).toLocaleString()}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${s.bg} ${s.text} ${s.border}`}>
                    {d.status || '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ResidentDetailModal = ({ profile, onClose }) => {
  if (!profile) return null;

  const st  = profile.account_status;
  const cfg = STATUS_CFG[st] || STATUS_CFG.active;

  const blockLot = [
    profile.block && `Block ${profile.block}`,
    profile.lot   && `Lot ${profile.lot}`,
  ].filter(Boolean).join(' / ') || null;

  const details = [
    { icon: Users,       label: 'Resident Type', value: profile.resident_type },
    { icon: MapPin,      label: 'Full Address',  value: profile.address       },
    { icon: Home,        label: 'Block / Lot',   value: blockLot              },
    { icon: MapPin,      label: 'Street',        value: profile.street        },
    { icon: Mail,        label: 'Email Address', value: profile.email         },
    { icon: Phone,       label: 'Phone Number',  value: profile.phone         },
    { icon: Clock,       label: 'Date Joined',   value: fmtDate(profile.created_at) },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Coloured header ── */}
        <div className={`bg-gradient-to-br ${cfg.header} px-6 pt-5 pb-6`}>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-bold cursor-pointer transition-colors group mb-5"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden shrink-0 flex items-center justify-center text-white text-2xl font-black uppercase">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (profile.first_name?.charAt(0) || profile.username?.charAt(0) || '?')}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white leading-tight">{fullName(profile)}</h2>
              <p className="text-white/60 text-sm mt-0.5">@{profile.username || '—'}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wide border border-white/20 text-white">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column body: profile details (left) + dues standing (right) ── */}
        <div className="flex divide-x divide-slate-100">
          {/* Left — profile fields */}
          <div className="flex-1 px-6 pb-4 pt-2 min-w-0">
            {details.map(d =>
              d.label === 'Resident Type'
                ? <ResidentTypeRow key={d.label} value={d.value} />
                : <DetailRow key={d.label} {...d} />
            )}
          </div>
          {/* Right — dues standing */}
          <div className="w-72 shrink-0">
            <DuesStanding userId={profile.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentDetailModal;
