import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseAdmin'; // Verified path
import { 
  Calendar, 
  CreditCard, 
  Vote, 
  Users, 
  Megaphone,
  FileTerminal 
} from 'lucide-react';

// --- ADDED: RequireRole Component ---
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (allowedRoles.includes(userRole) || userRole === 'super_admin') {
    return children;
  }
  return null; 
};

// --- RESTORED COMPONENTS ---
const StatCard = ({ title, value, icon: Icon, iconBg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>
        <Icon size={24} className="text-slate-700" />
      </div>
    </div>
    <div className="mt-4 h-4"></div> 
  </div>
);

// --- UPDATED: Added allowedRoles to conditionally render the link ---
const SectionHeader = ({ title, linkText, onClick, userRole, allowedRoles }) => (
  <div className="flex justify-between items-center mb-4">
    <h4 className="text-lg font-bold text-slate-800">{title}</h4>
    <RequireRole userRole={userRole} allowedRoles={allowedRoles}>
      <button 
        onClick={onClick} 
        className="text-blue-600 text-sm font-semibold hover:underline focus:outline-none cursor-pointer"
      >
        {linkText}
      </button>
    </RequireRole>
  </div>
);

const HoaDashboard = () => {
  const navigate = useNavigate();
  const [liveReports, setLiveReports] = useState([]);
  const [liveAnnouncements, setLiveAnnouncements] = useState([]); 
  const [liveElections, setLiveElections] = useState([]); 
  const [liveReservations, setLiveReservations] = useState([]);
  const [totalResidents, setTotalResidents] = useState(0);

  // ADDED: State for live payments
  const [livePayments, setLivePayments] = useState([]);
  
  // --- ADDED: State for Overdue Count ---
  const [overdueCount, setOverdueCount] = useState(0);

  // ADDED: Loading state
  const [isLoading, setIsLoading] = useState(true);

  // --- ADDED: Get Current Role ---
  const currentUserRole = localStorage.getItem('userRole') || 'resident';

  useEffect(() => {
    // ADDED: Wrapper to handle the loading state properly
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      // Wait for all fetches to complete before hiding the loading screen
      await Promise.all([
        fetchLiveReports(),
        fetchLiveAnnouncements(),
        fetchLiveElections(),
        fetchLiveReservations(),
        fetchTotalResidents(),
        fetchLivePayments(), // Added fetch call for payments
        fetchOverdueCount()  // --- ADDED: Fetch call for overdue count ---
      ]);

      setIsLoading(false);
    };

    loadDashboardData();
  }, []);

  const fetchLiveReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setLiveReports(data || []);
    } catch (error) {
      console.error("Error fetching dashboard reports:", error.message);
    }
  };

  const fetchLiveAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published') 
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setLiveAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching dashboard announcements:", error.message);
    }
  };

  // UPDATED: Now fetches the actual vote count from the 'votes' table for each active election
  const fetchLiveElections = async () => {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('status', 'active') 
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const electionsWithVoteCounts = await Promise.all(data.map(async (election) => {
          const { count, error: countError } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('election_id', election.id);
          
          return { ...election, actual_votes: count || 0 };
        }));
        setLiveElections(electionsWithVoteCounts);
      }
    } catch (error) {
      console.error("Error fetching dashboard elections:", error.message);
    }
  };

  // --- ADDED: FETCH LIVE RESERVATIONS ---
  const fetchLiveReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          facilities ( name ),
          profiles ( full_name )
        `)
        .order('date', { ascending: false })
        .limit(4);

      if (error) throw error;
      setLiveReservations(data || []);
    } catch (error) {
      console.error("Error fetching live reservations:", error.message);
    }
  };

  // --- ADDED: FETCH TOTAL RESIDENTS COUNT ---
  const fetchTotalResidents = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalResidents(count || 0);
    } catch (error) {
      console.error("Error fetching residents count:", error.message);
    }
  };

  // --- ADDED: FETCH OVERDUE PAYMENTS COUNT ---
  const fetchOverdueCount = async () => {
    try {
      // Using ilike to catch 'Overdue' or 'overdue' regardless of capitalization
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .ilike('status', 'overdue');

      if (error) throw error;
      setOverdueCount(count || 0);
    } catch (error) {
      console.error("Error fetching overdue payments count:", error.message);
    }
  };

  // --- ADDED: FETCH LIVE PAYMENTS ---
  const fetchLivePayments = async () => {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4); // Only fetch the 4 most recent payments for the dashboard

      if (paymentsError) throw paymentsError;

      if (!paymentsData || paymentsData.length === 0) {
        setLivePayments([]);
        return;
      }

      const userIds = [...new Set(paymentsData.map(p => p.user_id).filter(Boolean))];
      let profilesData = [];

      if (userIds.length > 0) {
        const { data: pData, error: pError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (!pError) {
          profilesData = pData || [];
        }
      }

      const mergedData = paymentsData.map(payment => {
        const profile = profilesData.find(p => p.id === payment.user_id);
        return {
          ...payment,
          profiles: profile || null
        };
      });

      setLivePayments(mergedData);
    } catch (error) {
      console.error("Error fetching live payments:", error.message);
    }
  };

  const handleNavigate = (path) => {
    navigate(`/hoa/${path}`);
  };

  // ADDED: Loading Screen Animation
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
          <p className="text-[#006837] font-semibold animate-pulse tracking-wide">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Welcome back! Here's what's happening in your community.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary', 'auditor']}>
          <StatCard title="Total Reservations" value={liveReservations.length} icon={Calendar} iconBg="bg-blue-50" />
        </RequireRole>

        <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer', 'auditor']}>
          {/* --- FIXED: Replaced hardcoded "1" with overdueCount --- */}
          <StatCard title="Overdue Payments" value={overdueCount} icon={CreditCard} iconBg="bg-red-50" />
        </RequireRole>

        <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary', 'auditor']}>
          <StatCard title="Active Elections" value={liveElections.length} icon={Vote} iconBg="bg-orange-50" />
        </RequireRole>

        <RequireRole userRole={currentUserRole} allowedRoles={['president', 'vice_president', 'secretary', 'auditor']}>
          <StatCard title="Residents" value={totalResidents} icon={Users} iconBg="bg-purple-50" />
        </RequireRole>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Recent Reservations" 
              linkText="View All" 
              onClick={() => handleNavigate('reservations')} 
              userRole={currentUserRole}
              allowedRoles={['president', 'vice_president', 'secretary', 'auditor', 'board_member']} 
            />
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {liveReservations.length > 0 ? (
                liveReservations.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.profiles?.full_name || 'Unknown User'}</p>
                      <p className="text-xs text-slate-500">{item.facilities?.name} • {item.date}</p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${item.status === 'Approved' ? 'bg-green-50 text-green-600' : item.status === 'Pending' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4 italic">No reservations found.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Residents Reports" 
              linkText="View All" 
              onClick={() => handleNavigate('reports')}
              userRole={currentUserRole}
              allowedRoles={['president', 'vice_president', 'secretary', 'auditor', 'board_member']} 
            />
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {liveReports.length > 0 ? (
                liveReports.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                      <p className="text-xs text-slate-500">
                        ID: {item.user_id?.substring(0,8)}... • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      item.status === 'Resolved' ? 'bg-green-50 text-green-600' : 
                      item.status === 'Pending' ? 'bg-red-50 text-red-600' : 
                      item.status === 'In Progress' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No live reports found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* --- FIXED: Wrapped whole Recent Payments card block in RequireRole to cleanly collapse for vice_president & secretary --- */}
          <RequireRole userRole={currentUserRole} allowedRoles={['president', 'treasurer', 'auditor', 'board_member']}>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <SectionHeader 
                title="Recent Payments" 
                linkText="View All" 
                onClick={() => handleNavigate('payments')} 
                userRole={currentUserRole}
                allowedRoles={['president', 'treasurer', 'auditor', 'board_member']} 
              />
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {livePayments.length > 0 ? (
                  livePayments.map((item) => {
                    const fullName = item.profiles?.full_name || 'Unknown Resident';
                    const amount = item.amount ? `₱${Number(item.amount).toLocaleString()}` : '₱0';
                    const date = item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A';
                    const status = (item.status || 'unpaid').toLowerCase();
                    
                    // Same styling logic as the main payments page
                    let statusColor = 'text-slate-500';
                    if (status === 'paid') statusColor = 'text-green-500';
                    if (status === 'pending') statusColor = 'text-orange-500';
                    if (status === 'overdue') statusColor = 'text-red-500';

                    return (
                      <div key={item.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{fullName}</p>
                          <p className="text-xs text-slate-500">Due: {date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{amount}</p>
                          <p className={`text-[10px] font-bold uppercase ${statusColor}`}>{status}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4 italic">No recent payments found.</p>
                )}
              </div>
            </div>
          </RequireRole>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Recent Announcements" 
              linkText="View All" 
              onClick={() => handleNavigate('announcements')} 
              userRole={currentUserRole}
              // --- UPDATED: Added vice_president access ---
              allowedRoles={['president', 'vice_president', 'secretary', 'auditor', 'board_member']} 
            />
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {liveAnnouncements.length > 0 ? (
                liveAnnouncements.map((item) => (
                  <div key={item.id} className={`p-4 border rounded-xl ${item.is_emergency ? 'border-red-100 bg-red-50/30' : 'border-slate-50 bg-slate-50/50'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm font-bold ${item.is_emergency ? 'text-red-900' : 'text-slate-800'}`}>{item.title}</p>
                      <Megaphone size={14} className={item.is_emergency ? 'text-red-500' : 'text-slate-400'} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()} • {item.category}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No recent announcements.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Active Elections" 
              linkText="View All" 
              onClick={() => handleNavigate('elections')} 
              userRole={currentUserRole}
              allowedRoles={['president', 'vice_president', 'secretary', 'auditor', 'board_member']} 
            />
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {liveElections.length > 0 ? (
                liveElections.map((item) => (
                  <div key={item.id} className="p-4 border-2 border-orange-100 rounded-xl bg-orange-50/30">
                    <p className="text-sm font-bold text-slate-900 mb-1">{item.title}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-orange-600 font-medium">{item.actual_votes || 0} Residents Voted</p>
                      <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded uppercase tracking-tighter">LIVE</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4 italic">No active elections at the moment.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoaDashboard;