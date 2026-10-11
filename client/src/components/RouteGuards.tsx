import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth-context";

const Loading = () => (
  <div className="center">
    <span className="spinner" aria-label="Loading" />
  </div>
);

// Only logged-in users can see these pages
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

// Logged-in users shouldn't see login/register again
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
