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
  Sparkles,
  History
} from 'lucide-react';
import { get, post, del, api } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import StatusStepper from '../../components/StatusStepper';
import Modal from '../../components/Modal';

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Pick & Pack local state tracking
  const [pickedLines, setPickedLines] = useState({});
  const [packedLines, setPackedLines] = useState({});

  // Add line item modal state
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState(1);

  // Print Slip Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    loadDelivery();
  }, [id]);

  async function loadDelivery() {
    setLoading(true);
    setError(null);
    try {
      const res = await get(`/deliveries/${id}`);
      setDelivery(res.data);

      // Initialize pick & pack states if already done
      if (res.data.status === 'done') {
        const pState = {};
        const pkState = {};
        (res.data.lines || []).forEach(line => {
          pState[line.id] = true;
          pkState[line.id] = true;
        });
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
    } catch (e) {
      console.warn('Failed to load products for line modal:', e);
    }
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
      setSuccessMessage('Product line added successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDelivery();
    } catch (err) {
      alert(`Failed to add line: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveLine(lineId) {
    if (!window.confirm('Remove this product line?')) return;
    setActionLoading(true);
    try {
      await del(`/deliveries/${id}/lines/${lineId}`);
      await loadDelivery();
    } catch (err) {
      alert(`Failed to remove line: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // 1. Pick Item
  const togglePick = (lineId) => {
    if (delivery?.status === 'done' || delivery?.status === 'canceled') return;
    setPickedLines(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  // 2. Pack Item
  const togglePack = (lineId) => {
    if (delivery?.status === 'done' || delivery?.status === 'canceled') return;
    setPackedLines(prev => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  // Check Availability
  async function handleCheckAvailability() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await post(`/deliveries/${id}/check-availability`);
      setSuccessMessage(res.data.message);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadDelivery();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // 3. Validate -> stock decreases automatically
  async function handleValidate() {
    if (!window.confirm('Validate this Delivery Order? Stock will decrease automatically and move history will be recorded.')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await post(`/deliveries/${id}/validate`);
      setSuccessMessage(res.data.message || 'Delivery validated successfully! Stock has decreased.');
      await loadDelivery();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Cancel order
  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this delivery order?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await post(`/deliveries/${id}/cancel`);
      setSuccessMessage('Delivery order has been canceled.');
      await loadDelivery();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '14px', fontSize: '0.9rem' }}>Loading delivery details...</p>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ padding: '16px 20px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
          <strong>Error loading delivery:</strong> {error}
        </div>
        <button type="button" className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => navigate('/deliveries')}>
          <ArrowLeft size={16} /> Back to Deliveries
        </button>
      </div>
    );
  }

  const lines = delivery.lines || [];
  const allPicked = lines.length > 0 && lines.every(l => pickedLines[l.id]);
  const allPacked = lines.length > 0 && lines.every(l => packedLines[l.id]);
  const hasOutOfStock = lines.some(l => l.out_of_stock || (l.stock_on_hand < l.quantity));
  const isEditable = ['draft', 'waiting'].includes(delivery.status);
  const isReady = delivery.status === 'ready';
  const isDone = delivery.status === 'done';
  const isCanceled = delivery.status === 'canceled';

  return (
    <div>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
        <Link to="/deliveries" style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} /> Delivery Orders
        </Link>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{delivery.reference}</span>
      </div>

      {/* Top Banner / Notification */}
      {successMessage && (
        <div style={{
          padding: '12px 18px',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          borderRadius: '8px',
          marginBottom: '16px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 18px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '8px',
          marginBottom: '16px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #fecaca'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Bar with Reference & Primary Actions */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0 }}>{delivery.reference}</h2>
            <StatusBadge status={delivery.status} />
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Destination: <strong>{delivery.to_contact || 'Customer'}</strong> — {delivery.operation_type || 'Delivery Orders'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="page-header-actions">
          {/* New / Reset order */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/deliveries')}
          >
            All Orders
          </button>

          {/* Add Product Line (Draft/Waiting) */}
          {isEditable && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={openAddLineModal}
              disabled={actionLoading}
            >
              <Plus size={14} /> Add Product
            </button>
          )}

          {/* Check Availability */}
          {isEditable && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCheckAvailability}
              disabled={actionLoading || lines.length === 0}
              title="Verifies stock in warehouse. If all available, sets status to Ready."
            >
              Check Availability
            </button>
          )}

          {/* Validate Button (Primary) */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleValidate}
            disabled={actionLoading || delivery.status !== 'ready'}
            title={delivery.status === 'ready' ? 'Validate to automatically decrease stock and complete shipment' : 'Order must be in Ready status to validate'}
            style={{
              boxShadow: delivery.status === 'ready' ? '0 0 15px rgba(59,130,246,0.5)' : undefined
            }}
          >
            <Check size={16} /> Validate (Decrease Stock)
          </button>

          {/* Print Delivery Slip (Done only) */}
          {isDone && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPrintModalOpen(true)}
            >
              <Printer size={16} /> Print Delivery Slip
            </button>
          )}

          {/* Cancel */}
          {!isDone && !isCanceled && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              <Ban size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status Pipeline Stepper */}
      <StatusStepper currentStatus={delivery.status} />

      {/* Warehouse Outgoing Process Guide Banner */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-xs)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#3b82f6" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              Standard Outgoing Shipment Process
            </h4>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Warehouse SOP</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Step 1: Pick */}
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: allPicked ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${allPicked ? '#86efac' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: allPicked ? '#22c55e' : '#3b82f6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              1
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                Pick Items
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Collect items from shelves in {delivery.from_location_name || 'Stock Room'}.
              </div>
            </div>
          </div>

          {/* Step 2: Pack */}
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: allPacked ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${allPacked ? '#86efac' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: allPacked ? '#22c55e' : '#3b82f6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              2
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                Pack Items
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Box, label, and seal packages for dispatch.
              </div>
            </div>
          </div>

          {/* Step 3: Validate */}
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: isDone ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${isDone ? '#86efac' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: isDone ? '#22c55e' : '#3b82f6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              3
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                Validate → Stock Decreases
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Stock reduces automatically & Move History is logged.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Meta Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              <Warehouse size={14} /> Source Location (From)
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              {delivery.from_location_name || 'Stock Room'}
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '6px' }}>
                ({delivery.from_location_code || 'WH/STOCK1'})
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              <User size={14} /> Customer / To Contact
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              {delivery.to_contact || '—'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              <MapPin size={14} /> Delivery Address
            </div>
            <div style={{ fontSize: '0.95rem', color: '#334155' }}>
              {delivery.delivery_address || '—'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              <Calendar size={14} /> Schedule Date
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              {delivery.schedule_date ? delivery.schedule_date.split('T')[0] : '—'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              <User size={14} /> Responsible (Auto-filled)
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              {delivery.responsible_name || 'admin1'}
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>(Logged-in User)</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              <Layers size={14} /> Operation Type
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              {delivery.operation_type || 'Delivery Orders'}
            </div>
          </div>
        </div>
      </div>

      {/* Product Lines Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Product Operations & Stock Allocation
            </h3>
          </div>

          {isEditable && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={openAddLineModal}
            >
              <Plus size={14} /> Add Product Line
            </button>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {lines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <p>No products added to this delivery order yet.</p>
              {isEditable && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={openAddLineModal}
                >
                  <Plus size={14} /> Add First Product
                </button>
              )}
            </div>
          ) : (
            <div className="data-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Demand Quantity</th>
                    <th>Current On-Hand</th>
                    <th>Availability Status</th>
                    <th style={{ textAlign: 'center' }}>Step 1: Picked</th>
                    <th style={{ textAlign: 'center' }}>Step 2: Packed</th>
                    <th>Stock Impact Preview</th>
                    {isEditable && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const isOut = line.out_of_stock || (line.stock_on_hand < line.quantity);
                    const isPicked = !!pickedLines[line.id];
                    const isPacked = !!packedLines[line.id];
                    const remainingStock = Math.max(0, (line.stock_on_hand || 0) - line.quantity);

                    return (
                      <tr
                        key={line.id}
                        className={isOut ? 'row-out-of-stock' : ''}
                        style={{
                          backgroundColor: isOut ? 'rgba(239, 68, 68, 0.05)' : undefined
                        }}
                      >
                        {/* Product Name */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {line.product_name}
                          </div>
                          {isOut && (
                            <div style={{
                              color: 'var(--color-danger)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px'
                            }}>
                              <AlertTriangle size={12} />
                              Out of stock alert: demand exceeds on-hand quantity!
                            </div>
                          )}
                        </td>

                        {/* SKU */}
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                            {line.product_sku}
                          </span>
                        </td>

                        {/* Demand Quantity */}
                        <td>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                            {line.quantity} units
                          </span>
                        </td>

                        {/* On Hand Stock */}
                        <td>
                          <span style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: isOut ? 'var(--color-danger)' : '#059669'
                          }}>
                            {line.stock_on_hand ?? 0} units
                          </span>
                        </td>

                        {/* Stock Availability Badge */}
                        <td>
                          {isOut ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626'
                            }}>
                              <AlertTriangle size={12} /> Missing Stock
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#dcfce7',
                              color: '#15803d'
                            }}>
                              <CheckCircle2 size={12} /> In Stock
                            </span>
                          )}
                        </td>

                        {/* Step 1: Picked Checkbox / Button */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => togglePick(line.id)}
                            disabled={isDone || isCanceled}
                            style={{
                              border: isPicked ? '1px solid #16a34a' : '1px solid #cbd5e1',
                              backgroundColor: isPicked ? '#dcfce7' : '#fff',
                              color: isPicked ? '#15803d' : '#64748b',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              cursor: (isDone || isCanceled) ? 'default' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '3px',
                              backgroundColor: isPicked ? '#22c55e' : '#fff',
                              border: isPicked ? '1px solid #16a34a' : '1px solid #94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '10px'
                            }}>
                              {isPicked && '✓'}
                            </span>
                            {isPicked ? 'Picked' : 'Mark Pick'}
                          </button>
                        </td>

                        {/* Step 2: Packed Checkbox / Button */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => togglePack(line.id)}
                            disabled={isDone || isCanceled}
                            style={{
                              border: isPacked ? '1px solid #16a34a' : '1px solid #cbd5e1',
                              backgroundColor: isPacked ? '#dcfce7' : '#fff',
                              color: isPacked ? '#15803d' : '#64748b',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              cursor: (isDone || isCanceled) ? 'default' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '3px',
                              backgroundColor: isPacked ? '#22c55e' : '#fff',
                              border: isPacked ? '1px solid #16a34a' : '1px solid #94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '10px'
                            }}>
                              {isPacked && '✓'}
                            </span>
                            {isPacked ? 'Packed' : 'Mark Pack'}
                          </button>
                        </td>

                        {/* Stock Impact Visualizer */}
                        <td>
                          {isDone ? (
                            <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                              ✓ Stock decreased by {line.quantity} units
                            </span>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                              <span>{line.stock_on_hand ?? 0}</span>
                              <span style={{ color: 'var(--color-danger)', fontWeight: 700, margin: '0 4px' }}>
                                - {line.quantity}
                              </span>
                              <span>= <strong>{remainingStock}</strong> units left</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        {isEditable && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-ghost btn-icon"
                              onClick={() => handleRemoveLine(line.id)}
                              style={{ color: '#ef4444', border: 'none', cursor: 'pointer' }}
                              title="Delete line"
                            >
                              <Trash2 size={16} />
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
      </div>

      {/* Done State: Ledger Confirmation & Next Steps */}
      {isDone && (
        <div className="card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '24px' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <CheckCircle2 size={20} color="#16a34a" />
              <h4 style={{ margin: 0, color: '#15803d', fontWeight: 700 }}>
                Stock Successfully Decreased & Recorded in Move History
              </h4>
            </div>
            <p style={{ color: '#166534', fontSize: '0.875rem' }}>
              Stock for all line items was automatically subtracted from the source warehouse location. An append-only Move History ledger record with direction <strong>OUT</strong> has been permanently posted.
            </p>
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsPrintModalOpen(true)}
              >
                <Printer size={14} /> Print Packing Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Line Modal */}
      <Modal
        isOpen={isAddLineOpen}
        onClose={() => setIsAddLineOpen(false)}
        title="Add Product to Delivery Order"
      >
        <form onSubmit={handleAddLine} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem'
              }}
            >
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Available On Hand: {p.total_on_hand ?? p.stock_on_hand ?? 0}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Demand Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={lineQuantity}
              onChange={(e) => setLineQuantity(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddLineOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Adding...' : 'Add Line'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Delivery Slip Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Delivery Order Slip (Print View)"
        maxWidth="650px"
      >
        <div id="printable-delivery-slip" style={{ padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>StockSense Warehouse</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>Main Warehouse Hub (WH) — Hyderabad</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#3b82f6' }}>DELIVERY SLIP</h3>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: '2px 0 0' }}>{delivery.reference}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.85rem' }}>
            <div>
              <strong>Ship To:</strong>
              <div>{delivery.to_contact || 'Customer'}</div>
              <div>{delivery.delivery_address || 'No street address provided'}</div>
            </div>
            <div>
              <div><strong>Dispatch Date:</strong> {delivery.schedule_date ? delivery.schedule_date.split('T')[0] : 'N/A'}</div>
              <div><strong>From Location:</strong> {delivery.from_location_name} ({delivery.from_location_code})</div>
              <div><strong>Responsible:</strong> {delivery.responsible_name}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>SKU</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Product Description</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Shipped Qty</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>{l.product_sku}</td>
                  <td style={{ padding: '8px' }}>{l.product_name}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{l.quantity} units</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '16px', fontSize: '0.8rem', color: '#64748b' }}>
            <div>Picked & Packed by Warehouse Staff</div>
            <div>Authorized Signature: _______________________</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPrintModalOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              <Printer size={16} /> Print Document
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
