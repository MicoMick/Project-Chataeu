import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff, AlertCircle, ShieldCheck, QrCode } from 'lucide-react';
import ChateauLogo from '../assets/ChataueLogo.png';

// --- UPDATED IMPORTS ---
import { supabase } from '../HOA Page/supabaseAdmin'; 
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); 
  const [errorMsg, setErrorMsg] = useState('');
  
  // --- MFA STATES ---
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [qrCode, setQrCode] = useState(''); // For initial enrollment
  const [isEnrolling, setIsEnrolling] = useState(false);

  const navigate = useNavigate(); 

  // Helper to handle routing based on role
  const checkRoleAndRedirect = async (user) => {
    try {
      const { data: adminData } = await supabase
        .from('admins')
        .select('role')
        .eq('email', user.email)
        .single();

      if (!adminData) {
        navigate('/resident/home');
      } else if (adminData.role === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/hoa/dashboard');
      }
    } catch (err) {
      navigate('/resident/home');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
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
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      // Check for MFA factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const enrolledFactor = factors.totp[0];

      if (enrolledFactor) {
        // User already has MFA set up
        setFactorId(enrolledFactor.id);
        setMfaRequired(true);
        setLoading(false);
      } else {
        // No MFA yet. Check if they are an admin.
        const { data: adminCheck } = await supabase
          .from('admins')
          .select('role')
          .eq('email', data.user.email)
          .single();

        if (adminCheck) {
          // It's an admin without MFA - Force Enrollment
          enrollMFA(data.user.email);
        } else {
          // Regular user
          checkRoleAndRedirect(data.user);
        }
      }
    }
  };

  // --- MFA ENROLLMENT (First Time) ---
  const enrollMFA = async (userEmail) => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Chateau Project',
      friendlyName: userEmail
    });

    if (data) {
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
      setIsEnrolling(true);
      setMfaRequired(true);
    }
    setLoading(false);
  };

  // --- MFA VERIFICATION (Every Login) ---
  const handleVerifyOTP = async () => {
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factorId,
      code: otpCode,
    });

    if (error) {
      alert("Invalid OTP Code. Please try again.");
      setLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      checkRoleAndRedirect(user);
    }
  };

  // --- MFA OVERLAY UI ---
  if (mfaRequired) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
        <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            {isEnrolling ? <QrCode size={40} /> : <ShieldCheck size={40} />}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isEnrolling ? "Setup Authenticator" : "Two-Step Verification"}
          </h2>
          
          <p className="text-slate-500 mb-6 text-sm">
            {isEnrolling 
              ? "Scan this QR code with Google Authenticator or Authy to secure your admin account." 
              : "Enter the 6-digit code from your authenticator app."}
          </p>

          {isEnrolling && qrCode && (
            <div className="bg-white p-4 border-2 border-slate-100 rounded-2xl mb-6 inline-block">
              <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          )}

          <div className="space-y-4">
            <input 
              type="text"
              placeholder="000000"
              maxLength={6}
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center text-3xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              onChange={(e) => setOtpCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
            />
            
            <button 
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:bg-slate-300"
            >
              {loading ? "Verifying..." : "Confirm & Access"}
            </button>

            <button 
              onClick={() => { setMfaRequired(false); setIsEnrolling(false); supabase.auth.signOut(); }}
              className="text-slate-400 text-xs font-semibold uppercase tracking-widest hover:text-red-500"
            >
              Cancel Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500 text-sm">Please enter your credentials to manage the association.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {errorMsg && !errorMsg.toLowerCase().includes('email') && !errorMsg.toLowerCase().includes('password') && !errorMsg.toLowerCase().includes('invalid credentials') && (
               <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold uppercase tracking-wide">{errorMsg}</p>
               </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${errorMsg.toLowerCase().includes('email') ? 'text-red-400' : 'text-slate-400'}`} size={20} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@chateau.com"
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errorMsg.toLowerCase().includes('email') ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-200 focus:ring-[#006837]'}`}
                />
              </div>
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