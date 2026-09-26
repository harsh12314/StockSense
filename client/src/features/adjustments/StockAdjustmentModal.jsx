import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { IconPackage, IconWarehouse, IconAlertTriangle, IconCheck } from '../../components/common/Icons';

export default function StockAdjustmentModal({ isOpen, onClose, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [recordedQty, setRecordedQty] = useState(0);
  const [countedQty, setCountedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [fetchingStock, setFetchingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load products and locations when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSelectedProduct('');
    setSelectedLocation('');
    setRecordedQty(0);
    setCountedQty('');
    setNotes('');

    const fetchMeta = async () => {
      setLoadingMeta(true);
      try {
        const [prodRes, locRes] = await Promise.all([
          api('/ref/products'),
          api('/ref/locations'),
        ]);
        if (prodRes.success) setProducts(prodRes.data || []);
        if (locRes.success) {
          setLocations(locRes.data || []);
          if (locRes.data && locRes.data.length > 0) {
            setSelectedLocation(locRes.data[0].id);
          }
        }
      } catch (err) {
        setError('Failed to load products and warehouse locations.');
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMeta();
  }, [isOpen]);

  // When product or location changes, fetch recorded theoretical stock
  useEffect(() => {
    if (!selectedProduct || !selectedLocation) {
      setRecordedQty(0);
      return;
    }

    const fetchCurrentStock = async () => {
      setFetchingStock(true);
      try {
        const res = await api(`/ref/products/${selectedProduct}/stock?location_id=${selectedLocation}`);
        if (res.success && res.data && res.data.length > 0) {
          setRecordedQty(res.data[0].on_hand_qty || 0);
        } else {
          setRecordedQty(0);
        }
      } catch {
        setRecordedQty(0);
      } finally {
        setFetchingStock(false);
      }
    };

    fetchCurrentStock();
  }, [selectedProduct, selectedLocation]);

  if (!isOpen) return null;

  const countedNum = countedQty === '' ? null : Number(countedQty);
  const delta = countedNum !== null && !isNaN(countedNum) ? countedNum - recordedQty : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct) {
      setError('Please select a product.');
      return;
    }
    if (!selectedLocation) {
      setError('Please select a warehouse location.');
      return;
    }
    if (countedNum === null || isNaN(countedNum) || countedNum < 0 || !Number.isInteger(countedNum)) {
      setError('Please enter a valid non-negative whole number for counted quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api('/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          product_id: Number(selectedProduct),
          location_id: Number(selectedLocation),
          counted_qty: countedNum,
          notes: notes.trim() || 'Physical inventory audit',
        }),
      });

      if (res.success) {
        onSuccess?.(res.data);
        onClose();
      } else {
        setError(res.error?.message || 'Failed to record adjustment.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProductObj = products.find(p => String(p.id) === String(selectedProduct));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.25rem', fontWeight: 600 }}>
              <IconPackage size={20} className="text-purple" />
              New Stock Adjustment / Physical Count
            </h2>
            <p className="page-subheading" style={{ margin: '4px 0 0' }}>
              Reconcile physical on-shelf inventory with the digital theoretical ledger.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message" style={{ margin: '16px 20px 0' }}>
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {loadingMeta ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading warehouse catalog...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* Product Selector */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="adj-product" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Select Product <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                id="adj-product"
                className="form-control"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface-elevated, #21262d)', color: '#fff', border: '1px solid var(--color-border)', borderRadius: 6 }}
              >
                <option value="">-- Choose a Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Total On Hand: {p.total_on_hand ?? 0} {p.unit_of_measure || 'units'}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Selector */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="adj-location" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Storage Location / Bin <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                id="adj-location"
                className="form-control"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface-elevated, #21262d)', color: '#fff', border: '1px solid var(--color-border)', borderRadius: 6 }}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.warehouse_name ? `[${l.warehouse_name}] ` : ''}{l.name} ({l.short_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Reconciliation Comparison Box */}
            <div
              style={{
                background: 'var(--color-surface-elevated, #1c2128)',
                border: '1px solid var(--color-border, #30363d)',
                borderRadius: 8,
                padding: '16px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Theoretical Recorded Stock
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {fetchingStock ? '...' : recordedQty}{' '}
                    <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                      {selectedProductObj?.unit_of_measure || 'units'}
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="adj-counted"
                    style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}
                  >
                    Actual Counted Quantity <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="adj-counted"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 25"
                    value={countedQty}
                    onChange={(e) => setCountedQty(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      background: 'var(--color-bg, #0d1117)',
                      color: '#fff',
                      border: '1px solid var(--color-border, #30363d)',
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>

              {/* Live Delta Display */}
              {delta !== null && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background:
                      delta > 0
                        ? 'rgba(5, 150, 105, 0.15)'
                        : delta < 0
                        ? 'rgba(225, 29, 72, 0.15)'
                        : 'rgba(59, 130, 246, 0.15)',
                    color:
                      delta > 0
                        ? '#34d399'
                        : delta < 0
                        ? '#f87171'
                        : '#60a5fa',
                    border: `1px solid ${
                      delta > 0
                        ? 'rgba(5, 150, 105, 0.3)'
                        : delta < 0
                        ? 'rgba(225, 29, 72, 0.3)'
                        : 'rgba(59, 130, 246, 0.3)'
                    }`,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {delta > 0 ? 'Surplus (Stock Increment)' : delta < 0 ? 'Deficit (Stock Shrinkage)' : 'Exact Match (No Change)'}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {delta > 0 ? `+${delta}` : delta} {selectedProductObj?.unit_of_measure || 'units'}
                  </span>
                </div>
              )}
            </div>

            {/* Notes / Reason */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="adj-notes" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Audit Reason / Reference Notes
              </label>
              <input
                id="adj-notes"
                type="text"
                placeholder="e.g. End of month cycle count, Damaged packaging, Shelf recount"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface-elevated, #21262d)', color: '#fff', border: '1px solid var(--color-border)', borderRadius: 6 }}
              />
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="action-btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="action-btn btn-action-primary"
                disabled={submitting || countedQty === ''}
              >
                {submitting ? 'Applying Adjustment...' : 'Apply Stock Adjustment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
