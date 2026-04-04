import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseAdmin";
import { ArrowLeft, Search, User, Mail, Briefcase, SearchX, Loader2, Filter, X, Globe, Layers } from "lucide-react";

const CandidatesPage = ({ onBack }) => {
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedElection, setSelectedElection] = useState("all");
  
  // ADDED: State for the detail modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    fetchCandidates();
    fetchElections();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidates")
        .select(`
          *,
          elections (
            title
          )
        `);

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error("Error fetching candidates:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchElections = async () => {
    try {
      const { data, error } = await supabase
        .from("elections")
        .select("title")
        .order("title", { ascending: true });
      
      if (error) throw error;
      setElections(data || []);
    } catch (error) {
      console.error("Error fetching elections:", error.message);
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = 
      candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.elections?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesElection = selectedElection === "all" || candidate.elections?.title === selectedElection;

    return matchesSearch && matchesElection;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans animate-in fade-in duration-500">
      
      {/* ADDED: Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors z-10 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="h-48 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
              <div className="absolute -bottom-12 left-8">
                <div className="w-32 h-32 bg-white rounded-3xl p-1.5 shadow-xl">
                  <div className="w-full h-full bg-indigo-50 rounded-[1.25rem] overflow-hidden flex items-center justify-center border border-gray-100">
                    {/* UPDATED: Changed image_url to photo_url to match database */}
                    {selectedCandidate.photo_url ? (
                      <img src={selectedCandidate.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center">
                         <User size={48} className="text-indigo-200" />
                         <span className="text-[8px] text-indigo-300 font-bold uppercase mt-1">No Photo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-16 p-8">
              <div className="mb-6">
                <p className="text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-1">{selectedCandidate.position}</p>
                <h2 className="text-3xl font-black text-gray-900">{selectedCandidate.full_name}</h2>
                <div className="flex items-center gap-2 mt-2 text-gray-500 font-bold text-sm">
                  <Briefcase size={14} />
                  <span>{selectedCandidate.elections?.title}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Candidate Manifesto</h4>
                <p className="text-gray-700 leading-relaxed font-medium italic">
                  "{selectedCandidate.manifesto || "No manifesto provided."}"
                </p>
              </div>

              <button 
                onClick={() => setSelectedCandidate(null)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-lg cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold mb-2 transition-colors group cursor-pointer"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">All Candidates</h1>
          <p className="text-gray-500 font-medium">Viewing all registered candidates across all elections.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-gray-700 shadow-sm appearance-none cursor-pointer"
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
            >
              <option value="all">All Elections</option>
              {elections.map(election => (
                <option key={election.title} value={election.title}>{election.title}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search candidates..."
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 shadow-sm transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* UPDATED: Dynamic Filter Header Placeholder with #006837 */}
      {selectedElection !== "all" && (
        <div className="mb-8 p-8 bg-[#006837] rounded-[2.5rem] text-white shadow-xl shadow-green-100 relative overflow-hidden group animate-in slide-in-from-top-4 duration-500">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <Layers size={140} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-1 bg-green-200 rounded-full"></span>
              <p className="text-green-50 text-[10px] font-black uppercase tracking-[0.4em]">Active Filter</p>
            </div>
            <h2 className="text-4xl font-black tracking-tight uppercase italic drop-shadow-sm">
              {selectedElection}
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <p className="text-xs font-bold">{filteredCandidates.length} Matching Results</p>
              </div>
              <button 
                onClick={() => setSelectedElection("all")}
                className="text-xs font-bold text-green-100 hover:text-white underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="text-indigo-600 animate-spin mb-4" size={40} />
          <p className="text-gray-500 font-bold">Retrieving candidate records...</p>
        </div>
      ) : filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <div 
              key={candidate.id}
              onClick={() => setSelectedCandidate(candidate)} 
              className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                {/* UPDATED: Logic to show photo_url or default User icon */}
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden border border-gray-100 shadow-inner">
                  {candidate.photo_url ? (
                    <img 
                      src={candidate.photo_url} 
                      alt={candidate.full_name} 
                      className="w-full h-full object-cover rounded-2xl" 
                      loading="lazy"
                    />
                  ) : (
                    <User size={30} />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 leading-tight">{candidate.full_name}</h3>
                  <p className="text-indigo-600 text-[10px] font-black uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">{candidate.position}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3 text-gray-600">
                  <Briefcase size={16} className="text-gray-400" />
                  <div>
                    <span className="text-gray-400 text-[10px] block uppercase font-black">Election Event</span>
                    <p className="text-sm font-bold text-gray-800">{candidate.elections?.title || "No election assigned"}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-gray-500 text-sm line-clamp-2 italic font-medium leading-relaxed">
                  "{candidate.manifesto || "No manifesto provided for this candidate."}"
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-gray-200 rounded-3xl">
          <SearchX size={48} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-800">No candidates found</h3>
          <p className="text-gray-500">Try adjusting your search or filter settings.</p>
        </div>
      )}
    </div>
  );
};

export default CandidatesPage;