import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseAdmin"; 
import { Plus, Send, BarChart2, Users, Calendar, X, Info, CheckCircle, Bell, Pencil, Trash2, SearchX, ArrowLeft, AlertCircle, LayoutDashboard, UserPlus } from "lucide-react";
import CandidateManager from "./CandidateManager.jsx"; 
import CandidatesPage from "./CandidatesPage.jsx"; 
import logger from '../auditlogger';

const ElectionPage = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); 
  const [isEditing, setIsEditing] = useState(false); 
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [electionTab, setElectionTab] = useState("overview");

  // --- MODAL STATES ---
  const [notification, setNotification] = useState({ show: false, title: "", message: "", type: "success" });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  // Form State
  const [newElection, setNewElection] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "active"
  });

  useEffect(() => {
    fetchElections();
  }, []);

  // UPDATED: Optimized Function to automatically close expired elections
  const checkAndCloseExpiredElections = async (electionList) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Find expired elections
    const expiredElections = electionList.filter(el => 
      el.status === "active" && el.end_date < today
    );

    if (expiredElections.length > 0) {
      try {
        // 1. Update all expired elections in the DB at once
        const { error } = await supabase
          .from("elections")
          .update({ status: "closed" })
          .in("id", expiredElections.map(el => el.id));

        if (error) throw error;

        // 2. Update the local state WITHOUT re-fetching from DB
        setElections(prev => 
          prev.map(el => 
            expiredElections.some(expired => expired.id === el.id) 
              ? { ...el, status: "closed" } 
              : el
          )
        );
        
        console.log("Expired elections updated to closed.");
      } catch (err) {
        logger.error("Auto-close error", { error: err.message });
        console.error("Auto-close error:", err);
      }
    }
  };

  const fetchElections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("elections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setElections(data || []);
      
      // ADDED: Trigger the expiration check whenever we get fresh data
      if (data) checkAndCloseExpiredElections(data);

    } catch (error) {
      logger.error("Error fetching elections", { error: error.message });
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return dateString.split('T')[0];
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    
    // Validation for single active election
    if (newElection.status === "active" && elections.some(el => el.status === "active")) {
      setNotification({
        show: true,
        title: "Action Restricted",
        message: "Only one election can be opened at a time. Please close the current active election first.",
        type: "error"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("elections")
        .insert([newElection])
        .select();

      if (error) throw error;
      
      setElections([data[0], ...elections]);
      closeModal();
      setNotification({
        show: true,
        title: "Success!",
        message: "The election has been created and residents have been notified.",
        type: "success"
      });
    } catch (error) {
      logger.error("Error creating election", { error: error.message });
      setNotification({
        show: true,
        title: "Error",
        message: error.message,
        type: "error"
      });
    }
  };

  const handleUpdateElection = async (e) => {
    e.preventDefault();

    // Validation for single active election during update
    if (newElection.status === "active" && elections.some(el => el.status === "active" && el.id !== newElection.id)) {
        setNotification({
          show: true,
          title: "Action Restricted",
          message: "Only one election can be opened at a time. Please close the current active election first.",
          type: "error"
        });
        return;
      }

    try {
      const { error } = await supabase
        .from("elections")
        .update(newElection)
        .eq("id", newElection.id);

      if (error) throw error;

      setElections(elections.map(el => el.id === newElection.id ? newElection : el));
      closeModal();
      setNotification({
        show: true,
        title: "Updated",
        message: "Election details have been successfully saved.",
        type: "success"
      });
    } catch (error) {
      logger.error("Error updating election", { error: error.message });
      setNotification({
        show: true,
        title: "Update Failed",
        message: error.message,
        type: "error"
      });
    }
  };

  const handleDeleteElection = async () => {
    const id = deleteConfirm.id;
    try {
      const { error } = await supabase.from("elections").delete().eq("id", id);
      if (error) throw error;
      setElections(elections.filter(el => el.id !== id));
      setDeleteConfirm({ show: false, id: null });
      setNotification({
        show: true,
        title: "Deleted",
        message: "The election record has been removed.",
        type: "success"
      });
    } catch (error) {
      logger.error("Error deleting election", { error: error.message });
      setNotification({
        show: true,
        title: "Error",
        message: error.message,
        type: "error"
      });
    }
  };

  // UPDATED: Minor UX Improvement for Date Input
  const handleEditClick = (election) => {
    setNewElection({
      ...election,
      // Ensure dates are just YYYY-MM-DD
      start_date: election.start_date ? election.start_date.split('T')[0] : "",
      end_date: election.end_date ? election.end_date.split('T')[0] : ""
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setNewElection({ 
      title: "", 
      description: "", 
      start_date: "", 
      end_date: "", 
      status: "active" 
    });
  };

  // Logic to find the strictly active election
  const activeElection = elections.find(e => e.status === 'active');

  // 2. ADDED: Logic to show CandidatesPage when the main tab is clicked
  if (activeTab === "candidates") {
    return <CandidatesPage onBack={() => setActiveTab("all")} />;
  }

  if (selectedElectionId) {
    const currentElection = elections.find(e => e.id === selectedElectionId);
    return (
      <div className="p-6 bg-gray-50 min-h-screen font-sans animate-in fade-in duration-500">
        <button 
          onClick={() => { setSelectedElectionId(null); setElectionTab("overview"); }}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold mb-6 transition-colors group cursor-pointer"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Elections
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 leading-tight">
            {currentElection?.title}
          </h1>
          <p className="text-gray-500 font-medium">{currentElection?.description || "Manage and review candidates for this election."}</p>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-px">
            <button 
                onClick={() => setElectionTab("overview")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all cursor-pointer relative ${
                    electionTab === "overview" ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"
                }`}
            >
                <LayoutDashboard size={18} />
                Overview
                {electionTab === "overview" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
            <button 
                onClick={() => setElectionTab("candidates")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all cursor-pointer relative ${
                    electionTab === "candidates" ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"
                }`}
            >
                <UserPlus size={18} />
                Candidates
                {electionTab === "candidates" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
        </div>

        {electionTab === "overview" ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-gray-400 uppercase text-[10px] font-black tracking-widest mb-4">Election Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-indigo-600" size={20} />
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Timeline</p>
                                    <p className="text-sm font-bold text-gray-800">{formatDate(currentElection?.start_date)} to {formatDate(currentElection?.end_date)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users className="text-indigo-600" size={20} />
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Participation</p>
                                    <p className="text-sm font-bold text-gray-800">{currentElection?.votes_count || 0} Votes Cast</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-indigo-50 rounded-2xl p-6 flex items-center justify-center text-center">
                        <div>
                            <p className="text-indigo-600 font-black text-4xl mb-1">{currentElection?.votes_count || 0}</p>
                            <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Total Ballots</p>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 animate-in fade-in slide-in-from-bottom-2">
                <CandidateManager electionId={selectedElectionId} />
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans relative overflow-x-hidden">
      {notification.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {notification.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{notification.title}</h3>
            <p className="text-gray-500 font-medium mb-6">{notification.message}</p>
            <button 
              onClick={() => setNotification({ ...notification, show: false })}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 text-center">Are you sure?</h3>
            <p className="text-gray-500 font-medium mb-6 text-center">This action cannot be undone. This election and its data will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleDeleteElection} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Election Management</h1>
          <p className="text-gray-500 text-sm">Create and manage HOA elections and view results.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md transition font-bold cursor-pointer">
          <Plus size={18} /> Create Election
        </button>
      </div>

      {/* Stats Card with Conditional Logic for OPEN/CLOSED/PENDING */}
      {activeElection ? (
        <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <CheckCircle size={28} />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900">{activeElection.title}</h2>
                    <p className="text-sm text-gray-600 font-medium italic">Voting ends: {formatDate(activeElection.end_date)}</p>
                    <p className="text-xs text-indigo-600 font-bold mt-2 bg-indigo-100/50 inline-block px-2 py-0.5 rounded italic">{activeElection.votes_count || 0} votes cast</p>
                </div>
            </div>
            <div className="flex items-center gap-8">
                <div className="text-right">
                    <p className="text-3xl font-black text-indigo-600">{activeElection.total_eligible > 0 ? ((activeElection.votes_count / activeElection.total_eligible) * 100).toFixed(2) : "0.00"}%</p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Participation</p>
                </div>
            </div>
        </div>
      ) : (
        <div className="mb-8 bg-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="w-14 h-14 bg-gray-300 rounded-xl flex items-center justify-center text-gray-500">
                <Info size={28} />
            </div>
            <div>
                <h2 className="text-xl font-extrabold text-gray-400 italic">No election is opened for now.</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pending activation of next cycle</p>
            </div>
        </div>
      )}

      {/* Tab Selection */}
      {elections.length > 0 && (
        <div className="flex gap-2 mb-6">
            {["all", "results", "candidates"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-1.5 rounded-lg text-sm font-bold capitalize transition-all cursor-pointer ${
                      activeTab === tab 
                      ? "bg-white text-gray-900 shadow-sm border border-gray-100" 
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                    {tab === "all" ? "All Elections" : tab}
                </button>
            ))}
        </div>
      )}

      {/* Election Grid */}
      <div className="mb-10">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : elections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elections.map((election) => (
              <div key={election.id} className="bg-white border p-5 rounded-2xl shadow-sm transition-all relative flex flex-col h-full border-gray-100 hover:shadow-md hover:border-indigo-100">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl border ${election.status === 'active' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        <CheckCircle size={22} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleEditClick(election)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteConfirm({ show: true, id: election.id })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><Trash2 size={16} /></button>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${election.status === 'active' ? 'bg-green-100 text-green-700' : election.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{election.status}</span>
                    </div>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{election.title}</h4>
                <div className="flex items-center gap-1.5 text-gray-500 mb-4"><Calendar size={14} /><p className="text-sm font-bold tracking-tight">{formatDate(election.start_date)} - {formatDate(election.end_date)}</p></div>
                <button onClick={() => setSelectedElectionId(election.id)} className="mt-auto w-full py-2.5 bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-700 text-xs font-black rounded-lg transition-all uppercase tracking-widest shadow-sm cursor-pointer">{election.status === 'closed' ? 'View Results' : 'Manage Election'}</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border-2 border-dashed border-gray-200 rounded-3xl">
            <SearchX size={40} className="text-gray-300 mb-6" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Elections Found</h3>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-xl hover:bg-indigo-100 transition font-bold cursor-pointer"><Plus size={18} /> Create your first election</button>
          </div>
        )}
      </div>

      {/* CREATE/EDIT ELECTION OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity cursor-pointer" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Edit Election" : "Create Election"}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={isEditing ? handleUpdateElection : handleCreateElection} className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="space-y-5 flex-1">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Election Title</label><input type="text" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newElection.title} onChange={(e) => setNewElection({...newElection, title: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Description</label><textarea rows="3" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={newElection.description} onChange={(e) => setNewElection({...newElection, description: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label><input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" value={formatDate(newElection.start_date)} onChange={(e) => setNewElection({...newElection, start_date: e.target.value})} /></div>
                  <div><label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label><input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" value={formatDate(newElection.end_date)} onChange={(e) => setNewElection({...newElection, end_date: e.target.value})} /></div>
                </div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Status</label><select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer" value={newElection.status} onChange={(e) => setNewElection({...newElection, status: e.target.value})}><option value="active">Active</option><option value="pending">Pending</option><option value="closed">Closed</option></select></div>
              </div>
              <div className="pt-8 border-t mt-auto flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold cursor-pointer">Discard</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg cursor-pointer">{isEditing ? "Update Changes" : "Save Election"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectionPage;