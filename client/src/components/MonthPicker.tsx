import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { currentMonth, formatMonth, shiftMonth } from "../utils/format";

interface Props {
  value: string; // 'YYYY-MM'
  onChange: (month: string) => void;
}

// ‹ October 2026 › — can't go past the current month
export default function MonthPicker({ value, onChange }: Props) {
  const isCurrent = value >= currentMonth();

  return (
    <div className="month-picker">
      <button
        type="button"
        className="icon-btn"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <span>{formatMonth(value)}</span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Next month"
        disabled={isCurrent}
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
