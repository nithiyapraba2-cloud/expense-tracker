import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TransactionItem from "./TransactionItem";
import { makeTransaction, salary } from "../test/fixtures";
import type { Transaction } from "../types/transaction";

function renderItem(tx: Transaction, onDelete?: (tx: Transaction) => void) {
  return render(
    <MemoryRouter>
      <ul>
        <TransactionItem tx={tx} onDelete={onDelete} />
      </ul>
    </MemoryRouter>,
  );
}

describe("TransactionItem", () => {
  it("shows category, details and a minus sign for expenses", () => {
    renderItem(
      makeTransaction({ amount: 658.5, paymentMethod: "upi", note: "veggies" }),
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("UPI · veggies")).toBeInTheDocument();
    expect(screen.getByText("−₹658.50")).toBeInTheDocument();
  });

  it("shows a plus sign for income", () => {
    renderItem(makeTransaction({ category: salary, amount: 45000 }));

    expect(screen.getByText("+₹45,000")).toBeInTheDocument();
  });

  it("hides the details line when there is nothing to show", () => {
    const { container } = renderItem(makeTransaction());

    expect(container.querySelector(".tx-info small")).toBeNull();
  });

  it("has no actions menu without onDelete (dashboard list)", () => {
    renderItem(makeTransaction());

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the menu with an edit link and a delete action", async () => {
    const tx = makeTransaction({ id: "tx-42" });
    const onDelete = vi.fn();
    renderItem(tx, onDelete);

    await userEvent.click(screen.getByLabelText("Actions for Groceries"));

    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute(
      "href",
      "/transactions/tx-42/edit",
    );

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith(tx);
  });
});
