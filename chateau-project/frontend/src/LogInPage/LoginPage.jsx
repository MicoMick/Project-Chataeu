import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff, AlertCircle, ShieldCheck, QrCode, CheckCircle } from 'lucide-react';
import ChateauLogo from '../assets/ChataueLogo.png';

// --- UPDATED IMPORTS ---
import { supabase } from '../HOA Page/supabaseAdmin'; 
import { useNavigate } from 'react-router-dom';

// --- ADDED: Example function to fetch the logged-in admin's role ---
const fetchAdminRole = async (userEmail) => {
  const { data, error } = await supabase
    .from('admins')
    .select('role')
    .eq('email', userEmail)
    .maybeSingle(); 

  if (error) {
    console.error("Error fetching role:", error);
    return null;
  }
  
  return data ? data.role : null; 
};
// ------------------------------------------------------------------

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); 
  const [errorMsg, setErrorMsg] = useState('');
  
  // --- MFA STATES ---
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState(''); // ADDED: Missing Challenge ID State
  const [otpCode, setOtpCode] = useState('');
  const [qrCode, setQrCode] = useState(''); 
  const [isEnrolling, setIsEnrolling] = useState(false);

  // --- ADDED: Confirmation State ---
  const [isConfirmingIdentity, setIsConfirmingIdentity] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  const navigate = useNavigate(); 

  const checkRoleAndRedirect = async (user) => {
    try {
      // --- ADDED: Fetch and store the role in localStorage for ProtectedRoute to use ---
      const userRole = await fetchAdminRole(user.email);
      if (userRole) {
        localStorage.setItem('userRole', userRole);
      } else {
        localStorage.setItem('userRole', 'resident'); 
      }

      const { data: adminData } = await supabase
        .from('admins')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (!adminData) {
        navigate('/resident/home');
      } else if (adminData.role === 'super_admin') {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/hoa/dashboard');
      }
    } catch (err) {
      console.error("Redirect logic failed:", err);
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
      console.error("Login attempt failed:", error.message); 
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setAuthenticatedUser(data.user);
      setIsConfirmingIdentity(true);
      setLoading(false);
    }
  };

  const proceedToMfa = async () => {
    setLoading(true);
    setIsConfirmingIdentity(false);

    try {
      const { data: factorData } = await supabase.auth.mfa.listFactors();
      
      // FIXED: Specifically check for verified vs unverified factors
      const verifiedFactor = factorData?.totp?.find(f => f.status === 'verified');
      const unverifiedFactor = factorData?.totp?.find(f => f.status === 'unverified');

      const { data: adminCheck } = await supabase
        .from('admins')
        .select('role')
        .eq('email', authenticatedUser.email)
        .maybeSingle();

      // Logic 1: Admin, no factors at all -> Force fresh enrollment
      if (adminCheck && !verifiedFactor && !unverifiedFactor) {
        enrollMFA(authenticatedUser.email);
        return;
      } 

      // Logic 2: Unverified factor exists -> Resume setup so we don't get "friendly name exists" error
      if (unverifiedFactor) {
        setFactorId(unverifiedFactor.id);
        setIsEnrolling(true); // Treat as enrollment
        setMfaRequired(true);
        setLoading(false);
      } 
      // Logic 3: Verified factor exists -> Standard Login Flow
      else if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        
        // FIXED: Must generate a Challenge ID for existing users
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id
        });

        if (challengeError) throw challengeError;

        setChallengeId(challengeData.id); // Save the Challenge ID
        setIsEnrolling(false);
        setMfaRequired(true);
        setLoading(false);
      } else {
        // Logic 4: Not an admin
        checkRoleAndRedirect(authenticatedUser);
        setLoading(false);
      }
    } catch (err) {
      console.error("MFA sequence error:", err);
      setErrorMsg("Security check failed. Please try again.");
      setLoading(false);
    }
  };

  const enrollMFA = async (userEmail) => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Chateau Project',
        friendlyName: userEmail
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setFactorId(data.id);
        setIsEnrolling(true);
        setMfaRequired(true);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg("Please enter a 6-digit code.");
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (isEnrolling) {
        // --- ADDED: Generate a challenge ID for the new factor before verifying ---
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factorId });
        if (challengeError) throw challengeError;

        const { error } = await supabase.auth.mfa.verify({
          factorId: factorId,
          challengeId: challengeData.id, // --- ADDED: Pass the generated challenge ID ---
          code: cleanCode,
        });
        if (error) throw error;
        await logSystemActivity('Admin verified and enrolled MFA');
        checkRoleAndRedirect(authenticatedUser);
      } else {
        // FIXED: Standard verification REQUIRES the challenge ID
        const { error } = await supabase.auth.mfa.challengeAndVerify({
          factorId: factorId,
          challengeId: challengeId, // Added this required parameter
          code: cleanCode,
        });
        if (error) throw error;
        await logSystemActivity('Admin verified via MFA');
        checkRoleAndRedirect(authenticatedUser);
      }
    } catch (err) {
      console.error("MFA Verification Error details:", err);
      setErrorMsg("Invalid OTP Code. Please ensure your phone's time is set to 'Automatic'.");
      setLoading(false);
    }
  };

  const logSystemActivity = async (details) => {
    await supabase.from('system_logs').insert([{ 
      user_email: authenticatedUser.email, 
      activity: 'User Logged In', 
      severity: 'info', 
      details: details
    }]);
  };

  // --- UI Logic ---
  if (isConfirmingIdentity) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
        <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center">
           <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} /></div>
           <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify Identity</h2>
           <p className="text-slate-500 mb-6 text-sm">Confirm that you are the administrator for this session.</p>
           <button onClick={proceedToMfa} className="w-full py-4 bg-[#006837] text-white font-bold rounded-2xl mb-3 cursor-pointer">Confirm & Continue</button>
           <button onClick={() => { setIsConfirmingIdentity(false); supabase.auth.signOut(); }} className="text-slate-400 text-xs font-semibold hover:text-red-500 cursor-pointer">Cancel</button>
        </div>
      </div>
    );
  }

  if (mfaRequired) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
        <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            {isEnrolling ? <QrCode size={40} /> : <ShieldCheck size={40} />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{isEnrolling ? "Setup MFA" : "Verification"}</h2>
          {errorMsg && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{errorMsg}</div>}
          {isEnrolling && qrCode && <div className="bg-white p-4 border rounded-2xl mb-6 inline-block"><img src={qrCode} alt="MFA QR" className="w-48 h-48" /></div>}
          <div className="space-y-4">
            <input type="text" placeholder="000000" maxLength={6} className="w-full p-5 bg-slate-50 border rounded-2xl text-center text-3xl font-bold tracking-[0.5em]" onChange={(e) => setOtpCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()} />
            <button onClick={handleVerifyOTP} disabled={loading} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">{loading ? "Verifying..." : "Access Dashboard"}</button>
            <button onClick={() => { setMfaRequired(false); setIsEnrolling(false); supabase.auth.signOut(); }} className="text-slate-400 text-xs font-semibold hover:text-red-500 cursor-pointer">Cancel Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#006837] to-[#FFF200] flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <img src={ChateauLogo} alt="Logo" className="w-48 md:w-64 mb-8 drop-shadow-2xl relative z-10" />
        <h1 className="text-4xl md:text-5xl font-black uppercase relative z-10">CHATEAU</h1>
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
          <p className="text-slate-500 text-sm mb-10">Admin Login</p>
          <form onSubmit={handleLogin} className="space-y-6">
            {errorMsg && <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600"><AlertCircle size={18} /><p className="text-xs font-bold uppercase">{errorMsg}</p></div>}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase">Email Address</label>
              <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-xl" placeholder="admin@chateau.com" /></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase">Password</label>
              <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-slate-50 border rounded-xl" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xl">{loading ? "Authenticating..." : "Sign In"}<ArrowRight size={18} /></button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;