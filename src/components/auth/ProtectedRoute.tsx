import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, employee, loading } = useAuth();
  const location = useLocation();

  // Wait for loading to complete before making any decisions
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Authenticated but no employee record - should not happen if login flow works correctly
  // but handle it gracefully
  if (!employee) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(employee.role)) {
      // Redirect to appropriate page based on their actual role
      switch (employee.role) {
        case 'Admin':
          return <Navigate to="/app/directory" replace />;
        case 'Manager':
          return <Navigate to="/app/team" replace />;
        default:
          return <Navigate to="/app" replace />;
      }
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
