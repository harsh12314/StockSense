// client/src/features/transfers/TransferDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Ban,
  Package,
  Plus,
  Trash2,
  Warehouse,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { transfersApi } from './transfersApi';
import StatusBadge from '../../components/StatusBadge';
import PrintSlip from '../../components/PrintSlip';
import './Transfers.css';

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add line modal
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState(1);
  const [addLineError, setAddLineError] = useState(null);

  // Print slip modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    loadTransfer();
  }, [id]);

  async function loadTransfer() {
    setLoading(true);
    setError(null);
    try {
      const data = await transfersApi.getById(id);
      setTransfer(data);
    } catch (err) {
      console.error('Error loading transfer:', err);
      setError(err.message || 'Failed to load transfer details');
    } finally {
      setLoading(false);
    }
  }

  // Open Add Line Modal & load products
  async function openAddLine() {
    setIsAddLineOpen(true);
    setAddLineError(null);
    try {
      const prods = await transfersApi.getProducts();
      setAvailableProducts(prods || []);
      if (prods && prods.length > 0 && !selectedProductId) {
        setSelectedProductId(String(prods[0].id));
      }
    } catch (e) {
      console.warn('Failed to load products for line modal:', e);
    }
  }

  async function handleAddLineSubmit(e) {
    e.preventDefault();
    if (!selectedProductId || lineQuantity <= 0) return;

    setActionLoading(true);
    setAddLineError(null);
    try {
      await transfersApi.addLine(id, {
        product_id: Number(selectedProductId),
        quantity: Math.floor(Number(lineQuantity)),
      });
      setIsAddLineOpen(false);
      setLineQuantity(1);
      setSuccessMsg('Product line added to transfer.');
      await loadTransfer();
    } catch (err) {
      setAddLineError(err.message || 'Could not add product line.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveLine(lineId) {
    if (!window.confirm('Are you sure you want to remove this line item?')) return;
    setActionLoading(true);
    try {
      await transfersApi.removeLine(id, lineId);
      setSuccessMsg('Line removed.');
      await loadTransfer();
    } catch (err) {
      setError(err.message || 'Failed to remove line.');
    } finally {
      setActionLoading(false);
    }
  }

  // Execute atomic stock transaction
  async function handleValidate() {
    if (!transfer?.lines || transfer.lines.length === 0) {
      setError('Cannot validate transfer: Please add at least one product line.');
      return;
    }

    // Check if any line has insufficient stock
    const insufficient = transfer.lines.find(
      (l) => Number(l.source_free_to_use_qty) < Number(l.quantity)
    );
    if (insufficient) {
      setError(
        `Insufficient stock for "${insufficient.product_name}". Available at ${transfer.from_location}: ${insufficient.source_free_to_use_qty}, Required: ${insufficient.quantity}`
      );
      return;
    }

    if (!window.confirm(`Validate transfer ${transfer.reference}? This will decrease stock at ${transfer.from_location} and increase stock at ${transfer.to_location}.`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await transfersApi.validate(id);
      setSuccessMsg(`Transfer ${transfer.reference} successfully validated! Stock balances updated and ledger logged.`);
      await loadTransfer();
    } catch (err) {
      console.error('Validation failed:', err);
      setError(err.message || 'Failed to validate transfer.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkReady() {
    setActionLoading(true);
    setError(null);
    try {
      await transfersApi.markReady(id);
      setSuccessMsg(`Transfer marked as ready.`);
      await loadTransfer();
    } catch (err) {
      setError(err.message || 'Failed to mark ready.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm(`Cancel transfer ${transfer.reference}?`)) return;
    setActionLoading(true);
    setError(null);
    try {
      await transfersApi.cancel(id);
      setSuccessMsg('Transfer canceled.');
      await loadTransfer();
    } catch (err) {
      setError(err.message || 'Failed to cancel transfer.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
        <div className="health-dot live-pulse" style={{ margin: '0 auto 12px' }} />
        <p>Loading transfer details...</p>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="empty-module-card">
        <AlertTriangle size={36} className="text-amber" />
        <h3>Transfer Not Found</h3>
        <p>{error || 'The requested internal transfer could not be found.'}</p>
        <button className="btn-secondary-dark" onClick={() => navigate('/transfers')}>
          Back to Transfers
        </button>
      </div>
    );
  }

  const isDraft = transfer.status === 'draft';
  const isReady = transfer.status === 'ready';
  const isDone = transfer.status === 'done';
  const isCanceled = transfer.status === 'canceled';

  const totalLines = transfer.lines?.length || 0;
  const totalUnits = (transfer.lines || []).reduce((acc, l) => acc + Number(l.quantity), 0);

  // Check if any product lacks source inventory
  const hasShortage = (transfer.lines || []).some(
    (l) => Number(l.source_free_to_use_qty) < Number(l.quantity)
  );

  return (
    <div className="transfers-container">
      {/* Top Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => navigate('/transfers')}
          className="btn-secondary-dark"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          <ArrowLeft size={16} /> Back to Transfers
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary-dark"
            onClick={() => setIsPrintModalOpen(true)}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <Printer size={15} /> Print Slip
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#fb7185',
            fontSize: '0.88rem',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#34d399',
            fontSize: '0.88rem',
          }}
        >
          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Detail Header Card */}
      <div className="transfer-detail-card">
        <div className="transfer-detail-top">
          <div className="ref-box">
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="ref-title">{transfer.reference}</h1>
                <StatusBadge status={transfer.status} />
              </div>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                Internal Location-to-Location Stock Transfer
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isDraft && (
              <button
                className="btn-secondary-dark"
                onClick={handleMarkReady}
                disabled={actionLoading || totalLines === 0}
              >
                Mark as Ready
              </button>
            )}

            {(isDraft || isReady) && (
              <button
                className="btn-success-gradient"
                onClick={handleValidate}
                disabled={actionLoading || totalLines === 0}
                title={hasShortage ? 'Warning: Source location has insufficient stock' : 'Execute Transfer'}
              >
                <CheckCircle2 size={16} /> Validate Transfer
              </button>
            )}

            {(isDraft || isReady) && (
              <button
                className="btn-danger-outline"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <Ban size={15} /> Cancel
              </button>
            )}

            {isDone && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} /> Stock Balances Committed
              </div>
            )}
          </div>
        </div>

        {/* Stepper Display */}
        <div style={{ padding: '4px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              maxWidth: '500px',
            }}
          >
            {[
              { id: 'draft', label: '1. Draft Created', icon: Clock },
              { id: 'ready', label: '2. Ready to Move', icon: Package },
              { id: 'done', label: '3. Validated (Done)', icon: CheckCircle2 },
            ].map((step, idx) => {
              const active =
                transfer.status === step.id ||
                (step.id === 'draft' && (isReady || isDone)) ||
                (step.id === 'ready' && isDone);
              const current = transfer.status === step.id;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isCanceled ? 0.4 : active ? 1 : 0.5,
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: current
                        ? '#6366f1'
                        : active
                        ? '#10b981'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                    }}
                  >
                    <StepIcon size={14} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: current ? 700 : 500,
                      color: current ? '#f8fafc' : '#94a3b8',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Meta Info Grid */}
        <div className="chips-row">
          <div className="info-chip-card highlight">
            <Warehouse size={20} className="chip-icon" />
            <div className="chip-meta">
              <span className="chip-meta-label">Source Location (From)</span>
              <span className="chip-meta-value">{transfer.from_location}</span>
              <span className="chip-meta-sub">
                Warehouse: {transfer.from_warehouse_name || transfer.from_warehouse_code || 'WH'}
              </span>
            </div>
          </div>

          <div className="info-chip-card highlight">
            <MapPin size={20} className="chip-icon" style={{ color: '#a855f7' }} />
            <div className="chip-meta">
              <span className="chip-meta-label">Destination Location (To)</span>
              <span className="chip-meta-value">{transfer.to_location}</span>
              <span className="chip-meta-sub">
                Warehouse: {transfer.to_warehouse_name || transfer.to_warehouse_code || 'WH'}
              </span>
            </div>
          </div>

          <div className="info-chip-card">
            <Calendar size={20} className="chip-icon" style={{ color: '#38bdf8' }} />
            <div className="chip-meta">
              <span className="chip-meta-label">Transfer Date</span>
              <span className="chip-meta-value">
                {transfer.transfer_date
                  ? new Date(transfer.transfer_date).toLocaleDateString()
                  : 'Immediate'}
              </span>
              <span className="chip-meta-sub">
                Created: {new Date(transfer.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="info-chip-card">
            <User size={20} className="chip-icon" style={{ color: '#f59e0b' }} />
            <div className="chip-meta">
              <span className="chip-meta-label">Responsible User</span>
              <span className="chip-meta-value">{transfer.responsible || 'System Admin'}</span>
              <span className="chip-meta-sub">Inventory Operations</span>
            </div>
          </div>
        </div>

        {/* Atomic Transaction Banner */}
        <div className="atomic-banner">
          <ShieldCheck size={22} style={{ color: '#818cf8', flexShrink: 0 }} />
          <div>
            <strong>Atomic Transaction Guaranteed:</strong> When validated, this operation will{' '}
            <span style={{ color: '#fb7185' }}>decrease {totalUnits} unit(s)</span> at{' '}
            <u>{transfer.from_location}</u> and{' '}
            <span style={{ color: '#34d399' }}>increase {totalUnits} unit(s)</span> at{' '}
            <u>{transfer.to_location}</u> in a single ACID commit, logged permanently to the move
            history ledger.
          </div>
        </div>

        {/* Product Lines Section */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Products to Move ({totalLines})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Total Quantity: <strong>{totalUnits} units</strong>
              </p>
            </div>

            {(isDraft || isReady) && (
              <button className="btn-secondary-dark" onClick={openAddLine}>
                <Plus size={16} /> Add Product Line
              </button>
            )}
          </div>

          {/* Lines Table */}
          <div className="data-table-card" style={{ margin: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Source Available ({transfer.from_location})</th>
                  <th>Dest Current ({transfer.to_location})</th>
                  <th>Transfer Quantity</th>
                  <th>Stock Impact</th>
                  {(isDraft || isReady) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {totalLines === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}
                    >
                      No product lines added yet. Click &quot;Add Product Line&quot; to specify items
                      to transfer.
                    </td>
                  </tr>
                ) : (
                  transfer.lines.map((line) => {
                    const isShortage = Number(line.source_free_to_use_qty) < Number(line.quantity);

                    return (
                      <tr key={line.id}>
                        <td className="font-semibold">{line.product_name}</td>
                        <td>
                          <span className="code-pill">{line.sku}</span>
                        </td>
                        <td>
                          <span
                            className={`stock-badge-pill ${
                              isShortage ? 'insufficient' : 'available'
                            }`}
                          >
                            {line.source_free_to_use_qty} {line.unit_of_measure || 'units'}
                          </span>
                          {isShortage && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: '#fb7185',
                                marginTop: '2px',
                              }}
                            >
                              Short by {line.quantity - line.source_free_to_use_qty}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                            {line.dest_on_hand_qty || 0} {line.unit_of_measure || 'units'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.95rem', color: '#f1f5f9' }}>
                            {line.quantity} {line.unit_of_measure || 'units'}
                          </strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#fb7185', fontSize: '0.78rem' }}>
                              <TrendingDown size={14} style={{ verticalAlign: 'middle' }} /> -
                              {line.quantity}
                            </span>
                            <span style={{ color: '#64748b' }}>→</span>
                            <span style={{ color: '#34d399', fontSize: '0.78rem' }}>
                              <TrendingUp size={14} style={{ verticalAlign: 'middle' }} /> +
                              {line.quantity}
                            </span>
                          </div>
                        </td>
                        {(isDraft || isReady) && (
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#fb7185',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                              }}
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Line Modal */}
      {isAddLineOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddLineOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>
                Add Product Line
              </h3>
              <button
                type="button"
                onClick={() => setIsAddLineOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLineSubmit} style={{ padding: '20px' }}>
              {addLineError && (
                <div
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fb7185',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    fontSize: '0.85rem',
                  }}
                >
                  {addLineError}
                </div>
              )}

              <div className="transfer-form-group">
                <label className="transfer-form-label">Product</label>
                <select
                  className="transfer-form-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                >
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="transfer-form-group">
                <label className="transfer-form-label">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="transfer-form-input"
                  value={lineQuantity}
                  onChange={(e) => setLineQuantity(e.target.value)}
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '20px',
                }}
              >
                <button
                  type="button"
                  className="btn-secondary-dark"
                  onClick={() => setIsAddLineOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-gradient"
                  disabled={actionLoading || !selectedProductId}
                >
                  {actionLoading ? 'Adding...' : 'Add to Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formal Internal Transfer Manifest Generator */}
      <PrintSlip
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={transfer}
        type="transfer"
      />
    </div>
  );
}
