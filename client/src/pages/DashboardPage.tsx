import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
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
        <Alert variant="danger">{getErrorMessage(summary.error)}</Alert>
      )}

      <Row className="g-2 g-sm-3">
        <Col xs={4}>
          <StatTile
            label="Income"
            tone="income"
            icon={<ArrowDownIcon size={16} />}
            value={s?.totalIncome}
          />
        </Col>
        <Col xs={4}>
          <StatTile
            label="Expense"
            tone="expense"
            icon={<ArrowUpIcon size={16} />}
            value={s?.totalExpense}
          />
        </Col>
        <Col xs={4}>
          <StatTile
            label="Balance"
            tone={s && s.balance < 0 ? "expense" : "primary"}
            icon={<WalletIcon size={16} />}
            value={s?.balance}
          />
        </Col>
      </Row>

      {s && s.balance < 0 && (
        <Alert variant="warning">
          <AlertIcon size={18} />
          <span>
            You've spent <strong>{formatINR(-s.balance)}</strong> more than
            you earned this month.
          </span>
        </Alert>
      )}

      <Row xs={1} lg={2} className="g-3 align-items-start">
        <Col>
          <Card body>
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
          </Card>
        </Col>

        <Col>
          <Card body>
            <div className="section-header">
              <h2>Recent</h2>
              <Link to="/transactions" className="link-sm">
                See all
              </Link>
            </div>
            {recent.isPending && <div className="skeleton" />}
            {recent.data && recent.data.data.length > 0 && (
              <ListGroup as="ul" variant="flush">
                {recent.data.data.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))}
              </ListGroup>
            )}
            {recent.data && recent.data.data.length === 0 && (
              <p className="empty">
                No transactions this month.{" "}
                <Link to="/transactions/new">Add one</Link>
              </p>
            )}
          </Card>
        </Col>
      </Row>
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
    <Card className="stat h-100">
      <Card.Body>
        <span className={`stat-icon ${tone}`}>{icon}</span>
        <div>
          <span className="stat-label">{label}</span>
          <strong className="stat-value">
            {value === undefined ? "—" : formatINR(value)}
          </strong>
        </div>
      </Card.Body>
    </Card>
  );
}
