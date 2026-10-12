import { Link } from "react-router-dom";
import Dropdown from "react-bootstrap/Dropdown";
import ListGroup from "react-bootstrap/ListGroup";
import type { Transaction } from "../types/transaction";
import { formatINR } from "../utils/format";
import { MoreIcon, PencilIcon, TrashIcon } from "./Icons";

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
        <Dropdown align="end" className="tx-menu">
          <Dropdown.Toggle
            variant="icon"
            size="sm"
            bsPrefix="tx-menu-toggle" // drops Bootstrap's caret
            aria-label={`Actions for ${tx.category.name}`}
          >
            <MoreIcon size={18} />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item as={Link} to={`/transactions/${tx.id}/edit`}>
              <PencilIcon size={16} />
              Edit
            </Dropdown.Item>
            <Dropdown.Item
              as="button"
              className="text-danger"
              onClick={() => onDelete(tx)}
            >
              <TrashIcon size={16} />
              Delete
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      )}
    </ListGroup.Item>
  );
}
