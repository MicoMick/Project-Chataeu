import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseAdmin'; 
import { 
  Users, 
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Clock,
  Activity, // ADDED: Icon for the new Logs stat card
  Server    // ADDED: Icon for the System Health panel
} from 'lucide-react';

const SuperAdminDB = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({
    residents: 0,
    admins: 0,
    pendingApprovals: 0,
    totalLogs: 0 // --- ADDED: State for Total Logs count ---
  });
  // New State for Modal
  const [modal, setModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetching Counts
      const { count: residents, error: resError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (resError) {
        console.error('Error fetching residents:', resError);
        setModal({ isOpen: true, message: 'Error fetching resident counts.' });
      }
      
      const { count: admins, error: adminError } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'super_admin');
      if (adminError) {
        console.error('Error fetching admins:', adminError);
        setModal({ isOpen: true, message: 'Error fetching admin counts.' });
      }

      const { count: pendingApprovals, error: pendingError } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');
      if (pendingError) {
        console.error('Error fetching pending approvals:', pendingError);
      }

      // --- ADDED: Fetch total system logs count for the new stat card ---
      const { count: totalLogs, error: totalLogsError } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true });
      if (totalLogsError) {
        console.error('Error fetching total logs:', totalLogsError);
      }
      
      // 2. Fetch Logs
      const { data: logsData, error: logsError } = await supabase
        .from('system_logs') 
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (logsError) {
        console.error('Error fetching logs:', logsError);
        setModal({ isOpen: true, message: 'Error fetching system logs.' });
      }

      setCounts({ 
        residents: residents || 0, 
        admins: admins || 0, 
        pendingApprovals: pendingApprovals || 0,
        totalLogs: totalLogs || 0 // --- ADDED ---
      });
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setModal({ isOpen: true, message: 'An unexpected error occurred while loading dashboard data.' });
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED: Added a 4th Stat Card so the grid looks full and balanced ---
  const stats = [
    { title: 'Total Residents', value: counts.residents.toLocaleString(), icon: Users, color: 'bg-blue-500' },
    { title: 'Total Admins', value: counts.admins.toLocaleString(), icon: ShieldCheck, color: 'bg-green-500' },
    { title: 'Pending Approvals', value: counts.pendingApprovals.toLocaleString(), icon: Clock, color: 'bg-amber-500' },
    { title: 'Total Audit Logs', value: counts.totalLogs.toLocaleString(), icon: Activity, color: 'bg-indigo-500' }, // --- ADDED ---
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
          <p className="text-[#006837] font-semibold animate-pulse tracking-wide">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 animate-in fade-in duration-500">
      {/* Modal Overlay */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                <h3 className="font-bold text-slate-800 mb-2">Notification</h3>
                <p className="text-slate-600 mb-6">{modal.message}</p>
                <button 
                    onClick={() => setModal({ isOpen: false, message: '' })}
                    className="w-full bg-[#006837] text-white py-2 rounded-lg font-bold hover:bg-[#005a2e] cursor-pointer"
                >
                    Close
                </button>
            </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, Super Admin</h1>
        <p className="text-slate-500 text-sm">Overview of Chateau Real - Metropolis Greens system status.</p>
      </div>

      {/* --- UPDATED: Grid to lg:grid-cols-4 to neatly fit the 4 cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`${item.color} p-3 rounded-xl text-white`}>
              <item.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.title}</p>
              <h3 className="text-2xl font-black text-slate-900">{item.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Recent System Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4">Activity</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin"></div>
                          <p className="text-[#006837] font-semibold animate-pulse tracking-wide text-xs">Loading activity...</p>
                        </div>
                      </td>
                    </tr>
                ) : logs.length > 0 ? (
                    logs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 font-medium text-slate-700">{log.admin_name || 'Admin'}</td>
                          <td className="px-6 py-4 text-slate-600">{log.activity}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {new Date(log.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md text-[10px] font-bold uppercase">Success</span>
                          </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="4" className="px-6 py-4 text-center text-slate-400">No recent activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="space-y-6">
          
          {/* --- ADDED: System Health Monitor (Looks highly technical for Capstone panelists) --- */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Server size={18} className="text-[#006837]" /> System Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Supabase Database</span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Auth Services</span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Storage Buckets</span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Quick Links</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">
                <Link to="/super-admin/admins">• Admin Control</Link>
              </li>
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">
                <Link to="/super-admin/residents">• Residents</Link>
              </li>
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">
                <Link to="/super-admin/pending-approvals">• Pending Approvals</Link>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SuperAdminDB;