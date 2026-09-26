import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  LayoutList,
  Columns3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  ChevronRight,
  RefreshCw,
  MapPin,
  Calendar,
  User,
  Package,
  ArrowRight,
  XCircle,
  Timer,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Boxes
} from 'lucide-react';
import { get, post } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import CreateDeliveryModal from './CreateDeliveryModal';

const STATUS_META = {
  draft:    { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
  waiting:  { label: 'Waiting',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  ready:    { label: 'Ready',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)'  },
  done:     { label: 'Done',      color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)'  },
  canceled: { label: 'Canceled',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
};

function StatusPill({ status, size = 'md' }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  const paddings = size === 'sm' ? '2px 8px' : '4px 12px';
  const fsize = size === 'sm' ? '0.72rem' : '0.78rem';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: paddings,
      borderRadius: '99px',
      backgroundColor: meta.bg,
      border: `1px solid ${meta.border}`,
      color: meta.color,
      fontSize: fsize,
      fontWeight: 700,
      letterSpacing: '0.02em',
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: meta.color,
        display: 'inline-block',
        flexShrink: 0,
      }} />
      {meta.label}
    </span>
  );
}

function KpiCard({ label, value, sub, color, accent, icon: Icon, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: active ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.55)',
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: 0,
      }}
      onMouseOver={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
      onMouseOut={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>{label}</div>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          backgroundColor: accent || 'rgba(99,102,241,0.15)',
          color: color || '#818cf8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} />
        </div>
      </div>
      <div style={{
        fontSize: '1.75rem',
        fontWeight: 800,
        color: color || '#f8fafc',
        lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub}</div>
    </div>
  );
}

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => { loadDeliveries(); }, [statusFilter]);

  async function loadDeliveries(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [listRes, statsRes] = await Promise.all([
        get(`/deliveries${query}`).catch(() => ({ success: true, data: [] })),
        get('/deliveries/stats').catch(() => ({ success: true, data: {} })),
      ]);
      setDeliveries(listRes.data || []);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const isLate = (dateStr, status) => {
    if (!dateStr || status === 'done' || status === 'canceled') return false;
    return new Date(dateStr) < new Date(new Date().toDateString());
  };

  const filteredDeliveries = useMemo(() => {
    if (!searchTerm.trim()) return deliveries;
    const q = searchTerm.toLowerCase();
    return deliveries.filter(d =>
      d.reference?.toLowerCase().includes(q) ||
      d.to_contact?.toLowerCase().includes(q) ||
      d.delivery_address?.toLowerCase().includes(q) ||
      d.from_location_name?.toLowerCase().includes(q)
    );
  }, [deliveries, searchTerm]);

  const readyCount = deliveries.filter(d => d.status === 'ready').length;
  const draftCount = deliveries.filter(d => d.status === 'draft').length;

  return (
    <div style={{ width: '100%' }}>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '24px', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.25))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
            }}>
              <Truck size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Delivery Orders
              </h1>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', marginTop: '1px' }}>
                Pick → Pack → Validate — automatic stock deduction on dispatch
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => loadDeliveries(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.color = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', border: 'none', padding: '9px 18px',
              borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.45)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'; }}
          >
            <Plus size={16} /> New Delivery Order
          </button>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <KpiCard
          label="To Deliver"
          value={stats.to_deliver_count ?? deliveries.filter(d => ['draft','waiting','ready'].includes(d.status)).length}
          sub="Active outgoing orders"
          color="#818cf8"
          accent="rgba(99,102,241,0.15)"
          icon={Boxes}
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
        <KpiCard
          label="Ready to Ship"
          value={readyCount}
          sub="Pick & pack verified"
          color="#38bdf8"
          accent="rgba(14,165,233,0.15)"
          icon={PackageCheck}
          onClick={() => setStatusFilter('ready')}
          active={statusFilter === 'ready'}
        />
        <KpiCard
          label="Waiting Stock"
          value={stats.waiting_count ?? 0}
          sub="Awaiting inventory"
          color="#f59e0b"
          accent="rgba(245,158,11,0.15)"
          icon={Timer}
          onClick={() => setStatusFilter('waiting')}
          active={statusFilter === 'waiting'}
        />
        <KpiCard
          label="Late Orders"
          value={stats.late_count ?? 0}
          sub="Schedule date passed"
          color="#f87171"
          accent="rgba(239,68,68,0.15)"
          icon={AlertTriangle}
          onClick={() => setStatusFilter('all')}
          active={false}
        />
        <KpiCard
          label="Completed"
          value={stats.done_count ?? deliveries.filter(d => d.status === 'done').length}
          sub="Stock already deducted"
          color="#34d399"
          accent="rgba(16,185,129,0.15)"
          icon={CheckCircle2}
          onClick={() => setStatusFilter('done')}
          active={statusFilter === 'done'}
        />
      </div>

      {/* ── Controls Bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
        backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', padding: '7px 14px', flex: 1, minWidth: '220px', maxWidth: '380px',
        }}>
          <Search size={15} color="#64748b" />
          <input
            type="text"
            placeholder="Search reference, contact, address..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.85rem', width: '100%', outline: 'none' }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
              <XCircle size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'draft', 'waiting', 'ready', 'done', 'canceled'].map(st => {
            const isActive = statusFilter === st;
            const meta = STATUS_META[st] || { color: '#94a3b8', bg: 'transparent', border: 'rgba(255,255,255,0.1)' };
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                  backgroundColor: isActive ? meta.bg : 'rgba(30,41,59,0.5)',
                  border: `1px solid ${isActive ? meta.border : 'rgba(255,255,255,0.08)'}`,
                  color: isActive ? meta.color : '#94a3b8',
                }}
              >
                {st === 'all' ? 'All Orders' : meta.label || st}
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginLeft: 'auto' }}>
          {[['list', LayoutList], ['kanban', Columns3]].map(([mode, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              title={`${mode} view`}
              style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer',
                backgroundColor: viewMode === mode ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.6)',
                color: viewMode === mode ? '#a5b4fc' : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '70px 0', color: '#64748b' }}>
          <div style={{
            display: 'inline-block', width: '32px', height: '32px',
            border: '3px solid rgba(255,255,255,0.08)',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ marginTop: '14px', fontSize: '0.875rem' }}>Loading delivery orders...</p>
        </div>

      ) : error ? (
        <div style={{
          padding: '20px 24px', backgroundColor: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#fca5a5',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <AlertCircle size={20} />
          <div>
            <div style={{ fontWeight: 700 }}>Failed to load delivery orders</div>
            <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>{error}</div>
          </div>
        </div>

      ) : filteredDeliveries.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          backgroundColor: 'rgba(15,23,42,0.35)', border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '16px', color: '#94a3b8',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: '#818cf8',
          }}>
            <Truck size={26} />
          </div>
          <h3 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
            No delivery orders found
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 20px' }}>
            {searchTerm || statusFilter !== 'all'
              ? 'No orders match your current filters. Try clearing filters.'
              : 'Start by creating a new outgoing delivery order.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Plus size={15} /> Create Delivery Order
            </button>
          </div>
        </div>

      ) : viewMode === 'list' ? (
        /* ── LIST TABLE ─────────────────────────────────────────────── */
        <div style={{
          backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', overflow: 'hidden',
        }}>
          {/* Toolbar */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: 'rgba(15,23,42,0.3)',
          }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
              Showing <strong style={{ color: '#f8fafc' }}>{filteredDeliveries.length}</strong> order{filteredDeliveries.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && <span style={{ color: STATUS_META[statusFilter]?.color || '#818cf8' }}> — {statusFilter}</span>}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Reference', 'Customer / Contact', 'From Location', 'Scheduled', 'Items', 'Status', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 16px', textAlign: i === 6 ? 'right' : 'left',
                      color: '#64748b', fontSize: '0.72rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((item, idx) => {
                  const late = isLate(item.schedule_date, item.status);
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/deliveries/${item.id}`)}
                      style={{
                        cursor: 'pointer', transition: 'background-color 0.12s',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        backgroundColor: isEven ? 'transparent' : 'rgba(255,255,255,0.015)',
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.06)'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = isEven ? 'transparent' : 'rgba(255,255,255,0.015)'}
                    >
                      {/* Reference */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                            backgroundColor: item.status === 'done'
                              ? 'rgba(16,185,129,0.12)' : item.status === 'ready'
                              ? 'rgba(59,130,246,0.12)' : 'rgba(99,102,241,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: item.status === 'done' ? '#34d399' : item.status === 'ready' ? '#60a5fa' : '#818cf8',
                          }}>
                            <Truck size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                              {item.reference}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                              {item.operation_type || 'Delivery Orders'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.to_contact || '—'}
                        </div>
                        {item.delivery_address && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                            {item.delivery_address}
                          </div>
                        )}
                      </td>

                      {/* From Location */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#cbd5e1' }}>
                          {item.from_location_name || 'Stock Room'}
                        </div>
                        {item.from_location_code && (
                          <code style={{
                            fontSize: '0.68rem', color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)',
                            padding: '1px 5px', borderRadius: '4px', marginTop: '2px', display: 'inline-block',
                          }}>
                            {item.from_location_code}
                          </code>
                        )}
                      </td>

                      {/* Scheduled Date */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        {item.schedule_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {late ? (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                color: '#f87171', fontWeight: 700,
                                backgroundColor: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem',
                              }}>
                                <AlertTriangle size={12} />
                                {item.schedule_date.split('T')[0]} LATE
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.82rem' }}>
                                <Calendar size={12} />
                                {item.schedule_date.split('T')[0]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Items */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '99px',
                          backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.08)',
                          color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          <Package size={12} />
                          {item.line_count ?? 0} item{(item.line_count ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <StatusPill status={item.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); navigate(`/deliveries/${item.id}`); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 12px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: 'rgba(30,41,59,0.7)', color: '#cbd5e1',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                            transition: 'all 0.15s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                          onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.7)'; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          {item.status === 'done' ? 'View' : 'Process'} <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        /* ── KANBAN BOARD ─────────────────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', minWidth: '900px', overflowX: 'auto' }}>
          {['draft', 'waiting', 'ready', 'done'].map(col => {
            const colItems = filteredDeliveries.filter(d => d.status === col);
            const meta = STATUS_META[col];
            return (
              <div key={col} style={{
                display: 'flex', flexDirection: 'column', gap: '0',
                backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', overflow: 'hidden',
              }}>
                {/* Column Header */}
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: `${meta.bg}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {meta.label}
                  </span>
                  <span style={{
                    backgroundColor: meta.bg, border: `1px solid ${meta.border}`,
                    color: meta.color, borderRadius: '99px', padding: '2px 8px',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px' }}>
                  {colItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#475569', fontSize: '0.8rem' }}>
                      No {col} orders
                    </div>
                  ) : colItems.map(item => {
                    const late = isLate(item.schedule_date, item.status);
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/deliveries/${item.id}`)}
                        style={{
                          backgroundColor: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '10px', padding: '13px 14px', cursor: 'pointer',
                          transition: 'all 0.15s', borderLeft: `3px solid ${meta.color}`,
                        }}
                        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.9)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(15,23,42,0.7)'; e.currentTarget.style.transform = ''; }}
                      >
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                          {item.reference}
                        </div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.875rem', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.to_contact || 'Customer'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Package size={11} />
                            {item.line_count ?? 0} items
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: late ? '#f87171' : '#64748b', fontWeight: late ? 700 : 400 }}>
                            {late && <AlertTriangle size={10} />}
                            <Calendar size={11} />
                            {item.schedule_date ? item.schedule_date.split('T')[0] : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
        onCreated={newDelivery => {
          loadDeliveries();
          navigate(`/deliveries/${newDelivery.id}`);
        }}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
