import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import type { Transaction } from "../types/transaction";
import { formatINR } from "../utils/format";
import { PencilIcon, TrashIcon } from "./Icons";
import LinkButton from "./LinkButton";

const PAYMENT_LABEL = { cash: "Cash", upi: "UPI", card: "Card", bank: "Bank" };

interface Props {
  tx: Transaction;
  onDelete?: (tx: Transaction) => void;
}

// Render inside <ListGroup variant="flush" as="ul">
export default function TransactionItem({ tx, onDelete }: Props) {
  const sign = tx.type === "income" ? "+" : "−";
  const details = [
    tx.paymentMethod && PAYMENT_LABEL[tx.paymentMethod],
    tx.note,
  ].filter(Boolean);

  return (
    <ListGroup.Item as="li" className="tx-item">
      <span className={`tx-icon ${tx.type}`}>{tx.category.icon ?? "•"}</span>
      <div className="tx-info">
        <strong>{tx.category.name}</strong>
        {details.length > 0 && <small>{details.join(" · ")}</small>}
      </div>
      <span className={`tx-amount ${tx.type}`}>
        {sign}
        {formatINR(tx.amount)}
      </span>
      {onDelete && (
        <div className="tx-actions">
          <LinkButton
            to={`/transactions/${tx.id}/edit`}
            variant="icon"
            size="sm"
            aria-label="Edit"
            title="Edit"
          >
            <PencilIcon size={16} />
          </LinkButton>
          <Button
            variant="icon"
            size="sm"
            className="danger"
            onClick={() => onDelete(tx)}
            aria-label="Delete"
            title="Delete"
          >
            <TrashIcon size={16} />
          </Button>
        </div>
      )}
    </ListGroup.Item>
  );
}
