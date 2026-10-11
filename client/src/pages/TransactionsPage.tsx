import { useState } from "react";
import { Link } from "react-router-dom";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { deleteTransaction, getTransactions } from "../api/transactions";
import { getErrorMessage } from "../api/client";
import TransactionItem from "../components/TransactionItem";
import MonthPicker from "../components/MonthPicker";
import { PlusIcon } from "../components/Icons";
import type {
  Transaction,
  TransactionFilters,
  TransactionType,
} from "../types/transaction";
import {
  currentMonth,
  formatDayHeading,
  formatINR,
  monthRange,
} from "../utils/format";

const LIMIT = 20;

const TYPE_FILTERS: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
];

// Group a (date-sorted) list into [date, transactions] pairs
function groupByDate(list: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const tx of list) {
    groups.set(tx.date, [...(groups.get(tx.date) ?? []), tx]);
  }
  return [...groups];
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonth);
  const [type, setType] = useState<TransactionType | "">("");
  const [page, setPage] = useState(1);

  const { from, to } = monthRange(month);
  const filters: TransactionFilters = {
    from,
    to,
    page,
    limit: LIMIT,
    type: type || undefined, // '' means "all", so send nothing
  };

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => getTransactions(filters),
    placeholderData: keepPreviousData, // keep the old page visible while the next loads
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      // Deleted the last item on this page: go back so we don't land on an empty page
      if (data?.data.length === 1 && page > 1) setPage((p) => p - 1);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["trend"] });
      queryClient.invalidateQueries({ queryKey: ["totals"] });
    },
  });

  function handleDelete(tx: Transaction) {
    if (window.confirm(`Delete ${tx.category.name} ${formatINR(tx.amount)}?`)) {
      deleteMutation.mutate(tx.id);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <Link to="/transactions/new" className="btn btn-primary desktop-only">
          <PlusIcon size={18} /> Add
        </Link>
      </div>

      <div className="toolbar">
        <MonthPicker
          value={month}
          onChange={(m) => {
            setMonth(m);
            setPage(1);
          }}
        />
        <div className="segmented" role="group" aria-label="Filter by type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={type === f.value ? "active" : ""}
              onClick={() => {
                setType(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {deleteMutation.isError && (
        <p className="error">{getErrorMessage(deleteMutation.error)}</p>
      )}
      {isError && <p className="error">{getErrorMessage(error)}</p>}

      {isPending && (
        <section className="card">
          <div className="skeleton" />
        </section>
      )}

      {data && data.data.length === 0 && (
        <section className="card">
          <p className="empty">
            No transactions in this month.{" "}
            <Link to="/transactions/new">Add one</Link>
          </p>
        </section>
      )}

      {data && data.data.length > 0 && (
        <section className="card">
          {groupByDate(data.data).map(([date, items]) => (
            <div className="day-group" key={date}>
              <h3 className="day-heading">{formatDayHeading(date)}</h3>
              <ul className="tx-list">
                {items.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    tx={tx}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
