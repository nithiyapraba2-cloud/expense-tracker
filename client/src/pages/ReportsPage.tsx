import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { getSummary, getTrend } from "../api/transactions";
import { getErrorMessage } from "../api/client";
import MonthPicker from "../components/MonthPicker";
import CategoryBars from "../components/CategoryBars";
import type { TrendPoint } from "../types/transaction";
import {
  currentMonth,
  formatINR,
  formatINRCompact,
  formatMonth,
  formatMonthShort,
} from "../utils/format";
import { useDarkMode } from "../utils/use-dark-mode";

// Validated chart palette (light / dark steps of the same hues)
const CHART = {
  light: {
    income: "#1fa463",
    expense: "#e5593a",
    savings: "#2a78d6",
    grid: "#e0e7ec",
    axis: "#8591a6",
    surface: "#ffffff",
  },
  dark: {
    income: "#3fc282",
    expense: "#f2785c",
    savings: "#4a90e8",
    grid: "#253148",
    axis: "#78859b",
    surface: "#131b2c",
  },
};

const RANGES = [3, 6, 12];
const SERIES_ORDER = ["income", "expense", "savings"];

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [months, setMonths] = useState(6);
  const colors = CHART[useDarkMode() ? "dark" : "light"];

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
  const overspent = s !== undefined && s.balance < 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {summary.isError && (
        <p className="error">{getErrorMessage(summary.error)}</p>
      )}

      <div className="stats">
        <div className="stat stacked">
          <span className="stat-label">Top spending</span>
          <strong className="stat-value">
            {top ? `${top.icon ?? ""} ${top.name}` : "—"}
          </strong>
          <span className="stat-sub">
            {top ? formatINR(top.total) : "No expenses yet"}
          </span>
        </div>
        <div className="stat stacked">
          <span className="stat-label">Savings rate</span>
          <strong className={`stat-value ${overspent ? "text-expense" : ""}`}>
            {savingsRate === null ? "—" : `${savingsRate.toFixed(0)}%`}
          </strong>
          <span className="stat-sub">
            {!s
              ? "—"
              : overspent
                ? `${formatINR(-s.balance)} overspent`
                : `${formatINR(s.balance)} saved`}
          </span>
        </div>
        <div className="stat stacked">
          <span className="stat-label">Spent this month</span>
          <strong className="stat-value">
            {s ? formatINR(s.totalExpense) : "—"}
          </strong>
          <span className="stat-sub">
            {s ? `of ${formatINR(s.totalIncome)} income` : "—"}
          </span>
        </div>
      </div>

      <section className="card">
        <div className="section-header">
          <h2>Spending by category</h2>
          <span className="muted small">{formatMonth(month)}</span>
        </div>
        {summary.isPending && <div className="skeleton" />}
        {s && s.expenseByCategory.length === 0 && (
          <p className="empty">No expenses this month.</p>
        )}
        {s && s.expenseByCategory.length > 0 && (
          <CategoryBars items={s.expenseByCategory} total={s.totalExpense} />
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Income vs expense</h2>
          <div className="segmented small" role="group" aria-label="Range">
            {RANGES.map((n) => (
              <button
                key={n}
                type="button"
                className={months === n ? "active" : ""}
                onClick={() => setMonths(n)}
              >
                {n}M
              </button>
            ))}
          </div>
        </div>
        {trend.isPending && <div className="skeleton tall" />}
        {trend.isError && (
          <p className="error">{getErrorMessage(trend.error)}</p>
        )}
        {trend.data && (
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend.data} barGap={2}>
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthShort}
                  tick={{ fill: colors.axis, fontSize: 12 }}
                  axisLine={{ stroke: colors.grid }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatINRCompact(Number(v))}
                  tick={{ fill: colors.axis, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <ReferenceLine y={0} stroke={colors.axis} />
                <Tooltip
                  content={TrendTooltip}
                  cursor={{ fill: colors.grid, opacity: 0.5 }}
                />
                <Legend
                  itemSorter={(item) =>
                    SERIES_ORDER.indexOf(String(item.dataKey))
                  }
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill={colors.income}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill={colors.expense}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  dataKey="savings"
                  name="Savings"
                  stroke={colors.savings}
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: colors.savings,
                    stroke: colors.surface,
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function TrendTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  return (
    <div className="chart-tooltip">
      <strong>{formatMonth(point.month)}</strong>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="chart-tooltip-row">
          <span className="dot" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="num">{formatINR(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}
