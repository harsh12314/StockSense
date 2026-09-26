import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  LayoutList,
  Kanban,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  ChevronRight,
  ArrowRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { get, post } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import CreateDeliveryModal from './CreateDeliveryModal';

export default function DeliveryList() {
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    total_count: 0,
    to_deliver_count: 0,
    waiting_count: 0,
    late_count: 0,
    done_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Views
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, [statusFilter]);

  async function loadDeliveries() {
    setLoading(true);
    setError(null);
    try {
      let query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [listRes, statsRes] = await Promise.all([
        get(`/deliveries${query}`).catch(() => ({ success: true, data: [] })),
        get('/deliveries/stats').catch(() => ({ success: true, data: {} })),
      ]);

      setDeliveries(listRes.data || []);
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Quick seed a demo order for 10 chairs matching user's exact prompt
  async function seedQuickDemo() {
    try {
      setLoading(true);
      const res = await post('/deliveries', {
        from_location_id: 1, // Stock Room
        to_contact: 'Acme Furnishings Inc.',
        delivery_address: 'Warehouse Hub 4, Cyber Towers, Hyderabad',
        schedule_date: new Date().toISOString().split('T')[0],
        operation_type: 'Delivery Orders',
      });

      const newOrder = res.data;
      // Add line: 10 Office Chairs (Product ID 1)
      await post(`/deliveries/${newOrder.id}/lines`, {
        product_id: 1,
        quantity: 10,
      });

      await loadDeliveries();
      navigate(`/deliveries/${newOrder.id}`);
    } catch (err) {
      alert(`Could not create demo order: ${err.message}`);
      setLoading(false);
    }
  }

  // Filter deliveries by search term (Reference or Contact)
  const filteredDeliveries = deliveries.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const refMatch = item.reference?.toLowerCase().includes(term);
    const contactMatch = item.to_contact?.toLowerCase().includes(term);
    const destMatch = item.delivery_address?.toLowerCase().includes(term);
    return refMatch || contactMatch || destMatch;
  });

  const isOrderLate = (dateStr, status) => {
    if (!dateStr || status === 'done' || status === 'canceled') return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div>
      {/* Page Title & Main Actions */}
      <div className="page-header">
        <div>
          <h2>Delivery Orders (Outgoing Goods)</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Process outgoing customer shipments: <strong>1. Pick</strong> → <strong>2. Pack</strong> → <strong>3. Validate</strong> (auto-decreases stock)
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={seedQuickDemo}
            title="Creates a sample order for 10 Chairs as specified in the prompt"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={16} color="#3b82f6" />
            <span>Sample: 10 Chairs Order</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>New Delivery</span>
          </button>
        </div>
      </div>

      {/* KPI Cards / Statistics */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">To Deliver</div>
          <div className="kpi-value">{stats.to_deliver_count ?? deliveries.filter(d => ['draft','waiting','ready'].includes(d.status)).length}</div>
          <div className="kpi-subtitle">Active outgoing shipments</div>
        </div>

        <div className="kpi-card" onClick={() => setStatusFilter('waiting')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title" style={{ color: 'var(--status-waiting)' }}>Waiting Stock</div>
          <div className="kpi-value" style={{ color: 'var(--status-waiting)' }}>{stats.waiting_count ?? 0}</div>
          <div className="kpi-subtitle">Items out of stock</div>
        </div>

        <div className="kpi-card" onClick={() => setStatusFilter('ready')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title" style={{ color: 'var(--status-ready)' }}>Ready to Ship</div>
          <div className="kpi-value" style={{ color: 'var(--status-ready)' }}>{deliveries.filter(d => d.status === 'ready').length}</div>
          <div className="kpi-subtitle">Pick & pack verified</div>
        </div>

        <div className="kpi-card" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title" style={{ color: 'var(--color-danger)' }}>Late Operations</div>
          <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{stats.late_count ?? 0}</div>
          <div className="kpi-subtitle">Schedule date passed</div>
        </div>

        <div className="kpi-card" onClick={() => setStatusFilter('done')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title" style={{ color: 'var(--status-done)' }}>Completed / Shipped</div>
          <div className="kpi-value" style={{ color: 'var(--status-done)' }}>{stats.done_count ?? deliveries.filter(d => d.status === 'done').length}</div>
          <div className="kpi-subtitle">Stock already deducted</div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and View Switcher */}
      <div className="table-controls" style={{ marginTop: '24px' }}>
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Reference (WH/OUT/...) or Contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '2px' }}>
          {['all', 'draft', 'waiting', 'ready', 'done', 'canceled'].map((st) => (
            <button
              key={st}
              type="button"
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(st)}
              style={{ textTransform: 'capitalize' }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: List vs Kanban */}
        <div className="view-toggle">
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <LayoutList size={16} />
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
            title="Kanban View"
          >
            <Kanban size={16} />
          </button>
        </div>
      </div>

      {/* Main Content: Table or Kanban */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '0.875rem' }}>Loading delivery orders...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginTop: '16px' }}>
          <div style={{ fontWeight: 600 }}>Error loading deliveries</div>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{error}</p>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', marginTop: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Truck size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>No delivery orders found</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '400px', margin: '8px auto 20px' }}>
            {searchTerm || statusFilter !== 'all'
              ? 'No deliveries match the selected filters. Try clearing filters.'
              : 'Create a new outgoing shipment or use the sample 10 chairs order button.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button type="button" className="btn btn-primary" onClick={seedQuickDemo}>
              <Sparkles size={16} /> Seed Sample 10 Chairs Order
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} /> Create Delivery
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ── List View (Dense Table) ── */
        <div className="data-table-wrapper" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>From Location</th>
                <th>To / Customer</th>
                <th>Destination Address</th>
                <th>Schedule Date</th>
                <th>Lines</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((item) => {
                const late = isOrderLate(item.schedule_date, item.status);
                return (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/deliveries/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="cell-reference">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={16} color="var(--color-primary)" />
                        <span>{item.reference}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>
                        {item.from_location_name || 'Stock Room'}
                      </span>
                      {item.from_location_code && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>
                          ({item.from_location_code})
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        {item.to_contact || '—'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {item.delivery_address || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: late ? 'var(--color-danger)' : '#475569', fontWeight: late ? 700 : 400 }}>
                        {item.schedule_date ? item.schedule_date.split('T')[0] : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        background: '#f1f5f9',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#475569'
                      }}>
                        {item.line_count ?? 1} items
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.status} isLate={late} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/deliveries/${item.id}`);
                        }}
                      >
                        Process <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Kanban View ── */
        <div className="kanban-board" style={{ marginTop: '16px' }}>
          {['draft', 'waiting', 'ready', 'done'].map((columnStatus) => {
            const columnItems = filteredDeliveries.filter((d) => d.status === columnStatus);
            return (
              <div key={columnStatus} className="kanban-column">
                <div className="kanban-column-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={columnStatus} />
                  </div>
                  <span className="count">{columnItems.length}</span>
                </div>

                <div className="kanban-cards">
                  {columnItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No {columnStatus} orders
                    </div>
                  ) : (
                    columnItems.map((item) => (
                      <div
                        key={item.id}
                        className="kanban-card"
                        onClick={() => navigate(`/deliveries/${item.id}`)}
                      >
                        <div className="kanban-card-title">{item.reference}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                          {item.to_contact || 'Customer Order'}
                        </div>
                        <div className="kanban-card-meta">
                          <span>From: {item.from_location_code || 'STOCK1'}</span>
                          <span>{item.schedule_date ? item.schedule_date.split('T')[0] : 'No date'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Delivery Modal */}
      <CreateDeliveryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newDelivery) => {
          loadDeliveries();
          navigate(`/deliveries/${newDelivery.id}`);
        }}
      />
    </div>
  );
}
