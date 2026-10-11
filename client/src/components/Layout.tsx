import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import {
  ChartIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  PlusIcon,
} from "./Icons";
import Brand from "./Brand";

const NAV = [
  { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/transactions", label: "Transactions", icon: ListIcon, end: true },
  { to: "/reports", label: "Reports", icon: ChartIcon, end: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.email || "";

  return (
    <div className="app">
      {/* Desktop: sidebar */}
      <aside className="sidebar">
        <Brand />

        <NavLink to="/transactions/new" className="btn btn-primary sidebar-add">
          <PlusIcon size={18} /> Add transaction
        </NavLink>

        <nav className="side-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="avatar">{displayName.charAt(0).toUpperCase()}</span>
          <span className="sidebar-name">{displayName}</span>
          <button
            className="icon-btn"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
          >
            <LogoutIcon size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile: top bar */}
      <header className="topbar">
        <Brand size="sm" />
        <button
          className="icon-btn"
          onClick={logout}
          aria-label="Log out"
          title="Log out"
        >
          <LogoutIcon size={18} />
        </button>
      </header>

      <main className="content">
        <Outlet />
      </main>

      {/* Mobile: bottom tabs */}
      <nav className="bottom-nav">
        <NavLink to="/" end>
          <HomeIcon />
          <span>Home</span>
        </NavLink>
        <NavLink to="/transactions" end>
          <ListIcon />
          <span>History</span>
        </NavLink>
        <NavLink to="/transactions/new" className="fab" aria-label="Add">
          <PlusIcon size={24} />
        </NavLink>
        <NavLink to="/reports">
          <ChartIcon />
          <span>Reports</span>
        </NavLink>
      </nav>
    </div>
  );
}
