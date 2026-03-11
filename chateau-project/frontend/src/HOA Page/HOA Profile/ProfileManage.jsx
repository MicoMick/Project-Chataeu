import React, { useState } from 'react';
import { 
  User, Mail, Phone, Shield, Camera, 
  Lock, Bell, Save, CheckCircle2 
} from 'lucide-react';

const ProfileManage = () => {
  const [activeSection, setActiveSection] = useState('Personal Info');

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Profile Management</h1>
        <p className="text-slate-500 text-sm">Update your account settings and personal information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#006837] to-[#004d29] flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                M
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-slate-100 rounded-xl shadow-lg text-slate-600 hover:text-indigo-600 transition-all">
                <Camera size={20} />
              </button>
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mt-6">Maria Clara</h2>
            <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mt-1">HOA Administrator</p>
            
            <div className="w-full h-px bg-slate-50 my-6"></div>
            
            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <Mail size={18} className="text-slate-400" />
                mariaclara@chateau.com
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <Phone size={18} className="text-slate-400" />
                +63 912 345 6789
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-[24px] p-2 border border-slate-100 shadow-sm">
            {['Personal Info', 'Security'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all
                  ${activeSection === section ? 'bg-slate-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
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
                  <input type="text" defaultValue="Maria" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Name</label>
                  <input type="text" defaultValue="Clara" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input type="email" defaultValue="mariaclara@chateau.com" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bio / Designation</label>
                  <textarea rows="3" defaultValue="Handling the administrative tasks and resident concerns for Chateau Community." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium resize-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">Change Password</h4>
                    <p className="text-slate-400 text-sm">Update your password to keep your account secure</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
                    <input type="password" placeholder="Enter current password" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                      <input type="password" placeholder="Enter new password" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                      <input type="password" placeholder="Confirm new password" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
                      <Lock size={16} /> Update Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conditionally render bottom buttons only for Personal Info */}
            {activeSection === 'Personal Info' && (
              <div className="mt-12 flex justify-end gap-4 border-t border-slate-50 pt-8">
                <button className="px-8 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                  <Save size={18} /> Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManage;