import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import {
  ClipboardList, ChevronDown, ChevronUp, Check, X,
  CheckCircle2, AlertCircle, AlertTriangle, RefreshCw,
  Calendar, User, Home, FileText, Search, Filter,
  ExternalLink, MapPin, Clock, Shield,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   dot: 'bg-amber-400',   label: 'Pending'  },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-400', label: 'Approved' },
  rejected: { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100',     dot: 'bg-red-400',     label: 'Rejected' },
};

const StatusPill = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const Toast = ({ toast }) => {
  if (!toast.show) return null;
  return (
    <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border
      animate-in fade-in slide-in-from-top-4 duration-300
      ${toast.type === 'success'
        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
        : 'bg-red-50 border-red-100 text-red-800'}`}>
      {toast.type === 'success'
        ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        : <AlertCircle  size={16} className="text-red-500 shrink-0"     />}
      <p className="text-sm font-bold">{toast.message}</p>
    </div>
  );
};

// ── Extract the storage path from a full Supabase Storage URL ────────────────
// e.g. "https://….supabase.co/storage/v1/object/public/move-in-docs/proof-of-ownership/file.jpg"
//   → "proof-of-ownership/file.jpg"
const extractStoragePath = (value) => {
  if (!value) return null;
  // Already a bare path (no protocol)
  if (!value.startsWith('http')) return value;
  // Pull everything after the bucket name in the URL
  const marker = '/move-in-docs/';
  const idx = value.indexOf(marker);
  if (idx !== -1) return value.slice(idx + marker.length);
  return null;
};

// ── DocLink — opens a signed URL for a private bucket file ───────────────────
// The bucket "move-in-docs" is PRIVATE, so public URLs return 404.
// createSignedUrl generates a short-lived (60 min) authenticated link.
const DocLink = ({ value }) => {
  const [loading, setLoading] = React.useState(false);
  const [err,     setErr]     = React.useState(false);

  const handleOpen = async () => {
    setLoading(true);
    setErr(false);
    try {
      const path = extractStoragePath(value);
      if (!path) throw new Error('Cannot resolve path');
      const { data, error } = await supabase.storage
        .from('move-in-docs')
        .createSignedUrl(path, 3600); // 1-hour signed URL
      if (error || !data?.signedUrl) throw error || new Error('No URL');
      window.open(data.signedUrl, '_blank', 'noreferrer');
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  };

  if (err) return <span className="text-sm text-red-400 italic">Failed to open — check storage permissions</span>;

  return (
    <button
      onClick={handleOpen}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm font-semibold text-[#006837] hover:underline cursor-pointer disabled:opacity-60">
      {loading
        ? <><span className="w-3 h-3 border-2 border-[#006837]/30 border-t-[#006837] rounded-full animate-spin" /> Opening…</>
        : <><ExternalLink size={12} /> View Document</>}
    </button>
  );
};

const DetailRow = ({ label, value, url }) => {
  if (!value) return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-40">{label}</span>
      <span className="text-sm text-slate-300 italic">Not provided</span>
    </div>
  );

  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-40">{label}</span>
      {url
        ? <DocLink value={value} />
        : <span className="text-sm font-semibold text-slate-700 text-right max-w-[260px] break-words">{value}</span>
      }
    </div>
  );
};

// ─── Reject Notes Modal ───────────────────────────────────────────────────────
const RejectModal = ({ request, onClose, onConfirm, loading }) => {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <X size={22} className="text-red-500" />
        </div>
        <h3 className="text-lg font-black text-slate-900 mb-1">Reject Clearance?</h3>
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
          This will notify the resident that their clearance was rejected.
          You may add a note explaining why.
        </p>
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Admin Notes <span className="text-slate-300">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Missing barangay clearance document…"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] resize-none transition-all"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(notes)} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-100 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Rejecting…</> : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Accordion Row ────────────────────────────────────────────────────────────
const ClearanceRow = ({ item, onApprove, onReject, actionLoadingId }) => {
  const [open, setOpen] = useState(false);

  const residentName = item.profiles?.full_name || 'Unknown Resident';
  const isOwner      = (item.resident_type || '').toLowerCase() === 'owner';
  const isMoveIn     = !!item.move_in_date;
  const typeLabel    = isMoveIn ? 'MOVE IN' : 'MOVE OUT';
  const isLoading    = actionLoadingId === item.id;

  // Determine clearance type label to show in the accordion header
  // e.g. "JOHN MICO — MOVE IN APPROVAL"
  const headerLabel = `${residentName.toUpperCase()} — ${typeLabel} APPROVAL`;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200
      ${open ? 'border-[#006837]/30 shadow-md' : 'border-slate-100 shadow-sm'}
      ${item.status === 'approved' ? 'border-l-4 border-l-emerald-400' :
        item.status === 'rejected' ? 'border-l-4 border-l-red-400'    :
        'border-l-4 border-l-amber-400'}`}>

      {/* ── Accordion Header / Trigger ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-slate-50/60 transition-colors cursor-pointer text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-[#006837]/10 text-[#006837] flex items-center justify-center font-black text-sm uppercase shrink-0">
          {residentName.charAt(0)}
        </div>

        {/* Label + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800 truncate">{headerLabel}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
              ${isMoveIn ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
              {typeLabel}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 capitalize">
              {item.resident_type || 'Unknown type'}
            </span>
            <span className="text-[10px] text-slate-400">
              Submitted {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Status pill */}
        <StatusPill status={item.status} />

        {/* Chevron */}
        <div className="text-slate-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Expanded Details ── */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40">

          {/* Resident info header — mirrors the physical form header */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 bg-white">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#006837]/10 rounded-xl shrink-0">
                <ClipboardList size={16} className="text-[#006837]" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  CREVHAI Move In / Move Out Clearance
                </p>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  {residentName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[
                    item.profiles?.block && `Block ${item.profiles.block}`,
                    item.profiles?.lot   && `Lot ${item.profiles.lot}`,
                    item.profiles?.street,
                  ].filter(Boolean).join(', ') || 'Chateau Real, Buenavista III, General Trias, Cavite'}
                </p>
              </div>
            </div>
          </div>

          {/* Detail fields */}
          <div className="px-5 py-4 space-y-0">

            {/* Clearance type section */}
            <div className="mb-3">
              <p className={`text-xs font-black uppercase tracking-widest mb-2 px-2 py-1 rounded-lg inline-block
                ${isMoveIn ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                {typeLabel} Details
              </p>
            </div>

            <DetailRow label="Resident Type" value={item.resident_type || '—'} />
            <DetailRow label="Move In Date"  value={item.move_in_date
              ? new Date(item.move_in_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : null} />

            {/* Documents — using the real DB column names */}
            {item.proof_of_ownership_url && (
              <DetailRow label="Proof of Ownership"
                value={item.proof_of_ownership_url} url={true} />
            )}
            {item.barangay_clearance_url && (
              <DetailRow label="Barangay Clearance"
                value={item.barangay_clearance_url} url={true} />
            )}
            {item.contract_copy_url && (
              <DetailRow label="Contract Copy"
                value={item.contract_copy_url} url={true} />
            )}
            {/* Show message if no documents submitted */}
            {!item.proof_of_ownership_url && !item.barangay_clearance_url && !item.contract_copy_url && (
              <div className="py-3 text-xs text-slate-400 italic">No documents submitted yet.</div>
            )}

            {/* Requirements checklist from the physical form */}
            <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Requirements Checklist
              </p>
              <div className="space-y-2">
                {isMoveIn && isOwner && [
                  'Orientation with HOA President or HOA Treasurer',
                ].map(req => (
                  <div key={req} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {req}
                  </div>
                ))}
                {isMoveIn && !isOwner && [
                  'HOA move out clearance or Barangay Clearance submitted',
                  'Xerox copy of contract submitted to HOA',
                  'Orientation with HOA President or Treasurer',
                ].map(req => (
                  <div key={req} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {req}
                  </div>
                ))}
                {!isMoveIn && [
                  'Cleared in all obligations with CREVHAI',
                  'Clearance from Homeowner or Agent (for Renter)',
                ].map(req => (
                  <div key={req} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {req}
                  </div>
                ))}
              </div>
            </div>

            {/* Review info (if already actioned) */}
            {(item.status === 'approved' || item.status === 'rejected') && (
              <div className={`mt-4 p-4 rounded-2xl border
                ${item.status === 'approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2
                  ${item.status === 'approved' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {item.status === 'approved' ? 'Approved' : 'Rejected'}
                </p>
                {item.reviewed_at && (
                  <p className="text-xs text-slate-600">
                    Reviewed on {new Date(item.reviewed_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                )}
                {item.admin_notes && (
                  <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                    <span className="font-bold">Notes: </span>{item.admin_notes}
                  </p>
                )}
              </div>
            )}

            {/* Submission date */}
            <DetailRow
              label="Date Submitted"
              value={new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            />
          </div>

          {/* Action buttons — only shown for pending */}
          {item.status === 'pending' && (
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => onReject(item)}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 transition-colors"
              >
                <X size={15} /> Reject
              </button>
              <button
                onClick={() => onApprove(item)}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#006837] hover:bg-[#004d29] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#006837]/20 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isLoading
                  ? <><RefreshCw size={14} className="animate-spin" /> Processing…</>
                  : <><Check size={15} /> Approve</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const MoveInClearance = () => {
  const [clearances,      setClearances]      = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [typeFilter,      setTypeFilter]      = useState('all');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [toast,           setToast]           = useState({ show: false, message: '', type: 'success' });
  const [rejectTarget,    setRejectTarget]    = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchClearances = async () => {
    setLoading(true);
    try {
      // Try with explicit FK hint first, fallback to simple join if it fails
      let { data, error } = await supabase
        .from('move_in_clearances')
        .select(`
          *,
          profiles!move_in_clearances_user_id_fkey (
            id, full_name, first_name, last_name, block, lot, street, email
          )
        `)
        .order('created_at', { ascending: false });

      // If FK hint fails, retry with simple join
      if (error || !data) {
        const retry = await supabase
          .from('move_in_clearances')
          .select(`*, profiles ( id, full_name, first_name, last_name, block, lot, street, email )`)
          .order('created_at', { ascending: false });
        data  = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      setClearances(data || []);
    } catch (e) {
      showToast('Failed to load clearances: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClearances(); }, []);

  // ── Auto-approve a resident's still-pending account when their Move In ───
  // clearance gets approved (mirrors the manual action in Account Approval /
  // Resident Management — saves the HOA an extra step).
  const autoApprovePendingAccount = async (profileId, residentName) => {
    if (!profileId) return;
    const { data: profile } = await supabase
      .from('profiles').select('account_status').eq('id', profileId).maybeSingle();
    if (profile?.account_status !== 'pending') return;

    const { error } = await supabase
      .from('profiles').update({ account_status: 'active' }).eq('id', profileId);
    if (error) return;

    await logAudit('APPROVE_ACCOUNT', `${residentName} — account auto-approved via Move In clearance approval`);
  };

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async (item) => {
    setActionLoadingId(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Only set reviewed_by if the user's id exists in profiles (avoids FK 409)
      let reviewedBy = null;
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (prof) reviewedBy = user.id;
      }

      const { error } = await supabase
        .from('move_in_clearances')
        .update({
          status:      'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          admin_notes: null,
        })
        .eq('id', item.id);

      if (error) throw error;

      await logAudit(
        'APPROVE_CLEARANCE',
        `Approved ${item.move_in_date ? 'Move In' : 'Move Out'} clearance for: ${item.profiles?.full_name} (ID: ${item.id})`
      );

      // Move In approvals also auto-approve the resident's pending account
      if (item.move_in_date) {
        await autoApprovePendingAccount(item.profiles?.id, item.profiles?.full_name || 'Resident');
      }

      showToast(`Clearance approved for ${item.profiles?.full_name || 'resident'}.`);
      fetchClearances();
    } catch (e) {
      showToast('Failed to approve: ' + e.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleRejectConfirm = async (notes) => {
    if (!rejectTarget) return;
    setActionLoadingId(rejectTarget.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Only set reviewed_by if the user's id exists in profiles (avoids FK 409)
      let reviewedBy = null;
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (prof) reviewedBy = user.id;
      }

      const { error } = await supabase
        .from('move_in_clearances')
        .update({
          status:      'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          admin_notes: notes || null,
        })
        .eq('id', rejectTarget.id);

      if (error) throw error;

      await logAudit(
        'REJECT_CLEARANCE',
        `Rejected ${rejectTarget.move_in_date ? 'Move In' : 'Move Out'} clearance for: ${rejectTarget.profiles?.full_name} (ID: ${rejectTarget.id})`,
        'warning'
      );

      showToast(`Clearance rejected for ${rejectTarget.profiles?.full_name || 'resident'}.`);
      setRejectTarget(null);
      fetchClearances();
    } catch (e) {
      showToast('Failed to reject: ' + e.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Counts ────────────────────────────────────────────────────────────────
  const pendingCount  = clearances.filter(c => c.status === 'pending').length;
  const approvedCount = clearances.filter(c => c.status === 'approved').length;
  const rejectedCount = clearances.filter(c => c.status === 'rejected').length;

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = clearances.filter(c => {
    const name         = c.profiles?.full_name || '';
    const matchSearch  = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus  = statusFilter === 'all' || c.status === statusFilter;
    const matchType    = typeFilter === 'all' ||
      (typeFilter === 'move_in'  &&  c.move_in_date) ||
      (typeFilter === 'move_out' && !c.move_in_date);
    return matchSearch && matchStatus && matchType;
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      <Toast toast={toast} />

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          loading={actionLoadingId === rejectTarget.id}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-[#006837]" />
            Move In / Move Out Clearances
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Review and approve CREVHAI clearance requests from residents
          </p>
        </div>
        <button onClick={fetchClearances} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',  value: pendingCount,  color: 'text-amber-600',   bg: 'bg-amber-50',   dot: 'bg-amber-400',   status: 'pending'  },
          { label: 'Approved', value: approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400', status: 'approved' },
          { label: 'Rejected', value: rejectedCount, color: 'text-red-500',     bg: 'bg-red-50',     dot: 'bg-red-400',     status: 'rejected' },
        ].map(k => (
          <div key={k.label}
            onClick={() => setStatusFilter(prev => prev === k.status ? 'all' : k.status)}
            className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md
              ${statusFilter === k.status
                ? 'border-[#006837] ring-1 ring-[#006837]/20 shadow-md'
                : 'border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                <span className={`w-3 h-3 rounded-full ${k.dot}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search resident name…"
            className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all shadow-sm" />
        </div>

        {/* Type filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
          {[
            { val: 'all',       label: 'All'       },
            { val: 'move_in',   label: 'Move In'   },
            { val: 'move_out',  label: 'Move Out'  },
          ].map(f => (
            <button key={f.val} onClick={() => setTypeFilter(f.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap
                ${typeFilter === f.val ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
          {['all','pending','approved','rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap
                ${statusFilter === s ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 font-medium ml-auto">
          {filtered.length} clearance{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Accordion List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium animate-pulse">Loading clearances…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-300">
          <ClipboardList size={40} className="mb-3" />
          <p className="text-sm font-semibold text-slate-400">
            {searchTerm ? 'No clearances match your search' : `No ${statusFilter === 'all' ? '' : statusFilter} clearances`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <ClearanceRow
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={(item) => setRejectTarget(item)}
              actionLoadingId={actionLoadingId}
            />
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-center pb-4">
          Showing {filtered.length} of {clearances.length} clearance requests
        </p>
      )}
    </div>
  );
};

export default MoveInClearance;
