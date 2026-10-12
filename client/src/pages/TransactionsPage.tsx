import { useState } from "react";
import { Link } from "react-router-dom";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Modal from "react-bootstrap/Modal";
import Pagination from "react-bootstrap/Pagination";
import Spinner from "react-bootstrap/Spinner";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import { deleteTransaction, getTransactions } from "../api/transactions";
import { getErrorMessage } from "../api/client";
import LinkButton from "../components/LinkButton";
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
  const [toDelete, setToDelete] = useState<Transaction | null>(null);

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

  function confirmDelete() {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id, {
      onSettled: () => setToDelete(null),
    });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <LinkButton to="/transactions/new" className="d-none d-lg-inline-flex">
          <PlusIcon size={18} /> Add
        </LinkButton>
      </div>

      <div className="toolbar">
        <MonthPicker
          value={month}
          onChange={(m) => {
            setMonth(m);
            setPage(1);
          }}
        />
        <ToggleButtonGroup
          type="radio"
          name="type-filter"
          value={type}
          onChange={(value: TransactionType | "") => {
            setType(value);
            setPage(1);
          }}
          aria-label="Filter by type"
        >
          {TYPE_FILTERS.map((f) => (
            <ToggleButton
              key={f.value}
              id={`type-filter-${f.value || "all"}`}
              value={f.value}
              variant="outline-secondary"
              size="sm"
            >
              {f.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

      {deleteMutation.isError && (
        <Alert variant="danger">{getErrorMessage(deleteMutation.error)}</Alert>
      )}
      {isError && <Alert variant="danger">{getErrorMessage(error)}</Alert>}

      {isPending && (
        <Card body>
          <div className="skeleton" />
        </Card>
      )}

      {data && data.data.length === 0 && (
        <Card body>
          <p className="empty">
            No transactions in this month.{" "}
            <Link to="/transactions/new">Add one</Link>
          </p>
        </Card>
      )}

      {data && data.data.length > 0 && (
        <Card body>
          {groupByDate(data.data).map(([date, items]) => (
            <div className="day-group" key={date}>
              <h3 className="day-heading">{formatDayHeading(date)}</h3>
              <ListGroup as="ul" variant="flush">
                {items.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    tx={tx}
                    onDelete={setToDelete}
                  />
                ))}
              </ListGroup>
            </div>
          ))}
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination className="justify-content-center">
          <Pagination.Prev
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Pagination.Prev>
          <Pagination.Item disabled className="page-count">
            Page {page} of {totalPages}
          </Pagination.Item>
          <Pagination.Next
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Pagination.Next>
        </Pagination>
      )}

      <Modal show={toDelete !== null} onHide={() => setToDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h2">Delete transaction?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {toDelete && (
            <>
              <strong>
                {toDelete.category.name} {formatINR(toDelete.amount)}
              </strong>{" "}
              will be removed. This can't be undone.
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && (
              <Spinner animation="border" size="sm" />
            )}
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
