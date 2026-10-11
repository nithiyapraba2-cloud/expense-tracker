import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">💰 Home Expenses</span>
        <div>
          <span className="hello">{user?.name ?? user?.email}</span>
          <button className="btn-ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end>
          🏠<span>Dashboard</span>
        </NavLink>
        <NavLink to="/transactions" end>
          📋<span>Transactions</span>
        </NavLink>
        <NavLink to="/transactions/new">
          ➕<span>Add</span>
        </NavLink>
        <NavLink to="/reports">
          📊<span>Reports</span>
        </NavLink>
      </nav>
    </div>
  );
}
