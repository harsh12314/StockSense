// client/src/features/ledger/StockLedger.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { get } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Package,
  ArrowRight,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';

export default function StockLedger() {
  const [moves, setMoves] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [directionFilter, setDirectionFilter] = useState('ALL'); // 'ALL' | 'in' | 'out'
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [movesRes, statsRes] = await Promise.all([
        get('/ledger?limit=250').catch(() => get('/moves?limit=250')).catch(() => ({ data: [] })),
        get('/ledger/stats').catch(() => get('/moves/stats')).catch(() => ({ data: null })),
      ]);

      const list = movesRes?.data || [];
      setMoves(Array.isArray(list) ? list : []);
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch stock ledger movements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side filtering & search
  const filteredMoves = useMemo(() => {
    return moves.filter((item) => {
      // Direction filter
      if (directionFilter !== 'ALL') {
        const dir = (item.direction || '').toLowerCase();
        if (dir !== directionFilter.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ref = (item.reference || '').toLowerCase();
        const contact = (item.contact || '').toLowerCase();
        const fromLoc = (item.from_location || '').toLowerCase();
        const toLoc = (item.to_location || '').toLowerCase();
        const prodName = (item.product_name || item.product || '').toLowerCase();
        const sku = (item.product_sku || '').toLowerCase();

        if (
          !ref.includes(q) &&
          !contact.includes(q) &&
          !fromLoc.includes(q) &&
          !toLoc.includes(q) &&
          !prodName.includes(q) &&
          !sku.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [moves, directionFilter, searchQuery]);

  // Dynamic KPI Stats calculated from current dataset
  const computedStats = useMemo(() => {
    let inQty = 0;
    let outQty = 0;
    let inCount = 0;
    let outCount = 0;

    moves.forEach((m) => {
      const dir = (m.direction || '').toLowerCase();
      const qty = Number(m.quantity || 0);
      if (dir === 'in') {
        inQty += qty;
        inCount += 1;
      } else if (dir === 'out') {
        outQty += qty;
        outCount += 1;
      }
    });

    return {
      totalMoves: moves.length,
      inQty: stats?.total_in_qty ?? inQty,
      outQty: stats?.total_out_qty ?? outQty,
      inCount: stats?.in_count ?? inCount,
      outCount: stats?.out_count ?? outCount,
      netDelta: (stats?.total_in_qty ?? inQty) - (stats?.total_out_qty ?? outQty),
    };
  }, [moves, stats]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="stock-ledger-view">
      {/* Header */}
      <div className="view-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="page-heading">Stock Ledger &amp; Move History</h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              LIVE AUDIT FEED
            </span>
          </div>
          <p className="page-subheading">
            Immutable chronological record of all product arrivals, departures, and count adjustments.
          </p>
        </div>

        <button
          type="button"
          className="action-btn btn-action-secondary"
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={refreshing ? 'spin-animation' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        {/* Total Ledger Moves */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">Total Movements</span>
            <div className="kpi-icon-wrapper kpi-icon-purple">
              <Activity size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{computedStats.totalMoves}</span>
            <span className="kpi-trend positive">
              <History size={13} /> {computedStats.inCount} In / {computedStats.outCount} Out
            </span>
          </div>
          <div className="kpi-footer">
            <span>Verified audit entries in database</span>
          </div>
        </div>

        {/* Total Inward Quantity */}
        <div
          className={`kpi-card ${directionFilter === 'in' ? 'active-filter-card' : ''}`}
          onClick={() => setDirectionFilter(directionFilter === 'in' ? 'ALL' : 'in')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-card-header">
            <span className="kpi-title">Total Inward Qty</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value" style={{ color: '#22c55e' }}>
              +{computedStats.inQty.toLocaleString()}
            </span>
            <span className="kpi-badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
              Incoming
            </span>
          </div>
          <div className="kpi-footer">
            <span>Receipts &amp; vendor deliveries</span>
          </div>
        </div>

        {/* Total Outward Quantity */}
        <div
          className={`kpi-card ${directionFilter === 'out' ? 'active-filter-card' : ''}`}
          onClick={() => setDirectionFilter(directionFilter === 'out' ? 'ALL' : 'out')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-card-header">
            <span className="kpi-title">Total Outward Qty</span>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value" style={{ color: '#ef4444' }}>
              -{computedStats.outQty.toLocaleString()}
            </span>
            <span className="kpi-badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
              Outgoing
            </span>
          </div>
          <div className="kpi-footer">
            <span>Customer delivery dispatches</span>
          </div>
        </div>

        {/* Net Flow Balance */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">Net Stock Flow</span>
            <div className="kpi-icon-wrapper kpi-icon-amber">
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value" style={{ color: computedStats.netDelta >= 0 ? '#22c55e' : '#ef4444' }}>
              {computedStats.netDelta >= 0 ? `+${computedStats.netDelta.toLocaleString()}` : computedStats.netDelta.toLocaleString()}
            </span>
            <span className={`kpi-trend ${computedStats.netDelta >= 0 ? 'positive' : 'negative'}`}>
              {computedStats.netDelta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} Net delta
            </span>
          </div>
          <div className="kpi-footer">
            <span>Inward minus outward stock balance</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={`filter-pill ${directionFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setDirectionFilter('ALL')}
          >
            All Movements ({moves.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${directionFilter === 'in' ? 'active' : ''}`}
            onClick={() => setDirectionFilter('in')}
            style={directionFilter === 'in' ? { background: '#22c55e', borderColor: '#22c55e' } : {}}
          >
            <ArrowDownLeft size={14} /> Inward ({computedStats.inCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${directionFilter === 'out' ? 'active' : ''}`}
            onClick={() => setDirectionFilter('out')}
            style={directionFilter === 'out' ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
          >
            <ArrowUpRight size={14} /> Outward ({computedStats.outCount})
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
            }}
          />
          <input
            type="text"
            placeholder="Search reference, product, SKU, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              backgroundColor: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.875rem',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadData(true)}
            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="data-table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Type</th>
              <th style={{ width: '130px' }}>Reference</th>
              <th>Date &amp; Time</th>
              <th>Product Details</th>
              <th style={{ textAlign: 'right' }}>Quantity Delta</th>
              <th>Route Flow (From ➔ To)</th>
              <th>Contact / Partner</th>
              <th style={{ width: '90px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && moves.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={22} className="spin-animation" style={{ color: '#3b82f6' }} />
                    <span>Loading live stock ledger records...</span>
                  </div>
                </td>
              </tr>
            ) : filteredMoves.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <History size={36} style={{ color: '#64748b', opacity: 0.6 }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9' }}>No stock movements found</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      {searchQuery
                        ? `No records matching "${searchQuery}"`
                        : 'Movements will automatically record here when Receipts or Deliveries are processed.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMoves.map((row) => {
                const isIncoming = (row.direction || '').toLowerCase() === 'in';
                const isOutgoing = (row.direction || '').toLowerCase() === 'out';
                const qtyVal = Number(row.quantity || 0);

                return (
                  <tr
                    key={row.id}
                    className={isIncoming ? 'row-in' : isOutgoing ? 'row-out' : ''}
                  >
                    {/* Direction / Type */}
                    <td>
                      <span
                        className={`type-tag ${isIncoming ? 'in' : isOutgoing ? 'out' : 'adjust'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: isIncoming
                            ? 'rgba(34, 197, 94, 0.15)'
                            : isOutgoing
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                          color: isIncoming ? '#22c55e' : isOutgoing ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft size={13} />
                        ) : isOutgoing ? (
                          <ArrowUpRight size={13} />
                        ) : (
                          <Layers size={13} />
                        )}
                        {isIncoming ? 'IN' : isOutgoing ? 'OUT' : 'ADJ'}
                      </span>
                    </td>

                    {/* Reference */}
                    <td>
                      <span className="code-pill font-mono" style={{ fontWeight: 600 }}>
                        {row.reference || `MOV/${row.id}`}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {formatDate(row.move_date)}
                    </td>

                    {/* Product */}
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {row.product_name || row.product || 'Unnamed Item'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          SKU: <span className="font-mono">{row.product_sku || '—'}</span>
                          {row.category_name && ` • ${row.category_name}`}
                        </div>
                      </div>
                    </td>

                    {/* Quantity Delta */}
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: isIncoming ? '#22c55e' : isOutgoing ? '#ef4444' : '#cbd5e1',
                        }}
                      >
                        {isIncoming ? `+${qtyVal}` : isOutgoing ? `-${qtyVal}` : qtyVal}{' '}
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                          {row.unit_of_measure || 'units'}
                        </span>
                      </span>
                    </td>

                    {/* Route Flow */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{row.from_location || 'Vendor / Source'}</span>
                        <ArrowRight size={12} style={{ color: '#64748b' }} />
                        <span style={{ fontWeight: 600, color: '#f8fafc' }}>{row.to_location || 'Warehouse Stock'}</span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ color: '#cbd5e1' }}>
                      {row.contact || 'Internal Ops'}
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={row.status || 'done'} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
