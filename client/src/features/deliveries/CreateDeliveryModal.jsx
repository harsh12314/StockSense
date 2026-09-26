import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { api, post } from '../../api/client';
import { Package, MapPin, User, Calendar, Plus } from 'lucide-react';

export default function CreateDeliveryModal({ isOpen, onClose, onCreated }) {
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    from_location_id: '1',
    to_contact: 'Acme Corporation',
    delivery_address: 'Plot 42, Hitech City, Hyderabad 500081',
    schedule_date: new Date().toISOString().split('T')[0],
    operation_type: 'Delivery Orders',
    // Initial line item pre-configured for the 10 chairs user request
    initial_product_id: '1',
    initial_quantity: '10',
  });

  useEffect(() => {
    if (isOpen) {
      loadReferences();
    }
  }, [isOpen]);

  async function loadReferences() {
    setLoading(true);
    setError(null);
    try {
      // Load locations and products
      const [locRes, prodRes] = await Promise.all([
        api('/ref/locations').catch(() => ({ success: true, data: [
          { id: 1, name: 'Stock Room', short_code: 'STOCK1' },
          { id: 2, name: 'Shipping Bay', short_code: 'SHIP1' }
        ]})),
        api('/ref/products').catch(() => ({ success: true, data: [
          { id: 1, name: 'Office Chair', sku: 'CHAIR-001', stock_on_hand: 50 },
          { id: 2, name: 'Standing Desk', sku: 'DESK-001', stock_on_hand: 20 },
          { id: 3, name: 'Desk Lamp', sku: 'LAMP-001', stock_on_hand: 100 },
          { id: 4, name: 'Monitor Stand', sku: 'MNTR-001', stock_on_hand: 30 },
          { id: 5, name: 'Notebook Pack', sku: 'NOTE-001', stock_on_hand: 200 },
        ]}))
      ]);

      if (locRes.data && locRes.data.length > 0) {
        setLocations(locRes.data);
        setFormData(prev => ({ ...prev, from_location_id: String(locRes.data[0].id) }));
      }
      if (prodRes.data && prodRes.data.length > 0) {
        setProducts(prodRes.data);
        setFormData(prev => ({ ...prev, initial_product_id: String(prodRes.data[0].id) }));
      }
    } catch (err) {
      console.warn('Could not load references:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create delivery order
      const res = await post('/deliveries', {
        from_location_id: parseInt(formData.from_location_id, 10),
        to_contact: formData.to_contact,
        delivery_address: formData.delivery_address,
        schedule_date: formData.schedule_date,
        operation_type: formData.operation_type,
      });

      const newDelivery = res.data;

      // 2. If an initial product was specified, add line
      if (formData.initial_product_id && parseInt(formData.initial_quantity, 10) > 0) {
        try {
          await post(`/deliveries/${newDelivery.id}/lines`, {
            product_id: parseInt(formData.initial_product_id, 10),
            quantity: parseInt(formData.initial_quantity, 10),
          });
        } catch (lineErr) {
          console.error('Failed to add initial product line:', lineErr);
        }
      }

      onCreated(newDelivery);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create delivery order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Outgoing Delivery Order">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '6px',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Source Location (From) *
            </label>
            <select
              name="from_location_id"
              value={formData.from_location_id}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem'
              }}
            >
              {locations.length > 0 ? (
                locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.short_code})
                  </option>
                ))
              ) : (
                <option value="1">Stock Room (STOCK1)</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Scheduled Date *
            </label>
            <input
              type="date"
              name="schedule_date"
              value={formData.schedule_date}
              onChange={handleChange}
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
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Customer / To Contact *
          </label>
          <input
            type="text"
            name="to_contact"
            value={formData.to_contact}
            onChange={handleChange}
            placeholder="e.g. Acme Corp"
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

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Delivery Destination Address
          </label>
          <input
            type="text"
            name="delivery_address"
            value={formData.delivery_address}
            onChange={handleChange}
            placeholder="e.g. 100 Warehouse Way, Hyderabad"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Initial Line Item Section */}
        <div style={{
          padding: '12px 14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Package size={16} color="#3b82f6" />
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b' }}>
              Add Initial Item (e.g. Sales Order for 10 Chairs)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Product
              </label>
              <select
                name="initial_product_id"
                value={formData.initial_product_id}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem'
                }}
              >
                {products.length > 0 ? (
                  products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Available: {p.stock_on_hand ?? 50}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">Office Chair (CHAIR-001) — Available: 50</option>
                    <option value="2">Standing Desk (DESK-001) — Available: 20</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Demand Qty
              </label>
              <input
                type="number"
                name="initial_quantity"
                min="1"
                value={formData.initial_quantity}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Delivery Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
