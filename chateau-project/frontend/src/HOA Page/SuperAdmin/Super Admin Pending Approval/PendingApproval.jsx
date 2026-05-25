import React, { useState, useEffect } from 'react';
// UPDATED: Added an extra '../' to reach supabaseAdmin in the HOA Page folder
import { supabase } from '../../supabaseAdmin'; 
import { 
  Check,
  X,
  AlertTriangle,
  CheckCircle2, // ADDED: For success toast
  AlertCircle   // ADDED: For error toast
} from 'lucide-react';

const PendingApproval = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]); 
  
  // --- REPLACED: Blocking modal with non-blocking Toast state ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // --- ADDED: Toast helper function ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch Pending Requests
      const { data: pendingRequests, error: reqError } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      console.log("Supabase response:", pendingRequests);
      if (reqError) {
        console.error("Supabase error:", reqError);
        showToast('Error fetching pending requests.', 'error');
      }

      setRequests(pendingRequests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('An unexpected error occurred while loading pending requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- FIXED: Handle Approval dynamically checks the action type and target table ---
  const handleApprove = async (request) => {
    try {
      if (request.target_table === 'payments' && request.action_type === 'DELETE') {
        // 1. Execute the deletion on the payments table
        const { error: deleteError } = await supabase
          .from('payments')
          .delete()
          .eq('id', request.target_id);

        if (deleteError) throw deleteError;

        // 2. Mark the approval request as APPROVED
        const { error: updateError } = await supabase
          .from('approval_requests')
          .update({ status: 'APPROVED' })
          .eq('id', request.id);

        if (updateError) throw updateError;

        showToast("Payment voided and request approved successfully!", "success");
        fetchPendingRequests(); // Refreshes the UI

      } else {
        // Fallback to original RPC logic for Profiles/Other updates
        const { data, error } = await supabase
          .rpc('approve_resident_update', {
            req_id: request.id,
            target_user_id: request.target_id,
            new_data: request.requested_data // This contains the whole object structure
          });

        if (error) {
          console.error("Error approving request:", error);
          showToast("Error approving request.", "error");
        } else {
          showToast("Profile updated successfully!", "success");
          fetchPendingRequests(); // Refreshes the UI
        }
      }
    } catch (err) {
      console.error("Approval Execution Error:", err);
      showToast("Error executing approval: " + err.message, "error");
    }
  };

  // Handle Rejection
  const handleReject = async (request) => {
    try {
      const { error } = await supabase.from('approval_requests').update({ status: 'REJECTED' }).eq('id', request.id);
      if (error) throw error;
      showToast("Request rejected.", "success");
      fetchPendingRequests();
    } catch (err) {
      showToast("Error rejecting request.", "error");
    }
  };

  // Smooth Loading Screen Animation
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
          <p className="text-[#006837] font-semibold animate-pulse tracking-wide">Loading Approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen animate-in fade-in duration-500 relative">
      
      {/* --- ADDED: Non-blocking Toast Notification --- */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4
          ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
        <p className="text-slate-500 text-sm">Review and approve resident changes and system requests.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" /> Pending Approval Requests
            </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                <tr>
                    <th className="px-6 py-4">Action Type</th>
                    <th className="px-6 py-4">Target ID</th>
                    <th className="px-6 py-4">Date Requested</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                  {requests.length > 0 ? (
                      requests.map((req) => (
                          <tr key={req.id}>
                              <td className="px-6 py-4 font-bold text-slate-700">{req.action_type}</td>
                              <td className="px-6 py-4 text-slate-600 font-mono text-xs">{req.target_id}</td>
                              {/* --- ENFORCED: MM/DD/YYYY Format --- */}
                              <td className="px-6 py-4 text-slate-400 text-xs">
                                {new Date(req.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                              </td>
                              <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                  <button onClick={() => handleApprove(req)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 cursor-pointer">
                                      <Check size={16} />
                                  </button>
                                  <button onClick={() => handleReject(req)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer">
                                      <X size={16} />
                                  </button>
                              </td>
                          </tr>
                      ))
                  ) : (
                      <tr><td colSpan="4" className="px-6 py-4 text-center text-slate-400">No pending requests.</td></tr>
                  )}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;