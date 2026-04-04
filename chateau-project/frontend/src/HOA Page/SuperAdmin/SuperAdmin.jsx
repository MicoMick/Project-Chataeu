import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  FileText, 
  Activity, 
  TrendingUp, 
  UserPlus 
} from 'lucide-react';

const SuperAdmin = () => {
  // Mock data for the UI layout
  const stats = [
    { title: 'Total Residents', value: '1,284', icon: Users, color: 'bg-blue-500' },
    { title: 'Active HOA Admins', value: '12', icon: ShieldCheck, color: 'bg-green-500' },
    { title: 'Pending Reports', value: '24', icon: FileText, color: 'bg-amber-500' },
    { title: 'System Health', value: '99.9%', icon: Activity, color: 'bg-indigo-500' },
  ];

  return (
    <div className="p-6 lg:p-10">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, Super Admin</h1>
        <p className="text-slate-500 text-sm">Overview of Chateau Real - Metropolis Greens system status.</p>
      </div>

      {/* Stats Grid */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Admin Activity Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Recent System Logs</h3>
            <button className="text-xs font-bold text-[#006837] hover:underline uppercase">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">Admin User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                <tr>
                  <td className="px-6 py-4 font-medium">Juan Dela Cruz</td>
                  <td className="px-6 py-4">Updated Monthly Dues</td>
                  <td className="px-6 py-4 text-slate-400">2 mins ago</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-600 rounded-md text-[10px] font-bold">SUCCESS</span></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Maria Santos</td>
                  <td className="px-6 py-4">Issued Notice to Phase 2</td>
                  <td className="px-6 py-4 text-slate-400">1 hour ago</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-600 rounded-md text-[10px] font-bold">SUCCESS</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Shortcuts */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#FFF200]" /> System Growth
            </h3>
            <p className="text-slate-400 text-sm mb-6">User registration is up 14% this month. New HOA Admin onboardings are pending.</p>
            <button className="w-full py-3 bg-[#006837] hover:bg-[#00522c] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
              <UserPlus size={18} /> Add New Admin
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Quick Links</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">• Audit Trails</li>
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">• Database Backups</li>
              <li className="flex items-center gap-2 hover:text-[#006837] cursor-pointer font-medium">• HOA Association Settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;