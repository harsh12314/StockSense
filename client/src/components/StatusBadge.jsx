// client/src/components/StatusBadge.jsx
import './StatusBadge.css';

const STATUS_LABELS = {
  draft:    'Draft',
  waiting:  'Waiting',
  ready:    'Ready',
  done:     'Done',
  canceled: 'Canceled',
  late:     'Late',
};

/**
 * Renders a colored status pill.
 * status: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled' | 'late'
 */
export default function StatusBadge({ status }) {
  const normalized = status ? status.toLowerCase() : 'draft';
  const label = STATUS_LABELS[normalized] || status;
  return (
    <span className={`status-badge status-${normalized}`} aria-label={`Status: ${label}`}>
      {label}
    </span>
  );
}
