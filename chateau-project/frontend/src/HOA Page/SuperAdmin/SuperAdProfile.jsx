import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Shield, Camera, 
  Lock, Bell, Save, CheckCircle2,
  Eye, EyeOff, AlertCircle 
} from 'lucide-react';
import { supabase } from '../supabaseAdmin'; // Ensure this path is correct for your project structure

const SuperAdProfile = () => {
  const [activeSection, setActiveSection] = useState('Personal Info');
  const [userEmail, setUserEmail] = useState('');
  
  // --- PERSONAL INFO STATES ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);

  // --- PASSWORD STATES ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- VISIBILITY TOGGLES ---
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- TOAST STATE ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- PASSWORD STRENGTH LOGIC ---
  const calculateStrength = (password) => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (password.length > 6) score++;
    if (password.length > 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 25, label: 'Weak', color: 'bg-red-500' };
    if (score === 3) return { score: 50, label: 'Fair', color: 'bg-yellow-500' };
    if (score === 4) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculateStrength(newPassword);

  // --- FETCH SUPER ADMIN DATA ---
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setFirstName(user.user_metadata?.first_name || user.email.split('@')[0]);
        setLastName(user.user_metadata?.last_name || 'Admin');
        setBio(user.user_metadata?.bio || "Managing the high-level system operations for Chateau.");
      }
    };
    getUser();
  }, []);

  // --- UPDATE FUNCTIONS ---
  const handleInfoUpdate = async () => {
    setInfoLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { 
        first_name: firstName,
        last_name: lastName,
        bio: bio 
      }
    });

    if (error) {
      triggerToast("Error: " + error.message, "error");
    } else {
      triggerToast("Super Admin profile updated!", "success");
    }
    setInfoLoading(false);
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      triggerToast("Please fill in both password fields.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      triggerToast("Passwords do not match!", "error");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      triggerToast("Error: " + error.message, "error");
    } else {
      triggerToast("Password updated successfully!", "success");
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4
          ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Profile</h1>
        <p className="text-slate-500 text-sm">Update your system-wide administrative settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#1e293b] to-[#0f172a] flex items-center justify-center text-white text-4xl font-bold shadow-xl uppercase">
                {firstName.charAt(0) || userEmail.charAt(0) || 'S'}
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-slate-100 rounded-xl shadow-lg text-slate-600 hover:text-blue-600 transition-all cursor-pointer">
                <Camera size={20} />
              </button>
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mt-6 truncate w-full text-center">{firstName} {lastName}</h2>
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mt-1">Super Administrator</p>
            
            <div className="w-full h-px bg-slate-50 my-6"></div>
            
            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 text-slate-500 text-sm overflow-hidden">
                <Mail size={18} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-[24px] p-2 border border-slate-100 shadow-sm">
            {['Personal Info', 'Security'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all cursor-pointer
                  ${activeSection === section ? 'bg-slate-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {section === 'Personal Info' && <User size={18} />}
                {section === 'Security' && <Lock size={18} />}
                {section}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-10">
            <h3 className="text-xl font-bold text-slate-900 mb-8">{activeSection}</h3>
            
            {activeSection === 'Personal Info' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">First Name</label>
                  <input 
                    type="text" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input type="email" value={userEmail} disabled className="w-full px-5 py-3.5 bg-slate-100 border border-slate-100 rounded-2xl text-sm font-medium text-slate-500 cursor-not-allowed" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bio / Admin Role Description</label>
                  <textarea 
                    rows="3" 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium resize-none" 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">System Security</h4>
                    <p className="text-slate-400 text-sm">Update your master admin password</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 relative">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password" 
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      
                      {newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mr-2">
                              <div 
                                className={`h-full transition-all duration-500 ${strength.color}`} 
                                style={{ width: `${strength.score}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 min-w-[40px] text-right">
                              {strength.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 relative">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password" 
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[10px] font-bold text-red-500 uppercase mt-1">Passwords do not match</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={handlePasswordUpdate}
                      disabled={loading || strength.score < 75 || newPassword !== confirmPassword}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Lock size={16} /> {loading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'Personal Info' && (
              <div className="mt-12 flex justify-end gap-4 border-t border-slate-50 pt-8">
                <button className="px-8 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
                  Cancel
                </button>
                <button 
                  onClick={handleInfoUpdate}
                  disabled={infoLoading}
                  className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save size={18} /> {infoLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdProfile;