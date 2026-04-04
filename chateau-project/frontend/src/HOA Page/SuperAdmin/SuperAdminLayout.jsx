import React from 'react';
import SidebarSuperAdmin from './SidebarSuperAdmin'; // Adjust path if needed

const SuperAdminLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Fixed width based on your component */}
      <SidebarSuperAdmin />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;