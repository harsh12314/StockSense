// client/src/features/settings/CreateWarehouseModal.jsx
import React, { useState, useEffect } from 'react';
import { post, put } from '../../api/client';
import { Warehouse, MapPin, Tag, X, Plus } from 'lucide-react';

export default function CreateWarehouseModal({ isOpen, onClose, onSaved, initialData = null }) {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [address, setAddress] = useState('');
  const [defaultLocName, setDefaultLocName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setShortCode(initialData.short_code || initialData.code || '');
        setAddress(initialData.address || initialData.location || '');
        setDefaultLocName('');
      } else {
        setName('');
        setShortCode('');
        setAddress('');
        setDefaultLocName('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Warehouse name is required.');
      return;
    }
    if (!shortCode.trim()) {
      setError('Short code is required (e.g., WH, NORTH-WH).');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (initialData?.id) {
        res = await put(`/settings/warehouses/${initialData.id}`, {
          name: name.trim(),
          short_code: shortCode.trim().toUpperCase(),
          address: address.trim(),
        });
      } else {
        res = await post('/settings/warehouses', {
          name: name.trim(),
          short_code: shortCode.trim().toUpperCase(),
          address: address.trim(),
          default_location_name: defaultLocName.trim() || undefined,
        });
      }

      if (onSaved) onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save warehouse.');
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
          maxWidth: '520px',
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
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
              }}
            >
              <Warehouse size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              {initialData?.id ? 'Edit Warehouse Facility' : 'Create New Warehouse'}
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

            {/* Warehouse Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Warehouse Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. North Hub Logistics, Central Depot"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            {/* Short Code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Short Code / Prefix <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. WH, NORTH, HUB-2"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Used to generate standard order references like {shortCode ? shortCode : 'WH'}/IN/00001 and {shortCode ? shortCode : 'WH'}/OUT/00001.
              </span>
            </div>

            {/* Address / Location */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Physical Address / City
              </label>
              <input
                type="text"
                placeholder="e.g. Plot 42, Hitech Industrial Area, Hyderabad"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Default Location Name (only when creating) */}
            {!initialData?.id && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Primary Storage Bin Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Defaults to '[Warehouse Name] Stock'"
                  value={defaultLocName}
                  onChange={(e) => setDefaultLocName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            )}
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
              <Warehouse size={15} />
              <span>{loading ? 'Saving...' : initialData?.id ? 'Update Warehouse' : 'Create Warehouse'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
