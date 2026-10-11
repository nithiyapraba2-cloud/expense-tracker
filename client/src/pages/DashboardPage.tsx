import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSummary, getTotals, getTransactions } from "../api/transactions";
import { getErrorMessage } from "../api/client";
import TransactionItem from "../components/TransactionItem";
import {
  currentMonth,
  formatINR,
  formatMonth,
  monthRange,
} from "../utils/format";

export default function DashboardPage() {
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

  return (
    <div className="page">
      {totals.data && (
        <div className="card overall">
          <small className="muted">Overall balance (all time)</small>
          <strong className={totals.data.balance < 0 ? "danger" : ""}>
            {formatINR(totals.data.balance)}
          </strong>
          <span className="muted">
            Income {formatINR(totals.data.totalIncome)} · Expense{" "}
            {formatINR(totals.data.totalExpense)}
          </span>
        </div>
      )}

      <div className="page-header">
        <h1>{formatMonth(month)}</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
      </div>

      {summary.isPending && <p>Loading...</p>}
      {summary.isError && (
        <p className="error">{getErrorMessage(summary.error)}</p>
      )}

      {summary.data && (
        <>
          <div className="summary">
            <div className="card income">
              Income<strong>{formatINR(summary.data.totalIncome)}</strong>
            </div>
            <div className="card expense">
              Expense<strong>{formatINR(summary.data.totalExpense)}</strong>
            </div>
            <div
              className={`card ${summary.data.balance >= 0 ? "savings" : "expense"}`}
            >
              Balance<strong>{formatINR(summary.data.balance)}</strong>
            </div>
          </div>

          <section className="card">
            <h2>Spending by category</h2>
            {summary.data.expenseByCategory.length === 0 ? (
              <p className="muted">No expenses this month.</p>
            ) : (
              <ul className="bars">
                {summary.data.expenseByCategory.map((c) => {
                  const percent = (c.total / summary.data.totalExpense) * 100;
                  return (
                    <li key={c.categoryId}>
                      <div className="bar-label">
                        <span>
                          {c.icon} {c.name}
                        </span>
                        <span>
                          {formatINR(c.total)} · {percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="card">
        <div className="section-header">
          <h2>Recent</h2>
          <Link to="/transactions">See all</Link>
        </div>
        {recent.data && recent.data.data.length > 0 ? (
          <ul className="tx-list">
            {recent.data.data.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </ul>
        ) : (
          <p className="muted">
            No transactions this month.{" "}
            <Link to="/transactions/new">Add one</Link>
          </p>
        )}
      </section>
    </div>
  );
}
