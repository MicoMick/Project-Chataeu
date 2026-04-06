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

const SectionHeader = ({ title, linkText, onClick }) => (
  <div className="flex justify-between items-center mb-4">
    <h4 className="text-lg font-bold text-slate-800">{title}</h4>
    <button 
      onClick={onClick} 
      className="text-blue-600 text-sm font-semibold hover:underline focus:outline-none cursor-pointer"
    >
      {linkText}
    </button>
  </div>
);

const HoaDashboard = () => {
  const navigate = useNavigate();
  const [liveReports, setLiveReports] = useState([]);
  const [liveAnnouncements, setLiveAnnouncements] = useState([]); 
  const [liveElections, setLiveElections] = useState([]); 
  // ADDED: State for live reservations and residents count
  const [liveReservations, setLiveReservations] = useState([]);
  const [totalResidents, setTotalResidents] = useState(0);

  useEffect(() => {
    fetchLiveReports();
    fetchLiveAnnouncements(); 
    fetchLiveElections(); 
    fetchLiveReservations(); // ADDED
    fetchTotalResidents();   // ADDED
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

  const fetchLiveElections = async () => {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('status', 'active') 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLiveElections(data || []);
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

  const handleNavigate = (path) => {
    navigate(`/hoa/${path}`);
  };

  const mockData = {
    payments: [
      { id: 1, user: "Juan Dela Cruz", amount: "₱2,500", type: "Monthly Dues", status: "Paid", date: "Jan 15, 2024" },
      { id: 4, user: "Ana Garcia", amount: "₱2,500", type: "Monthly Dues", status: "Overdue", date: "Jan 15, 2024" }
    ]
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Welcome back! Here's what's happening in your community.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* UPDATED: Now uses live reservations count */}
        <StatCard title="Total Reservations" value={liveReservations.length} icon={Calendar} iconBg="bg-blue-50" />
        <StatCard title="Overdue Payments" value="1" icon={CreditCard} iconBg="bg-red-50" />
        <StatCard title="Active Elections" value={liveElections.length} icon={Vote} iconBg="bg-orange-50" />
        {/* UPDATED: Now uses live total residents count */}
        <StatCard title="Residents" value={totalResidents} icon={Users} iconBg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader title="Recent Reservations" linkText="View All" onClick={() => handleNavigate('reservations')} />
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {/* UPDATED: Uses liveReservations instead of mockData */}
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
            <SectionHeader title="Residents Reports" linkText="View All" onClick={() => handleNavigate('reports')} />
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader title="Recent Payments" linkText="View All" onClick={() => handleNavigate('payments')} />
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {mockData.payments.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.user}</p>
                    <p className="text-xs text-slate-500">{item.type} • {item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{item.amount}</p>
                    <p className={`text-[10px] font-bold uppercase ${item.status === 'Overdue' ? 'text-red-500' : 'text-green-500'}`}>{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader title="Recent Announcements" linkText="View All" onClick={() => handleNavigate('announcements')} />
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
            <SectionHeader title="Active Elections" linkText="View All" onClick={() => handleNavigate('elections')} />
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {liveElections.length > 0 ? (
                liveElections.map((item) => (
                  <div key={item.id} className="p-4 border-2 border-orange-100 rounded-xl bg-orange-50/30">
                    <p className="text-sm font-bold text-slate-900 mb-1">{item.title}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-orange-600 font-medium">{item.votes_count || 0} Residents Voted</p>
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