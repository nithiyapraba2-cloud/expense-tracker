import { NavLink, Outlet } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { useAuth } from "../context/auth-context";
import {
  ChartIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  PlusIcon,
} from "./Icons";
import Brand from "./Brand";
import LinkButton from "./LinkButton";

const NAV = [
  { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/transactions", label: "Transactions", icon: ListIcon, end: true },
  { to: "/reports", label: "Reports", icon: ChartIcon, end: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.email || "";

  const logoutButton = (
    <Button
      variant="icon"
      onClick={logout}
      aria-label="Log out"
      title="Log out"
    >
      <LogoutIcon size={18} />
    </Button>
  );

  return (
    <div className="app">
      {/* Desktop: sidebar */}
      <aside className="sidebar">
        <Brand />

        <LinkButton to="/transactions/new" className="w-100">
          <PlusIcon size={18} /> Add transaction
        </LinkButton>

        <Nav variant="pills" className="flex-column side-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <Nav.Link key={to} as={NavLink} to={to} end={end}>
              <Icon size={18} />
              {label}
            </Nav.Link>
          ))}
        </Nav>

        <div className="sidebar-user">
          <span className="avatar">{displayName.charAt(0).toUpperCase()}</span>
          <span className="sidebar-name">{displayName}</span>
          {logoutButton}
        </div>
      </aside>

      {/* Mobile: top bar */}
      <Navbar sticky="top" className="topbar justify-content-between">
        <Brand size="sm" />
        {logoutButton}
      </Navbar>

      <main className="content">
        <Outlet />
      </main>

      {/* Mobile: bottom tabs */}
      <Nav as="nav" className="bottom-nav">
        <Nav.Link as={NavLink} to="/" end>
          <HomeIcon />
          <span>Home</span>
        </Nav.Link>
        <Nav.Link as={NavLink} to="/transactions" end>
          <ListIcon />
          <span>History</span>
        </Nav.Link>
        <Nav.Link
          as={NavLink}
          to="/transactions/new"
          className="fab"
          aria-label="Add"
        >
          <PlusIcon size={24} />
        </Nav.Link>
        <Nav.Link as={NavLink} to="/reports">
          <ChartIcon />
          <span>Reports</span>
        </Nav.Link>
      </Nav>
    </div>
  );
}
