import React from 'react';
import { useNavigate } from 'react-router-dom'; // Added for routing
import { 
  Calendar, 
  CreditCard, 
  Vote, 
  Users, 
  Megaphone,
  FileTerminal 
} from 'lucide-react';

// --- TEMPORARY DATA ---
const mockData = {
  reservations: [
    { id: 1, user: "Juan Dela Cruz", facility: "Clubhouse", date: "2026-03-12" },
    { id: 2, user: "Maria Santos", facility: "Basketball Court", date: "2026-03-14" }
  ],
  payments: [
    { id: 1, user: "Ricardo Gomez", amount: "₱1,500.00", type: "Monthly Dues" },
    { id: 2, user: "Elena Reyes", amount: "₱500.00", type: "Facility Fee" }
  ],
  reports: [
    { id: 1, subject: "Broken Streetlight", status: "Pending", priority: "Medium" },
    { id: 2, subject: "Noise Complaint - Unit 402", status: "In Progress", priority: "High" }
  ],
  announcements: [
    { id: 1, title: "Community General Assembly", date: "March 20, 2026", type: "Event" },
    { id: 2, title: "Water Interruption Notice", date: "March 11, 2026", type: "Urgent" }
  ],
  elections: [
    { id: 1, title: "HOA Board Election 2026", status: "Ongoing", voters: 142 }
  ]
};

const StatCard = ({ title, value, icon: Icon, iconBg, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
  >
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
      className="text-blue-600 text-sm font-semibold hover:underline focus:outline-none"
    >
      {linkText}
    </button>
  </div>
);

const HoaDashboard = () => {
  const navigate = useNavigate();

  // Navigation Logic updated for all routes
  const handleNavigate = (path) => {
    navigate(`${path}`);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Welcome back! Here's what's happening in your community.</p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Pending Reservations" 
          value={mockData.reservations.length} 
          icon={Calendar} 
          iconBg="bg-blue-50"
          onClick={() => handleNavigate('reservations')}
        />
        <StatCard 
          title="Pending Payments" 
          value={mockData.payments.length} 
          icon={CreditCard} 
          iconBg="bg-green-50"
          onClick={() => handleNavigate('payments')}
        />
        <StatCard 
          title="Active Elections" 
          value={mockData.elections.length} 
          icon={Vote} 
          iconBg="bg-orange-50"
          onClick={() => handleNavigate('elections')}
        />
        <StatCard 
          title="Active Residents" 
          value="154" 
          icon={Users} 
          iconBg="bg-purple-50"
          onClick={() => handleNavigate('residents')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Pending Reservations" 
              linkText="View All" 
              onClick={() => handleNavigate('reservations')} 
            />
            <div className="space-y-3">
              {mockData.reservations.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.user}</p>
                    <p className="text-xs text-slate-500">{item.facility} • {item.date}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">Pending</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Pending Payments" 
              linkText="View All" 
              onClick={() => handleNavigate('payments')} 
            />
            <div className="space-y-3">
              {mockData.payments.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.user}</p>
                    <p className="text-xs text-slate-500">{item.type}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{item.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Residents Reports" 
              linkText="View All" 
              onClick={() => handleNavigate('reports')} 
            />
            <div className="space-y-3">
              {mockData.reports.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.subject}</p>
                    <p className="text-xs text-slate-500">Status: {item.status}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Recent Announcements" 
              linkText="View All" 
              onClick={() => handleNavigate('announcements')} 
            />
            <div className="space-y-4">
              {mockData.announcements.map((item) => (
                <div key={item.id} className="p-4 border border-slate-50 rounded-xl bg-slate-50/50">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    <Megaphone size={14} className="text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">{item.date} • {item.type}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <SectionHeader 
              title="Active Elections" 
              linkText="View All" 
              onClick={() => handleNavigate('elections')} 
            />
            <div className="space-y-3">
              {mockData.elections.map((item) => (
                <div key={item.id} className="p-4 border-2 border-orange-100 rounded-xl bg-orange-50/30">
                  <p className="text-sm font-bold text-slate-900 mb-1">{item.title}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-orange-600 font-medium">{item.voters} Residents Voted</p>
                    <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">LIVE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoaDashboard;