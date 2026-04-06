import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'; // Added AlertCircle
import ChateauLogo from '../assets/ChataueLogo.png';

// --- ADDED IMPORTS ---
import { supabase } from '../HOA Page/supabaseAdmin'; 
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); 
  const [errorMsg, setErrorMsg] = useState(''); // Added error state
  
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(''); // Reset error on new attempt

    // --- CHECK FOR EMPTY FIELDS ---
    if (!email || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg(error.message); // Set the error message instead of alert
      setLoading(false);
    } else {
      console.log("Logged in successfully:", data);
      
      // --- START OF ROLE-BASED REDIRECTION ---
      try {
        const { data: adminData, error: roleError } = await supabase
          .from('admins')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (roleError || !adminData) {
          // If not found in admins table, check if they are a regular resident/user
          navigate('/resident/home'); 
        } else if (adminData.role === 'super_admin') {
          // President Super goes here
          navigate('/super-admin/dashboard');
        } else if (adminData.role === 'admin') {
          // Regular HOA Admins go here
          navigate('/hoa/dashboard');
        }
      } catch (err) {
        console.error("Redirection error:", err);
        navigate('/hoa/dashboard'); // Fallback to your original route
      } finally {
        setLoading(false);
      }
      // --- END OF ROLE-BASED REDIRECTION ---
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden">
      
      {/* Left Side: Branding & Logo */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#006837] to-[#FFF200] flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-[#FFF200] rounded-full blur-[110px] opacity-10"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[500px] h-[500px] bg-[#006837] rounded-full blur-[130px] opacity-80"></div>

        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
          <img 
            src={ChateauLogo} 
            alt="Chateau Real Logo" 
            className="w-48 md:w-64 h-auto object-contain mb-8 drop-shadow-2xl" 
          />
          <h1 className="text-4xl md:text-5xl font-black tracking-[0.2em] uppercase text-white drop-shadow-md">
            CHATEAU
          </h1>
          <p className="mt-4 text-white/90 tracking-widest uppercase text-sm font-semibold">
            Metropolis Greens
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24 bg-white">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back, Admin</h2>
            <p className="text-slate-500 text-sm">Please enter your credentials to manage the association.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* --- GENERAL ERROR MESSAGE (For empty fields or overall failures) --- */}
            {errorMsg && !errorMsg.toLowerCase().includes('email') && !errorMsg.toLowerCase().includes('password') && !errorMsg.toLowerCase().includes('invalid credentials') && (
               <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold uppercase tracking-wide">{errorMsg}</p>
               </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('user') ? 'text-red-400' : 'text-slate-400'}`} size={20} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@chateau.com"
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('user') ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-200 focus:ring-[#006837]'}`}
                />
              </div>
              {/* Email Error Message */}
              {(errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('user')) && (
                <p className="text-[11px] font-bold text-red-500 uppercase flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={12} /> {errorMsg}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('invalid credentials') ? 'text-red-400' : 'text-slate-400'}`} size={20} />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-4 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('invalid credentials') ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-200 focus:ring-[#006837]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#006837] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {/* Password/Generic Error Message */}
              {(errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('invalid credentials')) && (
                <p className="text-[11px] font-bold text-red-500 uppercase flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={12} /> {errorMsg}
                </p>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-slate-200 cursor-pointer"
            >
              {loading ? "Authenticating..." : "Sign In"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-12 text-center text-slate-400 text-xs">
            Authorized Personnel Only. © 2026 CHATEAU REALS.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;