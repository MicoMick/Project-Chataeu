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
import SuperAdminLayout from './HOA Page/SuperAdmin/Super Admin Sidebar/SuperAdminLayout.jsx';
import SuperAdminDB from './HOA Page/SuperAdmin/Super Admin Dashboard/SuperAdminDB.jsx';
import SuperAdProfile from './HOA Page/SuperAdmin/Super Admin Profile/SuperAdProfile.jsx'; 
import AdminControl from './HOA Page/SuperAdmin/Admin Profiles/AdminControl.jsx'; 
import Residents from './HOA Page/SuperAdmin/Profiles Residents/Residents.jsx'; 
import SystemLogs from './HOA Page/SuperAdmin/System AuditLogs/SystemLogs.jsx';
import PendingApproval from './HOA Page/Pending Approval/PendingApproval.jsx'; 
import AuditorDashboard from './HOA Page/AuditorBoard/AuditorDashboard.jsx'; 
import Statistics from './HOA Page/Statistics/Statistics.jsx';
import AccountApproval from './HOA Page/Account Approval/AccountApproval.jsx';
import MoveInClearance from './HOA Page/Move In and Out Clearance/MoveInClearance.jsx';
import { supabase } from './HOA Page/supabaseAdmin'; 
import ProtectedRoute from './HOA Page/Protect Route/ProtectedRoute';

// ─── Role constants — single source of truth ──────────────────────────────────
// Edit ONLY here if you ever add/remove roles.

const ROLES = {
  PRESIDENT:      'president',
  VICE_PRESIDENT: 'vice_president',
  SECRETARY:      'secretary',
  TREASURER:      'treasurer',
  AUDITOR:        'auditor',
  BOARD_MEMBER:   'board_member',
};

// Who can access each page
const ACCESS = {
  // Full governance (everything except financial detail)
  GOVERNANCE:  [ROLES.PRESIDENT, ROLES.VICE_PRESIDENT, ROLES.SECRETARY, ROLES.BOARD_MEMBER],

  // Resident/operational management
  OPERATIONS:  [ROLES.PRESIDENT, ROLES.VICE_PRESIDENT, ROLES.SECRETARY, ROLES.BOARD_MEMBER],

  // Election management — board members are observers only, not managers
  ELECTIONS:   [ROLES.PRESIDENT, ROLES.VICE_PRESIDENT, ROLES.SECRETARY],

  // Financial — only president and treasurer can add/void payments
  PAYMENTS:    [ROLES.PRESIDENT, ROLES.TREASURER],

  // Statistics — everyone except treasurer (no operational context)
  STATISTICS:  [ROLES.PRESIDENT, ROLES.VICE_PRESIDENT, ROLES.SECRETARY, ROLES.AUDITOR, ROLES.BOARD_MEMBER],

  // Auditor workspace — exclusive to auditor
  AUDITOR:     [ROLES.AUDITOR],

  // Profile — everyone
  PROFILE:     [ROLES.PRESIDENT, ROLES.VICE_PRESIDENT, ROLES.SECRETARY, ROLES.TREASURER, ROLES.AUDITOR, ROLES.BOARD_MEMBER],
};

// ─── Auth + role helpers ──────────────────────────────────────────────────────

const AuthRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-[#006837]/20 border-t-[#006837] rounded-full animate-spin" />
    </div>
  );
  if (!session) return <Navigate to="/admin" replace />;
  return children;
};

const RoleBasedRoute = ({ allowedRoles, children }) => {
  const currentRole = localStorage.getItem('userRole') || 'resident';
  return (
    <ProtectedRoute userRole={currentRole} allowedRoles={allowedRoles}>
      {children}
    </ProtectedRoute>
  );
};

// ─── Layout components ────────────────────────────────────────────────────────

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

const AdminLayout = () => (
  <div className="flex w-full h-screen bg-slate-50 overflow-hidden">
    <Sidebar />
    <main className="flex-1 h-screen overflow-y-auto">
      <Outlet />
    </main>
  </div>
);

// ─── Dashboard redirect — each role lands on their home page ──────────────────
const DashboardRedirect = () => {
  const role = (localStorage.getItem('userRole') || 'resident').trim().toLowerCase();

  // Treasurer lands directly on Payments — that's their whole scope
  if (role === ROLES.TREASURER) return <Navigate to="/hoa/payments" replace />;

  // Auditor lands on their dedicated workspace
  if (role === ROLES.AUDITOR) return <Navigate to="/hoa/auditor-workspace" replace />;

  // Everyone else: president, vice_president, secretary, board_member → Dashboard
  return (
    <RoleBasedRoute allowedRoles={[...ACCESS.GOVERNANCE, 'super_admin']}>
      <HoaDashboard />
    </RoleBasedRoute>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <Router>
      <Routes>

        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<LoginPage />} />

        {/* Super Admin (bypasses all role checks — handled by supabase auth) */}
        <Route path="/super-admin/dashboard"         element={<AuthRoute><SuperAdminLayout><SuperAdminDB /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/profile"           element={<AuthRoute><SuperAdminLayout><SuperAdProfile /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/admins"            element={<AuthRoute><SuperAdminLayout><AdminControl /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/residents"         element={<AuthRoute><SuperAdminLayout><Residents /></SuperAdminLayout></AuthRoute>} />
        <Route path="/super-admin/logs"              element={<AuthRoute><RoleBasedRoute allowedRoles={['super_admin']}><SuperAdminLayout><SystemLogs /></SuperAdminLayout></RoleBasedRoute></AuthRoute>} />

        {/* HOA Admin shell */}
        <Route path="/hoa" element={<AuthRoute><AdminLayout /></AuthRoute>}>

          <Route index          element={<DashboardRedirect />} />
          <Route path="dashboard" element={<DashboardRedirect />} />

          {/* ── Auditor — isolated workspace ── */}
          <Route path="auditor-workspace" element={
            <RoleBasedRoute allowedRoles={ACCESS.AUDITOR}>
              <AuditorDashboard />
            </RoleBasedRoute>
          } />

          {/* ── Resident management ── */}
          <Route path="residents" element={
            <RoleBasedRoute allowedRoles={ACCESS.OPERATIONS}>
              <ResidentManage />
            </RoleBasedRoute>
          } />

          {/* ── Pending Approvals — president only ── */}
          <Route path="pending-approvals" element={
            <RoleBasedRoute allowedRoles={['president']}>
              <PendingApproval />
            </RoleBasedRoute>
          } />

          {/* ── Account approval ── */}
          <Route path="account-approval" element={
            <RoleBasedRoute allowedRoles={ACCESS.OPERATIONS}>
              <AccountApproval />
            </RoleBasedRoute>
          } />

          {/* ── Move In / Move Out Clearances ── */}
          <Route path="move-in-clearances" element={
            <RoleBasedRoute allowedRoles={ACCESS.OPERATIONS}>
              <MoveInClearance />
            </RoleBasedRoute>
          } />

          {/* ── Reservations ── */}
          <Route path="reservations" element={
            <RoleBasedRoute allowedRoles={ACCESS.OPERATIONS}>
              <Reservation />
            </RoleBasedRoute>
          } />

          {/* ── Payments — president + treasurer only ── */}
          <Route path="payments" element={
            <RoleBasedRoute allowedRoles={ACCESS.PAYMENTS}>
              <Payment />
            </RoleBasedRoute>
          } />

          {/* ── Elections — president, VP, secretary (board members observe only via results) ── */}
          <Route path="elections" element={
            <RoleBasedRoute allowedRoles={ACCESS.ELECTIONS}>
              <ElectionPage />
            </RoleBasedRoute>
          } />

          <Route path="results" element={
            <RoleBasedRoute allowedRoles={ACCESS.ELECTIONS}>
              <Results />
            </RoleBasedRoute>
          } />

          {/* ── Reports / Issues ── */}
          <Route path="reports" element={
            <RoleBasedRoute allowedRoles={ACCESS.OPERATIONS}>
              <Reports />
            </RoleBasedRoute>
          } />

          {/* ── Announcements ── */}
          <Route path="announcements" element={
            <RoleBasedRoute allowedRoles={ACCESS.OPERATIONS}>
              <Announcements />
            </RoleBasedRoute>
          } />

          {/* ── Statistics — everyone except treasurer ── */}
          <Route path="statistics" element={
            <RoleBasedRoute allowedRoles={ACCESS.STATISTICS}>
              <Statistics />
            </RoleBasedRoute>
          } />

          {/* ── Profile — all roles ── */}
          <Route path="profile" element={
            <RoleBasedRoute allowedRoles={ACCESS.PROFILE}>
              <ProfileManage />
            </RoleBasedRoute>
          } />

          {/* ── System logs — super_admin only (handled by ProtectedRoute) ── */}
          <Route path="logs" element={
            <RoleBasedRoute allowedRoles={['super_admin']}>
              <SystemLogs />
            </RoleBasedRoute>
          } />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;
