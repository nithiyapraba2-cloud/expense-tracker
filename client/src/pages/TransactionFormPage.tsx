import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  getTransaction,
  updateTransaction,
} from "../api/transactions";
import { getCategories } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { ChevronLeftIcon } from "../components/Icons";
import type {
  PaymentMethod,
  Transaction,
  TransactionInput,
  TransactionType,
} from "../types/transaction";
import { todayISO } from "../utils/format";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
];

export default function TransactionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const existing = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(id!),
    enabled: isEdit, // only fetch when editing
  });

  if (isEdit && existing.isPending)
    return (
      <div className="page narrow">
        <div className="card">
          <div className="skeleton" />
        </div>
      </div>
    );
  if (isEdit && existing.isError)
    return <p className="error">{getErrorMessage(existing.error)}</p>;

  // key forces a fresh form when switching between add and edit
  return <TransactionForm key={id ?? "new"} initial={existing.data} />;
}

function TransactionForm({ initial }: { initial?: Transaction }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(
    initial?.paymentMethod ?? "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  const categories = useQuery({
    queryKey: ["categories", type],
    queryFn: () => getCategories(type),
  });

  const mutation = useMutation({
    mutationFn: (input: TransactionInput) =>
      initial ? updateTransaction(initial.id, input) : createTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transaction"] });
      queryClient.invalidateQueries({ queryKey: ["trend"] });
      queryClient.invalidateQueries({ queryKey: ["totals"] });
      navigate("/transactions");
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function changeType(newType: TransactionType) {
    setType(newType);
    setCategoryId(""); // expense categories don't apply to income
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter an amount greater than 0");
    if (!categoryId) return setError("Choose a category");

    mutation.mutate({
      type,
      amount: value,
      date,
      categoryId,
      paymentMethod: paymentMethod || null,
      note: note.trim() || null,
    });
  }

  return (
    <div className="page narrow">
      <div className="page-header">
        <div className="title-with-back">
          <Link to="/transactions" className="icon-btn" aria-label="Back">
            <ChevronLeftIcon />
          </Link>
          <h1>{initial ? "Edit transaction" : "New transaction"}</h1>
        </div>
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <div className="segmented type-toggle" role="group" aria-label="Type">
          <button
            type="button"
            className={type === "expense" ? "active expense" : ""}
            onClick={() => changeType("expense")}
          >
            Expense
          </button>
          <button
            type="button"
            className={type === "income" ? "active income" : ""}
            onClick={() => changeType("income")}
          >
            Income
          </button>
        </div>

        <label className="amount-field">
          <span>Amount</span>
          <div className={`amount-input ${type}`}>
            <span aria-hidden="true">₹</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus={!initial}
              required
            />
          </div>
        </label>

        <fieldset>
          <legend>Category</legend>
          {categories.isPending && <div className="skeleton short" />}
          {categories.data?.length === 0 && (
            <p className="muted">No {type} categories yet.</p>
          )}
          <div className="chips">
            {categories.data?.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${categoryId === c.id ? `selected ${type}` : ""}`}
                aria-pressed={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="chip-icon">{c.icon ?? "•"}</span>
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-row">
          <label>
            Date
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <fieldset>
            <legend>Paid by (optional)</legend>
            <div className="chips">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`chip ${paymentMethod === m.value ? "selected" : ""}`}
                  aria-pressed={paymentMethod === m.value}
                  onClick={() =>
                    setPaymentMethod(paymentMethod === m.value ? "" : m.value)
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <label>
          Note (optional)
          <input
            value={note}
            maxLength={255}
            placeholder="e.g. weekly vegetables"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <Link to="/transactions" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Saving..."
              : initial
                ? "Save changes"
                : `Add ${type}`}
          </button>
        </div>
      </form>
    </div>
  );
}
