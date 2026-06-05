import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseAdmin";
import {
  Trophy, BarChart3, Users, Loader2,
  Medal, Star, TrendingUp, Vote,
  Crown, Award,
} from "lucide-react";
import logger from '../auditlogger';

const POSITION_COLORS = {
  "President":      { bg: "bg-[#006837]",   light: "bg-[#006837]/10 text-[#006837]",   bar: "bg-[#006837]"   },
  "Vice President": { bg: "bg-blue-600",     light: "bg-blue-50 text-blue-700",         bar: "bg-blue-500"    },
  "Secretary":      { bg: "bg-violet-600",   light: "bg-violet-50 text-violet-700",     bar: "bg-violet-500"  },
  "Treasurer":      { bg: "bg-amber-500",    light: "bg-amber-50 text-amber-700",       bar: "bg-amber-400"   },
  "Auditor":        { bg: "bg-rose-600",     light: "bg-rose-50 text-rose-700",         bar: "bg-rose-500"    },
  "Board Member":   { bg: "bg-slate-500",    light: "bg-slate-100 text-slate-600",      bar: "bg-slate-400"   },
};

const rankIcon = (index) => {
  if (index === 0) return <Crown size={16} className="text-yellow-500" />;
  if (index === 1) return <Medal size={15} className="text-slate-400" />;
  if (index === 2) return <Award size={14} className="text-amber-600" />;
  return <span className="text-xs font-black text-slate-400">#{index + 1}</span>;
};

// ─── Animated progress bar ────────────────────────────────────────────────────
const AnimatedBar = ({ percentage, color, delay = 0 }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percentage), 100 + delay);
    return () => clearTimeout(t);
  }, [percentage, delay]);

  return (
    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

// ─── Results by Position Group ────────────────────────────────────────────────
const PositionGroup = ({ position, candidates, totalVotes }) => {
  const cfg = POSITION_COLORS[position] || POSITION_COLORS["Board Member"];
  const groupVotes = candidates.reduce((s, c) => s + (c.vote_count || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Position header */}
      <div className={`px-5 py-3.5 flex items-center justify-between ${cfg.light}`}>
        <div className="flex items-center gap-2">
          <Vote size={14} />
          <span className="text-sm font-black uppercase tracking-wider">{position}</span>
        </div>
        <span className="text-xs font-bold">{groupVotes} total votes</span>
      </div>

      {/* Candidates in this position */}
      <div className="divide-y divide-slate-50">
        {candidates.map((c, i) => {
          const pct = groupVotes > 0 ? ((c.vote_count / groupVotes) * 100).toFixed(1) : 0;
          const isLeader = i === 0 && c.vote_count > 0;
          return (
            <div key={c.id} className={`px-5 py-4 flex items-center gap-4 ${isLeader ? 'bg-slate-50/60' : ''}`}>
              {/* Rank */}
              <div className="w-7 flex items-center justify-center shrink-0">
                {rankIcon(i)}
              </div>

              {/* Photo */}
              <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border-2
                ${isLeader ? 'border-[#FFF200]' : 'border-slate-100'}`}>
                {c.photo_url
                  ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                  : <div className={`w-full h-full flex items-center justify-center text-white text-xs font-black ${cfg.bg}`}>
                      {c.full_name?.charAt(0)}
                    </div>}
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-sm font-black text-slate-900 truncate">{c.full_name}</p>
                  {isLeader && (
                    <span className="text-[9px] font-black bg-[#FFF200] text-[#006837] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      Leading
                    </span>
                  )}
                </div>
                <AnimatedBar percentage={parseFloat(pct)} color={cfg.bar} delay={i * 80} />
              </div>

              {/* Vote count */}
              <div className="text-right shrink-0">
                <p className="text-base font-black text-slate-900">{c.vote_count}</p>
                <p className="text-[10px] text-slate-400 font-bold">{pct}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Results Component ───────────────────────────────────────────────────
const Results = ({ electionId, onBack }) => {
  const [results,  setResults]  = useState([]);
  const [election, setElection] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (electionId) fetchResults();
  }, [electionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);

      const { data: electionData } = await supabase
        .from("elections").select("title, status, end_date").eq("id", electionId).single();
      setElection(electionData);

      const { data: candidates, error: candError } = await supabase
        .from("candidates").select("id, full_name, position, photo_url").eq("election_id", electionId);
      if (candError) throw candError;

      const { data: votes, error: voteError } = await supabase
        .from("votes").select("candidate_id").eq("election_id", electionId);
      if (voteError) throw voteError;

      const withCounts = candidates.map(c => ({
        ...c,
        vote_count: votes.filter(v => v.candidate_id === c.id).length,
      })).sort((a, b) => b.vote_count - a.vote_count);

      setResults(withCounts);
    } catch (err) {
      logger.error("Error fetching results", { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = results.reduce((s, c) => s + (c.vote_count || 0), 0);

  // Group by position
  const byPosition = {};
  results.forEach(c => {
    if (!byPosition[c.position]) byPosition[c.position] = [];
    byPosition[c.position].push(c);
  });

  // Overall leaders (top candidate per position)
  const leaders = Object.entries(byPosition)
    .map(([pos, cands]) => ({ position: pos, leader: cands[0] }))
    .filter(x => x.leader && x.leader.vote_count > 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-semibold animate-pulse">Calculating results…</p>
    </div>
  );

  if (results.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
      <Users size={40} className="text-slate-300 mb-3" />
      <h3 className="text-lg font-black text-slate-700 mb-1">No Results Yet</h3>
      <p className="text-sm text-slate-400">The election is in progress or has no recorded votes.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">

      {/* ── Election title + total votes ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-slate-900">{election?.title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {election?.status === 'closed' ? 'Final results' : 'Live standings'} · {totalVotes} total votes cast
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border
          ${election?.status === 'active'  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            election?.status === 'closed'  ? 'bg-slate-100 text-slate-500 border-slate-200'       :
                                             'bg-amber-50 text-amber-700 border-amber-100'}`}>
          {election?.status || 'unknown'}
        </div>
      </div>

      {/* ── Current leaders panel ── */}
      {leaders.length > 0 && (
        <div className="bg-gradient-to-br from-[#006837] to-[#004d29] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-white/20 rounded-xl"><Trophy size={16} className="text-[#FFF200]" /></div>
              <p className="text-white font-black text-sm uppercase tracking-wider">Current Leaders</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {leaders.map(({ position, leader }) => {
                const cfg = POSITION_COLORS[position] || POSITION_COLORS["Board Member"];
                return (
                  <div key={position} className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">{position}</p>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-white/20">
                        {leader.photo_url
                          ? <img src={leader.photo_url} alt="" className="w-full h-full object-cover" />
                          : <div className={`w-full h-full flex items-center justify-center text-white text-xs font-black ${cfg.bg}`}>
                              {leader.full_name?.charAt(0)}
                            </div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-black truncate">{leader.full_name}</p>
                        <p className="text-[#FFF200] text-[10px] font-bold">{leader.vote_count} votes</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Votes',  value: totalVotes,       icon: Vote,       bg: 'bg-[#006837]/10', color: 'text-[#006837]' },
          { label: 'Candidates',   value: results.length,   icon: Users,      bg: 'bg-blue-50',       color: 'text-blue-600'  },
          { label: 'Positions',    value: Object.keys(byPosition).length, icon: BarChart3, bg: 'bg-amber-50', color: 'text-amber-600' },
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

      {/* ── Per-position breakdowns ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-wider">
          <BarChart3 size={15} className="text-[#006837]" /> Detailed Standings by Position
        </h3>
        {Object.entries(byPosition).map(([pos, cands]) => (
          <PositionGroup key={pos} position={pos} candidates={cands} totalVotes={totalVotes} />
        ))}
      </div>
    </div>
  );
};

export default Results;
