import React, { useState, useEffect, useRef } from 'react';
import {
  Search, FileText, AlertCircle, CheckCircle2,
  Eye, Trash2, X, User, Tag, Calendar, Send,
  ChevronDown, ImageIcon, Maximize2, Video,
  MoreHorizontal,
} from 'lucide-react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';

const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') return children;
  return null;
};

const STATUS_CONFIG = {
  'Pending':     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   dot: 'bg-amber-400'   },
  'In Progress': { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    dot: 'bg-blue-400'    },
  'Resolved':    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-400' },
  'On Hold':     { bg: 'bg-slate-100',  text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400'   },
  'Denied':      { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100',     dot: 'bg-red-400'     },
};

const StatusPill = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border
      ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const KpiCard = ({ label, value, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-xl ${iconBg}`}><Icon size={20} className={iconColor} /></div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

// ─── Portal dropdown — renders at fixed screen position, never clipped ────────
const PortalMenu = ({ anchorRef, open, onClose, children }) => {
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top:   rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
  }, [open, anchorRef]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[500]" onClick={onClose} />
      <div
        style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 501 }}
        className="w-44 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {children}
      </div>
    </>
  );
};

// ─── Row action menu ──────────────────────────────────────────────────────────
const RowMenu = ({ report, currentUserRole, onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
      >
        <MoreHorizontal size={16} />
      </button>

      <PortalMenu anchorRef={btnRef} open={open} onClose={() => setOpen(false)}>
        <div className="p-1.5 space-y-0.5">
          <button
            onClick={() => { onView(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
          >
            <Eye size={14} /> View & Respond
          </button>
          <RequireRole userRole={currentUserRole} allowedRoles={['president', 'secretary']}>
            <div className="border-t border-slate-50 my-1" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Delete Report
            </button>
          </RequireRole>
        </div>
      </PortalMenu>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const Reports = () => {
  const [activeFilter,           setActiveFilter]           = useState('All');
  const [searchQuery,            setSearchTerm]             = useState('');
  const [selectedResidentFilter, setSelectedResidentFilter] = useState('All');
  const [selectedReport,         setSelectedReport]         = useState(null);
  const [isImageExpanded,        setIsImageExpanded]        = useState(false);
  const [reports,                setReports]                = useState([]);
  const [loading,                setLoading]                = useState(true);
  const [toast,                  setToast]                  = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirmation,     setDeleteConfirmation]     = useState({ show: false, id: null });
  const [feedbackText,           setFeedbackText]           = useState('');
  const [previousFeedback,       setPreviousFeedback]       = useState([]);
  const [selectedStatus,         setSelectedStatus]         = useState('');

  const filters = ['All', 'Pending', 'In Progress', 'Resolved', 'On Hold', 'Denied'];
  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchPreviousFeedback = async (reportId) => {
    try {
      const { data } = await supabase
        .from('notifications').select('message, created_at')
        .eq('report_id', reportId).order('created_at', { ascending: false });
      setPreviousFeedback(data || []);
    } catch (e) { console.error('Error fetching feedback:', e.message); }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchPreviousFeedback(selectedReport.id);
      setSelectedStatus(selectedReport.status);
    } else {
      setPreviousFeedback([]);
    }
  }, [selectedReport]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select(`id, user_id, category, description, photo_url, video_url, created_at, status, profiles(full_name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setReports(data.map(item => ({
          id:             item.id,
          user_id:        item.user_id,
          resident:       item.profiles?.full_name || 'Unknown Resident',
          category:       item.category,
          description:    item.description,
          status:         item.status || 'Pending',
          created_at_iso: item.created_at,
          date:           new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          rptNo:          `RPT-${item.id.toString().slice(0,4).toUpperCase()}`,
          imageUrl:       item.photo_url || null,
          videoUrl:       item.video_url || null,
        })));
      }
    } catch (e) { console.error('Error fetching reports:', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, fetchReports)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const today         = new Date().toISOString().split('T')[0];
  const currentMonth  = new Date().getMonth();
  const currentYear   = new Date().getFullYear();
  const dailyReceived   = reports.filter(r => r.created_at_iso?.startsWith(today)).length;
  const monthlyReceived = reports.filter(r => {
    const d = new Date(r.created_at_iso);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const residentOptions = [...new Set(reports.map(r => r.resident))].sort();

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return showToast('Please write a message', 'error');
    try {
      const { error: statusError } = await supabase
        .from('reports').update({ status: selectedStatus }).eq('id', selectedReport.id);
      if (statusError) throw statusError;

      const { error: notifError } = await supabase.from('notifications').insert([{
        user_id:   selectedReport.user_id,
        report_id: selectedReport.id,
        title:     `Status Update: ${selectedReport.category}`,
        message:   feedbackText,
        is_read:   false,
      }]);
      if (notifError) throw notifError;

      await logAudit('UPDATE_REPORT_STATUS', `Set status to "${selectedStatus}" for report ID: ${selectedReport.id}`);
      setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: selectedStatus } : r));
      setSelectedReport(prev => ({ ...prev, status: selectedStatus }));
      showToast('Feedback sent and status updated!');
      setFeedbackText('');
      fetchPreviousFeedback(selectedReport.id);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDeleteReport = async () => {
    const id = deleteConfirmation.id;
    try {
      await supabase.from('notifications').delete().eq('report_id', id);
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
      await logAudit('DELETE_REPORT', `Deleted report ID: ${id}`);
      setDeleteConfirmation({ show: false, id: null });
      showToast('Report deleted successfully');
      fetchReports();
    } catch (e) { showToast('Error deleting report: ' + e.message, 'error'); }
  };

  const filteredReports = reports.filter(report => {
    const matchesFilter   = activeFilter === 'All' || report.status.toLowerCase() === activeFilter.toLowerCase();
    const matchesResident = selectedResidentFilter === 'All' || report.resident === selectedResidentFilter;
    const matchesSearch   = report.resident.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            report.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            report.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch && matchesResident;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[400] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border
          animate-in fade-in slide-in-from-top-4 duration-300
          ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white p-7 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Delete Report?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmation({ show: false, id: null })}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDeleteReport}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-100 cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Resident Reports</h1>
        <p className="text-sm text-slate-400 mt-0.5">Review and respond to resident-submitted issues</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Received Today"      value={dailyReceived}   icon={FileText}     iconBg="bg-blue-50"    iconColor="text-blue-600"    />
        <KpiCard label="Received This Month" value={monthlyReceived} icon={Calendar}     iconBg="bg-purple-50"  iconColor="text-purple-600"  />
        <KpiCard label="Total Resolved"      value={resolvedCount}   icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="relative w-full lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all"
              placeholder="Search reports…"
              value={searchQuery}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center lg:ml-auto">
            <select
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer"
              value={selectedResidentFilter}
              onChange={e => setSelectedResidentFilter(e.target.value)}
            >
              <option value="All">All Residents</option>
              {residentOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 flex-wrap">
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap
                    ${activeFilter === f ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table — note: NO overflow-hidden here so dropdowns escape freely */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium animate-pulse">Loading reports…</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-slate-300">
              <FileText size={40} className="mb-3" />
              <p className="text-sm font-semibold text-slate-400">No reports found for "{activeFilter}"</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Resident','Category','Description','Status','Date',''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReports.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#006837]/10 flex items-center justify-center text-[#006837] font-bold text-xs uppercase shrink-0">
                          {report.resident.charAt(0)}
                        </div>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[140px]">{report.resident}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg capitalize">
                        {report.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-500 truncate max-w-[200px]">{report.description}</p>
                    </td>
                    <td className="px-5 py-4"><StatusPill status={report.status} /></td>
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{report.date}</td>
                    <td className="px-5 py-4 text-right">
                      <RowMenu
                        report={report}
                        currentUserRole={currentUserRole}
                        onView={() => setSelectedReport(report)}
                        onDelete={() => setDeleteConfirmation({ show: true, id: report.id })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredReports.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
              {activeFilter !== 'All' ? ` • Filtered by "${activeFilter}"` : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Detail / Feedback Modal ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-900">{selectedReport.category}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedReport.rptNo}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={selectedStatus} />
                <button onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><User size={14} className="text-slate-300" />{selectedReport.resident}</span>
                <span className="flex items-center gap-1.5"><Tag size={14} className="text-slate-300" />{selectedReport.category}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-300" />{selectedReport.date}</span>
              </div>

              {selectedReport.imageUrl && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ImageIcon size={13} /> Attached Photo
                  </p>
                  <div onClick={() => setIsImageExpanded(true)}
                    className="relative cursor-pointer w-full h-56 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={selectedReport.imageUrl} alt="Report attachment" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white/90 p-2.5 rounded-full shadow-lg"><Maximize2 size={18} className="text-slate-900" /></div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReport.videoUrl && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Video size={13} /> Attached Video
                  </p>
                  <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-900">
                    <video src={selectedReport.videoUrl} controls className="w-full max-h-[360px] object-contain">
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText size={13} /> Resident's Message
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-100">
                  {selectedReport.description}
                </div>
              </div>

              {previousFeedback.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Previous Responses</p>
                  <div className="space-y-2">
                    {previousFeedback.map((fb, i) => (
                      <div key={i} className="bg-[#006837]/5 border border-[#006837]/10 rounded-2xl p-3.5">
                        <p className="text-sm text-slate-700 leading-relaxed">{fb.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          {new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100" />

              <RequireRole userRole={currentUserRole} allowedRoles={['president','secretary','vice_president']}>
                <div className="space-y-4">
                  <p className="text-sm font-black text-slate-700">Send Feedback to Resident</p>
                  <div className="relative w-52">
                    <select
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700
                        focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] cursor-pointer transition-all"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Denied">Denied</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <textarea
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 placeholder-slate-300
                      focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] resize-none transition-all"
                    rows={4}
                    placeholder="Write your feedback or response to the resident…"
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                  />
                  <button onClick={handleSendFeedback}
                    className="flex items-center gap-2 bg-[#006837] hover:bg-[#004d29] text-white px-6 py-3 rounded-xl
                      text-sm font-bold transition-all shadow-lg shadow-[#006837]/20 active:scale-95 cursor-pointer">
                    <Send size={15} /> Send Feedback
                  </button>
                </div>
              </RequireRole>
            </div>
          </div>
        </div>
      )}

      {/* Expanded image */}
      {isImageExpanded && selectedReport?.imageUrl && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsImageExpanded(false)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white cursor-pointer"><X size={28} /></button>
          <img src={selectedReport.imageUrl} alt="Expanded" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default Reports;
