import React, { useState, useEffect } from 'react';
import { 
  Search, MoreHorizontal, Filter, FileText, AlertCircle, CheckCircle2, Clock, Eye, Trash2, Edit, X, User, MapPin, Tag, Calendar, Send,
  ChevronDown,
  ImageIcon,
  Maximize2
} from 'lucide-react';
import { supabase } from '../supabaseAdmin';

const Reports = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, id: null });

  const [feedbackText, setFeedbackText] = useState(""); 
  const [previousFeedback, setPreviousFeedback] = useState([]); 

  const filters = ['All', 'Pending', 'In Progress', 'Resolved', 'On Hold'];

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchPreviousFeedback = async (reportId) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('message, created_at')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPreviousFeedback(data || []);
    } catch (error) {
      console.error("Error fetching feedback:", error.message);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchPreviousFeedback(selectedReport.id);
    } else {
      setPreviousFeedback([]);
    }
  }, [selectedReport]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          user_id,
          category,
          description,
          photo_url,
          created_at,
          status,
          profiles (
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData = data.map(item => ({
          id: item.id,
          user_id: item.user_id,
          resident: item.profiles?.username || "Unknown Resident",
          category: item.category,
          description: item.description,
          status: item.status || "Pending",
          date: new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          rptNo: `RPT-${item.id.toString().slice(0, 4).toUpperCase()}`,
          imageUrl: item.photo_url || "https://via.placeholder.com/800x600?text=No+Image+Available"
        }));
        setReports(formattedData);
      }
    } catch (error) {
      console.error("Error fetching:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED REALTIME LOGIC ---
  useEffect(() => {
    fetchReports();

    // 1. Create the channel and listen specifically for ALL changes on the 'reports' table
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reports' 
        }, 
        (payload) => {
          console.log('Change received!', payload);
          fetchReports(); // Re-fetch the data whenever a change is detected
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return showToast("Please write a message", "error");

    try {
      const { error: statusError } = await supabase
        .from('reports')
        .update({ status: selectedReport.status })
        .eq('id', selectedReport.id);

      if (statusError) throw statusError;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: selectedReport.user_id, 
          report_id: selectedReport.id,
          title: `Status Update: ${selectedReport.category}`,
          message: feedbackText,
          is_read: false
        }]);

      if (notifError) throw notifError;

      setReports(prevReports => 
        prevReports.map(report => 
          report.id === selectedReport.id ? { ...report, status: selectedReport.status } : report
        )
      );

      showToast("Feedback sent and status updated!");
      setFeedbackText(""); 
      fetchPreviousFeedback(selectedReport.id);
      
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleDeleteReport = async () => {
    const id = deleteConfirmation.id;
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setOpenMenuId(null);
      setDeleteConfirmation({ show: false, id: null });
      showToast("Report deleted successfully", "success");
    } catch (error) {
      showToast("Error deleting report: " + error.message, "error");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === id ? { ...report, status: newStatus } : report
        )
      );

      if (selectedReport && selectedReport.id === id) {
        setSelectedReport(prev => ({ ...prev, status: newStatus }));
      }

      showToast(`Status updated to ${newStatus}`, "success");
    } catch (error) {
      showToast("Error updating status: " + error.message, "error");
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesFilter = activeFilter === 'All' || report.status.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch = 
      report.resident.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusStyles = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'resolved': return 'bg-green-100 text-green-600';
      case 'in progress': return 'bg-orange-100 text-orange-600';
      case 'pending': return 'bg-red-100 text-red-600';
      case 'on hold': return 'bg-slate-200 text-slate-600';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const toggleMenu = (id) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 ${
          toast.type === 'success' ? 'bg-[#1e3a6a] text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Report?</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">This action cannot be undone. Are you sure you want to permanently remove this report?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmation({ show: false, id: null })}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteReport}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm font-medium">Residents Report Issues</p>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm">
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all" 
              placeholder="Search Reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === filter 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Residents</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{report.resident}</td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{report.category}</td>
                    <td className="px-8 py-5 text-sm text-slate-500">{report.description}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyles(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{report.date}</td>
                    <td className="px-8 py-5 text-right relative">
                      <button 
                        onClick={() => toggleMenu(report.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative z-30 cursor-pointer"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {openMenuId === report.id && (
                        <>
                          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuId(null)}></div>
                          <div className="absolute right-8 top-12 w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5">
                            <div className="p-1.5">
                              <button 
                                onClick={() => {
                                  setSelectedReport(report);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                              >
                                View Details
                              </button>
                              <div className="my-1 border-t border-slate-50"></div>
                              <button 
                                onClick={() => {
                                  setDeleteConfirmation({ show: true, id: report.id });
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center px-4 py-2.5 text-[11px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="p-6 flex justify-between items-start shrink-0">
                <div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 w-fit ${getStatusStyles(selectedReport.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedReport.status?.toLowerCase() === 'resolved' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        {selectedReport.status}
                    </span>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 pb-10 overflow-y-auto custom-scrollbar">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedReport.category}</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedReport.rptNo}</p>
                </div>

                <div className="flex flex-wrap gap-6 mb-8 text-slate-500">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <User size={18} className="text-slate-300" /> {selectedReport.resident}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Tag size={18} className="text-slate-300" /> {selectedReport.category}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar size={18} className="text-slate-300" /> {selectedReport.date}
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                        <ImageIcon size={18} className="text-slate-400" /> Attached Photo
                    </h3>
                    <div 
                      onClick={() => setIsImageExpanded(true)}
                      className="relative cursor-pointer w-full h-64 rounded-3xl overflow-hidden border border-slate-100 bg-slate-50"
                    >
                        <img 
                          src={selectedReport.imageUrl} 
                          alt="Report attachment" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                <Maximize2 size={20} className="text-slate-900" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                        <FileText size={18} className="text-slate-400" /> Resident's Message
                    </h3>
                    <div className="bg-slate-50/80 p-6 rounded-2xl text-black text-sm leading-relaxed font-medium border border-slate-100">
                        {selectedReport.description}
                    </div>
                </div>

                <div className="border-t border-slate-100 my-8"></div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Send Feedback to Resident</h3>
                    <div className="relative w-48">
                        <select 
                          value={selectedReport.status}
                          onChange={(e) => handleStatusChange(selectedReport.id, e.target.value)}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer"
                        >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="On Hold">On Hold</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    <textarea 
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                        rows="4"
                        placeholder="Write your feedback or response to the resident..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                    ></textarea>
                    <button 
                      onClick={handleSendFeedback}
                      className="flex items-center gap-2 bg-[#1e3a6a] hover:bg-[#152a4d] text-white px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-indigo-900/10 cursor-pointer"
                    >
                        <Send size={16} /> Send Feedback
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isImageExpanded && selectedReport && (
          <div 
            className="fixed inset-0 z-[200] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setIsImageExpanded(false)}
          >
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors cursor-pointer">
              <X size={32} />
            </button>
            <img 
              src={selectedReport.imageUrl} 
              alt="Expanded view" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            />
          </div>
        )}

        {!loading && filteredReports.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">No reports found for "{activeFilter}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;