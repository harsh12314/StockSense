// client/src/features/transfers/CreateTransferModal.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  X,
  AlertCircle,
  Package,
  Calendar,
  Warehouse,
  MapPin,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import { transfersApi } from './transfersApi';

export default function CreateTransferModal({ isOpen, onClose, onCreated }) {
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Product Line Items in creation modal
  const [lines, setLines] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
      setError(null);
    }
  }, [isOpen]);

  async function loadFormData() {
    setLoadingMeta(true);
    try {
      const [locs, prods] = await Promise.all([
        transfersApi.getLocations(),
        transfersApi.getProducts(),
      ]);

      setLocations(locs || []);
      setProducts(prods || []);

      if (locs && locs.length >= 2) {
        setFromLocationId(String(locs[0].id));
        setToLocationId(String(locs[1].id));
      } else if (locs && locs.length === 1) {
        setFromLocationId(String(locs[0].id));
      }

      if (prods && prods.length > 0) {
        setSelectedProductId(String(prods[0].id));
      }
    } catch (err) {
      console.error('Failed to load reference data:', err);
      setError('Failed to load locations and products. Please check server connection.');
    } finally {
      setLoadingMeta(false);
    }
  }

  // Find source stock for currently selected product
  const getProductStockAtSource = (productId, locId) => {
    if (!productId || !locId) return null;
    const prod = products.find((p) => String(p.id) === String(productId));
    if (!prod) return null;
    return prod.total_free_to_use ?? prod.total_on_hand ?? 0;
  };

  const handleAddLineToDraft = () => {
    if (!selectedProductId) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Line quantity must be greater than 0');
      return;
    }

    const prod = products.find((p) => String(p.id) === String(selectedProductId));
    if (!prod) return;

    // Check if product already exists in lines
    const existingIndex = lines.findIndex((l) => String(l.product_id) === String(selectedProductId));
    if (existingIndex >= 0) {
      const updated = [...lines];
      updated[existingIndex].quantity += qty;
      setLines(updated);
    } else {
      setLines([
        ...lines,
        {
          product_id: prod.id,
          product_name: prod.name,
          sku: prod.sku,
          quantity: qty,
          uom: prod.unit_of_measure || 'units',
        },
      ]);
    }

    setQuantity(1);
    setError(null);
  };

  const handleRemoveDraftLine = (index) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fromLocationId) {
      setError('Please select a source location.');
      return;
    }
    if (!toLocationId) {
      setError('Please select a destination location.');
      return;
    }
    if (String(fromLocationId) === String(toLocationId)) {
      setError('Source and Destination locations must be different.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        from_location_id: Number(fromLocationId),
        to_location_id: Number(toLocationId),
        transfer_date: transferDate,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
        })),
      };

      const created = await transfersApi.create(payload);
      if (onCreated) {
        onCreated(created);
      }
      onClose();
    } catch (err) {
      console.error('Error creating transfer:', err);
      setError(err.message || 'Failed to create internal transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentProductStock = getProductStockAtSource(selectedProductId, fromLocationId);

  return (
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
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                New Internal Transfer
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Transfer inventory between warehouse zones or facilities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '18px',
                color: '#fb7185',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Location Routing Selectors */}
          <div className="form-grid-2">
            <div className="transfer-form-group">
              <label className="transfer-form-label">
                Source Location (From) <span style={{ color: '#fb7185' }}>*</span>
              </label>
              <select
                className="transfer-form-select"
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                disabled={loadingMeta}
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.short_code || loc.warehouse_code || `LOC-${loc.id}`})
                  </option>
                ))}
              </select>
              <span className="transfer-form-helper">Goods will be deducted from here</span>
            </div>

            <div className="transfer-form-group">
              <label className="transfer-form-label">
                Destination Location (To) <span style={{ color: '#fb7185' }}>*</span>
              </label>
              <select
                className="transfer-form-select"
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                disabled={loadingMeta}
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.short_code || loc.warehouse_code || `LOC-${loc.id}`})
                  </option>
                ))}
              </select>
              <span className="transfer-form-helper">Goods will be credited here</span>
            </div>
          </div>

          {/* Schedule Date */}
          <div className="transfer-form-group" style={{ maxWidth: '300px' }}>
            <label className="transfer-form-label">Scheduled Transfer Date</label>
            <input
              type="date"
              className="transfer-form-input"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              required
            />
          </div>

          {/* Product Items Section */}
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                Transfer Line Items ({lines.length})
              </label>
              {currentProductStock !== null && (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Total on hand across locations: <strong style={{ color: '#38bdf8' }}>{currentProductStock}</strong>
                </span>
              )}
            </div>

            {/* Quick add product bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px auto',
                gap: '10px',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Select Product
                </label>
                <select
                  className="transfer-form-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={products.length === 0}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  className="transfer-form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn-secondary-dark"
                onClick={handleAddLineToDraft}
                disabled={!selectedProductId || products.length === 0}
                style={{ height: '38px', padding: '0 12px' }}
              >
                <Plus size={16} /> Add
              </button>
            </div>

            {/* Lines List */}
            {lines.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lines.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>{item.product_name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>
                        SKU: {item.sku}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#a5b4fc',
                          background: 'rgba(99, 102, 241, 0.15)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {item.quantity} {item.uom}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftLine(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#fb7185',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '16px',
            }}
          >
            <button
              type="button"
              className="btn-secondary-dark"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-gradient"
              disabled={submitting || loadingMeta}
            >
              {submitting ? 'Creating Transfer...' : 'Create Transfer Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
