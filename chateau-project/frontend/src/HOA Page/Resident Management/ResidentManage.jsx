import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseAdmin';
import { logAudit } from '../auditLogger';
import {
  Users, UserPlus, UserCheck, Search, X,
  Home, AlertTriangle, Eye, Edit2, Trash2,
  RefreshCw, CheckCircle2, Info,
} from 'lucide-react';

const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') return children;
  return null;
};

const KpiCard = ({ title, value, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
      <div className={`p-2.5 rounded-xl ${iconBg}`}><Icon size={18} className={iconColor} /></div>
    </div>
  </div>
);

const Toast = ({ toast }) => {
  if (!toast.show) return null;
  return (
    <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border
      animate-in fade-in slide-in-from-top-4 duration-300
      ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
      : toast.type === 'info'    ? 'bg-blue-50 border-blue-100 text-blue-800'
      :                            'bg-red-50 border-red-100 text-red-800'}`}>
      {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" />
      : toast.type === 'info'   ? <Info          size={16} className="text-blue-500"    />
      :                           <AlertTriangle  size={16} className="text-red-500"     />}
      <p className="text-sm font-bold">{toast.message}</p>
    </div>
  );
};

const ResidentManage = () => {
  const [residents,        setResidents]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [showEditModal,    setShowEditModal]     = useState(false);
  const [residentToDelete, setResidentToDelete] = useState(null);
  const [isSaving,         setIsSaving]         = useState(false);
  const [toast,            setToast]            = useState({ show: false, message: '', type: 'success' });

  const [editFields, setEditFields] = useState({
    full_name: '', email: '', first_name: '', last_name: '',
    middle_initial: '', username: '', resident_type: '',
    address: '', street: '', phone: '',
  });

  const currentUserRole = localStorage.getItem('userRole') || 'resident';
  const isPresident  = currentUserRole === 'president';
  const isSecretary  = currentUserRole === 'secretary';

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setResidents(data || []);
    } catch (e) {
      showToast('Failed to load residents: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResidents(); }, []);

  useEffect(() => {
    if (selectedResident) {
      setEditFields({
        full_name:      selectedResident.full_name      || '',
        email:          selectedResident.email          || '',
        first_name:     selectedResident.first_name     || '',
        last_name:      selectedResident.last_name      || '',
        middle_initial: selectedResident.middle_initial || '',
        username:       selectedResident.username       || '',
        resident_type:  selectedResident.resident_type  || '',
        address:        selectedResident.address        || '',
        street:         selectedResident.street         || '',
        phone:          selectedResident.phone          || '',
      });
    }
  }, [selectedResident]);

  // ── Save handler — President saves directly; Secretary submits for approval ──
  const handleUpdateResident = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isPresident) {
        // President: direct save
        const { error } = await supabase
          .from('profiles')
          .update(editFields)
          .eq('id', selectedResident.id);
        if (error) throw error;
        await logAudit('UPDATE_RESIDENT', `President updated resident profile ID: ${selectedResident.id}`);
        showToast('Resident updated successfully.');
        fetchResidents();
      } else if (isSecretary) {
        // Secretary: submit to approval_requests for President review
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('approval_requests').insert([{
          target_table:   'profiles',
          target_id:      selectedResident.id,
          action_type:    'UPDATE',
          requested_data: editFields,
          status:         'PENDING',
          requested_by:   user?.id || null,
        }]);
        if (error) throw error;
        await logAudit('REQUEST_UPDATE_RESIDENT',
          `Secretary submitted edit request for resident ID: ${selectedResident.id}`);
        showToast('Edit request submitted to the President for approval.', 'info');
      }
      setShowEditModal(false);
      setSelectedResident(null);
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete — President only (direct) ─────────────────────────────────────
  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('profiles').delete().eq('id', residentToDelete);
      if (error) throw error;
      await logAudit('DELETE_RESIDENT', `Deleted resident profile ID: ${residentToDelete}`, 'warning');
      showToast('Resident deleted successfully.');
      setResidentToDelete(null);
      fetchResidents();
    } catch (e) {
      showToast('Failed to delete resident: ' + e.message, 'error');
    }
  };

  const filtered = residents.filter(r =>
    !searchTerm || (
      (r.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.email     || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.username  || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const homeownersCount = residents.filter(r => (r.resident_type || '').toLowerCase().includes('homeowner')).length;
  const tenantsCount    = residents.filter(r => (r.resident_type || '').toLowerCase().includes('tenant')).length;
  const now             = new Date();
  const newThisMonth    = residents.filter(r => {
    if (!r.created_at) return false;
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  // Button label changes depending on role
  const saveLabel = isPresident ? 'Save Changes' : 'Submit for Approval';
  const saveHint  = isSecretary
    ? 'Your changes will be reviewed by the President before applying.'
    : '';

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      <Toast toast={toast} />

      {/* Delete confirm — President only */}
      {residentToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Delete Resident?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              This will permanently remove the resident's profile. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResidentToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-100 cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile modal */}
      {selectedResident && isViewingProfile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setSelectedResident(null); setIsViewingProfile(false); }} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-br from-[#006837] to-[#34a853] p-8 text-white text-center relative shrink-0">
              <button onClick={() => { setSelectedResident(null); setIsViewingProfile(false); }}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl cursor-pointer">
                <X size={18} />
              </button>
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-4 border-2 border-white/30 text-2xl font-black mx-auto uppercase overflow-hidden">
                {selectedResident.avatar_url
                  ? <img src={selectedResident.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (selectedResident.full_name?.charAt(0) || selectedResident.username?.charAt(0) || '?')}
              </div>
              <h2 className="text-xl font-black">{selectedResident.full_name || selectedResident.username}</h2>
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold mt-2">
                {selectedResident.resident_type || 'Resident'}
              </span>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {[
                { label: 'Email',     value: selectedResident.email           },
                { label: 'Phone',     value: selectedResident.phone           },
                { label: 'Username',  value: selectedResident.username        },
                { label: 'First Name',value: selectedResident.first_name      },
                { label: 'Last Name', value: selectedResident.last_name       },
                { label: 'M.I.',      value: selectedResident.middle_initial  },
                { label: 'Address',   value: selectedResident.address         },
                { label: 'Street',    value: selectedResident.street          },
                { label: 'Block/Lot', value: [selectedResident.block && `Block ${selectedResident.block}`, selectedResident.lot && `Lot ${selectedResident.lot}`].filter(Boolean).join(', ') },
                { label: 'Joined',    value: selectedResident.created_at ? new Date(selectedResident.created_at).toLocaleDateString() : null },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                  <span className="text-sm font-semibold text-slate-700">{value}</span>
                </div>
              ) : null)}
              <button onClick={() => { setSelectedResident(null); setIsViewingProfile(false); }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm mt-4 cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal — President (direct) or Secretary (sends to approval) */}
      {showEditModal && selectedResident && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowEditModal(false); setSelectedResident(null); }} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Resident Details</h3>
                {isSecretary && (
                  <p className="text-xs text-blue-500 font-semibold mt-0.5 flex items-center gap-1">
                    <Info size={11} /> Changes will be submitted to the President for approval
                  </p>
                )}
                {isPresident && (
                  <p className="text-xs text-slate-400 mt-0.5">Changes are saved directly to the resident profile</p>
                )}
              </div>
              <button onClick={() => { setShowEditModal(false); setSelectedResident(null); }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form className="p-6 overflow-y-auto flex-1" onSubmit={handleUpdateResident}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Full Name',      key: 'full_name'      },
                  { label: 'Username',       key: 'username'       },
                  { label: 'First Name',     key: 'first_name'     },
                  { label: 'Last Name',      key: 'last_name'      },
                  { label: 'Middle Initial', key: 'middle_initial' },
                  { label: 'Phone',          key: 'phone'          },
                  { label: 'Resident Type',  key: 'resident_type'  },
                  { label: 'Email',          key: 'email', type: 'email' },
                ].map(({ label, key, type = 'text' }) => (
                  <div key={key}>
                    <label className={labelClass}>{label}</label>
                    <input type={type} value={editFields[key]}
                      onChange={e => setEditFields(p => ({ ...p, [key]: e.target.value }))}
                      className={inputClass} />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input value={editFields.address}
                    onChange={e => setEditFields(p => ({ ...p, address: e.target.value }))}
                    className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Street</label>
                  <input value={editFields.street}
                    onChange={e => setEditFields(p => ({ ...p, street: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

              {/* Secretary hint banner */}
              {isSecretary && (
                <div className="mt-4 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2.5">
                  <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    As Secretary, your edits will be sent to the <strong>President</strong> as a pending approval request. The changes won't apply until the President approves them.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button type="button"
                  onClick={() => { setShowEditModal(false); setSelectedResident(null); }}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving}
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2
                    ${isSecretary
                      ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-100'
                      : 'bg-[#006837] hover:bg-[#004d29] shadow-lg shadow-[#006837]/20'}`}>
                  {isSaving
                    ? <><RefreshCw size={14} className="animate-spin" /> {isSecretary ? 'Submitting…' : 'Saving…'}</>
                    : saveLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Resident Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">View, edit, and manage resident profiles</p>
        </div>
        <button onClick={fetchResidents} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Residents" value={residents.length} icon={Users}     iconBg="bg-blue-50"    iconColor="text-blue-600"    />
        <KpiCard title="Homeowners"      value={homeownersCount}  icon={Home}      iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <KpiCard title="Tenants"         value={tenantsCount}     icon={UserCheck} iconBg="bg-indigo-50"  iconColor="text-indigo-600"  />
        <KpiCard title="New This Month"  value={newThisMonth}     icon={UserPlus}  iconBg="bg-amber-50"   iconColor="text-amber-600"   />
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search residents…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] transition-all" />
          </div>
          <p className="text-xs text-slate-400 ml-auto font-medium">
            {filtered.length} resident{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium animate-pulse">Loading residents…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <Users size={36} className="mb-2" />
              <p className="text-sm font-semibold text-slate-400">
                {searchTerm ? 'No residents match your search' : 'No residents found'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Resident','Contact','Block / Lot','Type','Status','Joined',''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(r => {
                  const statusCfg = {
                    active:   { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-400', label: 'Active'   },
                    pending:  { bg: 'bg-amber-50 text-amber-700 border-amber-100',       dot: 'bg-amber-400',   label: 'Pending'  },
                    rejected: { bg: 'bg-red-50 text-red-600 border-red-100',             dot: 'bg-red-400',     label: 'Rejected' },
                  }[r.account_status] || {
                    bg: 'bg-slate-100 text-slate-500 border-slate-200',
                    dot: 'bg-slate-300',
                    label: r.account_status || '—',
                  };

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#006837]/10 text-[#006837] flex items-center justify-center font-bold text-sm uppercase overflow-hidden shrink-0">
                            {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : (r.first_name?.charAt(0) || r.username?.charAt(0) || '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{r.full_name || r.username}</p>
                            <p className="text-xs text-slate-400 truncate">@{r.username || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-600 truncate max-w-[160px]">{r.email || '—'}</p>
                        <p className="text-xs text-slate-400">{r.phone || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {[r.block && `Block ${r.block}`, r.lot && `Lot ${r.lot}`].filter(Boolean).join(', ') || '—'}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-[100px]">{r.street || ''}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 capitalize">{r.resident_type || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusCfg.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          {/* View — all roles */}
                          <button onClick={() => { setSelectedResident(r); setIsViewingProfile(true); }}
                            title="View profile"
                            className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer">
                            <Eye size={15} />
                          </button>
                          {/* Edit — President (direct) and Secretary (via approval). VP cannot edit. */}
                          <RequireRole userRole={currentUserRole} allowedRoles={['president','secretary']}>
                            <button onClick={() => { setSelectedResident(r); setIsViewingProfile(false); setShowEditModal(true); }}
                              title={isSecretary ? 'Edit (requires President approval)' : 'Edit resident'}
                              className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer">
                              <Edit2 size={15} />
                            </button>
                          </RequireRole>
                          {/* Delete — President only */}
                          <RequireRole userRole={currentUserRole} allowedRoles={['president']}>
                            <button onClick={() => setResidentToDelete(r.id)}
                              title="Delete resident"
                              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          </RequireRole>
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
            <p className="text-xs text-slate-400">
              {filtered.length} of {residents.length} residents{searchTerm ? ' (filtered)' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentManage;
