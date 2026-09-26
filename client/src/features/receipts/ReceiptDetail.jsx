// client/src/features/receipts/ReceiptDetail.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { receiptsApi } from './receiptsApi';
import StatusBadge from '../../components/StatusBadge';
import Button      from '../../components/Button';
import PrintSlip   from '../../components/PrintSlip';
import './Receipts.css';

// ─── Icons ────────────────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const CalIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const TruckIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const UserIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const BoxIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'draft', label: 'Draft',  n: 1 },
  { key: 'ready', label: 'Ready',  n: 2 },
  { key: 'done',  label: 'Done',   n: 3 },
];

function stepState(stepKey, currentStatus) {
  // When done, every step is complete
  if (currentStatus === 'done') return 'complete';
  // canceled: treat as draft for step display
  const order = ['draft', 'ready', 'done'];
  const ci = order.indexOf(currentStatus === 'canceled' ? 'draft' : currentStatus);
  const si = order.indexOf(stepKey);
  if (si < ci) return 'complete';
  if (si === ci) return 'active';
  return 'pending';
}

function Stepper({ status }) {
  return (
    <div className="stepper">
      {STEPS.map((step, i) => {
        const state = stepState(step.key, status);
        return (
          <React.Fragment key={step.key}>
            <div className={`step step-${state}`}>
              <span className="step-dot">
                {state === 'complete' ? '✓' : step.n}
              </span>
              <span className="step-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-connector${state === 'complete' ? ' filled' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
      {status === 'canceled' && (
        <div style={{ marginLeft: 'auto', flexShrink: 0, paddingLeft: 16 }}>
          <StatusBadge status="canceled" />
        </div>
      )}
    </div>
  );
}

// ─── Info chip ────────────────────────────────────────────────────────────────
function InfoChip({ icon, label, value, editable, inputType, placeholder, onSave }) {
  const [local, setLocal]   = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => { setLocal(value ?? ''); }, [value]);

  async function handleBlur() {
    setFocused(false);
    if (!editable || local === (value ?? '') || !onSave) return;
    setSaving(true);
    try { await onSave(local); } catch {} finally { setSaving(false); }
  }

  return (
    <div className={`info-chip${focused ? ' info-chip-focused' : ''}`}>
      <span className="info-chip-icon">{icon}</span>
      <div className="info-chip-inner">
        <span className="info-chip-label">{label}{saving && <span className="chip-saving"> ·</span>}</span>
        {editable ? (
          <input
            className="info-chip-input"
            type={inputType || 'text'}
            value={local}
            placeholder={placeholder}
            onChange={e => setLocal(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
          />
        ) : (
          <span className="info-chip-value">{value || '—'}</span>
        )}
      </div>
    </div>
  );
}

// ─── Add Product Modal ────────────────────────────────────────────────────────
function AddProductModal({ onAdd, onClose }) {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity]     = useState('');
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    receiptsApi.listProducts()
      .then(d => { setProducts(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const selected = products.find(p => String(p.id) === String(selectedId));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!selectedId) { setError('Select a product.'); return; }
    if (!quantity || Number(quantity) <= 0) { setError('Enter a positive quantity.'); return; }
    setSaving(true);
    try { await onAdd({ product_id: Number(selectedId), quantity: Number(quantity) }); onClose(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Add Product</h2>
        {loading ? <div className="spinner-wrap" style={{ padding: 32 }}><div className="spinner" /></div> : (
          <form onSubmit={handleSubmit}>
            <div className="modal-fields">
              <div className="field-group">
                <label className="field-label" htmlFor="mp">Product</label>
                <select id="mp" className="field-input" value={selectedId}
                  onChange={e => setSelectedId(e.target.value)} required autoFocus>
                  <option value="">— Choose a product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>
                  ))}
                </select>
              </div>
              {selected && (
                <div className="product-preview">
                  <span className="product-preview-sku">{selected.sku}</span>
                  {selected.per_unit_cost > 0 && (
                    <span className="product-preview-cost">
                      ₹{Number(selected.per_unit_cost).toFixed(2)} / {selected.unit_of_measure || 'unit'}
                    </span>
                  )}
                </div>
              )}
              <div className="field-group">
                <label className="field-label" htmlFor="mq">Quantity</label>
                <input id="mq" className="field-input" type="number" min="1"
                  placeholder="e.g. 50" value={quantity}
                  onChange={e => setQuantity(e.target.value)} required />
              </div>
              {error && <p role="alert" className="modal-error">{error}</p>}
            </div>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={saving || !selectedId}>
                {saving ? 'Adding…' : 'Add Product'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type }) {
  return message ? <div className={`toast ${type}`}>{message}</div> : null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReceiptDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try   { setReceipt(await receiptsApi.get(id)); }
    catch (e) { showToast(e.message, 'error'); }
    finally   { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (receipt?.reference) {
      document.title = `${receipt.reference} — Receipt Details | StockSense`;
    } else {
      document.title = 'Receipt Details | StockSense';
    }
  }, [receipt?.reference]);

  const isEditable = receipt && !['done', 'canceled'].includes(receipt.status);
  const totalQty   = receipt?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0;

  async function saveHeader(field, value) {
    await receiptsApi.updateHeader(id, {
      from_contact:  field === 'from_contact'  ? value : receipt.from_contact,
      schedule_date: field === 'schedule_date' ? value : receipt.schedule_date,
    });
    await load();
  }

  async function handleAddLine(line) {
    await receiptsApi.addLine(id, line);
    await load();
    showToast('Product added.');
  }

  async function handleRemoveLine(lineId) {
    try { await receiptsApi.removeLine(id, lineId); await load(); showToast('Removed.'); }
    catch (e) { showToast(e.message, 'error'); }
  }

  async function handleAction(action) {
    setBusy(true);
    try {
      if (action === 'todo')     await receiptsApi.markReady(id);
      if (action === 'validate') await receiptsApi.validate(id);
      if (action === 'cancel')   await receiptsApi.cancel(id);
      await load();
      const msgs = { todo: 'Marked as Ready!', validate: '✅ Validated — stock updated!', cancel: 'Receipt canceled.' };
      showToast(msgs[action], action === 'cancel' ? 'error' : 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (!receipt) return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Receipt not found.</div>;

  const isDone = receipt.status === 'done';

  return (
    <div className="receipt-detail-page">

      {/* Back button + breadcrumb */}
      <div className="detail-nav">
        <button className="btn-back" onClick={() => navigate('/receipts')}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Receipts
        </button>
        <nav className="breadcrumb">
          <Link to="/receipts">Receipts</Link>
          <span>›</span>
          <span>{receipt.reference}</span>
        </nav>
      </div>


      <div className="detail-card">

        {/* ── Top bar: reference + status + actions ── */}
        <div className="detail-topbar">
          <div className="detail-topbar-left">
            <h1 className="detail-reference">{receipt.reference}</h1>
            <StatusBadge status={receipt.status} />
          </div>
          <div className="detail-actions">
            {receipt.status === 'draft' && (
              <Button variant="primary" onClick={() => handleAction('todo')} disabled={busy}>
                To Do →
              </Button>
            )}
            {receipt.status === 'ready' && (
              <Button variant="primary" onClick={() => handleAction('validate')} disabled={busy}>
                ✓ Validate
              </Button>
            )}
            {isEditable && (
              <Button variant="danger" onClick={() => handleAction('cancel')} disabled={busy}>
                Cancel
              </Button>
            )}
            {isDone && (
              <Button variant="secondary" onClick={() => setIsPrintModalOpen(true)}>
                🖨 Print Slip
              </Button>
            )}
          </div>
        </div>

        {/* ── Stepper ── */}
        <Stepper status={receipt.status} />

        {/* ── Info chips bar (horizontal) ── */}
        <div className="info-chips-bar">
          <InfoChip
            icon={<TruckIcon />}
            label="Receive From"
            value={receipt.from_contact}
            editable={isEditable}
            placeholder="Supplier name…"
            onSave={v => saveHeader('from_contact', v)}
          />
          <InfoChip
            icon={<BoxIcon />}
            label="Deliver To"
            value={receipt.to_location}
          />
          <InfoChip
            icon={<CalIcon />}
            label="Schedule Date"
            value={receipt.schedule_date ? receipt.schedule_date.split('T')[0] : ''}
            editable={isEditable}
            inputType="date"
            onSave={v => saveHeader('schedule_date', v || null)}
          />
          <InfoChip
            icon={<UserIcon />}
            label="Responsible"
            value={receipt.responsible}
          />
        </div>

        {/* ── Done banner ── */}
        {isDone && (
          <div className="done-banner">
            <span className="done-banner-icon">✓</span>
            <div>
              <strong>Stock Updated Successfully</strong>
              <span> · {receipt.lines.length} product{receipt.lines.length !== 1 ? 's' : ''}, {totalQty} units received into {receipt.to_location}</span>
            </div>
          </div>
        )}

        {/* ── Product Lines ── */}
        <div className="detail-lines">
          <div className="lines-header">
            <div>
              <span className="lines-title">Product Lines</span>
              {receipt.lines.length > 0 && (
                <span className="lines-count">{receipt.lines.length} item{receipt.lines.length !== 1 ? 's' : ''} · {totalQty} units</span>
              )}
            </div>
            {isEditable && (
              <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
                <PlusIcon /> Add Product
              </Button>
            )}
          </div>

          {receipt.lines.length === 0 ? (
            <div className="lines-empty">
              <div className="lines-empty-icon">📦</div>
              <div>No products added yet.</div>
              {isEditable && (
                <button className="lines-empty-link" onClick={() => setShowModal(true)}>
                  + Add your first product
                </button>
              )}
            </div>
          ) : (
            <div className="lines-table-wrap">
              <table className="lines-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    {isDone && <th style={{ textAlign: 'right' }}>Impact</th>}
                    {isEditable && <th style={{ width: 44 }} />}
                  </tr>
                </thead>
                <tbody>
                  {receipt.lines.map((line, i) => (
                    <tr key={line.id}>
                      <td className="line-num">{i + 1}</td>
                      <td className="line-name">{line.product_name}</td>
                      <td><span className="sku-badge">{line.sku}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                        {line.quantity}
                      </td>
                      {isDone && (
                        <td style={{ textAlign: 'right' }}>
                          <span className="stock-impact">+{line.quantity}</span>
                        </td>
                      )}
                      {isEditable && (
                        <td>
                          <button className="btn-row-delete"
                            onClick={() => handleRemoveLine(line.id)}
                            title={`Remove ${line.product_name}`}>
                            <TrashIcon />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={isDone ? 3 : isEditable ? 3 : 3} className="tfoot-label">
                      {receipt.lines.length} product{receipt.lines.length !== 1 ? 's' : ''}
                    </td>
                    <td className="tfoot-total">{totalQty}</td>
                    {isDone && <td className="tfoot-total" style={{ color: '#15803d' }}>+{totalQty}</td>}
                    {isEditable && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>

      {showModal && <AddProductModal onAdd={handleAddLine} onClose={() => setShowModal(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Formal Goods Receipt Voucher Generator */}
      <PrintSlip
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={receipt}
        type="receipt"
      />
    </div>
  );
}
