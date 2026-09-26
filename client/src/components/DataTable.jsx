// client/src/components/DataTable.jsx
import { useState, useMemo } from 'react';
import './DataTable.css';

const SearchIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);

/**
 * Generic sortable, searchable table.
 *
 * columns: [{ key, label, render?: (row) => ReactNode, sortable?: bool }]
 * rows: array of objects
 * onRowClick: (row) => void
 * searchKeys: which keys to search across (default: all string keys)
 * isLate: (row) => bool — if true, row gets red highlight
 * toolbar: extra ReactNode shown right-side of search bar
 */
export default function DataTable({
  columns = [],
  rows = [],
  onRowClick,
  searchKeys,
  isLate,
  toolbar,
  emptyMessage = 'No records found.',
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Determine which keys to search
  const keys = searchKeys || columns.map(c => c.key);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(row =>
      keys.some(k => String(row[k] ?? '').toLowerCase().includes(q))
    );
  }, [rows, search, keys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  return (
    <div className="datatable-wrapper">
      <div className="datatable-toolbar">
        <label className="datatable-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search table"
          />
        </label>
        {toolbar && <div className="datatable-toolbar-right">{toolbar}</div>}
      </div>

      <div className="datatable-scroll">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable !== false ? 'sortable' : ''}
                  onClick={col.sortable !== false ? () => toggleSort(col.key) : undefined}
                  aria-sort={sortKey === col.key ? sortDir : undefined}
                >
                  {col.label}
                  {sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="datatable-empty">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={isLate?.(row) ? 'row-late' : ''}
                >
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
