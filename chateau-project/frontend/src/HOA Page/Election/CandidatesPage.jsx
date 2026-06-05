import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseAdmin";
import {
  ArrowLeft, Search, User, Briefcase, SearchX,
  Loader2, X, Users, Vote, ChevronRight,
  Award, Filter,
} from "lucide-react";
import logger from '../auditlogger';

// ─── Constants ────────────────────────────────────────────────────────────────
const POSITION_COLORS = {
  "President":      "bg-[#006837]/10 text-[#006837] border-[#006837]/20",
  "Vice President": "bg-blue-50 text-blue-700 border-blue-100",
  "Secretary":      "bg-violet-50 text-violet-700 border-violet-100",
  "Treasurer":      "bg-amber-50 text-amber-700 border-amber-100",
  "Auditor":        "bg-rose-50 text-rose-700 border-rose-100",
  "Board Member":   "bg-slate-100 text-slate-600 border-slate-200",
};

const POSITION_DOT = {
  "President":      "bg-[#006837]",
  "Vice President": "bg-blue-500",
  "Secretary":      "bg-violet-500",
  "Treasurer":      "bg-amber-400",
  "Auditor":        "bg-rose-500",
  "Board Member":   "bg-slate-400",
};

// ─── Candidate Detail Modal ───────────────────────────────────────────────────
const CandidateModal = ({ candidate, onClose }) => {
  if (!candidate) return null;
  const posColor = POSITION_COLORS[candidate.position] || POSITION_COLORS["Board Member"];
  const posDot   = POSITION_DOT[candidate.position]   || POSITION_DOT["Board Member"];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}>

        {/* Header — green gradient with photo */}
        <div className="relative bg-gradient-to-br from-[#006837] to-[#004d29] pt-8 pb-16 px-6 text-center">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center cursor-pointer transition-all">
            <X size={15} />
          </button>
          <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Candidate Profile</div>

          {/* Photo */}
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl mx-auto mb-3">
            {candidate.photo_url
              ? <img src={candidate.photo_url} alt={candidate.full_name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <User size={32} className="text-white/40" />
                </div>}
          </div>

          {/* Position badge */}
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border mb-2 ${posColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${posDot}`} />
            {candidate.position}
          </span>
          <h2 className="text-2xl font-black text-white">{candidate.full_name}</h2>
        </div>

        {/* Body */}
        <div className="-mt-6 bg-white rounded-t-3xl relative z-10 p-6 space-y-4">
          {/* Election */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-9 h-9 bg-[#006837]/10 rounded-xl flex items-center justify-center shrink-0">
              <Vote size={15} className="text-[#006837]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Election Event</p>
              <p className="text-sm font-bold text-slate-800">{candidate.elections?.title || 'No election assigned'}</p>
            </div>
          </div>

          {/* Manifesto */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Manifesto</p>
            <p className="text-sm text-slate-600 leading-relaxed italic">
              "{candidate.manifesto || 'No manifesto provided.'}"
            </p>
          </div>

          <button onClick={onClose}
            className="w-full py-3.5 bg-[#006837] hover:bg-[#004d29] text-white rounded-2xl font-bold cursor-pointer transition-all shadow-lg shadow-[#006837]/20">
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Candidate Card ───────────────────────────────────────────────────────────
const CandidateCard = ({ candidate, onClick }) => {
  const posColor = POSITION_COLORS[candidate.position] || POSITION_COLORS["Board Member"];
  const posDot   = POSITION_DOT[candidate.position]   || POSITION_DOT["Board Member"];

  return (
    <div onClick={onClick}
      className="group bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg hover:border-[#006837]/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col">

      {/* Photo */}
      <div className="relative h-36 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        {candidate.photo_url
          ? <img src={candidate.photo_url} alt={candidate.full_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#006837]/10 flex items-center justify-center">
                <User size={26} className="text-[#006837]" />
              </div>
            </div>}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#006837]/0 group-hover:bg-[#006837]/10 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/95 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
            <span className="text-[10px] font-black text-[#006837] uppercase tracking-wider">View Profile</span>
            <ChevronRight size={11} className="text-[#006837]" />
          </div>
        </div>

        {/* Position badge overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/20 to-transparent">
          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${posColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${posDot}`} />
            {candidate.position}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-sm font-black text-slate-900 truncate mb-0.5">{candidate.full_name}</p>

        {/* Election name */}
        <div className="flex items-center gap-1.5 mt-1 mb-3">
          <Briefcase size={11} className="text-slate-400 shrink-0" />
          <p className="text-[11px] text-slate-400 font-semibold truncate">
            {candidate.elections?.title || 'No election'}
          </p>
        </div>

        {/* Manifesto preview */}
        <p className="text-xs text-slate-400 line-clamp-2 italic leading-relaxed mt-auto pt-3 border-t border-slate-50">
          "{candidate.manifesto || 'No manifesto provided.'}"
        </p>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CandidatesPage = ({ onBack }) => {
  const [candidates,       setCandidates]       = useState([]);
  const [elections,        setElections]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedElection, setSelectedElection] = useState('all');
  const [selectedCandidate,setSelectedCandidate]= useState(null);

  useEffect(() => { fetchCandidates(); fetchElections(); }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidates')
        .select('*, elections(title)');
      if (error) throw error;
      setCandidates(data || []);
    } catch (err) {
      logger.error('Error fetching candidates', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchElections = async () => {
    try {
      const { data } = await supabase.from('elections').select('id, title').order('title');
      setElections(data || []);
    } catch (err) {
      logger.error('Error fetching elections', { error: err.message });
    }
  };

  const filtered = candidates.filter(c => {
    const matchSearch =
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.elections?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchElection = selectedElection === 'all' || c.elections?.title === selectedElection;
    return matchSearch && matchElection;
  });

  // Group filtered by election for the grouped view
  const byElection = {};
  filtered.forEach(c => {
    const key = c.elections?.title || 'Unassigned';
    if (!byElection[key]) byElection[key] = [];
    byElection[key].push(c);
  });

  const showGrouped  = selectedElection === 'all' && !searchTerm;
  const totalElections = Object.keys(byElection).length;

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen space-y-6 animate-in fade-in duration-300">
      <CandidateModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-[#006837] font-bold mb-2 transition-colors group cursor-pointer text-sm">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Elections
          </button>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-[#006837]" />
            All Candidates
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} across {elections.length} election{elections.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Election filter */}
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select value={selectedElection} onChange={e => setSelectedElection(e.target.value)}
              className="pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 cursor-pointer shadow-sm appearance-none">
              <option value="all">All Elections</option>
              {elections.map(el => <option key={el.id} value={el.title}>{el.title}</option>)}
            </select>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search candidates…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 focus:border-[#006837] shadow-sm transition-all w-56" />
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Candidates', value: candidates.length, icon: Users,  bg: 'bg-[#006837]/10', color: 'text-[#006837]' },
          { label: 'Elections',        value: elections.length,  icon: Vote,   bg: 'bg-blue-50',       color: 'text-blue-600'  },
          { label: 'Showing',          value: filtered.length,   icon: Award,  bg: 'bg-amber-50',      color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.bg}`}>
              <k.icon size={17} className={k.color} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900">{k.value}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active election filter banner ── */}
      {selectedElection !== 'all' && (
        <div className="bg-gradient-to-r from-[#006837] to-[#34a853] rounded-2xl p-5 flex items-center justify-between gap-4 relative overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
          <div className="relative">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-0.5">Filtered by Election</p>
            <h2 className="text-lg font-black text-white">{selectedElection}</h2>
            <p className="text-white/70 text-xs font-semibold mt-0.5">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
          <button onClick={() => setSelectedElection('all')}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold cursor-pointer transition-all border border-white/20">
            <X size={12} /> Clear Filter
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-semibold animate-pulse">Loading candidates…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
          <SearchX size={40} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-black text-slate-700 mb-1">No Candidates Found</h3>
          <p className="text-sm text-slate-400">Try adjusting your search or filter settings.</p>
        </div>
      ) : showGrouped ? (
        /* ── Grouped by election ── */
        <div className="space-y-8">
          {Object.entries(byElection).map(([electionTitle, electionCandidates]) => (
            <div key={electionTitle}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#006837]/10 rounded-xl flex items-center justify-center shrink-0">
                  <Vote size={14} className="text-[#006837]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{electionTitle}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{electionCandidates.length} candidate{electionCandidates.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 h-px bg-slate-200 ml-2" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 py-1 bg-slate-100 rounded-full">
                  {electionCandidates.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {electionCandidates.map(c => (
                  <CandidateCard key={c.id} candidate={c} onClick={() => setSelectedCandidate(c)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Flat grid (when searching or filtering) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => (
            <CandidateCard key={c.id} candidate={c} onClick={() => setSelectedCandidate(c)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidatesPage;
