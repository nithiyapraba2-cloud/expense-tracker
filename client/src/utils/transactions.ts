import type { Paginated, Transaction } from "../types/transaction";

// Group a (date-sorted) list into [date, transactions] pairs
export function groupByDate(list: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const tx of list) {
    groups.set(tx.date, [...(groups.get(tx.date) ?? []), tx]);
  }
  return [...groups];
}

// Infinite scroll: the next page number, or undefined when everything is loaded
export function getNextPage({ page, limit, total }: Paginated<unknown>) {
  return page * limit < total ? page + 1 : undefined;
}
