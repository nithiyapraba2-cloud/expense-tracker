const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

// 45000 → ₹45,000
export function formatINR(amount: number) {
  return inr.format(amount);
}

// '2026-10-10' → '10/10/2026'
export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// '2026-10' → 'October 2026'
export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

// Today's date in LOCAL time as 'YYYY-MM-DD'
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonth() {
  return todayISO().slice(0, 7);
}

// '2026-10' → { from: '2026-10-01', to: '2026-10-31' }
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

// 45000 → ₹45K, 150000 → ₹1.5L (for chart axes)
export function formatINRCompact(amount: number) {
  return inrCompact.format(amount);
}

// '2026-10' → 'Oct 26'
export function formatMonthShort(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}
