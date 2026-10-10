import { Link } from "react-router-dom";
import type { Transaction } from "../types/transaction";
import { formatDate, formatINR } from "../utils/format";

interface Props {
  tx: Transaction;
  onDelete?: (tx: Transaction) => void;
}

export default function TransactionItem({ tx, onDelete }: Props) {
  const sign = tx.type === "income" ? "+" : "−";

  return (
    <li className="tx-item">
      <span className="tx-icon">{tx.category.icon ?? "•"}</span>
      <div className="tx-info">
        <strong>{tx.category.name}</strong>
        <small>
          {formatDate(tx.date)}
          {tx.paymentMethod && ` · ${tx.paymentMethod.toUpperCase()}`}
          {tx.note && ` · ${tx.note}`}
        </small>
      </div>
      <span className={`tx-amount ${tx.type}`}>
        {sign}
        {formatINR(tx.amount)}
      </span>
      {onDelete && (
        <div className="tx-actions">
          <Link to={`/transactions/${tx.id}/edit`}>Edit</Link>
          <button className="btn-link danger" onClick={() => onDelete(tx)}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
