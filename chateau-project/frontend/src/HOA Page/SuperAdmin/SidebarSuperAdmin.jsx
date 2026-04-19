import React, { useState, useEffect } from 'react';
import { 
  Link, 
  useLocation,
  useNavigate 
} from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShieldCheck, UserCircle, Globe, Settings, LogOut, 
  Menu, ChevronLeft, ChevronDown, Activity, ShieldAlert
} from 'lucide-react';
import ChateauLogo from '../../assets/ChataueLogo.png';
import { supabase } from '../supabaseAdmin'; 

const SidebarSuperAdmin = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState('President Super'); 
  const location = useLocation();
  const navigate = useNavigate();

  // --- FETCH USER DATA & SETUP LISTENER ---
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Super Admin");
      }
    };

    getUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setDisplayName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Super Admin");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={22} />, label: "Master Dashboard", path: "/super-admin/dashboard" },
    { icon: <Globe size={22} />, label: "HOA Management", path: "/super-admin/hoas" }, 
    { icon: <ShieldAlert size={22} />, label: "Admin Control", path: "/super-admin/admins" },
    { icon: <Users size={22} />, label: "All Residents", path: "/super-admin/residents" },
    { icon: <Activity size={22} />, label: "System Logs", path: "/super-admin/logs" },
    { icon: <Settings size={22} />, label: "Global Settings", path: "/super-admin/settings" },
  ];

  return (
    // Changed to h-screen flex flex-col to pin footer
    <aside className={`relative h-screen flex flex-col transition-all duration-300 ease-in-out shadow-2xl z-50
      ${isCollapsed ? 'w-20' : 'w-72'} 
      bg-gradient-to-b from-[#006837] to-[#004d29]`}>
      
      {/* Background Yellow Glow Overlay */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#FFF200] opacity-10 blur-[100px] pointer-events-none"></div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-white text-[#006837] rounded-full p-1 shadow-md hover:scale-110 transition-transform border border-slate-200 z-50"
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
        <h1 className="text-white font-black tracking-[0.2em] text-xl uppercase text-center">CHATEAU CONTROL</h1>
        <div className="h-px w-full bg-white/20 mt-6"></div>
      </div>

      {/* Navigation Menu (flex-1 makes this area grow to fill space) */}
      <nav className="mt-4 px-3 space-y-2 flex-1 overflow-y-auto">
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

      {/* User Profile Footer (Static at bottom) */}
      <div className="p-3 mt-auto">
        {isProfileOpen && !isCollapsed && (
          <div className="absolute bottom-24 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Account</p>
            </div>
            <div className="p-2">
              <Link to="/super-admin/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all">
                <UserCircle size={18} /> System Profile
              </Link>
              <div className="h-px bg-slate-100 my-2 mx-2"></div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-all text-left"
              >
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FFF200] to-white flex items-center justify-center text-[#006837] font-bold shadow-inner text-lg group-hover:scale-105 transition-transform uppercase">
              {displayName.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="text-left overflow-hidden">
                <p className="text-white text-xs font-bold truncate w-32">{displayName}</p>
                <div className="flex items-center gap-1 text-white/60 text-[10px] uppercase font-bold tracking-tighter">
                  <ShieldCheck size={10} className="text-[#FFF200]" />
                  Super Administrator
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

export default SidebarSuperAdmin;