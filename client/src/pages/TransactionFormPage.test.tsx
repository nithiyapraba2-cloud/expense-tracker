import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TransactionFormPage from "./TransactionFormPage";
import { getCategories } from "../api/categories";
import { createTransaction } from "../api/transactions";
import { groceries, makeTransaction, salary } from "../test/fixtures";

// Replace the API calls; nothing reaches a server
vi.mock("../api/categories", () => ({ getCategories: vi.fn() }));
vi.mock("../api/transactions", () => ({
  createTransaction: vi.fn(),
  getTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

function renderNewForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/transactions/new"]}>
        <Routes>
          <Route path="/transactions/new" element={<TransactionFormPage />} />
          <Route path="/transactions" element={<p>Transactions list</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TransactionFormPage (new)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12));
    vi.mocked(getCategories).mockImplementation(async (type) =>
      type === "income" ? [salary] : [groceries],
    );
    vi.mocked(createTransaction).mockResolvedValue(makeTransaction());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts as an expense with today's date", async () => {
    renderNewForm();

    expect(screen.getByLabelText("Expense")).toBeChecked();
    expect(screen.getByLabelText("Date")).toHaveValue("2026-10-12");
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(getCategories).toHaveBeenCalledWith("expense");
  });

  it("asks for a category before saving", async () => {
    renderNewForm();
    await userEvent.type(screen.getByLabelText("Amount"), "250");

    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));

    expect(await screen.findByText("Choose a category")).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("creates the transaction and goes back to the list", async () => {
    renderNewForm();
    await userEvent.type(screen.getByLabelText("Amount"), "250.75");
    await userEvent.click(await screen.findByRole("button", { name: /Groceries/ }));
    await userEvent.click(screen.getByRole("button", { name: "UPI" }));
    await userEvent.type(screen.getByLabelText("Note (optional)"), "  weekly veg  ");

    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith({
        type: "expense",
        amount: 250.75,
        date: "2026-10-12",
        categoryId: groceries.id,
        paymentMethod: "upi",
        note: "weekly veg", // trimmed
      }),
    );
    expect(await screen.findByText("Transactions list")).toBeInTheDocument();
  });

  it("sends null for an empty payment method and note", async () => {
    renderNewForm();
    await userEvent.type(screen.getByLabelText("Amount"), "100");
    await userEvent.click(await screen.findByRole("button", { name: /Groceries/ }));

    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethod: null, note: null }),
      ),
    );
  });

  it("switching to income loads income categories and clears the choice", async () => {
    renderNewForm();
    const groceriesChip = await screen.findByRole("button", {
      name: /Groceries/,
    });
    await userEvent.click(groceriesChip);
    expect(groceriesChip).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByLabelText("Income"));

    expect(await screen.findByRole("button", { name: /Salary/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(getCategories).toHaveBeenCalledWith("income");
    expect(screen.getByRole("button", { name: "Add income" })).toBeInTheDocument();
  });

  it("shows the server error if saving fails", async () => {
    vi.mocked(createTransaction).mockRejectedValue(new Error("Server down"));
    renderNewForm();
    await userEvent.type(screen.getByLabelText("Amount"), "100");
    await userEvent.click(await screen.findByRole("button", { name: /Groceries/ }));

    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Transactions list")).toBeNull();
  });
});
