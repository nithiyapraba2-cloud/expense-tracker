import { api } from "./client";
import type { Category, TransactionType } from "../types/transaction";

export async function getCategories(type?: TransactionType) {
  const { data } = await api.get<Category[]>("/categories", {
    params: { type },
  });
  return data;
}
