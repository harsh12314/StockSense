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
          backgroundColor: '#0F172A',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: 600,
          border: '1px solid #334155'
        }}>
          <CheckCircle2 size={18} color="#22C55E" />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              backgroundColor: '#EBF3FC',
              border: '1px solid #BFDBFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A90E2',
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="page-heading" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Warehouses & Storage Locations
              </h1>
              <p className="page-subheading" style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.88rem' }}>
                Manage physical distribution centers, internal aisles, shelves, and stock allocation bins.
              </p>
            </div>
          </div>
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
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              padding: '9px 16px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.color = '#0F172A';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#334155';
              e.currentTarget.style.borderColor = '#CBD5E1';
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
              background: '#4A90E2',
              color: '#ffffff',
              border: '1px solid #4A90E2',
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(74, 144, 226, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#3B7DC4';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4A90E2';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.25)';
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
        {/* Warehouses KPI */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDF2F7',
          borderRadius: '18px',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.06)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.04)';
        }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#EBF3FC',
            color: '#4A90E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Warehouse size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Warehouses
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginTop: '4px' }}>
              {stats.totalFacilities}
            </div>
          </div>
        </div>

        {/* Storage Bins KPI */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDF2F7',
          borderRadius: '18px',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.06)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.04)';
        }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#EBF3FC',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Storage Bins / Locations
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginTop: '4px' }}>
              {stats.totalBins}
            </div>
          </div>
        </div>

        {/* Total Stock KPI */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #EDF2F7',
          borderRadius: '18px',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.06)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.04)';
        }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total On-Hand Inventory
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginTop: '4px' }}>
              {stats.totalStock.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        border: '1px solid #EDF2F7',
        borderRadius: '14px',
        padding: '14px 18px',
        marginBottom: '24px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#F8FAFD',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          padding: '8px 14px',
          flex: '1',
          maxWidth: '400px',
          minWidth: '240px',
        }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search warehouse code, name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F172A',
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
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#0F172A';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#94A3B8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#334155';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '1px solid #FECACA',
          color: '#DC2626',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          fontSize: '0.88rem',
        }}>
          <AlertCircle size={20} />
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
          padding: '70px 20px',
          color: '#64748B',
          gap: '14px',
        }}>
          <RefreshCw size={28} className="animate-spin text-blue" />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Loading warehouse facility hierarchy...</p>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px dashed #CBD5E1',
          borderRadius: '18px',
          padding: '56px 24px',
          textAlign: 'center',
          color: '#64748B',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#EBF3FC',
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#4A90E2',
          }}>
            <Warehouse size={28} />
          </div>
          <h3 style={{ color: '#0F172A', margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800 }}>No warehouses match your filter</h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#64748B' }}>Create a new warehouse or adjust your search terms.</p>
          <button
            onClick={() => {
              setEditingWarehouse(null);
              setIsWarehouseModalOpen(true);
            }}
            style={{
              background: '#4A90E2',
              color: '#ffffff',
              border: '1px solid #4A90E2',
              padding: '9px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(74, 144, 226, 0.25)',
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
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDF2F7',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Warehouse Master Header */}
                <div
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    borderBottom: !isCollapsed ? '1px solid #EDF2F7' : 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1', minWidth: '280px' }}>
                    <button
                      onClick={() => toggleCollapse(wh.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
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
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: '#EBF3FC',
                      color: '#4A90E2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Warehouse size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                          {wh.name}
                        </h2>
                        <span style={{
                          backgroundColor: '#EBF3FC',
                          color: '#4A90E2',
                          border: '1px solid #BFDBFE',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                        }}>
                          {wh.short_code || wh.code}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748B', fontSize: '0.84rem' }}>
                        <MapPin size={13} color="#94A3B8" />
                        <span>{wh.address || wh.location || 'Standard Facility'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Pills & Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      backgroundColor: '#F8FAFD',
                      border: '1px solid #EDF2F7',
                      borderRadius: '10px',
                      padding: '8px 16px',
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Locations</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{locCount}</div>
                      </div>
                      <div style={{ width: '1px', backgroundColor: '#EDF2F7' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>On-Hand Stock</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16A34A' }}>{whStock.toLocaleString()}</div>
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
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFD';
                        e.currentTarget.style.color = '#0F172A';
                        e.currentTarget.style.borderColor = '#94A3B8';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.color = '#334155';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
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
                        backgroundColor: '#EBF3FC',
                        border: '1px solid #BFDBFE',
                        color: '#4A90E2',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#4A90E2';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#4A90E2';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#EBF3FC';
                        e.currentTarget.style.color = '#4A90E2';
                        e.currentTarget.style.borderColor = '#BFDBFE';
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Bin</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Locations Table (Expandable) */}
                {!isCollapsed && (
                  <div style={{ padding: '0 24px 20px', marginTop: '14px' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
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
                        backgroundColor: '#F8FAFD',
                        border: '1px dashed #CBD5E1',
                        borderRadius: '10px',
                        padding: '24px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontSize: '0.85rem',
                      }}>
                        No internal locations or bins registered for this warehouse facility yet.
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: '#F8FAFD',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid #EDF2F7',
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #EDF2F7', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Location / Bin Name</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Short Code</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Current Stock On-Hand</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {locList.map((loc, idx) => {
                              const onHand = Number(loc.on_hand_qty || 0);
                              return (
                                <tr
                                  key={loc.id || idx}
                                  style={{
                                    borderBottom: idx < locList.length - 1 ? '1px solid #EDF2F7' : 'none',
                                    transition: 'background-color 0.12s',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <td style={{ padding: '14px 18px', color: '#0F172A', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <MapPin size={14} color="#4A90E2" />
                                      <span>{loc.name}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '14px 18px' }}>
                                    <code style={{
                                      backgroundColor: '#FFFFFF',
                                      color: '#4A90E2',
                                      border: '1px solid #CBD5E1',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.78rem',
                                      fontFamily: 'monospace',
                                      fontWeight: 700,
                                    }}>
                                      {loc.short_code}
                                    </code>
                                  </td>
                                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                    <span style={{
                                      fontWeight: 700,
                                      color: onHand > 0 ? '#16A34A' : '#64748B',
                                      fontSize: '0.88rem',
                                    }}>
                                      {onHand.toLocaleString()} units
                                    </span>
                                  </td>
                                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
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
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        color: '#475569',
                                        cursor: 'pointer',
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                        transition: 'all 0.15s ease',
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.color = '#0F172A';
                                        e.currentTarget.style.borderColor = '#94A3B8';
                                        e.currentTarget.style.backgroundColor = '#F8FAFD';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.color = '#475569';
                                        e.currentTarget.style.borderColor = '#CBD5E1';
                                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                                      }}
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
