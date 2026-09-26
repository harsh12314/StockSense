import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Ban,
  Package,
  Plus,
  Trash2,
  Clock,
  Warehouse,
  MapPin,
  User,
  Calendar,
  Layers,
  Check,
  RefreshCw,
  History,
  AlertCircle,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { get, post, del, api } from '../../api/client';
import StatusStepper from '../../components/StatusStepper';
import Modal from '../../components/Modal';
import PrintSlip from '../../components/PrintSlip';

/* ── Status helpers ─────────────────────────────────────────────────── */
const STATUS_META = {
  draft:    { label: 'Draft',    color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
  waiting:  { label: 'Waiting',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)'   },
  ready:    { label: 'Ready',    color: '#38bdf8', bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.3)'   },
  done:     { label: 'Done',     color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)'   },
  canceled: { label: 'Canceled', color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '99px',
      backgroundColor: meta.bg, border: `1px solid ${meta.border}`,
      color: meta.color, fontSize: '0.78rem', fontWeight: 700,
      textTransform: 'capitalize', letterSpacing: '0.02em',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: meta.color, display: 'inline-block' }} />
      {meta.label}
    </span>
  );
}

/* ── Meta Info Cell ─────────────────────────────────────────────────── */
function MetaField({ icon: Icon, label, value, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>{value || '—'}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub}</div>}
    </div>
  );
}

/* ── Notify Banner ──────────────────────────────────────────────────── */
function NotifyBanner({ type, message, onClose }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
      padding: '12px 18px', borderRadius: '10px', marginBottom: '16px', fontWeight: 600,
      backgroundColor: isSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      color: isSuccess ? '#34d399' : '#f87171',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
        <span style={{ fontSize: '0.875rem' }}>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>✕</button>
      )}
    </div>
  );
}

/* ── Workflow Step Card ──────────────────────────────────────────────── */
function WorkflowStep({ step, label, desc, done, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px',
      borderRadius: '10px', flex: 1,
      backgroundColor: done ? 'rgba(16,185,129,0.08)' : active ? 'rgba(99,102,241,0.1)' : 'rgba(30,41,59,0.3)',
      border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        backgroundColor: done ? '#10b981' : active ? '#6366f1' : 'rgba(100,116,139,0.2)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem', fontWeight: 800,
      }}>
        {done ? '✓' : step}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: done ? '#34d399' : active ? '#a5b4fc' : '#94a3b8' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
  );
}

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [pickedLines, setPickedLines] = useState({});
  const [packedLines, setPackedLines] = useState({});

  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState(1);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => { loadDelivery(); }, [id]);

  async function loadDelivery() {
    setLoading(true);
    setError(null);
    try {
      const res = await get(`/deliveries/${id}`);
      setDelivery(res.data);
      if (res.data.status === 'done') {
        const pState = {}, pkState = {};
        (res.data.lines || []).forEach(l => { pState[l.id] = true; pkState[l.id] = true; });
        setPickedLines(pState);
        setPackedLines(pkState);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openAddLineModal() {
    setIsAddLineOpen(true);
    try {
      const prodRes = await api('/ref/products');
      if (prodRes.data) {
        setAvailableProducts(prodRes.data);
        if (prodRes.data.length > 0 && !selectedProductId) {
          setSelectedProductId(String(prodRes.data[0].id));
        }
      }
    } catch (e) { console.warn('Failed to load products:', e); }
  }

  async function handleAddLine(e) {
    e.preventDefault();
    if (!selectedProductId || lineQuantity <= 0) return;
    setActionLoading(true);
    try {
      await post(`/deliveries/${id}/lines`, {
        product_id: parseInt(selectedProductId, 10),
        quantity: parseInt(lineQuantity, 10),
      });
      setIsAddLineOpen(false);
      showSuccess('Product line added successfully.');
      await loadDelivery();
    } catch (err) {
      setError(`Failed to add line: ${err.message}`);
    } finally { setActionLoading(false); }
  }

  async function handleRemoveLine(lineId) {
    if (!window.confirm('Remove this product line?')) return;
    setActionLoading(true);
    try {
      await del(`/deliveries/${id}/lines/${lineId}`);
      await loadDelivery();
    } catch (err) {
      setError(`Failed to remove line: ${err.message}`);
    } finally { setActionLoading(false); }
  }

  const togglePick = lineId => {
    if (delivery?.status === 'done' || delivery?.status === 'canceled') return;
    setPickedLines(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  const togglePack = lineId => {
    if (delivery?.status === 'done' || delivery?.status === 'canceled') return;
    setPackedLines(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  async function handleCheckAvailability() {
    setActionLoading(true); setError(null);
    try {
      const res = await post(`/deliveries/${id}/check-availability`);
      showSuccess(res.data.message);
      await loadDelivery();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  }

  async function handleValidate() {
    if (!window.confirm('Validate this Delivery? Stock will decrease automatically and move history will be recorded.')) return;
    setActionLoading(true); setError(null);
    try {
      const res = await post(`/deliveries/${id}/validate`);
      showSuccess(res.data.message || 'Delivery validated! Stock has been decreased.');
      await loadDelivery();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this delivery order?')) return;
    setActionLoading(true); setError(null);
    try {
      await post(`/deliveries/${id}/cancel`);
      showSuccess('Delivery order canceled.');
      await loadDelivery();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  }

  function showSuccess(msg) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  /* ── Loading / Error ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
        <div style={{
          display: 'inline-block', width: '36px', height: '36px',
          border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#6366f1',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ marginTop: '14px', fontSize: '0.9rem' }}>Loading delivery order…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ padding: '16px 20px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} /> <strong>Error:</strong> {error}
        </div>
        <button type="button" onClick={() => navigate('/deliveries')} style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(30,41,59,0.7)', color: '#94a3b8', cursor: 'pointer' }}>
          <ArrowLeft size={15} /> Back to Deliveries
        </button>
      </div>
    );
  }

  const lines = delivery.lines || [];
  const allPicked = lines.length > 0 && lines.every(l => pickedLines[l.id]);
  const allPacked = lines.length > 0 && lines.every(l => packedLines[l.id]);
  const isEditable = ['draft', 'waiting'].includes(delivery.status);
  const isReady = delivery.status === 'ready';
  const isDone = delivery.status === 'done';
  const isCanceled = delivery.status === 'canceled';

  const canValidate = isReady;

  return (
    <div style={{ width: '100%' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.82rem' }}>
        <Link to="/deliveries" style={{ color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
          <ArrowLeft size={14} /> Delivery Orders
        </Link>
        <span style={{ color: '#334155' }}>/</span>
        <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{delivery.reference}</span>
      </div>

      {/* ── Notifications ──────────────────────────────────────────── */}
      <NotifyBanner type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
      <NotifyBanner type="error" message={error} onClose={() => setError(null)} />

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: isDone
              ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))'
              : isCanceled
              ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.2))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.25))',
            border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : isCanceled ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDone ? '#34d399' : isCanceled ? '#f87171' : '#818cf8',
          }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace', letterSpacing: '-0.01em' }}>
                {delivery.reference}
              </h1>
              <StatusBadge status={delivery.status} />
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              {delivery.operation_type || 'Delivery Orders'} · {delivery.to_contact || 'Customer'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isEditable && (
            <>
              <button type="button" onClick={openAddLineModal} disabled={actionLoading} style={btnSecStyle}>
                <Plus size={14} /> Add Product
              </button>
              <button
                type="button"
                onClick={handleCheckAvailability}
                disabled={actionLoading || lines.length === 0}
                style={btnSecStyle}
                title="Check stock and mark as Ready if available"
              >
                <ShieldCheck size={14} /> Check Availability
              </button>
            </>
          )}

          {/* Validate — primary CTA */}
          <button
            type="button"
            onClick={handleValidate}
            disabled={actionLoading || !canValidate}
            style={{
              ...btnPrimaryStyle,
              opacity: canValidate ? 1 : 0.4,
              cursor: canValidate ? 'pointer' : 'not-allowed',
              boxShadow: canValidate ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
            }}
            title={canValidate ? 'Validate to dispatch & decrease stock' : 'Order must be Ready to validate'}
          >
            {actionLoading ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
            Validate & Dispatch
          </button>

          {isDone && (
            <button type="button" onClick={() => setIsPrintModalOpen(true)} style={btnSecStyle}>
              <Printer size={14} /> Print Slip
            </button>
          )}

          {!isDone && !isCanceled && (
            <button type="button" onClick={handleCancel} disabled={actionLoading} style={btnDangerStyle}>
              <Ban size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Status Stepper ─────────────────────────────────────────── */}
      <StatusStepper currentStatus={delivery.status} />

      {/* ── Workflow Guide ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '10px', flexWrap: 'wrap',
        marginBottom: '22px', padding: '16px',
        backgroundColor: 'rgba(15,23,42,0.45)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
      }}>
        <WorkflowStep step="1" label="Pick Items" desc={`Collect from ${delivery.from_location_name || 'Stock Room'}`} done={allPicked} active={!isDone && !allPicked} />
        <WorkflowStep step="2" label="Pack Items" desc="Box, label & seal for dispatch" done={allPacked} active={allPicked && !allPacked} />
        <WorkflowStep step="3" label="Validate → Dispatch" desc="Stock decreases automatically" done={isDone} active={allPacked && !isDone} />
      </div>

      {/* ── Meta Info Card ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0',
        backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px', overflow: 'hidden', marginBottom: '22px',
      }}>
        {[
          { icon: Warehouse, label: 'Source Location', value: delivery.from_location_name || 'Stock Room', sub: delivery.from_location_code ? `Code: ${delivery.from_location_code}` : null },
          { icon: User, label: 'Customer / Contact', value: delivery.to_contact },
          { icon: MapPin, label: 'Delivery Address', value: delivery.delivery_address },
          { icon: Calendar, label: 'Scheduled Date', value: delivery.schedule_date ? delivery.schedule_date.split('T')[0] : null },
          { icon: User, label: 'Responsible', value: delivery.responsible_name || 'System', sub: 'Logged-in operator' },
          { icon: Layers, label: 'Operation Type', value: delivery.operation_type || 'Delivery Orders' },
        ].map((field, i) => (
          <div key={i} style={{
            padding: '16px 20px',
            borderRight: i % 3 !== 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <MetaField {...field} />
          </div>
        ))}
      </div>

      {/* ── Product Lines Table ────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px', overflow: 'hidden', marginBottom: '22px',
      }}>
        {/* Table Header Bar */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: 'rgba(15,23,42,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={17} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>Product Lines & Stock Allocation</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px', padding: '2px 8px', fontWeight: 600 }}>
              {lines.length} item{lines.length !== 1 ? 's' : ''}
            </span>
          </div>
          {isEditable && (
            <button type="button" onClick={openAddLineModal} style={btnSecStyle}>
              <Plus size={13} /> Add Line
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
            <Package size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem' }}>No products added to this delivery order yet.</p>
            {isEditable && (
              <button type="button" onClick={openAddLineModal} style={btnPrimaryStyle}>
                <Plus size={14} /> Add First Product
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Product', 'SKU', 'Demand Qty', 'On Hand', 'Availability', 'Step 1: Pick', 'Step 2: Pack', 'Stock After', ...(isEditable ? [''] : [])].map((h, i) => (
                    <th key={i} style={{
                      padding: '11px 16px', textAlign: ['Step 1: Pick', 'Step 2: Pack'].includes(h) ? 'center' : 'left',
                      color: '#64748b', fontSize: '0.71rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const isOut = line.out_of_stock || (line.stock_on_hand < line.quantity);
                  const isPicked = !!pickedLines[line.id];
                  const isPacked = !!packedLines[line.id];
                  const remainingStock = Math.max(0, (line.stock_on_hand || 0) - line.quantity);
                  const isEven = idx % 2 === 0;

                  return (
                    <tr key={line.id} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      backgroundColor: isOut
                        ? 'rgba(239,68,68,0.05)'
                        : isEven ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}>
                      {/* Product */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{line.product_name}</div>
                        {isOut && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', color: '#f87171', fontSize: '0.72rem', fontWeight: 600 }}>
                            <AlertTriangle size={11} /> Insufficient stock
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td style={{ padding: '14px 16px' }}>
                        <code style={{ fontSize: '0.78rem', color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: '5px' }}>
                          {line.product_sku}
                        </code>
                      </td>

                      {/* Demand */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>{line.quantity}</span>
                        <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '4px' }}>units</span>
                      </td>

                      {/* On Hand */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: isOut ? '#f87171' : '#34d399', fontSize: '0.9rem' }}>
                          {line.stock_on_hand ?? 0}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '4px' }}>units</span>
                      </td>

                      {/* Availability */}
                      <td style={{ padding: '14px 16px' }}>
                        {isOut ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '99px', fontSize: '0.73rem', fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                            <AlertTriangle size={11} /> Missing
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '99px', fontSize: '0.73rem', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                            <CheckCircle2 size={11} /> In Stock
                          </span>
                        )}
                      </td>

                      {/* Pick Toggle */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => togglePick(line.id)}
                          disabled={isDone || isCanceled}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '5px 12px', borderRadius: '7px', cursor: (isDone || isCanceled) ? 'default' : 'pointer',
                            border: `1px solid ${isPicked ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
                            backgroundColor: isPicked ? 'rgba(16,185,129,0.12)' : 'rgba(30,41,59,0.6)',
                            color: isPicked ? '#34d399' : '#64748b',
                            fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s',
                          }}
                        >
                          <span style={{
                            width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                            backgroundColor: isPicked ? '#10b981' : 'transparent',
                            border: `2px solid ${isPicked ? '#10b981' : '#475569'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '9px',
                          }}>{isPicked && '✓'}</span>
                          {isPicked ? 'Picked' : 'Mark Pick'}
                        </button>
                      </td>

                      {/* Pack Toggle */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => togglePack(line.id)}
                          disabled={isDone || isCanceled}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '5px 12px', borderRadius: '7px', cursor: (isDone || isCanceled) ? 'default' : 'pointer',
                            border: `1px solid ${isPacked ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
                            backgroundColor: isPacked ? 'rgba(16,185,129,0.12)' : 'rgba(30,41,59,0.6)',
                            color: isPacked ? '#34d399' : '#64748b',
                            fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s',
                          }}
                        >
                          <span style={{
                            width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                            backgroundColor: isPacked ? '#10b981' : 'transparent',
                            border: `2px solid ${isPacked ? '#10b981' : '#475569'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '9px',
                          }}>{isPacked && '✓'}</span>
                          {isPacked ? 'Packed' : 'Mark Pack'}
                        </button>
                      </td>

                      {/* Stock After */}
                      <td style={{ padding: '14px 16px' }}>
                        {isDone ? (
                          <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> −{line.quantity} dispatched
                          </span>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                            <span>{line.stock_on_hand ?? 0}</span>
                            <span style={{ color: '#f87171', fontWeight: 700 }}>−{line.quantity}</span>
                            <span>=</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{remainingStock}</span>
                          </div>
                        )}
                      </td>

                      {/* Delete */}
                      {isEditable && (
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            title="Remove line"
                            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '5px 7px', color: '#f87171', cursor: 'pointer', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center' }}
                            onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; }}
                            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Done Confirmation Banner ───────────────────────────────── */}
      {isDone && (
        <div style={{
          padding: '20px 24px', borderRadius: '12px', marginBottom: '22px',
          backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <CheckCircle2 size={22} color="#34d399" />
            <h3 style={{ margin: 0, color: '#34d399', fontSize: '1rem', fontWeight: 700 }}>
              Shipment Dispatched — Stock Updated & Move History Recorded
            </h3>
          </div>
          <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '0.85rem' }}>
            All product quantities have been automatically deducted from the source location.
            An immutable <strong style={{ color: '#94a3b8' }}>OUT</strong> record has been posted to the Move History ledger.
          </p>
          <button type="button" onClick={() => setIsPrintModalOpen(true)} style={btnPrimaryStyle}>
            <Printer size={14} /> Print Packing Slip
          </button>
        </div>
      )}

      {/* ── Add Product Line Modal ─────────────────────────────────── */}
      <Modal isOpen={isAddLineOpen} onClose={() => setIsAddLineOpen(false)} title="Add Product to Delivery">
        <form onSubmit={handleAddLine} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.875rem',
                backgroundColor: 'rgba(15,23,42,0.8)', color: '#f1f5f9',
              }}
            >
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) · On Hand: {p.total_on_hand ?? p.stock_on_hand ?? 0}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={lineQuantity}
              onChange={e => setLineQuantity(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.875rem',
                backgroundColor: 'rgba(15,23,42,0.8)', color: '#f1f5f9',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setIsAddLineOpen(false)} style={btnSecStyle}>Cancel</button>
            <button type="submit" disabled={actionLoading} style={btnPrimaryStyle}>
              {actionLoading ? 'Adding…' : <><Plus size={14} /> Add Line</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Print Slip ────────────────────────────────────────────── */}
      <PrintSlip
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={delivery}
        type="delivery"
      />
    </div>
  );
}

/* ── Button style constants ─────────────────────────────────────────── */
const btnSecStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.12)',
  backgroundColor: 'rgba(30,41,59,0.7)', color: '#cbd5e1',
  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
};

const btnPrimaryStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '9px 18px', borderRadius: '8px', border: 'none',
  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700,
  transition: 'all 0.15s', boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
};

const btnDangerStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', borderRadius: '8px',
  border: '1px solid rgba(239,68,68,0.3)',
  backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171',
  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
};
