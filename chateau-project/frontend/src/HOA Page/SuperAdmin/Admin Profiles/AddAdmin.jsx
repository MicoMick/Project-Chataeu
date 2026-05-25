import React, { useState } from 'react';
import { supabase } from '../../supabaseAdmin'; 
import { X, Eye, EyeOff } from 'lucide-react';
import zxcvbn from 'zxcvbn';

const AddAdmin = ({ isOpen, onClose, onAdminAdded }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Admin'); 
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const passwordScore = zxcvbn(password).score;
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!displayName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (passwordScore < 3) { 
      setError('Password is too weak. Please use a stronger password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // --- FIXED: Reverted back to signUp to fix the 401 Unauthorized Error. ---
      // To bypass email confirmation, you must turn OFF "Confirm email" in your Supabase Dashboard (Authentication -> Providers -> Email).
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password, 
        options: { 
          data: { 
            full_name: displayName, 
            role: role 
          } 
        }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('admins')
        .insert([
          {
            id: authData.user?.id, 
            display_name: displayName,
            email: email,
            role: role,
            created_at: new Date().toISOString(),
          }
        ]);

      // --- FIXED: Intercepts the RLS 403 Error to prevent app crash and guides you to the backend fix ---
      if (dbError) {
        if (dbError.code === '42501' || dbError.message?.includes('row-level security')) {
          throw new Error("Admin created in Auth, but Supabase RLS blocked the table insert. Solution: Go to Supabase Dashboard -> Authentication -> Policies -> 'admins' table -> Create a policy to 'Enable insert for anon users'.");
        }
        throw dbError;
      }

      // --- ADDED: Clean up the mistakenly created profile ---
      // Your database has a trigger that automatically creates a 'profiles' row on signup.
      // This deletes that auto-generated resident profile so they ONLY exist in 'admins'.
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', authData.user?.id);
        
      if (profileDeleteError) {
         console.warn("Note: Could not automatically delete the auto-generated profile due to RLS policies. You may need to delete it manually.", profileDeleteError);
      }

      setDisplayName('');
      setEmail('');
      setPassword('');
      setRole('Admin');
      onAdminAdded(); 
      onClose();      

    } catch (err) {
      setError(err.message || 'An error occurred while creating the admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Add New Admin</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Display Name</label>
            <input 
              type="text" 
              required 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. Jane Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="admin@chateau.com"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="president">President</option>
              <option value="vice_president">Vice President</option>
              <option value="treasurer">Treasurer</option>
              <option value="secretary">Secretary</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500">Password Strength:</span>
                  <span className={`text-xs font-bold ${passwordScore >= 3 ? 'text-green-600' : 'text-slate-500'}`}>
                    {strengthLabels[passwordScore]}
                  </span>
                </div>
                <div className="flex gap-1 h-1.5 w-full">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div 
                      key={index}
                      className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                        index <= passwordScore ? strengthColors[passwordScore] : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || (password && passwordScore < 3)}
              className="flex-1 py-2 bg-[#006837] text-white rounded-lg font-semibold hover:bg-[#004d29] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
            >
              {isSubmitting ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAdmin;