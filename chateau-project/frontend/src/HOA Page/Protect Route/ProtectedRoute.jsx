import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ userRole, allowedRoles, children }) => {
  if (!userRole) {
    return null; 
  }

  // --- ADDED: Matrix Bypass ---
  if (userRole === 'super_admin' || userRole === 'president') {
    return children;
  }

  // If the user's role is not inside the allowedRoles array, redirect them
  if (!allowedRoles.includes(userRole)) {
    console.warn(`Access Denied for role: ${userRole}. Redirecting to dashboard.`);
    return <Navigate to="/hoa/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;