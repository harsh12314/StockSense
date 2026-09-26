// client/src/features/settings/CreateLocationModal.jsx
import React, { useState, useEffect } from 'react';
import { post, put } from '../../api/client';
import { MapPin, Warehouse, X, Plus } from 'lucide-react';

export default function CreateLocationModal({
  isOpen,
  onClose,
  onSaved,
  warehouses = [],
  initialData = null,
  selectedWarehouseId = null,
}) {
  const [warehouseId, setWarehouseId] = useState('');
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setShortCode(initialData.short_code || '');
        setWarehouseId(String(initialData.warehouse_id || selectedWarehouseId || (warehouses[0]?.id ?? '')));
      } else {
        setName('');
        setShortCode('');
        setWarehouseId(String(selectedWarehouseId || (warehouses[0]?.id ?? '')));
      }
      setError(null);
    }
  }, [isOpen, initialData, selectedWarehouseId, warehouses]);

  if (!isOpen) return null;

  const currentWh = warehouses.find((w) => String(w.id) === String(warehouseId));

  const handleNameChange = (val) => {
    setName(val);
    // If user hasn't manually typed a complex short code, suggest a clean code
    if (!initialData && currentWh) {
      const slug = val.trim().toUpperCase().replace(/\s+/g, '_');
      if (slug) {
        setShortCode(`${currentWh.code || currentWh.short_code || 'WH'}/${slug}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Location / Bin name is required.');
      return;
    }
    if (!warehouseId) {
      setError('Please select a parent warehouse facility.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (initialData?.id) {
        res = await put(`/settings/locations/${initialData.id}`, {
          name: name.trim(),
          short_code: shortCode.trim(),
          warehouse_id: parseInt(warehouseId, 10),
        });
      } else {
        res = await post('/settings/locations', {
          name: name.trim(),
          short_code: shortCode.trim(),
          warehouse_id: parseInt(warehouseId, 10),
        });
      }

      if (onSaved) onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save storage location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <MapPin size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              {initialData?.id ? 'Edit Storage Location / Bin' : 'Add Internal Storage Location'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Parent Warehouse */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Parent Warehouse Facility <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                }}
                required
              >
                <option value="" disabled>Select parent warehouse...</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code || wh.short_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Location / Bin Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Bin / Location Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Shelf B2 - Raw Materials, Dock 1 Holding"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                }}
                required
              />
            </div>

            {/* Bin Short Code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Location Code / Bin Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. WH/SHELF-B2"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Referenced during picking slips, internal transfers, and receipts.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
            }}
          >
            <button
              type="button"
              className="action-btn btn-action-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="action-btn btn-action-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MapPin size={15} />
              <span>{loading ? 'Saving...' : initialData?.id ? 'Update Location' : 'Create Location'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
