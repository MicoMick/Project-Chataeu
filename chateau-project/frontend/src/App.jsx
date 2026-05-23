import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom'; 
import React, { useState, useEffect } from 'react'; 
import Header from './LandingPage/Header/Header.jsx'; 
import Mainpage from './LandingPage/MainPage/Mainpage.jsx';
import Team from './LandingPage/Team/Team.jsx'; 
import HowItWorks from './LandingPage/HowItWorks/HowItWorks.jsx';
import DownloadPage from './LandingPage/DownloadPage/Downloadpage.jsx';
import AboutUs from './LandingPage/About us/AboutUs.jsx';
import Footer from './LandingPage/Footer/Footer.jsx';
import LoginPage from './LogInPage/LoginPage.jsx'; 
import Sidebar from './HOA Page/Sidebar/Sidebar.jsx';
import HoaDashboard from './HOA Page/Dashboard/HoaDashboard.jsx';
import ResidentManage from './HOA Page/Resident Management/ResidentManage.jsx';
import Reservation from './HOA Page/Facility and Reservation/Reservation.jsx';
import Payment from './HOA Page/Payments/Payment.jsx';
import ElectionPage from './HOA Page/Election/ElectionPage.jsx';
import Results from './HOA Page/Election/Results.jsx';
import Announcements from './HOA Page/Announcements/Announcements.jsx';
import Reports from './HOA Page/Residents Reports/Reports.jsx';
import ProfileManage from './HOA Page/HOA Profile/ProfileManage.jsx';

// --- ADDED SUPER ADMIN IMPORTS (UPDATED PATHS BASED ON FOLDERS) ---
import SuperAdminLayout from './HOA Page/SuperAdmin/Super Admin Sidebar/SuperAdminLayout.jsx';
import SuperAdminDB from './HOA Page/SuperAdmin/Super Admin Dashboard/SuperAdminDB.jsx';
import SuperAdProfile from './HOA Page/SuperAdmin/Super Admin Profile/SuperAdProfile.jsx'; 
import AdminControl from './HOA Page/SuperAdmin/Admin Profiles/AdminControl.jsx'; 
import Residents from './HOA Page/SuperAdmin/Profiles Residents/Residents.jsx'; 
import SystemLogs from './HOA Page/SuperAdmin/System AuditLogs/SystemLogs.jsx';
// --- ADDED: Pending Approval Import ---
import PendingApproval from './HOA Page/SuperAdmin/Super Admin Pending Approval/PendingApproval.jsx';

// --- SUPABASE IMPORT ---
import { supabase } from './HOA Page/supabaseAdmin'; 

// --- ADDED: IMPORT ROLE-BASED PROTECTED ROUTE ---
import ProtectedRoute from './HOA Page/Protect Route/ProtectedRoute';

// --- AUTH ROUTE COMPONENT (Renamed from ProtectedRoute to avoid conflict) ---
const AuthRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes on auth state (logged out, expired, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  if (!session) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// --- ADDED: Dynamic Role Wrapper to fix the "stale role bouncing" issue ---
// This fetches the role dynamically the exact moment the route is rendered.
const RoleBasedRoute = ({ allowedRoles, children }) => {
  const currentRole = localStorage.getItem('userRole') || 'resident';
  return (
    <ProtectedRoute userRole={currentRole} allowedRoles={allowedRoles}>
      {children}
    </ProtectedRoute>
  );
};

const LandingPage = () => (
  <div className="bg-slate-900 min-h-screen scroll-smooth">
    <Header />
    <main>
      <Mainpage />
      <Team />
      <HowItWorks />
      <DownloadPage />
      <AboutUs />
      <Footer />
    </main>
  </div>
);

// --- FIXED: AdminLayout removed constraint to fill screen dynamically ---
const AdminLayout = () => (
  <div className="flex w-full h-screen bg-slate-50 overflow-hidden">
    <Sidebar />
    <main className="flex-1 h-screen overflow-y-auto">
      <Outlet />
    </main>
  </div>
);

// --- HELPER COMPONENT FOR REDIRECT ---
const DashboardRedirect = () => {
  const role = (localStorage.getItem('userRole') || 'resident').trim().toLowerCase();
  if (role === 'treasurer') {
    return <Navigate to="/hoa/payments" replace />;
  }
  return (
    <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'secretary', 'auditor', 'board_member']}>
       <HoaDashboard />
    </RoleBasedRoute>
  );
};

function App() {
  // --- CONSOLE LOG ---
  console.log("Supabase Client:", supabase);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<LoginPage />} />

        {/* --- SUPER ADMIN ROUTES (Kept using AuthRoute) --- */}
        <Route path="/super-admin/dashboard" element={<AuthRoute><SuperAdminLayout><SuperAdminDB /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/profile" element={<AuthRoute><SuperAdminLayout><SuperAdProfile /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/admins" element={<AuthRoute><SuperAdminLayout><AdminControl /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/residents" element={<AuthRoute><SuperAdminLayout><Residents /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/logs" element={<AuthRoute><RoleBasedRoute allowedRoles={['super_admin']}><SuperAdminLayout><SystemLogs /></SuperAdminLayout></RoleBasedRoute></AuthRoute>} />
        <Route path="/super-admin/pending-approvals" element={<AuthRoute><SuperAdminLayout><PendingApproval /></SuperAdminLayout></AuthRoute>} />

        {/* --- HOA Admin Routes --- */}
        <Route path="/hoa" element={<AuthRoute><AdminLayout /></AuthRoute>}>
          
          {/* Default Route - FIXED: Uses the DashboardRedirect to bypass RoleBasedRoute guard loops */}
          <Route index element={<DashboardRedirect />} /> 

          {/* Dashboard - FIXED: Applied DashboardRedirect here as well so hard navigations to /hoa/dashboard are intercepted */}
          <Route path="dashboard" element={<DashboardRedirect />} />

          {/* Payments (Fixed allowed roles for Treasurer, Auditor, Board Member) */}
          <Route path="payments" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'treasurer', 'auditor', 'board_member']}>
              <Payment />
            </RoleBasedRoute>
          } />

          {/* Reports/Issues - FIXED: Added vice_president to allowedRoles */}
          <Route path="reports" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'secretary', 'auditor', 'board_member']}>
              <Reports />
            </RoleBasedRoute>
          } />

          {/* Announcements - FIXED: Added vice_president to allowedRoles */}
          <Route path="announcements" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'secretary', 'auditor', 'board_member']}>
              <Announcements />
            </RoleBasedRoute>
          } />

          {/* Reservations - FIXED: Added secretary to allowedRoles */}
          <Route path="reservations" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'secretary', 'auditor', 'board_member']}>
              <Reservation />
            </RoleBasedRoute>
          } />

          {/* Residents */}
          <Route path="residents" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'secretary', 'auditor', 'board_member']}>
              <ResidentManage />
            </RoleBasedRoute>
          } />

          {/* Elections */}
          <Route path="elections" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'secretary', 'auditor', 'board_member']}>
              <ElectionPage />
            </RoleBasedRoute>
          } />

          {/* Election Results */}
          <Route path="results" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'secretary', 'auditor', 'board_member']}>
              <Results/>
            </RoleBasedRoute>
          } />

          {/* Profile Manage - Kept open to all logged-in HOA admins so they can update their own info */}
          <Route path="profile" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'president', 'vice_president', 'treasurer', 'secretary', 'auditor', 'board_member']}>
              <ProfileManage />
            </RoleBasedRoute>
          } />

          {/* System Logs */}
          <Route path="logs" element={
            <RoleBasedRoute allowedRoles={['super_admin', 'auditor']}>
              <SystemLogs />
            </RoleBasedRoute>
          } />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;