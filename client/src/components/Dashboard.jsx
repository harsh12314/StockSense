import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './layout/Navbar';
import Sidebar from './layout/Sidebar';
import StatusBadge from './common/StatusBadge';
import ProductList from '../features/products/ProductList';
import DeliveryList from '../features/deliveries/DeliveryList';
import ReceiptsList from '../features/receipts/ReceiptsList';
import CreateDeliveryModal from '../features/deliveries/CreateDeliveryModal';
import CreateProductModal from '../features/products/CreateProductModal';
import { receiptsApi } from '../features/receipts/receiptsApi';
import { get } from '../api/client';
import {
  IconPackage,
  IconReceipt,
  IconTruck,
  IconAlertTriangle,
  IconPlus,
  IconFilter,
  IconArrowIn,
  IconArrowOut,
  IconAdjust,
  IconTrendingUp,
  IconSearch,
  IconHistory,
  IconWarehouse,
} from './common/Icons';
import {
  INITIAL_WAREHOUSES,
  INITIAL_ACTIVITIES,
} from '../services/mockData';

export default function Dashboard({ onLogout, initialTab = 'dashboard' }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : { loginId: 'admin1', role: 'inventory_manager', email: 'admin@stocksense.io' };
    } catch {
      return { loginId: 'admin1', role: 'inventory_manager', email: 'admin@stocksense.io' };
    }
  });

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');

  // Modal states for Quick Actions
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [creatingReceipt, setCreatingReceipt] = useState(false);

  // Live data states
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryStats, setDeliveryStats] = useState({});
  const [activities] = useState(INITIAL_ACTIVITIES);
  const [warehouses] = useState(INITIAL_WAREHOUSES);
  const [actionNotice, setActionNotice] = useState(null);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Sync activeTab with URL / prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'dashboard') {
      navigate('/dashboard');
    } else {
      navigate(`/${tabId}`);
    }
  };

  // Fetch live operational data from backend
  const loadDashboardData = useCallback(async () => {
    try {
      const [prodRes, recRes, delRes, statsRes] = await Promise.all([
        get('/products').catch(() => ({ data: [] })),
        get('/receipts').catch(() => ({ data: [] })),
        get('/deliveries').catch(() => ({ data: [] })),
        get('/deliveries/stats').catch(() => ({ data: {} })),
      ]);

      if (prodRes?.data) setProducts(prodRes.data);
      if (recRes?.data) setReceipts(recRes.data);
      if (delRes?.data) setDeliveries(delRes.data);
      if (statsRes?.data) setDeliveryStats(statsRes.data);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, activeTab]);

  // Quick Action Handlers
  const handleCreateReceipt = async () => {
    try {
      setCreatingReceipt(true);
      const newRec = await receiptsApi.create({ to_location_id: 1 });
      if (newRec && newRec.id) {
        showNotice(`Created new receipt ${newRec.reference || 'WH/IN'}`);
        navigate(`/receipts/${newRec.id}`);
      } else {
        handleSelectTab('receipts');
      }
    } catch (err) {
      showNotice(`Error creating receipt: ${err.message}`);
    } finally {
      setCreatingReceipt(false);
    }
  };

  // Filters for Dashboard Activity feed
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculations & KPI Stats based on real database records
  const lowStockItems = useMemo(() => {
    return products.filter((p) => {
      const onHand = Number(p.on_hand_qty ?? p.onHand ?? 0);
      const minStock = Number(p.reordering_rule ?? p.minStock ?? 5);
      return onHand <= minStock;
    });
  }, [products]);

  const pendingReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const st = r.status?.toLowerCase();
      return st !== 'done' && st !== 'canceled';
    });
  }, [receipts]);

  const pendingDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const st = d.status?.toLowerCase();
      return st !== 'done' && st !== 'canceled';
    });
  }, [deliveries]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (typeFilter !== 'ALL' && act.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && act.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesRef = act.reference.toLowerCase().includes(q);
        const matchesProd = act.product.toLowerCase().includes(q);
        const matchesContact = act.contact.toLowerCase().includes(q);
        if (!matchesRef && !matchesProd && !matchesContact) return false;
      }
      return true;
    });
  }, [activities, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="stocksense-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        counts={{
          totalProducts: products.length,
          pendingReceipts: pendingReceipts.length,
          pendingDeliveries: pendingDeliveries.length,
        }}
      />

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top Navbar */}
        <Navbar
          user={user}
          onLogout={onLogout}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          currentWarehouse={selectedWarehouse}
          onWarehouseChange={setSelectedWarehouse}
          warehouses={warehouses}
          lowStockCount={lowStockItems.length}
        />

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="toast-notification">
            <span className="toast-dot" />
            <span>{actionNotice}</span>
          </div>
        )}

        <main className="dashboard-content">
          {activeTab === 'dashboard' && (
            <>
              {/* Header Title & Quick Actions */}
              <section className="dashboard-header-row">
                <div className="header-titles">
                  <h1 className="page-heading">Operations Dashboard</h1>
                  <p className="page-subheading">
                    Real-time warehouse KPIs, stock flow, and operational alerts across facilities.
                  </p>
                </div>

                <div className="quick-actions-toolbar">
                  <button
                    className="action-btn btn-action-primary"
                    onClick={handleCreateReceipt}
                    disabled={creatingReceipt}
                  >
                    <IconPlus size={16} />
                    <span>{creatingReceipt ? 'Creating...' : '+ New Receipt'}</span>
                  </button>

                  <button
                    className="action-btn btn-action-secondary"
                    onClick={() => setIsDeliveryModalOpen(true)}
                  >
                    <IconTruck size={16} />
                    <span>+ New Delivery</span>
                  </button>

                  <button
                    className="action-btn btn-action-secondary"
                    onClick={() => setIsProductModalOpen(true)}
                  >
                    <IconPackage size={16} />
                    <span>Add Product</span>
                  </button>

                  <button
                    className="action-btn btn-action-secondary"
                    onClick={() => handleSelectTab('products')}
                  >
                    <IconAdjust size={16} />
                    <span>Adjust Stock</span>
                  </button>
                </div>
              </section>

              {/* 4 Core KPI Stat Cards */}
              <section className="kpi-grid">
                {/* 1. Total Products */}
                <div
                  className="kpi-card"
                  onClick={() => handleSelectTab('products')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-title">Total Products</span>
                    <div className="kpi-icon-wrapper kpi-icon-purple">
                      <IconPackage size={20} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value">{products.length}</span>
                    <span className="kpi-trend positive">
                      <IconTrendingUp size={14} /> Active SKUs
                    </span>
                  </div>
                  <div className="kpi-footer">
                    <span>Catalogued in central database</span>
                  </div>
                </div>

                {/* 2. Low Stock Alerts */}
                <div
                  className="kpi-card alert-card"
                  onClick={() => {
                    const el = document.getElementById('low-stock-panel');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-title">Low Stock Alerts</span>
                    <div className="kpi-icon-wrapper kpi-icon-rose">
                      <IconAlertTriangle size={20} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value alert-text">{lowStockItems.length}</span>
                    <span className="kpi-badge badge-urgent">Action Required</span>
                  </div>
                  <div className="kpi-footer">
                    <span>{lowStockItems.length} items below minimum safety threshold</span>
                  </div>
                </div>

                {/* 3. Pending Receipts */}
                <div
                  className="kpi-card"
                  onClick={() => handleSelectTab('receipts')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-title">Pending Receipts</span>
                    <div className="kpi-icon-wrapper kpi-icon-amber">
                      <IconReceipt size={20} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value">{pendingReceipts.length}</span>
                    <span className="kpi-badge badge-amber">
                      {receipts.filter((r) => r.status?.toLowerCase() === 'ready').length} Ready
                    </span>
                  </div>
                  <div className="kpi-footer">
                    <span>Incoming vendor shipments awaiting validation</span>
                  </div>
                </div>

                {/* 4. Pending Deliveries */}
                <div
                  className="kpi-card"
                  onClick={() => handleSelectTab('deliveries')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="kpi-card-header">
                    <span className="kpi-title">Pending Deliveries</span>
                    <div className="kpi-icon-wrapper kpi-icon-blue">
                      <IconTruck size={20} />
                    </div>
                  </div>
                  <div className="kpi-body">
                    <span className="kpi-value">{pendingDeliveries.length}</span>
                    <span className="kpi-badge badge-blue">
                      {deliveries.filter((d) => d.status?.toLowerCase() === 'ready').length} Ready to Ship
                    </span>
                  </div>
                  <div className="kpi-footer">
                    <span>Customer orders pending picking & dispatch</span>
                  </div>
                </div>
              </section>

              {/* Operations Pipeline Breakdown */}
              <section className="pipeline-overview-section">
                <div className="pipeline-card" onClick={() => handleSelectTab('receipts')} style={{ cursor: 'pointer' }}>
                  <div className="pipeline-card-header">
                    <div className="pipeline-title-group">
                      <IconReceipt size={18} className="text-amber" />
                      <h3>Receipts Pipeline</h3>
                    </div>
                    <span className="pipeline-count-tag">{receipts.length} Total Orders</span>
                  </div>
                  <div className="pipeline-steps-bar">
                    <div className="pipeline-step step-draft">
                      <span className="step-label">Draft</span>
                      <span className="step-count">{receipts.filter((r) => r.status?.toLowerCase() === 'draft').length}</span>
                    </div>
                    <div className="pipeline-step-arrow">→</div>
                    <div className="pipeline-step step-ready">
                      <span className="step-label">Ready</span>
                      <span className="step-count">{receipts.filter((r) => r.status?.toLowerCase() === 'ready').length}</span>
                    </div>
                    <div className="pipeline-step-arrow">→</div>
                    <div className="pipeline-step step-done">
                      <span className="step-label">Done</span>
                      <span className="step-count">{receipts.filter((r) => r.status?.toLowerCase() === 'done').length}</span>
                    </div>
                  </div>
                </div>

                <div className="pipeline-card" onClick={() => handleSelectTab('deliveries')} style={{ cursor: 'pointer' }}>
                  <div className="pipeline-card-header">
                    <div className="pipeline-title-group">
                      <IconTruck size={18} className="text-blue" />
                      <h3>Deliveries Pipeline</h3>
                    </div>
                    <span className="pipeline-count-tag">{deliveries.length} Total Orders</span>
                  </div>
                  <div className="pipeline-steps-bar">
                    <div className="pipeline-step step-draft">
                      <span className="step-label">Draft</span>
                      <span className="step-count">{deliveries.filter((d) => d.status?.toLowerCase() === 'draft').length}</span>
                    </div>
                    <div className="pipeline-step-arrow">→</div>
                    <div className="pipeline-step step-waiting">
                      <span className="step-label">Waiting</span>
                      <span className="step-count">{deliveries.filter((d) => d.status?.toLowerCase() === 'waiting').length}</span>
                    </div>
                    <div className="pipeline-step-arrow">→</div>
                    <div className="pipeline-step step-ready">
                      <span className="step-label">Ready</span>
                      <span className="step-count">{deliveries.filter((d) => d.status?.toLowerCase() === 'ready').length}</span>
                    </div>
                    <div className="pipeline-step-arrow">→</div>
                    <div className="pipeline-step step-done">
                      <span className="step-label">Done</span>
                      <span className="step-count">{deliveries.filter((d) => d.status?.toLowerCase() === 'done').length}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Two Column Grid: Low Stock Alert Panel + Recent Activity Feed */}
              <div className="dashboard-detail-grid">
                {/* Low Stock Warning Section */}
                <section id="low-stock-panel" className="dashboard-box low-stock-box">
                  <div className="box-header">
                    <div className="box-title-wrap">
                      <IconAlertTriangle size={18} className="text-rose" />
                      <h2>Low Stock Critical Items</h2>
                    </div>
                    <span className="box-badge-count">{lowStockItems.length} Warnings</span>
                  </div>

                  <div className="low-stock-table-container">
                    <table className="compact-table">
                      <thead>
                        <tr>
                          <th>SKU / Product</th>
                          <th>On Hand</th>
                          <th>Safety Min</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                              All items are well stocked above safety threshold.
                            </td>
                          </tr>
                        ) : (
                          lowStockItems.map((prod) => (
                            <tr key={prod.id} className="low-stock-row">
                              <td>
                                <div className="prod-cell-main">
                                  <span className="prod-name">{prod.name}</span>
                                  <span className="prod-sku">{prod.sku} • {prod.category_name || prod.category || 'General'}</span>
                                </div>
                              </td>
                              <td>
                                <span className="onhand-pill alert">{prod.on_hand_qty ?? prod.onHand ?? 0} {prod.unit_of_measure || prod.uom || 'units'}</span>
                              </td>
                              <td>
                                <span className="minstock-label">{prod.reordering_rule ?? prod.minStock ?? 5} {prod.unit_of_measure || prod.uom || 'units'}</span>
                              </td>
                              <td>
                                <button
                                  className="btn-reorder-tiny"
                                  onClick={handleCreateReceipt}
                                >
                                  Reorder
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Activity & Stock Movements Feed */}
                <section className="dashboard-box activity-box">
                  <div className="box-header">
                    <div className="box-title-wrap">
                      <IconHistory size={18} className="text-purple" />
                      <h2>Recent Stock Movements</h2>
                    </div>
                    <button
                      className="box-link-btn"
                      onClick={() => handleSelectTab('ledger')}
                    >
                      View Full Ledger →
                    </button>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="activity-filter-bar">
                    <div className="filter-pill-group">
                      <button
                        className={`filter-pill ${typeFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setTypeFilter('ALL')}
                      >
                        All Types
                      </button>
                      <button
                        className={`filter-pill ${typeFilter === 'IN' ? 'active' : ''}`}
                        onClick={() => setTypeFilter('IN')}
                      >
                        <IconArrowIn size={13} /> Incoming
                      </button>
                      <button
                        className={`filter-pill ${typeFilter === 'OUT' ? 'active' : ''}`}
                        onClick={() => setTypeFilter('OUT')}
                      >
                        <IconArrowOut size={13} /> Outgoing
                      </button>
                      <button
                        className={`filter-pill ${typeFilter === 'ADJUST' ? 'active' : ''}`}
                        onClick={() => setTypeFilter('ADJUST')}
                      >
                        <IconAdjust size={13} /> Adjustments
                      </button>
                    </div>

                    <div className="activity-search-wrap">
                      <IconSearch size={14} />
                      <input
                        type="text"
                        placeholder="Filter movements..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="activity-search-input"
                      />
                    </div>
                  </div>

                  <div className="activity-list">
                    {filteredActivities.length === 0 ? (
                      <div className="empty-state-card">
                        <p>No stock movements match current filters.</p>
                      </div>
                    ) : (
                      filteredActivities.map((act) => (
                        <div
                          key={act.id}
                          className={`activity-item-card ${
                            act.type === 'IN'
                              ? 'item-in'
                              : act.type === 'OUT'
                              ? 'item-out'
                              : 'item-adjust'
                          }`}
                        >
                          <div className="activity-icon-badge">
                            {act.type === 'IN' ? (
                              <IconArrowIn size={16} />
                            ) : act.type === 'OUT' ? (
                              <IconArrowOut size={16} />
                            ) : (
                              <IconAdjust size={16} />
                            )}
                          </div>

                          <div className="activity-details">
                            <div className="activity-top-line">
                              <span className="activity-ref">{act.reference}</span>
                              <span className="activity-time">{act.time}</span>
                            </div>
                            <div className="activity-mid-line">
                              <span className="activity-product-title">{act.product}</span>
                              <span className={`activity-qty ${act.type === 'IN' ? 'qty-in' : 'qty-out'}`}>
                                {act.qty}
                              </span>
                            </div>
                            <div className="activity-bot-line">
                              <span className="activity-contact">{act.contact}</span>
                              <StatusBadge status={act.status} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* Sub-Views when clicking Sidebar Tabs */}
          {activeTab === 'products' && (
            <div className="view-container">
              <ProductList />
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="view-container">
              <ReceiptsList />
            </div>
          )}

          {activeTab === 'deliveries' && (
            <div className="view-container">
              <DeliveryList />
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h1 className="page-heading">Stock Ledger & Move History</h1>
                  <p className="page-subheading">Immutable chronological record of all product arrivals, departures, and count adjustments.</p>
                </div>
              </div>

              <div className="data-table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Product</th>
                      <th>Quantity Delta</th>
                      <th>Location</th>
                      <th>Contact / Source</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={a.id} className={a.type === 'IN' ? 'row-in' : a.type === 'OUT' ? 'row-out' : ''}>
                        <td>
                          <span className={`type-tag ${a.type.toLowerCase()}`}>{a.type}</span>
                        </td>
                        <td><span className="code-pill">{a.reference}</span></td>
                        <td className="font-semibold">{a.product}</td>
                        <td className={a.type === 'IN' ? 'text-green' : 'text-red'}>{a.qty}</td>
                        <td>{a.location}</td>
                        <td>{a.contact}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'warehouses' && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h1 className="page-heading">Warehouses & Storage Facilities</h1>
                  <p className="page-subheading">Configure multi-warehouse storage units, short codes, and internal locations.</p>
                </div>
              </div>

              <div className="warehouse-grid">
                {warehouses.map((wh) => (
                  <div key={wh.id} className="warehouse-card">
                    <div className="wh-header">
                      <IconWarehouse size={22} className="text-purple" />
                      <span className="wh-code">{wh.code}</span>
                    </div>
                    <h3>{wh.name}</h3>
                    <p className="wh-location">{wh.location}</p>
                    <div className="wh-stats">
                      <span>Status: <strong className="text-green">Active</strong></span>
                      <span>Bins: <strong>24</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'transfers' || activeTab === 'adjustments' || activeTab === 'settings') && (
            <div className="view-container">
              <div className="view-header">
                <div>
                  <h1 className="page-heading" style={{ textTransform: 'capitalize' }}>{activeTab}</h1>
                  <p className="page-subheading">Configured for active warehouse operations.</p>
                </div>
              </div>
              <div className="empty-module-card">
                <IconAdjust size={36} className="text-purple" />
                <h3>{activeTab.toUpperCase()} Module Ready</h3>
                <p>This module UI shell is active and ready to link with backend migration controllers.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Interactive Creation Modals */}
      <CreateDeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        onCreated={(newDelivery) => {
          loadDashboardData();
          setIsDeliveryModalOpen(false);
          if (newDelivery && newDelivery.id) {
            navigate(`/deliveries/${newDelivery.id}`);
          }
        }}
      />

      <CreateProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onCreated={() => {
          loadDashboardData();
          setIsProductModalOpen(false);
          handleSelectTab('products');
        }}
      />
    </div>
  );
}
