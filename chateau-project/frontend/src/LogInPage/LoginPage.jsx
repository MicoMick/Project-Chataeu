import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import ChateauLogo from '../assets/ChataueLogo.png';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State for visibility

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Logging in with:", username, password);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden">
      
      {/* Left Side: Branding & Logo */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#006837] to-[#FFF200] flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        
        {/* Custom Gradient Blobs */}
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin_username"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006837] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} // Switches type based on state
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006837] focus:border-transparent transition-all"
                  required
                />
                {/* Toggle Eye Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#006837] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-sm font-semibold text-[#006837] hover:underline">
                Forgot password?
              </button>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
            >
              Sign In
              <ArrowRight size={18} />
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