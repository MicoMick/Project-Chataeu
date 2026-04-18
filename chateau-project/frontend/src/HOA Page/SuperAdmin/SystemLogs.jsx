import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseAdmin'; 
import { Search, Activity, Clock, ShieldAlert, Info, AlertTriangle } from 'lucide-react';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Assuming your table is named 'system_logs'
      // Order by created_at descending to see newest first
      const { data, error } = await supabase
        .from('system_logs') 
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">System Activity Logs</h1>
        <p className="text-slate-500 text-sm">Monitor platform events and security updates</p>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search logs by activity or user..."
              className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006837]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Activity</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10">Loading logs...</td></tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{log.user_email || 'System'}</td>
                  <td className="px-6 py-4 text-slate-600">{log.activity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getSeverityStyle(log.severity)}`}>
                      {log.severity || 'Info'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm italic">{log.details || '-'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400">No logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemLogs;