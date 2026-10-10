export type TransactionType = "expense" | "income";
export type PaymentMethod = "cash" | "upi" | "card" | "bank";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // 'YYYY-MM-DD'
  paymentMethod: PaymentMethod | null;
  note: string | null;
  categoryId: string;
  category: Category;
  createdAt: string;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  date: string;
  categoryId: string;
  paymentMethod?: PaymentMethod | null;
  note?: string | null;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryTotal {
  type: TransactionType;
  categoryId: string;
  name: string;
  icon: string | null;
  total: number;
}

export interface MonthSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
}
