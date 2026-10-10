import { useAuth } from "../context/auth-context";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <header>
        <h1>Welcome, {user?.name ?? user?.email} 👋</h1>
        <button onClick={logout}>Logout</button>
      </header>
      <div className="summary">
        <div className="card income">
          Income<strong>₹0</strong>
        </div>
        <div className="card expense">
          Expense<strong>₹0</strong>
        </div>
        <div className="card savings">
          Savings<strong>₹0</strong>
        </div>
      </div>
    </div>
  );
}
