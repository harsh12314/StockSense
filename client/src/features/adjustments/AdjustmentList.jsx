import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { IconAdjust, IconPlus, IconSearch, IconFilter, IconCheck, IconAlertTriangle } from '../../components/common/Icons';
import StockAdjustmentModal from './StockAdjustmentModal';

export default function AdjustmentList() {
  const [adjustments, setAdjustments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deltaFilter, setDeltaFilter] = useState('ALL'); // ALL, SURPLUS, DEFICIT, MATCH
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchAdjustments = async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        api('/adjustments'),
        api('/adjustments/stats'),
      ]);

      if (listRes.success) {
        setAdjustments(listRes.data || []);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load stock adjustment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const handleAdjustmentSuccess = (created) => {
    setToastMessage(`Stock adjustment ${created.reference} applied successfully.`);
    setTimeout(() => setToastMessage(null), 4000);
    fetchAdjustments();
  };

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      // Delta filter
      if (deltaFilter === 'SURPLUS' && a.delta <= 0) return false;
      if (deltaFilter === 'DEFICIT' && a.delta >= 0) return false;
      if (deltaFilter === 'MATCH' && a.delta !== 0) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesProd = a.product_name?.toLowerCase().includes(q);
        const matchesSku = a.product_sku?.toLowerCase().includes(q);
        const matchesLoc = a.location_name?.toLowerCase().includes(q);
        const matchesRef = a.notes?.toLowerCase().includes(q);
        if (!matchesProd && !matchesSku && !matchesLoc && !matchesRef) return false;
      }
      return true;
    });
  }, [adjustments, deltaFilter, searchQuery]);

  return (
    <div className="view-container">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="toast-notification">
          <span className="toast-dot" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-heading">Stock Adjustments & Physical Counts</h1>
          <p className="page-subheading">
            Reconcile physical inventory counts with theoretical database balances and track stock shrinkage or gains.
          </p>
        </div>
        <button
          className="action-btn btn-action-primary"
          onClick={() => setModalOpen(true)}
        >
          <IconPlus size={16} /> New Physical Count
        </button>
      </div>

      {/* Stats Cards */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="kpi-card">
          <div className="kpi-label">Total Audits Recorded</div>
          <div className="kpi-value">{stats ? stats.total_adjustments : adjustments.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Surplus Counts (Gains)</div>
          <div className="kpi-value text-green">
            {stats ? stats.positive_adjustments : adjustments.filter(a => a.delta > 0).length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Deficit Counts (Shrinkage)</div>
          <div className="kpi-value text-red">
            {stats ? stats.negative_adjustments : adjustments.filter(a => a.delta < 0).length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Net Inventory Delta</div>
          <div className={`kpi-value ${stats && stats.net_delta < 0 ? 'text-red' : stats && stats.net_delta > 0 ? 'text-green' : ''}`}>
            {stats ? (stats.net_delta > 0 ? `+${stats.net_delta}` : stats.net_delta) : 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="filters-toolbar"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 16,
          background: 'var(--color-surface, #161b22)',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid var(--color-border, #30363d)',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconSearch
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search by product, SKU, location, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'var(--color-bg, #0d1117)',
              color: '#fff',
              border: '1px solid var(--color-border, #30363d)',
              borderRadius: 6,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <IconFilter size={16} style={{ color: 'var(--color-text-muted)' }} />
          {['ALL', 'SURPLUS', 'DEFICIT', 'MATCH'].map((filter) => (
            <button
              key={filter}
              className={`filter-pill ${deltaFilter === filter ? 'active' : ''}`}
              onClick={() => setDeltaFilter(filter)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: '0.8rem',
                border: '1px solid var(--color-border, #30363d)',
                background: deltaFilter === filter ? 'var(--color-primary, #7c3aed)' : 'transparent',
                color: deltaFilter === filter ? '#fff' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {filter === 'ALL' ? 'All Counts' : filter === 'SURPLUS' ? 'Surplus (+)' : filter === 'DEFICIT' ? 'Deficit (-)' : 'Exact (0)'}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="data-table-card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading stock adjustment audit records...
          </div>
        ) : error ? (
          <div className="error-message" style={{ margin: 20 }}>
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div className="empty-module-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <IconAdjust size={36} className="text-purple" style={{ marginBottom: 12 }} />
            <h3>No Stock Adjustments Found</h3>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: 440, margin: '8px auto 20px' }}>
              No inventory discrepancies recorded yet. Click "New Physical Count" to audit a shelf location.
            </p>
            <button
              className="action-btn btn-action-primary"
              onClick={() => setModalOpen(true)}
            >
              <IconPlus size={16} /> Record First Audit
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Location</th>
                <th>Recorded Qty</th>
                <th>Counted Qty</th>
                <th>Delta Adjustment</th>
                <th>Audited By</th>
                <th>Date & Time</th>
                <th>Notes / Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdjustments.map((a) => {
                const isSurplus = a.delta > 0;
                const isDeficit = a.delta < 0;

                return (
                  <tr key={a.id} className={isSurplus ? 'row-in' : isDeficit ? 'row-out' : ''}>
                    <td>
                      <div className="font-semibold">{a.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {a.product_sku}
                      </div>
                    </td>
                    <td>
                      <span className="code-pill">
                        {a.warehouse_code ? `${a.warehouse_code} / ` : ''}{a.location_name}
                      </span>
                    </td>
                    <td>{a.recorded_qty} {a.unit_of_measure || ''}</td>
                    <td className="font-semibold">{a.counted_qty} {a.unit_of_measure || ''}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: isSurplus
                            ? 'rgba(5, 150, 105, 0.15)'
                            : isDeficit
                            ? 'rgba(225, 29, 72, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                          color: isSurplus
                            ? '#34d399'
                            : isDeficit
                            ? '#f87171'
                            : '#60a5fa',
                        }}
                      >
                        {isSurplus ? `+${a.delta}` : a.delta} {a.unit_of_measure || ''}
                      </span>
                    </td>
                    <td>{a.logged_by_name}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {new Date(a.adjustment_date).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{a.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}
