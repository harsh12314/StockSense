// client/src/features/settings/WarehouseSettings.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { get } from '../../api/client';
import CreateWarehouseModal from './CreateWarehouseModal';
import CreateLocationModal from './CreateLocationModal';
import {
  Warehouse,
  MapPin,
  Layers,
  Plus,
  Search,
  Pencil,
  ChevronDown,
  ChevronRight,
  Package,
  RefreshCw,
  Boxes,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function WarehouseSettings() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedWarehouses, setCollapsedWarehouses] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedWarehouseIdForLoc, setSelectedWarehouseIdForLoc] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get('/settings/warehouses');
      if (res && res.data) {
        setWarehouses(res.data);
      } else {
        setWarehouses([]);
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
      setError(err.message || 'Failed to load warehouses and location settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const toggleCollapse = (whId) => {
    setCollapsedWarehouses((prev) => ({
      ...prev,
      [whId]: !prev[whId],
    }));
  };

  // High-level KPI Stats
  const stats = useMemo(() => {
    let totalBins = 0;
    let totalStock = 0;
    let totalFree = 0;

    warehouses.forEach((wh) => {
      totalBins += Number(wh.location_count || (wh.locations ? wh.locations.length : 0) || 0);
      totalStock += Number(wh.total_stock_qty || 0);
      totalFree += Number(wh.total_free_qty || 0);
    });

    return {
      totalFacilities: warehouses.length,
      totalBins,
      totalStock,
      totalFree,
    };
  }, [warehouses]);

  // Filtered warehouses based on search query
  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return warehouses;
    const q = searchQuery.toLowerCase().trim();
    return warehouses.filter((wh) => {
      const matchWh =
        wh.name?.toLowerCase().includes(q) ||
        wh.short_code?.toLowerCase().includes(q) ||
        wh.address?.toLowerCase().includes(q);

      const matchLocs = wh.locations?.some(
        (loc) =>
          loc.name?.toLowerCase().includes(q) ||
          loc.short_code?.toLowerCase().includes(q)
      );

      return matchWh || matchLocs;
    });
  }, [warehouses, searchQuery]);

  return (
    <div className="wh-settings-container" style={{ width: '100%' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="view-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={26} color="#818cf8" />
            <h1 className="page-heading" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
              Warehouses & Storage Locations
            </h1>
          </div>
          <p className="page-subheading" style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            Manage physical distribution centers, internal aisles, shelves, and stock allocation bins.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => {
              setSelectedWarehouseIdForLoc(warehouses[0]?.id || null);
              setEditingLocation(null);
              setIsLocationModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(51, 65, 85, 0.6)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(71, 85, 105, 0.8)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.6)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <Plus size={16} />
            <span>New Location</span>
          </button>

          <button
            onClick={() => {
              setEditingWarehouse(null);
              setIsWarehouseModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(99, 102, 241, 0.45)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.35)';
            }}
          >
            <Plus size={16} />
            <span>New Warehouse</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Warehouse size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Warehouses
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2, marginTop: '2px' }}>
              {stats.totalFacilities}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(14, 165, 233, 0.15)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Storage Bins / Locations
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2, marginTop: '2px' }}>
              {stats.totalBins}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total On-Hand Inventory
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2, marginTop: '2px' }}>
              {stats.totalStock.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '6px 14px',
          flex: '1',
          maxWidth: '400px',
          minWidth: '240px',
        }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search warehouse code, name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '0.875rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={fetchWarehouses}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#f8fafc')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          fontSize: '0.88rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && warehouses.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: '#94a3b8',
          gap: '12px',
        }}>
          <RefreshCw size={28} className="animate-spin text-purple" />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Loading warehouse facility hierarchy...</p>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div style={{
          backgroundColor: 'rgba(30, 41, 59, 0.3)',
          border: '1px dashed rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '50px 20px',
          textAlign: 'center',
          color: '#94a3b8',
        }}>
          <Warehouse size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: '1.1rem' }}>No warehouses match your filter</h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.88rem' }}>Create a new warehouse or adjust your search terms.</p>
          <button
            onClick={() => {
              setEditingWarehouse(null);
              setIsWarehouseModalOpen(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Create Warehouse
          </button>
        </div>
      ) : (
        /* Warehouse Hierarchical List Cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredWarehouses.map((wh) => {
            const isCollapsed = collapsedWarehouses[wh.id] || false;
            const locList = wh.locations || [];
            const locCount = locList.length;
            const whStock = Number(wh.total_stock_qty || 0);

            return (
              <div
                key={wh.id}
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Warehouse Master Header */}
                <div
                  style={{
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    borderBottom: !isCollapsed ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                    backgroundColor: 'rgba(15, 23, 42, 0.35)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1', minWidth: '280px' }}>
                    <button
                      onClick={() => toggleCollapse(wh.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                      }}
                      title={isCollapsed ? 'Expand bins list' : 'Collapse bins list'}
                    >
                      {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </button>

                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Warehouse size={20} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                          {wh.name}
                        </h2>
                        <span style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: '#a5b4fc',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                        }}>
                          {wh.short_code || wh.code}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#94a3b8', fontSize: '0.82rem' }}>
                        <MapPin size={13} color="#64748b" />
                        <span>{wh.address || wh.location || 'Standard Facility'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Pills & Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      backgroundColor: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '6px 14px',
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Locations</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>{locCount}</div>
                      </div>
                      <div style={{ width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>On-Hand Stock</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>{whStock.toLocaleString()}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingWarehouse(wh);
                        setIsWarehouseModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(51, 65, 85, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#cbd5e1',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(71, 85, 105, 0.7)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.4)')}
                    >
                      <Pencil size={13} />
                      <span>Edit Facility</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedWarehouseIdForLoc(wh.id);
                        setEditingLocation(null);
                        setIsLocationModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        color: '#a5b4fc',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.35)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)')}
                    >
                      <Plus size={14} />
                      <span>Add Bin</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Locations Table (Expandable) */}
                {!isCollapsed && (
                  <div style={{ padding: '0 22px 18px', marginTop: '12px' }}>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <Layers size={14} />
                      <span>Internal Storage Locations ({locCount})</span>
                    </div>

                    {locList.length === 0 ? (
                      <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: '8px',
                        padding: '20px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '0.85rem',
                      }}>
                        No internal locations or bins registered for this warehouse facility yet.
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.07)', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Location / Bin Name</th>
                              <th style={{ padding: '10px 16px', fontWeight: 600 }}>Short Code</th>
                              <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Current Stock On-Hand</th>
                              <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {locList.map((loc, idx) => {
                              const onHand = Number(loc.on_hand_qty || 0);
                              return (
                                <tr
                                  key={loc.id || idx}
                                  style={{
                                    borderBottom: idx < locList.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                                    transition: 'background-color 0.15s',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 500 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <MapPin size={14} color="#818cf8" />
                                      <span>{loc.name}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 16px' }}>
                                    <code style={{
                                      backgroundColor: 'rgba(51, 65, 85, 0.5)',
                                      color: '#93c5fd',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.8rem',
                                      fontFamily: 'monospace',
                                    }}>
                                      {loc.short_code}
                                    </code>
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <span style={{
                                      fontWeight: 600,
                                      color: onHand > 0 ? '#34d399' : '#94a3b8',
                                    }}>
                                      {onHand.toLocaleString()} units
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <button
                                      onClick={() => {
                                        setSelectedWarehouseIdForLoc(wh.id);
                                        setEditingLocation({
                                          ...loc,
                                          warehouse_id: wh.id,
                                        });
                                        setIsLocationModalOpen(true);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.78rem',
                                      }}
                                      onMouseOver={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                                      onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                    >
                                      <Pencil size={12} />
                                      <span>Edit</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warehouse Modal Dialog */}
      <CreateWarehouseModal
        isOpen={isWarehouseModalOpen}
        onClose={() => {
          setIsWarehouseModalOpen(false);
          setEditingWarehouse(null);
        }}
        initialData={editingWarehouse}
        onSaved={(savedWh) => {
          setIsWarehouseModalOpen(false);
          setEditingWarehouse(null);
          showToast(
            editingWarehouse
              ? `Warehouse "${savedWh.name}" updated successfully.`
              : `Warehouse "${savedWh.name}" created successfully.`
          );
          fetchWarehouses();
        }}
      />

      {/* Internal Location Modal Dialog */}
      <CreateLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => {
          setIsLocationModalOpen(false);
          setEditingLocation(null);
        }}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseIdForLoc}
        initialData={editingLocation}
        onSaved={(savedLoc) => {
          setIsLocationModalOpen(false);
          setEditingLocation(null);
          showToast(
            editingLocation
              ? `Storage location "${savedLoc.name}" updated successfully.`
              : `Storage location "${savedLoc.name}" created successfully.`
          );
          fetchWarehouses();
        }}
      />
    </div>
  );
}
