import React, { useState, useEffect } from 'react'; 
import { 
  Link, 
  useLocation,
  useNavigate 
} from 'react-router-dom';
import { 
  LayoutDashboard,  Users,  CalendarCheck, CreditCard, Vote, Megaphone, BarChart3, ChevronLeft, Menu, ChevronDown, ShieldCheck, UserCircle,
  Settings,
  LogOut,
  FileSearch // Added for System Logs
} from 'lucide-react';
import ChateauLogo from '../../assets/ChataueLogo.png';
import { supabase } from '../supabaseAdmin'; 

// --- RequireRole Component ---
const RequireRole = ({ userRole, allowedRoles, children }) => {
  if (userRole === 'super_admin' || userRole === 'president') {
    return children;
  }
  if (allowedRoles.includes(userRole)) {
    return children;
  }
  return null; 
};

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('Admin'); 
  const [displayName, setDisplayName] = useState('Admin'); 
  const [avatarUrl, setAvatarUrl] = useState(null); 
  const location = useLocation();
  const navigate = useNavigate(); 

  const [currentUserRole, setCurrentUserRole] = useState(localStorage.getItem('userRole') || 'resident');

  useEffect(() => {
    setCurrentUserRole(localStorage.getItem('userRole') || 'resident');

    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setDisplayName(user.user_metadata?.first_name || user.email.split('@')[0]);
        setAvatarUrl(user.user_metadata?.avatar_url || null);
      }
    };

    getUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email);
        setDisplayName(session.user.user_metadata?.first_name || session.user.email.split('@')[0]);
        setAvatarUrl(session.user.user_metadata?.avatar_url || null);
        setCurrentUserRole(localStorage.getItem('userRole') || 'resident');
      }
    });

    return () => subscription.unsubscribe();
  }, [location]);

  const handleLogout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('system_logs').insert([
        { 
          user_email: user.email, 
          activity: 'User Logged Out', 
          severity: 'info', 
          details: `Session terminated for role: ${currentUserRole}` 
        }
      ]);
    }
    localStorage.removeItem('userRole'); 
    await supabase.auth.signOut();
    navigate('/admin'); 
  };

  const menuItems = [
    { icon: <LayoutDashboard size={22} />, label: "Dashboard", path: "/hoa/dashboard", allowedRoles: ['vice_president', 'secretary', 'auditor', 'board_member', 'treasurer'] },
    { icon: <Users size={22} />, label: "Residents", path: "/hoa/residents", allowedRoles: ['vice_president', 'secretary', 'auditor', 'board_member'] }, 
    // --- FIXED: Added 'secretary' to allowedRoles for Reservations ---
    { icon: <CalendarCheck size={22} />, label: "Reservations", path: "/hoa/reservations", allowedRoles: ['vice_president', 'secretary', 'auditor', 'board_member'] },
    { icon: <CreditCard size={22} />, label: "Payments", path: "/hoa/payments", allowedRoles: ['treasurer', 'auditor', 'board_member'] },
    { icon: <Vote size={22} />, label: "Elections", path: "/hoa/elections", allowedRoles: ['vice_president', 'secretary', 'auditor', 'board_member'] },
    { icon: <Megaphone size={22} />, label: "Announcements", path: "/hoa/announcements", allowedRoles: ['vice_president', 'secretary', 'auditor', 'board_member'] },
    { icon: <BarChart3 size={22} />, label: "Reports", path: "/hoa/reports", allowedRoles: ['vice_president', 'secretary', 'auditor', 'board_member'] },
    { icon: <FileSearch size={22} />, label: "System Logs", path: "/hoa/logs", allowedRoles: ['auditor'] },
  ];

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
        .group:hover .custom-scrollbar::-webkit-scrollbar-thumb { background: rgb(146, 146, 146); }
      `}</style>

      <aside className={`relative flex flex-col min-h-screen transition-all duration-300 ease-in-out shadow-2xl z-40 group
        ${isCollapsed ? 'w-20' : 'w-72'} 
        bg-gradient-to-b from-[#006837] to-[#004d29]`}>
        
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#FFF200] opacity-10 blur-[100px] pointer-events-none"></div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-white text-[#006837] rounded-full p-1 shadow-md hover:scale-110 transition-transform border border-slate-200 cursor-pointer z-50"
        >
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className={`flex flex-col items-center py-10 px-4 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 invisible' : 'opacity-100'}`}>
          <img src={ChateauLogo} alt="Chateau Logo" className="w-20 h-auto mb-4 drop-shadow-lg" />
          <h1 className="text-white font-black tracking-[0.2em] text-xl uppercase">CHATEAU</h1>
          <div className="h-px w-full bg-white/20 mt-6"></div>
        </div>

        <nav className="mt-4 px-3 space-y-2 flex-1 overflow-y-auto overflow-x-hidden pb-6 custom-scrollbar">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <RequireRole key={index} userRole={currentUserRole} allowedRoles={item.allowedRoles}>
                <Link
                  to={item.path}
                  title={isCollapsed ? item.label : ""}
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
              </RequireRole>
            );
          })}
        </nav>

        <div className="mt-auto mb-8 w-full px-3 relative z-50">
          {isProfileOpen && !isCollapsed && (
            <div className="absolute bottom-[calc(100%+16px)] left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-50">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account</p>
              </div>
              <div className="p-2">
                <Link to="/hoa/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all">
                  <UserCircle size={18} /> View Profile
                </Link>
                <div className="h-px bg-slate-100 my-2 mx-2"></div>
                <button 
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-all text-left cursor-pointer"
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FFF200] to-white flex items-center justify-center text-[#006837] font-bold shadow-inner text-lg uppercase overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : displayName.charAt(0)}
              </div>
              {!isCollapsed && (
                <div className="text-left overflow-hidden">
                  <p className="text-white text-xs font-bold truncate w-32">{displayName}</p>
                  <div className="flex items-center gap-1 text-white/60 text-[10px] uppercase font-bold tracking-tighter">
                    <ShieldCheck size={10} className="text-[#FFF200]" />
                    {currentUserRole.replace('_', ' ')}
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronDown size={16} className={`text-white/40 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />}
          </div>
        </div>
      </aside>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><LogOut size={24} /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sign Out</h3>
              <p className="text-slate-500 text-sm mb-6">Are you sure you want to sign out?</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold transition-colors cursor-pointer">Cancel</button>
                <button onClick={() => { setIsLogoutModalOpen(false); handleLogout(); }} className="flex-1 py-3 rounded-xl text-white bg-red-500 hover:bg-red-600 font-bold shadow-md shadow-red-500/20 cursor-pointer">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;