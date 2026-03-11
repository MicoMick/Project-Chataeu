import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom'; // Added Navigate
import React, { useState, useEffect } from 'react'; // Added React hooks
import Header from './LandingPage/Header/Header.jsx'; 
import Mainpage from './LandingPage/MainPage/Mainpage.jsx';
import Features from './LandingPage/Features/Features.jsx'; 
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
import Announcements from './HOA Page/Announcements/Announcements.jsx';
import Reports from './HOA Page/Residents Reports/Reports.jsx';
import ProfileManage from './HOA Page/HOA Profile/ProfileManage.jsx';

// --- SUPABASE IMPORT ---
import { supabase } from './HOA Page/supabaseAdmin'; 

// --- PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ children }) => {
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

const LandingPage = () => (
  <div className="bg-slate-900 min-h-screen scroll-smooth">
    <Header />
    <main>
      <Mainpage />
      <Features />
      <HowItWorks />
      <DownloadPage />
      <AboutUs />
      <Footer />
    </main>
  </div>
);

const AdminLayout = () => (
  <div className="flex bg-slate-50 min-h-screen overflow-hidden">
    <Sidebar />
    <main className="flex-1 h-screen overflow-y-auto">
      <Outlet />
    </main>
  </div>
);

function App() {
  // --- CONSOLE LOG ---
  console.log("Supabase Client:", supabase);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<LoginPage />} />

        {/* HOA Admin Routes - WRAPPED IN PROTECTED ROUTE */}
        <Route 
          path="/hoa" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Index route makes this the default for /hoa */}
          <Route index element={<HoaDashboard />} /> 
          <Route path="dashboard" element={<HoaDashboard />} />
          <Route path="residents" element={<ResidentManage />} />
          <Route path="reservations" element={<Reservation />} />
          <Route path="payments" element={<Payment />} />
          <Route path="elections" element={<ElectionPage />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<ProfileManage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;