import React from 'react';
import SidebarSuperAdmin from './SidebarSuperAdmin'; 

const SuperAdminLayout = ({ children }) => {
  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden">
      <SidebarSuperAdmin />
      <main className="flex-1 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;