import React from 'react';
import SidebarSuperAdmin from './SidebarSuperAdmin'; 

const SuperAdminLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarSuperAdmin />
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;