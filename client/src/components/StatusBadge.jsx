// client/src/components/StatusBadge.jsx
import styles from './StatusBadge.module.css';

const MAP = {
  draft: 'Draft',
  waiting: 'Waiting',
  ready: 'Ready',
  done: 'Done',
  canceled: 'Canceled',
  late: 'Late',
};

export default function StatusBadge({ status }) {
  const label = MAP[status?.toLowerCase()] ?? status;
  return <span className={`${styles.badge} ${styles[status?.toLowerCase()]}`}>{label}</span>;
}
