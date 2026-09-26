// client/src/features/transfers/TransferList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
  ChevronRight,
  Filter,
  Sparkles,
  RefreshCw,
  Ban,
  TrendingDown,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { transfersApi } from './transfersApi';
import StatusBadge from '../../components/StatusBadge';
import CreateTransferModal from './CreateTransferModal';
import './Transfers.css';

export default function TransferList({ onOpenTransfer }) {
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState({
    total_count: 0,
    draft_count: 0,
    ready_count: 0,
    done_count: 0,
    canceled_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listData, statsData] = await Promise.all([
        transfersApi.list({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchTerm || undefined,
        }),
        transfersApi.stats(),
      ]);

      setTransfers(listData || []);
      setStats(statsData || {});
    } catch (err) {
      console.error('Error loading transfers:', err);
      setError(err.message || 'Failed to fetch internal transfers.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate to detail view
  const handleRowClick = (transferId) => {
    if (onOpenTransfer) {
      onOpenTransfer(transferId);
    } else {
      navigate(`/transfers/${transferId}`);
    }
  };

  // Quick Demo Creator for instant review
  const handleQuickDemo = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const newTransfer = await transfersApi.create({
        from_location_id: 1, // Main Warehouse
        to_location_id: 2,   // Production Floor
        transfer_date: new Date().toISOString().slice(0, 10),
        lines: [
          { product_id: 1, quantity: 5 }, // 5 Steel Rods
        ],
      });

      showNotice(`Created Demo Transfer ${newTransfer.reference} (5 Steel Rods WH → PROD)`);
      await loadData();
      handleRowClick(newTransfer.id);
    } catch (err) {
      setError(err.message || 'Could not create demo transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Validate directly from table row
  const handleQuickValidate = async (e, transfer) => {
    e.stopPropagation();
    if (!window.confirm(`Validate transfer ${transfer.reference}? Stock will move from ${transfer.from_location} to ${transfer.to_location}.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await transfersApi.validate(transfer.id);
      showNotice(`Transfer ${transfer.reference} validated! Stock balances updated.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to validate transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter transfers client-side as well for snappy search
  const filteredTransfers = transfers.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.reference?.toLowerCase().includes(term) ||
      t.from_location?.toLowerCase().includes(term) ||
      t.to_location?.toLowerCase().includes(term) ||
      t.responsible?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="transfers-container">
      {/* Top Page Header */}
      <div className="transfers-header">
        <div className="transfers-title-area">
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
            <ArrowRightLeft className="text-purple" size={24} />
            Internal Stock Transfers
          </h1>
          <p>
            Move inventory between warehouse locations with atomic stock deduction and ledger
            auditing.
          </p>
        </div>

        <div className="transfers-actions">
          <button
            type="button"
            className="btn-secondary-dark"
            onClick={handleQuickDemo}
            disabled={actionLoading}
            title="Create a sample transfer with 5 Steel Rods"
          >
            <Sparkles size={16} style={{ color: '#fbbf24' }} /> Demo Transfer
          </button>

          <button
            type="button"
            className="btn-primary-gradient"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} /> New Transfer
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#34d399',
            fontSize: '0.88rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{notice}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#fb7185',
            fontSize: '0.88rem',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="transfers-kpi-grid">
        <div className="transfers-kpi-card">
          <div className="kpi-icon-box indigo">
            <ArrowRightLeft size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{stats.total_count || 0}</span>
            <span className="kpi-lbl">Total Transfers</span>
          </div>
        </div>

        <div className="transfers-kpi-card">
          <div className="kpi-icon-box amber">
            <Clock size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{stats.draft_count || 0}</span>
            <span className="kpi-lbl">Draft Orders</span>
          </div>
        </div>

        <div className="transfers-kpi-card">
          <div className="kpi-icon-box blue">
            <Package size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{stats.ready_count || 0}</span>
            <span className="kpi-lbl">Ready to Move</span>
          </div>
        </div>

        <div className="transfers-kpi-card">
          <div className="kpi-icon-box emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{stats.done_count || 0}</span>
            <span className="kpi-lbl">Validated (Done)</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="transfers-controls">
        <div className="transfers-tabs">
          {[
            { id: 'ALL', label: 'All Transfers' },
            { id: 'draft', label: 'Draft', count: stats.draft_count },
            { id: 'ready', label: 'Ready', count: stats.ready_count },
            { id: 'done', label: 'Done', count: stats.done_count },
            { id: 'canceled', label: 'Canceled', count: stats.canceled_count },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`transfer-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="tab-badge">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="transfers-search-box">
            <Search size={16} className="search-icon-inside" />
            <input
              type="text"
              placeholder="Search reference, location..."
              className="transfers-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn-secondary-dark"
            onClick={loadData}
            title="Refresh list"
            style={{ padding: '8px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Transfers Data Table */}
      <div className="data-table-card" style={{ margin: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Routing (Source → Destination)</th>
              <th>Line Items</th>
              <th>Transfer Date</th>
              <th>Responsible</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && transfers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <div className="health-dot live-pulse" style={{ margin: '0 auto 10px' }} />
                  Loading internal transfers...
                </td>
              </tr>
            ) : filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <ArrowRightLeft size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 600, color: '#94a3b8' }}>No transfers found</p>
                  <p style={{ margin: '4px 0 16px', fontSize: '0.8rem' }}>
                    {searchTerm
                      ? `No transfers matching "${searchTerm}"`
                      : 'Get started by creating your first internal stock transfer.'}
                  </p>
                  <button
                    className="btn-primary-gradient"
                    onClick={() => setIsCreateOpen(true)}
                    style={{ margin: '0 auto' }}
                  >
                    <Plus size={16} /> Create Transfer
                  </button>
                </td>
              </tr>
            ) : (
              filteredTransfers.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="code-pill font-mono">{item.reference}</span>
                  </td>
                  <td>
                    <div className="transfer-route-cell">
                      <span className="loc-tag">
                        <span className="wh-code-badge">
                          {item.from_warehouse_code || 'WH'}
                        </span>
                        {item.from_location}
                      </span>
                      <ArrowRightLeft size={14} className="transfer-arrow-icon" />
                      <span className="loc-tag dest">
                        <span className="wh-code-badge">
                          {item.to_warehouse_code || 'WH'}
                        </span>
                        {item.to_location}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>
                      {item.line_count || 0} line{item.line_count === 1 ? '' : 's'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '6px' }}>
                      ({item.total_quantity || 0} units)
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>
                      {item.transfer_date
                        ? new Date(item.transfer_date).toLocaleDateString()
                        : new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {item.responsible || 'System'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(item.status === 'draft' || item.status === 'ready') && (
                        <button
                          type="button"
                          className="btn-success-gradient"
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          onClick={(e) => handleQuickValidate(e, item)}
                          disabled={actionLoading || item.line_count === 0}
                          title="Quick validate transfer"
                        >
                          <CheckCircle2 size={13} /> Validate
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-secondary-dark"
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        onClick={() => handleRowClick(item.id)}
                      >
                        Details <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      <CreateTransferModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newTransfer) => {
          showNotice(`Transfer ${newTransfer.reference || 'Draft'} created!`);
          loadData();
          if (newTransfer && newTransfer.id) {
            handleRowClick(newTransfer.id);
          }
        }}
      />
    </div>
  );
}
