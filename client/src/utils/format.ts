const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrDecimal = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

// 45000 → ₹45,000 · 658.5 → ₹658.50 (no ".00" on whole rupees)
export function formatINR(amount: number) {
  return Number.isInteger(amount)
    ? inrWhole.format(amount)
    : inrDecimal.format(amount);
}

// '2026-10-10' → '10/10/2026'
export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// '2026-10-11' → 'Today' / 'Yesterday' / 'Fri, 9 Oct'
export function formatDayHeading(isoDate: string) {
  if (isoDate === todayISO()) return "Today";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// '2026-10' → 'October 2026'
export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

// '2026-10' → 'Oct 2026' (month picker on phones)
export function formatMonthMedium(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-IN", {
    month: "short",
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

// ('2026-01', -1) → '2025-12'
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
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
