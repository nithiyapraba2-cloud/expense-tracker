import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Modal from "react-bootstrap/Modal";
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
  const [toDelete, setToDelete] = useState<Transaction | null>(null);

  const { from, to } = monthRange(month);
  const filters: TransactionFilters = {
    from,
    to,
    limit: LIMIT,
    type: type || undefined, // '' means "all", so send nothing
  };

  // Infinite scroll: each "page" from the API is appended to one list
  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["transactions", "infinite", filters],
    queryFn: ({ pageParam }) => getTransactions({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    placeholderData: keepPreviousData, // keep the old list visible while filters change
  });

  const transactions = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Load the next page when the bottom of the list scrolls into view
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" }, // start a bit before the user hits the end
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <LinkButton to="/transactions/new" className="d-none d-lg-inline-flex">
          <PlusIcon size={18} /> Add
        </LinkButton>
      </div>

      <div className="toolbar">
        <MonthPicker value={month} onChange={setMonth} />
        <ToggleButtonGroup
          type="radio"
          name="type-filter"
          value={type}
          onChange={(value: TransactionType | "") => setType(value)}
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

      {data && transactions.length === 0 && (
        <Card body>
          <p className="empty">
            No transactions in this month.{" "}
            <Link to="/transactions/new">Add one</Link>
          </p>
        </Card>
      )}

      {transactions.length > 0 && (
        <Card body>
          {groupByDate(transactions).map(([date, items]) => (
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

          <div ref={sentinelRef} className="list-end">
            {isFetchingNextPage ? (
              <Spinner animation="border" size="sm" aria-label="Loading more" />
            ) : hasNextPage ? (
              // Fallback if the automatic load doesn't fire
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => fetchNextPage()}
              >
                Load more
              </Button>
            ) : (
              total > LIMIT && (
                <span>All {total} transactions shown</span>
              )
            )}
          </div>
        </Card>
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
