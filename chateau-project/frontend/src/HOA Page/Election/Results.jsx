import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseAdmin";
import { Trophy, BarChart3, Users, Loader2, ArrowLeft } from "lucide-react";
import logger from '../auditlogger';

const Results = ({ electionId, onBack }) => {
  const [results, setResults] = useState([]);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (electionId) {
      fetchResults();
    }
  }, [electionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Fetch Election Title
      const { data: electionData } = await supabase
        .from("elections")
        .select("title")
        .eq("id", electionId)
        .single();
      
      setElection(electionData);

      // Fetch Candidates & Votes
      const { data, error } = await supabase
        .from("candidates")
        .select("full_name, position, vote_count, photo_url")
        .eq("election_id", electionId)
        .order("vote_count", { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      logger.error("Error fetching results", { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = results.reduce((sum, c) => sum + (c.vote_count || 0), 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Election Results</h1>
        <p className="text-gray-500 font-medium">{election?.title || "Loading..."}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="text-indigo-600 animate-spin mb-4" size={40} />
          <p className="text-gray-500 font-bold">Calculating results...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Winner Highlight Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl flex items-center gap-6">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
              <Trophy size={48} className="text-yellow-300" />
            </div>
            <div>
              <p className="text-indigo-100 font-black uppercase tracking-widest text-xs">Current Leader</p>
              <h2 className="text-3xl font-black">{results[0].full_name}</h2>
              <p className="text-indigo-200 font-bold">{results[0].vote_count} Votes</p>
            </div>
          </div>

          {/* Results List */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-indigo-600" />
              <h3 className="font-black text-gray-900 text-lg">Detailed Standings</h3>
            </div>
            
            <div className="space-y-6">
              {results.map((candidate, index) => {
                const percentage = totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(1) : 0;
                return (
                  <div key={index} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-400 w-6">#{index + 1}</span>
                        <span className="font-bold text-gray-900">{candidate.full_name}</span>
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md font-bold text-gray-500">{candidate.position}</span>
                      </div>
                      <span className="font-black text-indigo-600">{candidate.vote_count} votes ({percentage}%)</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Users size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800">No results yet</h3>
          <p className="text-gray-500">The election is currently in progress or has no recorded votes.</p>
        </div>
      )}
    </div>
  );
};

export default Results;