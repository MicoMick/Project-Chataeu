import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseAdmin'; 
import { 
  Users, 
  ShieldCheck
} from 'lucide-react';

const SuperAdminDB = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({
    residents: 0,
    admins: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetching Counts
      const { count: residents } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      const { count: admins } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'super_admin');
      
      // FIX: Changed 'audit_logs' to 'system_logs'
      const { data: logsData } = await supabase
        .from('system_logs') 
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setCounts({ residents: residents || 0, admins: admins || 0 });
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic stats array using fetched data
  const stats = [
    { title: 'Total Residents', value: counts.residents.toLocaleString(), icon: Users, color: 'bg-blue-500' },
    { title: 'Total Admins', value: counts.admins.toLocaleString(), icon: ShieldCheck, color: 'bg-green-500' },
  ];

  return (
    <div className="p-6 lg:p-10">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, Super Admin</h1>
        <p className="text-slate-500 text-sm">Overview of Chateau Real - Metropolis Greens system status.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent System Activity Table */}
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
                    <tr><td colSpan="4" className="px-6 py-4 text-center text-slate-400">Loading activity...</td></tr>
                ) : logs.length > 0 ? (
                    logs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 font-medium text-slate-700">{log.admin_name || 'Admin'}</td>
                          <td className="px-6 py-4 text-slate-600">{log.activity}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">{new Date(log.created_at).toLocaleDateString()}</td>
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

        {/* Quick Actions / Shortcuts */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Quick Links</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">
                <Link to="/super-admin/admins">• Admin Control</Link>
              </li>
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">
                <Link to="/super-admin/residents">• Residents</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDB;