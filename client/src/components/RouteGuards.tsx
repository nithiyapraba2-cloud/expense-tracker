import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth-context";

// Only logged-in users can see these pages
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

// Logged-in users shouldn't see login/register again
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
