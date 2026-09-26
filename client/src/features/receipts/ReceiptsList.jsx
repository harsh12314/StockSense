// client/src/features/receipts/ReceiptsList.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { receiptsApi } from './receiptsApi';
import StatusBadge   from '../../components/StatusBadge';
import Button        from '../../components/Button';
import ReceiptKanban from './ReceiptKanban';
import './Receipts.css';

// ── Icons ──────────────────────────────────────────────────────────────────
const ListIcon   = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const KanbanIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="14" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/>
    <rect x="14" y="16" width="7" height="5" rx="1"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const ArrowUpIcon   = () => <span style={{ fontSize: 10 }}>▲</span>;
const ArrowDownIcon = () => <span style={{ fontSize: 10 }}>▼</span>;

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUSES = ['draft', 'ready', 'done', 'canceled'];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isLate(row) {
  if (!row.schedule_date || ['done', 'canceled'].includes(row.status)) return false;
  return new Date(row.schedule_date) < new Date(new Date().toDateString());
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, type }) {
  return message ? <div className={`toast ${type}`}>{message}</div> : null;
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ status, count, active, onClick }) {
  return (
    <div
      className={`stat-card ${status}${active ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="stat-card-label">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
      <div className="stat-card-count">{count}</div>
    </div>
  );
}

// ── List table ─────────────────────────────────────────────────────────────
const COLS = [
  { key: 'reference',     label: 'Reference' },
  { key: 'from_contact',  label: 'Receive From' },
  { key: 'to_location',   label: 'Deliver To' },
  { key: 'responsible',   label: 'Responsible' },
  { key: 'schedule_date', label: 'Schedule Date' },
  { key: 'status',        label: 'Status' },
];

function ReceiptsTable({ rows, onRowClick }) {
  const [sortKey, setSortKey] = useState('reference');
  const [sortDir, setSortDir] = useState('desc');

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0) {
    return (
      <div className="receipts-table-wrap">
        <div className="table-empty">
          <div className="table-empty-icon">📦</div>
          No receipts found. Click <strong>+ New</strong> to create one.
        </div>
      </div>
    );
  }

  return (
    <div className="receipts-table-wrap">
      <table className="receipts-table">
        <thead>
          <tr>
            {COLS.map(col => (
              <th key={col.key} onClick={() => toggleSort(col.key)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {col.label}
                  {sortKey === col.key
                    ? (sortDir === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />)
                    : <span style={{ opacity: 0.25 }}><ArrowUpIcon /></span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.id} onClick={() => onRowClick(row)}
                className={isLate(row) ? 'row-late' : ''}>
              <td><span className="receipt-ref-link">{row.reference}</span></td>
              <td style={{ color: row.from_contact ? 'inherit' : 'var(--color-text-light)' }}>
                {row.from_contact || '—'}
              </td>
              <td>{row.to_location}</td>
              <td style={{ color: 'var(--color-text-muted)' }}>{row.responsible}</td>
              <td style={{ color: isLate(row) ? 'var(--color-canceled)' : 'inherit', fontWeight: isLate(row) ? 600 : 400 }}>
                {fmtDate(row.schedule_date)}
              </td>
              <td><StatusBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ReceiptsList() {
  const navigate = useNavigate();
  const [view, setView]         = useState('list');
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState(null); // null = all
  const [toast, setToast]       = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await receiptsApi.list();
      setReceipts(data);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleNew() {
    try {
      setCreating(true);
      const { id } = await receiptsApi.create({ to_location_id: 1 });
      navigate(`/receipts/${id}`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  // Counts per status for stat bar
  const counts = useMemo(() => {
    const c = {};
    STATUSES.forEach(s => { c[s] = receipts.filter(r => r.status === s).length; });
    return c;
  }, [receipts]);

  // Filtered rows
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return receipts.filter(r => {
      const statusOk = !filterStatus || r.status === filterStatus;
      const searchOk = !q || [r.reference, r.from_contact, r.responsible, r.to_location]
        .some(v => v && v.toLowerCase().includes(q));
      return statusOk && searchOk;
    });
  }, [receipts, search, filterStatus]);

  return (
    <div className="receipts-page">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Receipts</h1>
          <p className="page-subtitle">Manage incoming stock from suppliers</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}>
              <ListIcon /> List
            </button>
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')} aria-pressed={view === 'kanban'}>
              <KanbanIcon /> Kanban
            </button>
          </div>
          <Button variant="primary" onClick={handleNew} disabled={creating}>
            <PlusIcon /> {creating ? 'Creating…' : 'New'}
          </Button>
        </div>
      </div>

      {/* ── Stat bar (clickable filters) ── */}
      {!loading && (
        <div className="stat-bar">
          {STATUSES.map(s => (
            <StatCard
              key={s}
              status={s}
              count={counts[s]}
              active={filterStatus === s}
              onClick={() => setFilterStatus(prev => prev === s ? null : s)}
            />
          ))}
        </div>
      )}

      {/* ── Toolbar: search ── */}
      {!loading && (
        <div className="toolbar">
          <div className="search-box">
            <span className="search-box-icon"><SearchIcon /></span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by reference, supplier…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search receipts"
            />
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {filtered.length} of {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
            {filterStatus && ` · filtered by ${filterStatus}`}
          </span>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : view === 'list' ? (
        <ReceiptsTable rows={filtered} onRowClick={r => navigate(`/receipts/${r.id}`)} />
      ) : (
        <ReceiptKanban
          receipts={filtered}
          onCardClick={r => navigate(`/receipts/${r.id}`)}
          isLate={isLate}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
