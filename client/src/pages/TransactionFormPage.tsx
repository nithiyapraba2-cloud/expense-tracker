import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import {
  createTransaction,
  getTransaction,
  updateTransaction,
} from "../api/transactions";
import { getCategories } from "../api/categories";
import { getErrorMessage } from "../api/client";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
} from "../components/Icons";
import LinkButton from "../components/LinkButton";
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
        <Card body>
          <div className="skeleton" />
        </Card>
      </div>
    );
  if (isEdit && existing.isError)
    return <Alert variant="danger">{getErrorMessage(existing.error)}</Alert>;

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

  // Selected chips get a soft tint in the transaction type's colour
  const selectedVariant = `chip-${type}`;

  return (
    <div className="page narrow">
      <div className="page-header">
        <div className="title-with-back">
          <LinkButton to="/transactions" variant="icon" aria-label="Back">
            <ChevronLeftIcon />
          </LinkButton>
          <h1>{initial ? "Edit transaction" : "New transaction"}</h1>
        </div>
      </div>

      <Card>
        <Card.Body>
          <Form className="d-flex flex-column gap-4" onSubmit={handleSubmit}>
            <ToggleButtonGroup
              type="radio"
              name="type"
              value={type}
              onChange={changeType}
              className="type-toggle w-100"
              aria-label="Type"
            >
              <ToggleButton
                id="type-expense"
                value="expense"
                variant="outline-danger"
              >
                <ArrowUpIcon size={16} />
                Expense
              </ToggleButton>
              <ToggleButton
                id="type-income"
                value="income"
                variant="outline-success"
              >
                <ArrowDownIcon size={16} />
                Income
              </ToggleButton>
            </ToggleButtonGroup>

            <Form.Group controlId="amount">
              <Form.Label>Amount</Form.Label>
              <InputGroup className={`amount-input ${type}`}>
                <InputGroup.Text aria-hidden="true">₹</InputGroup.Text>
                <Form.Control
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
              </InputGroup>
            </Form.Group>

            <fieldset>
              <Form.Label as="legend">Category</Form.Label>
              {categories.isPending && <div className="skeleton short" />}
              {categories.data?.length === 0 && (
                <p className="muted mb-0">No {type} categories yet.</p>
              )}
              <div className="d-flex flex-wrap gap-2">
                {categories.data?.map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={
                      categoryId === c.id ? selectedVariant : "outline-secondary"
                    }
                    className="chip rounded-pill"
                    aria-pressed={categoryId === c.id}
                    onClick={() => setCategoryId(c.id)}
                  >
                    <span className="chip-icon">{c.icon ?? "•"}</span>
                    {c.name}
                  </Button>
                ))}
              </div>
            </fieldset>

            <Row className="g-4">
              <Col sm={5}>
                <Form.Group controlId="date">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={date}
                    max={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              <Col sm={7}>
                <fieldset>
                  <Form.Label as="legend">Paid by (optional)</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <Button
                        key={m.value}
                        size="sm"
                        variant={
                          paymentMethod === m.value
                            ? "chip-primary"
                            : "outline-secondary"
                        }
                        className="chip rounded-pill"
                        aria-pressed={paymentMethod === m.value}
                        onClick={() =>
                          setPaymentMethod(
                            paymentMethod === m.value ? "" : m.value,
                          )
                        }
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </fieldset>
              </Col>
            </Row>

            <Form.Group controlId="note">
              <Form.Label>Note (optional)</Form.Label>
              <Form.Control
                value={note}
                maxLength={255}
                placeholder="e.g. weekly vegetables"
                onChange={(e) => setNote(e.target.value)}
              />
            </Form.Group>

            {error && <Alert variant="danger">{error}</Alert>}

            <div className="form-actions d-flex justify-content-end gap-2">
              <LinkButton to="/transactions" variant="outline-secondary">
                Cancel
              </LinkButton>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Spinner animation="border" size="sm" />
                )}
                {mutation.isPending
                  ? "Saving..."
                  : initial
                    ? "Save changes"
                    : `Add ${type}`}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
