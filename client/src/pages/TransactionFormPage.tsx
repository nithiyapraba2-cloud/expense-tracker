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
import type {
  PaymentMethod,
  Transaction,
  TransactionInput,
  TransactionType,
} from "../types/transaction";
import { todayISO } from "../utils/format";

export default function TransactionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const existing = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(id!),
    enabled: isEdit, // only fetch when editing
  });

  if (isEdit && existing.isPending) return <p>Loading...</p>;
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
    <div className="page">
      <h1>
        {initial ? "Edit" : "Add"} {type === "expense" ? "Expense" : "Income"}
      </h1>

      <form className="card form" onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}

        <div className="type-toggle">
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

        <label>
          Amount (₹)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label>
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">
              {categories.isPending ? "Loading..." : "Choose a category"}
            </option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>

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

        <label>
          Payment method
          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethod | "")
            }
          >
            <option value="">Not specified</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank">Bank transfer</option>
          </select>
        </label>

        <label>
          Note (optional)
          <input
            value={note}
            maxLength={255}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="form-actions">
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </button>
          <Link to="/transactions">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
