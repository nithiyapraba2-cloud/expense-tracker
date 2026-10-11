import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSummary, getTrend } from "../api/transactions";
import { getErrorMessage } from "../api/client";
import {
  currentMonth,
  formatINR,
  formatINRCompact,
  formatMonth,
  formatMonthShort,
} from "../utils/format";

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
  "#84cc16",
];

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [months, setMonths] = useState(6);

  // Same key as the dashboard, so it's often already cached
  const summary = useQuery({
    queryKey: ["summary", month],
    queryFn: () => getSummary(month),
  });

  const trend = useQuery({
    queryKey: ["trend", months],
    queryFn: () => getTrend(months),
  });

  const s = summary.data;
  const top = s?.expenseByCategory[0]; // backend already sorts by total DESC
  const savingsRate =
    s && s.totalIncome > 0 ? (s.balance / s.totalIncome) * 100 : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
      </div>

      {summary.isError && (
        <p className="error">{getErrorMessage(summary.error)}</p>
      )}

      {s && (
        <div className="highlights">
          <div className="card">
            <small className="muted">Top spending</small>
            <strong>{top ? `${top.icon ?? ""} ${top.name}` : "—"}</strong>
            {top && <span>{formatINR(top.total)}</span>}
          </div>
          <div className="card">
            <small className="muted">Savings rate</small>
            <strong
              className={
                savingsRate !== null && savingsRate < 0 ? "danger" : ""
              }
            >
              {savingsRate === null ? "—" : `${savingsRate.toFixed(0)}%`}
            </strong>
            <span>{formatINR(s.balance)} saved</span>
          </div>
        </div>
      )}

      <section className="card">
        <h2>Spending by category · {formatMonth(month)}</h2>
        {summary.isPending && <p>Loading...</p>}
        {s && s.expenseByCategory.length === 0 && (
          <p className="muted">No expenses this month.</p>
        )}
        {s && s.expenseByCategory.length > 0 && (
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={s.expenseByCategory}
                  dataKey="total"
                  nameKey="name"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {s.expenseByCategory.map((c, i) => (
                    <Cell key={c.categoryId} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Income vs Expense</h2>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>
        {trend.isPending && <p>Loading...</p>}
        {trend.isError && (
          <p className="error">{getErrorMessage(trend.error)}</p>
        )}
        {trend.data && (
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonthShort} />
                <YAxis
                  tickFormatter={(v) => formatINRCompact(Number(v))}
                  width={60}
                />
                <Tooltip
                  formatter={(value) => formatINR(Number(value))}
                  labelFormatter={(label) => formatMonth(String(label))}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  dataKey="savings"
                  name="Savings"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
