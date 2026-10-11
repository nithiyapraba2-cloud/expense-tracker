import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSummary, getTotals, getTransactions } from "../api/transactions";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/auth-context";
import TransactionItem from "../components/TransactionItem";
import MonthPicker from "../components/MonthPicker";
import CategoryBars from "../components/CategoryBars";
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  WalletIcon,
} from "../components/Icons";
import { currentMonth, formatINR, monthRange } from "../utils/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const { from, to } = monthRange(month);

  const summary = useQuery({
    queryKey: ["summary", month],
    queryFn: () => getSummary(month),
  });

  const totals = useQuery({ queryKey: ["totals"], queryFn: getTotals });

  const recentFilters = { from, to, limit: 5 };
  const recent = useQuery({
    queryKey: ["transactions", recentFilters],
    queryFn: () => getTransactions(recentFilters),
  });

  const s = summary.data;
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Welcome back{firstName && `, ${firstName}`}</p>
          <h1>Overview</h1>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="hero">
        <span className="hero-label">Total balance</span>
        <strong className="hero-value">
          {totals.data ? formatINR(totals.data.balance) : "—"}
        </strong>
        {totals.data && (
          <div className="hero-split">
            <span>
              <ArrowDownIcon size={14} /> In{" "}
              {formatINR(totals.data.totalIncome)}
            </span>
            <span>
              <ArrowUpIcon size={14} /> Out{" "}
              {formatINR(totals.data.totalExpense)}
            </span>
          </div>
        )}
      </div>

      {summary.isError && (
        <p className="error">{getErrorMessage(summary.error)}</p>
      )}

      <div className="stats">
        <StatTile
          label="Income"
          tone="income"
          icon={<ArrowDownIcon size={16} />}
          value={s?.totalIncome}
        />
        <StatTile
          label="Expense"
          tone="expense"
          icon={<ArrowUpIcon size={16} />}
          value={s?.totalExpense}
        />
        <StatTile
          label="Balance"
          tone={s && s.balance < 0 ? "expense" : "primary"}
          icon={<WalletIcon size={16} />}
          value={s?.balance}
        />
      </div>

      {s && s.balance < 0 && (
        <div className="alert">
          <AlertIcon size={18} />
          <span>
            You've spent <strong>{formatINR(-s.balance)}</strong> more than
            you earned this month.
          </span>
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="section-header">
            <h2>Spending by category</h2>
            <Link to="/reports" className="link-sm">
              Reports
            </Link>
          </div>
          {summary.isPending && <div className="skeleton" />}
          {s && s.expenseByCategory.length === 0 && (
            <p className="empty">No expenses this month.</p>
          )}
          {s && s.expenseByCategory.length > 0 && (
            <CategoryBars
              items={s.expenseByCategory}
              total={s.totalExpense}
            />
          )}
        </section>

        <section className="card">
          <div className="section-header">
            <h2>Recent</h2>
            <Link to="/transactions" className="link-sm">
              See all
            </Link>
          </div>
          {recent.isPending && <div className="skeleton" />}
          {recent.data && recent.data.data.length > 0 && (
            <ul className="tx-list">
              {recent.data.data.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </ul>
          )}
          {recent.data && recent.data.data.length === 0 && (
            <p className="empty">
              No transactions this month.{" "}
              <Link to="/transactions/new">Add one</Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value?: number;
  tone: "income" | "expense" | "primary";
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">
          {value === undefined ? "—" : formatINR(value)}
        </strong>
      </div>
    </div>
  );
}
