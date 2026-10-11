import type { CategoryTotal } from "../types/transaction";
import { formatINR } from "../utils/format";

interface Props {
  items: CategoryTotal[];
  total: number;
}

// One bar per category, sized by its share of the month's spending
export default function CategoryBars({ items, total }: Props) {
  return (
    <ul className="bars">
      {items.map((c) => {
        const percent = total > 0 ? (c.total / total) * 100 : 0;
        return (
          <li key={c.categoryId}>
            <span className="bar-icon">{c.icon ?? "•"}</span>
            <div className="bar-body">
              <div className="bar-label">
                <span className="bar-name">{c.name}</span>
                <span className="bar-value">
                  {formatINR(c.total)}
                  <small>{percent.toFixed(0)}%</small>
                </span>
              </div>
              <div
                className="bar-track"
                role="meter"
                aria-label={`${c.name} share of spending`}
                aria-valuenow={Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="bar-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
