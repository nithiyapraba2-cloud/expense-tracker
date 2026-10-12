import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import {
  currentMonth,
  formatMonth,
  formatMonthMedium,
  shiftMonth,
} from "../utils/format";

interface Props {
  value: string; // 'YYYY-MM'
  onChange: (month: string) => void;
}

// ‹ October 2026 › — can't go past the current month
export default function MonthPicker({ value, onChange }: Props) {
  const isCurrent = value >= currentMonth();

  return (
    <InputGroup className="month-picker w-auto">
      <Button
        variant="outline-secondary"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <ChevronLeftIcon size={18} />
      </Button>
      <InputGroup.Text className="month-label">
        <span className="d-none d-sm-inline">{formatMonth(value)}</span>
        <span className="d-sm-none">{formatMonthMedium(value)}</span>
      </InputGroup.Text>
      <Button
        variant="outline-secondary"
        aria-label="Next month"
        disabled={isCurrent}
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <ChevronRightIcon size={18} />
      </Button>
    </InputGroup>
  );
}
