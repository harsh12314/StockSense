// client/src/features/receipts/ReceiptKanban.jsx
import StatusBadge from '../../components/StatusBadge';
import './Receipts.css';

const STATUSES = [
  { key: 'draft',    label: 'Draft' },
  { key: 'ready',    label: 'Ready' },
  { key: 'done',     label: 'Done' },
  { key: 'canceled', label: 'Canceled' },
];

/**
 * Kanban board view — receipts grouped by status.
 */
export default function ReceiptKanban({ receipts, onCardClick, isLate }) {
  const columns = STATUSES.map(s => ({
    ...s,
    cards: receipts.filter(r => r.status === s.key),
  }));

  return (
    <div className="kanban-board">
      {columns.map(col => (
        <div key={col.key} className="kanban-col">
          <div className="kanban-col-header">
            <span className="kanban-col-title">
              <StatusBadge status={col.key} />
            </span>
            <span className="kanban-count">{col.cards.length}</span>
          </div>
          <div className="kanban-cards">
            {col.cards.length === 0 ? (
              <p className="kanban-empty">No receipts</p>
            ) : (
              col.cards.map(card => (
                <div
                  key={card.id}
                  className="kanban-card"
                  onClick={() => onCardClick(card)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onCardClick(card)}
                  style={isLate?.(card) ? { borderLeft: '3px solid var(--color-late)' } : {}}
                >
                  <div className="kanban-card-ref">{card.reference}</div>
                  <div className="kanban-card-contact">
                    {card.from_contact || 'No supplier'}
                  </div>
                  {card.schedule_date && (
                    <div className="kanban-card-date">
                      📅 {new Date(card.schedule_date).toLocaleDateString()}
                      {isLate?.(card) && (
                        <span style={{ color: 'var(--color-late)', marginLeft: 6, fontWeight: 600 }}>
                          · Late
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
