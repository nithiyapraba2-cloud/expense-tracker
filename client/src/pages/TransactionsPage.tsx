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
import type {
  Transaction,
  TransactionFilters,
  TransactionType,
} from "../types/transaction";
import { currentMonth, formatINR, monthRange } from "../utils/format";

const LIMIT = 20;

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
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
        <Link to="/transactions/new">+ Add</Link>
      </div>

      <div className="filters">
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) {
              setMonth(e.target.value);
              setPage(1);
            }
          }}
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as TransactionType | "");
            setPage(1);
          }}
        >
          <option value="">All</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
      </div>

      {deleteMutation.isError && (
        <p className="error">{getErrorMessage(deleteMutation.error)}</p>
      )}

      <section className="card">
        {isPending && <p>Loading...</p>}
        {isError && <p className="error">{getErrorMessage(error)}</p>}
        {data && data.data.length === 0 && (
          <p className="muted">No transactions found.</p>
        )}
        {data && data.data.length > 0 && (
          <ul className="tx-list">
            {data.data.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </section>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
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
