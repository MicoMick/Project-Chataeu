import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseAdmin";
import { UserPlus, Trash2, User, Camera, X, CheckCircle, AlertCircle, Briefcase } from "lucide-react"; 

const CandidateManager = ({ electionId }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // ADDED: State to store the current election's title
  const [electionTitle, setElectionTitle] = useState("");
  
  // --- MODAL STATES ---
  const [notification, setNotification] = useState({ show: false, title: "", message: "", type: "success" });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  const [newCandidate, setNewCandidate] = useState({
    full_name: "", 
    position: "",
    manifesto: "",
    photo_url: "" 
  });

  // ADDED: Position options for the dropdown
  const positions = ["President", "Vice President", "Secretary", "Treasurer", "Auditor"];

  useEffect(() => {
    if (electionId) {
      fetchCandidates();
      fetchElectionDetails(); // ADDED: Call to get the title
    }
  }, [electionId]);

  // ADDED: Function to fetch the specific election title
  const fetchElectionDetails = async () => {
    const { data, error } = await supabase
      .from("elections")
      .select("title")
      .eq("id", electionId)
      .single();

    if (!error && data) {
      setElectionTitle(data.title);
    }
  };

  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, position, manifesto, full_name, photo_url")
      .eq("election_id", electionId);

    if (!error) setCandidates(data || []);
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `candidate-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("candidatephotos") 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("candidatephotos") 
        .getPublicUrl(filePath);

      setNewCandidate({ ...newCandidate, photo_url: publicUrl });
    } catch (error) {
      setNotification({
        show: true,
        title: "Upload Error",
        message: error.message,
        type: "error"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("candidates")
      .insert([{ 
        ...newCandidate, 
        election_id: electionId 
      }])
      .select();

    if (error) {
      setNotification({
        show: true,
        title: "Error",
        message: "Failed to add candidate: " + error.message,
        type: "error"
      });
    } else {
      fetchCandidates();
      setNewCandidate({ full_name: "", position: "", manifesto: "", photo_url: "" });
      setNotification({
        show: true,
        title: "Candidate Added",
        message: "The candidate has been successfully registered for this election.",
        type: "success"
      });
    }
  };

  const handleDeleteCandidate = async () => {
    const id = deleteConfirm.id;
    
    // UPDATED: Added error logging and count check to verify if deletion actually happened
    const { error, status } = await supabase
      .from("candidates")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Supabase Delete Error:", error); // This will show why it failed in the console
      setNotification({
        show: true,
        title: "Deletion Failed",
        message: error.message,
        type: "error"
      });
    } else if (status === 403 || status === 401) {
       // If no error but row still exists, it's usually an RLS issue
       setNotification({
        show: true,
        title: "Permission Denied",
        message: "You do not have permission to delete this record. Check your RLS policies.",
        type: "error"
      });
    } else {
      fetchCandidates();
      setDeleteConfirm({ show: false, id: null });
      setNotification({
        show: true,
        title: "Removed",
        message: "Candidate has been removed from the election.",
        type: "success"
      });
    }
  };

  if (!electionId) return <div className="p-10 text-center text-gray-400">Please select an election to manage candidates.</div>;

  return (
    <div className="mt-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-in fade-in duration-500">
      
      {/* UPDATED: Dynamic Filter Header Placeholder with #006837 */}
      <div className="mb-8 p-6 bg-[#006837] rounded-[2rem] text-white shadow-xl shadow-green-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Briefcase size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-green-100 text-xs font-black uppercase tracking-[0.3em] mb-2">Currently Managing</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase italic">
            {electionTitle || "Loading Election..."}
          </h2>
          <div className="flex items-center gap-2 mt-4">
             <div className="h-1.5 w-12 bg-white rounded-full"></div>
             <p className="text-green-50 text-sm font-bold italic">{candidates.length} Candidates Registered</p>
          </div>
        </div>
      </div>

      {/* --- NOTIFICATION MODAL --- */}
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

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 text-center">Remove Candidate?</h3>
            <p className="text-gray-500 font-medium mb-6 text-center">Are you sure you want to remove this candidate? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm({ show: false, id: null })}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteCandidate}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <UserPlus size={20} className="text-indigo-600" />
        Candidate Entry
      </h3>

      <form onSubmit={handleAddCandidate} className="space-y-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-6 items-center mb-4">
          <div className="relative group">
            <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden border-2 border-indigo-100 flex items-center justify-center">
              {newCandidate.photo_url ? (
                <img src={newCandidate.photo_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-gray-400" />
              )}
            </div>
            
            <label className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white cursor-pointer hover:bg-indigo-700 transition shadow-lg">
              <Camera size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            </label>

            {newCandidate.photo_url && (
              <button
                type="button"
                onClick={() => setNewCandidate({ ...newCandidate, photo_url: "" })}
                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-md cursor-pointer"
              >
                <X size={14} />
              </button>
            )}

            {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-full text-[10px] font-bold">Uploading...</div>}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Candidate Name</label>
              <input
                type="text"
                required
                placeholder="Enter full name"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={newCandidate.full_name}
                onChange={(e) => setNewCandidate({...newCandidate, full_name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Position</label>
              {/* UPDATED: Changed input to select for better UX */}
              <select
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                value={newCandidate.position}
                onChange={(e) => setNewCandidate({...newCandidate, position: e.target.value})}
                required
              >
                <option value="" disabled>Select Position</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Candidate Manifesto</label>
          <textarea
            placeholder="What are their goals for the community?"
            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows="2"
            value={newCandidate.manifesto}
            onChange={(e) => setNewCandidate({...newCandidate, manifesto: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={uploading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 disabled:bg-gray-400 cursor-pointer"
        >
          {uploading ? "Waiting for upload..." : "Confirm Candidate"}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((c) => (
          <div key={c.id} className="group flex flex-col p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all relative min-h-[160px]">
             <div className="flex items-center gap-4 mb-3">
               <div className="w-14 h-14 bg-indigo-50 rounded-full overflow-hidden flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} />
                  )}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 leading-tight truncate">{c.full_name}</p>
                  <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider">{c.position}</p>
               </div>
               <button 
                 onClick={() => setDeleteConfirm({ show: true, id: c.id })}
                 className="p-2 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
               >
                 <Trash2 size={18} />
               </button>
             </div>
             
             <div className="mt-auto">
                <p className="text-xs text-gray-500 line-clamp-3 italic leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-50">
                  "{c.manifesto || "No manifesto provided."}"
                </p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandidateManager;