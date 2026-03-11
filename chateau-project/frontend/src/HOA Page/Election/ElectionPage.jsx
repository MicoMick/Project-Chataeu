import React, { useState } from 'react';
import { 
  Plus, Bell, Users, Calendar, CheckSquare, 
  ChevronDown, Search, MoreHorizontal, FileText,
  Trophy, UserPlus, Info, X, Eye
} from 'lucide-react';

const ElectionPage = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'candidates', 'results'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  
  // New State for Viewing Candidate Details
  const [selectedCandidateForView, setSelectedCandidateForView] = useState(null);
  
  // Logic for dynamic positions
  const [positions, setPositions] = useState([]);
  const [currentPosition, setCurrentPosition] = useState('');
  
  // Logic for filtering candidates
  const [selectedPosition, setSelectedPosition] = useState('All Positions');

  // --- NEW LOGIC FOR CANDIDATES ---
  const [candidates, setCandidates] = useState([]);
  const [candidateName, setCandidateName] = useState('');
  const [candidatePosition, setCandidatePosition] = useState('President');
  const [candidateBio, setCandidateBio] = useState('');
  const [candidateError, setCandidateError] = useState(''); // Added Error State

  const handleConfirmCandidate = () => {
    if (candidateName.trim() === '' || candidateBio.trim() === '') {
      setCandidateError('Please fill in both the candidate name and bio.');
      return;
    }

    const newCandidate = {
      id: Date.now(),
      name: candidateName,
      position: candidatePosition,
      bio: candidateBio,
      votes: 0 // Initial votes for results logic
    };
    setCandidates([...candidates, newCandidate]);
    
    // Reset and close
    setCandidateName('');
    setCandidateBio('');
    setCandidateError('');
    setIsCandidateModalOpen(false);
  };

  const filteredCandidates = candidates.filter(c => 
    selectedPosition === 'All Positions' || c.position === selectedPosition
  );
  // --------------------------------

  // --- NEW LOGIC FOR ELECTIONS ---
  const [electionCards, setElectionCards] = useState([
    { id: 1, title: "Board of Directors Election 2026", range: "Feb 1, 2026 - Feb 15, 2026", voters: `0 / 156 votes`, status: "active", buttonText: "Manage" },
  ]);
  const [newElectionTitle, setNewElectionTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [electionError, setElectionError] = useState(''); // Added Error State

  const handleCreateElection = () => {
    if (newElectionTitle.trim() === '' || startDate === '' || endDate === '') {
      setElectionError('Please provide a title and both start/end dates.');
      return;
    }

    const newElection = {
      id: Date.now(),
      title: newElectionTitle,
      range: `${startDate} - ${endDate}`,
      voters: "0 / 156 votes",
      status: "upcoming",
      buttonText: "Manage"
    };
    setElectionCards([...electionCards, newElection]);
    
    // Reset and close
    setNewElectionTitle('');
    setStartDate('');
    setEndDate('');
    setPositions([]);
    setElectionError('');
    setIsModalOpen(false);
  };
  // --------------------------------

  const handleAddPosition = () => {
    if (currentPosition.trim() !== '') {
      setPositions([...positions, currentPosition.trim()]);
      setCurrentPosition(''); // Clear input for next entry
    }
  };

  const removePosition = (indexToRemove) => {
    setPositions(positions.filter((_, index) => index !== indexToRemove));
  };

  // Stats and Active Election Info - UPDATED TO BE DYNAMIC
  const totalEligible = 156;
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  
  const electionStats = {
    title: electionCards[0]?.title || "No Active Election",
    ends: electionCards[0]?.range.split('-')[1] || "N/A",
    participation: ((totalVotes / totalEligible) * 100).toFixed(2),
    votesCast: totalVotes,
    eligibleVoters: totalEligible
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Election Management</h1>
          <p className="text-slate-500 text-sm">Create and manage HOA elections and view results.</p>
        </div>
        <button 
          onClick={() => {
            setElectionError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
        >
          <Plus size={18} /> Create Election
        </button>
      </div>

      {/* Main Participation Banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-[32px] p-8 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
            <CheckSquare size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{electionStats.title}</h2>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              Voting ends: {electionStats.ends} 
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span> 
              {electionStats.votesCast} votes cast
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-12">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
            <Bell size={18} /> Send Reminder
          </button>
          <div className="text-right">
            <div className="text-3xl font-black text-indigo-600">{electionStats.participation}%</div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Participation</p>
            <p className="text-[10px] text-slate-400 mt-1">{electionStats.eligibleVoters} eligible voters</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8">
        {['All Elections', 'Candidates', 'Results'].map((tab) => (
          <button 
            key={tab}
            onClick={() => {
              if (tab === 'All Elections') setActiveTab('all');
              else setActiveTab(tab.toLowerCase());
            }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === (tab === 'All Elections' ? 'all' : tab.toLowerCase())
                ? 'bg-white shadow-sm border border-slate-200 text-slate-900' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Conditional Content Rendering */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {electionCards.map((card) => (
            <div key={card.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <CheckSquare size={20} />
                </div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  card.status === 'active' ? 'bg-green-100 text-green-600' : 
                  card.status === 'upcoming' ? 'bg-orange-100 text-orange-600' : 
                  'bg-slate-100 text-slate-400'
                }`}>
                  {card.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{card.title}</h3>
              <div className="space-y-3 mb-8">
                <p className="text-xs text-slate-500 flex items-center gap-2"><Calendar size={14} /> {card.range}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2"><Users size={14} /> {card.voters}</p>
              </div>
              <button 
                onClick={() => setActiveTab('candidates')}
                className="w-full py-3 bg-slate-100 group-hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all"
              >
                {card.buttonText}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className="bg-white rounded-[32px] border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="flex gap-4 mb-6">
            <div className="relative">
              <select className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none">
                <option>Board of Directors Election 2026...</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <div className="relative">
              <select 
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none min-w-[140px]"
              >
                <option>All Positions</option>
                <option>President</option>
                <option>Vice President</option>
                <option>Secretary</option>
                <option>Treasurer</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none w-64" placeholder="Search Candidates..." />
            </div>
          </div>

          {/* DYNAMIC CANDIDATE LIST */}
          {filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8 text-left">
               {filteredCandidates.map(candidate => (
                 <div key={candidate.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 group relative">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{candidate.name}</h4>
                        <p className="text-xs text-indigo-600 font-semibold">{candidate.position}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{candidate.bio}</p>
                    <button 
                      onClick={() => setSelectedCandidateForView(candidate)}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all"
                    >
                      <Eye size={14} /> View Details
                    </button>
                 </div>
               ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm mb-6 mt-12">No Candidates Found for {selectedPosition}....</p>
          )}

          <button 
            onClick={() => {
              setCandidateError('');
              setIsCandidateModalOpen(true);
            }}
            className="mt-8 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
          >
            <Plus size={18} /> Add Candidates
          </button>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
              <div className="flex gap-4">
                <div className="relative">
                  <select className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none">
                    <option>Board of Directors Election 2026...</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                  <FileText size={18} /> Generate Official Report
                </button>
              </div>
          </div>
          
          {candidates.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {candidates.map(candidate => (
                <div key={candidate.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{candidate.name}</h4>
                      <p className="text-xs text-slate-400">{candidate.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-600">{candidate.votes} votes</div>
                    <div className="w-32 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500" 
                        style={{ width: `${totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 mb-4">
                <Trophy size={32} />
              </div>
              <p className="text-slate-400 text-sm">No results available yet. Results will appear here once candidates are added and voting begins.</p>
            </div>
          )}
        </div>
      )}

      {/* View Candidate Details Overlay */}
      {selectedCandidateForView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="relative p-8">
              <button 
                onClick={() => setSelectedCandidateForView(null)}
                className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-indigo-100">
                  {selectedCandidateForView.name.charAt(0)}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedCandidateForView.name}</h2>
                <p className="text-indigo-600 font-bold text-sm tracking-wide uppercase mt-1">{selectedCandidateForView.position}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Biography & Manifesto</h3>
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedCandidateForView.bio}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Current Votes</p>
                      <p className="text-xl font-black text-indigo-600">{selectedCandidateForView.votes}</p>
                   </div>
                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                      <p className="text-sm font-bold text-slate-700">Verified Candidate</p>
                   </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedCandidateForView(null)}
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Election Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Create New Election</h2>
                  <p className="text-slate-500 text-xs">Set up a new election for the community.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Election Title</label>
                  <input 
                    type="text" 
                    value={newElectionTitle}
                    onChange={(e) => setNewElectionTitle(e.target.value)}
                    placeholder="e.g. Board of Directors Election 2026"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Description</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Start Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">End Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Position Being Contested</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={currentPosition}
                      onChange={(e) => setCurrentPosition(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPosition()}
                      placeholder="e.g. President"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
                    />
                    <button 
                      onClick={handleAddPosition}
                      className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  {/* List of Added Positions */}
                  <div className="flex flex-wrap gap-2">
                    {positions.map((pos, index) => (
                      <span key={index} className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 group">
                        {pos}
                        <button onClick={() => removePosition(index)} className="hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Voter Eligibility</label>
                  <div className="relative">
                    <select className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none">
                      <option>Home Owners Only</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Error message for Election */}
                {electionError && (
                  <p className="text-red-500 text-xs font-bold ml-1 animate-pulse">{electionError}</p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateElection}
                  className="flex-1 py-3 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  Create Election
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Overlay */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Add New Candidate</h2>
                  <p className="text-slate-500 text-xs">Enter candidate details for the election.</p>
                </div>
                <button 
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Running For Position</label>
                  <div className="relative">
                    <select 
                      value={candidatePosition}
                      onChange={(e) => setCandidatePosition(e.target.value)}
                      className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none"
                    >
                      <option>President</option>
                      <option>Vice President</option>
                      <option>Secretary</option>
                      <option>Treasurer</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">Candidate Bio / Manifesto</label>
                  <textarea 
                    rows={4}
                    value={candidateBio}
                    onChange={(e) => setCandidateBio(e.target.value)}
                    placeholder="Briefly describe the candidate's goals..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                {/* Error message for Candidate */}
                {candidateError && (
                  <p className="text-red-500 text-xs font-bold ml-1 animate-pulse">{candidateError}</p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmCandidate}
                  className="flex-1 py-3 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  Confirm Candidate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectionPage;