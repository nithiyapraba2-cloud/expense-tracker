import type { Category, Transaction } from "../types/transaction";

export const groceries: Category = {
  id: "cat-groceries",
  name: "Groceries",
  type: "expense",
  icon: "🛒",
};

export const salary: Category = {
  id: "cat-salary",
  name: "Salary",
  type: "income",
  icon: "💼",
};

let nextId = 1;

// A transaction with sensible defaults; override only what a test cares about
export function makeTransaction(overrides: Partial<Transaction> = {}) {
  const category = overrides.category ?? groceries;
  return {
    id: `tx-${nextId++}`,
    type: category.type,
    amount: 500,
    date: "2026-10-10",
    paymentMethod: null,
    note: null,
    categoryId: category.id,
    category,
    createdAt: "2026-10-10T08:00:00.000Z",
    ...overrides,
  } satisfies Transaction;
}
