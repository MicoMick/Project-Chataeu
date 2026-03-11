import React, { useState } from 'react';
import { 
  Link, 
  useLocation 
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  Vote, 
  Megaphone, 
  BarChart3, 
  ChevronLeft, 
  Menu,
  ChevronDown,
  ShieldCheck,
  UserCircle,
  Settings,
  LogOut
} from 'lucide-react';
import ChateauLogo from '../../assets/ChataueLogo.png';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { icon: <LayoutDashboard size={22} />, label: "Dashboard", path: "/hoa/dashboard" },
    { icon: <Users size={22} />, label: "Resident Management", path: "/hoa/residents" }, 
    { icon: <CalendarCheck size={22} />, label: "Reservations", path: "/hoa/reservations" },
    { icon: <CreditCard size={22} />, label: "Payments", path: "/hoa/payments" },
    { icon: <Vote size={22} />, label: "Elections", path: "/hoa/elections" },
    { icon: <Megaphone size={22} />, label: "Announcements", path: "/hoa/announcements" },
    { icon: <BarChart3 size={22} />, label: "Residents Report", path: "/hoa/reports" },
  ];

  return (
    <aside className={`relative min-h-screen transition-all duration-300 ease-in-out shadow-2xl z-50
      ${isCollapsed ? 'w-20' : 'w-72'} 
      bg-gradient-to-b from-[#006837] to-[#004d29]`}>
      
      {/* Background Yellow Glow Overlay */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#FFF200] opacity-10 blur-[100px] pointer-events-none"></div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-white text-[#006837] rounded-full p-1 shadow-md hover:scale-110 transition-transform border border-slate-200"
      >
        {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Branding Section */}
      <div className={`flex flex-col items-center py-10 px-4 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 invisible' : 'opacity-100'}`}>
        <img 
          src={ChateauLogo} 
          alt="Chateau Logo" 
          className="w-20 h-auto mb-4 drop-shadow-lg" 
        />
        <h1 className="text-white font-black tracking-[0.2em] text-xl uppercase">CHATEAU</h1>
        <div className="h-px w-full bg-white/20 mt-6"></div>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-4 px-3 space-y-2">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={index}
              to={item.path}
              className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all group
                ${isActive ? 'bg-white/20 text-white shadow-inner' : 'text-white/80 hover:text-white hover:bg-white/10'}
                ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            >
              <span className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#FFF200]'}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="absolute bottom-8 left-0 w-full px-3">
        {/* Profile Dropdown Modal */}
        {isProfileOpen && !isCollapsed && (
          <div className="absolute bottom-24 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account</p>
            </div>
            <div className="p-2">
              <Link to="/hoa/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all">
                <UserCircle size={18} /> View Profile
              </Link>
              <div className="h-px bg-slate-100 my-2 mx-2"></div>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-all text-left">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        )}

        <div 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`bg-black/20 backdrop-blur-md p-4 rounded-2xl flex items-center gap-3 border border-white/10 transition-all hover:bg-white/10 cursor-pointer group
          ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FFF200] to-white flex items-center justify-center text-[#006837] font-bold shadow-inner text-lg group-hover:scale-105 transition-transform">
              M
            </div>
            {!isCollapsed && (
              <div className="text-left">
                <p className="text-white text-sm font-bold">Maria</p>
                <div className="flex items-center gap-1 text-white/60 text-[10px] uppercase font-bold tracking-tighter">
                  <ShieldCheck size={10} className="text-[#FFF200]" />
                  HOA Admin
                </div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <ChevronDown 
              size={16} 
              className={`text-white/40 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} 
            />
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;