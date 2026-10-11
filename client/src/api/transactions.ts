import { api } from "./client";
import type {
  MonthSummary,
  Paginated,
  Transaction,
  TransactionFilters,
  TransactionInput,
} from "../types/transaction";
import type { Totals, TrendPoint } from "../types/transaction";

export async function getTransactions(filters: TransactionFilters) {
  const { data } = await api.get<Paginated<Transaction>>("/transactions", {
    params: filters,
  });
  return data;
}

export async function getTransaction(id: string) {
  const { data } = await api.get<Transaction>(`/transactions/${id}`);
  return data;
}

export async function createTransaction(input: TransactionInput) {
  const { data } = await api.post<Transaction>("/transactions", input);
  return data;
}

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>,
) {
  const { data } = await api.patch<Transaction>(`/transactions/${id}`, input);
  return data;
}

export async function deleteTransaction(id: string) {
  await api.delete(`/transactions/${id}`);
}

export async function getSummary(month: string) {
  const { data } = await api.get<MonthSummary>("/transactions/summary", {
    params: { month },
  });
  return data;
}

export async function getTotals() {
  const { data } = await api.get<Totals>("/transactions/totals");
  return data;
}

export async function getTrend(months: number) {
  const { data } = await api.get<TrendPoint[]>("/transactions/trend", {
    params: { months },
  });
  return data;
}
