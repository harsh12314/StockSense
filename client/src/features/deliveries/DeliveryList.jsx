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
  draft:    { label: 'Draft',     color: '#64748B', bg: 'rgba(100,116,139,0.08)', border: '#CBD5E1' },
  waiting:  { label: 'Waiting',   color: '#D97706', bg: '#FEF3C7',                 border: '#FCD34D' },
  ready:    { label: 'Ready',     color: '#2563EB', bg: '#EBF3FC',                 border: '#BFDBFE' },
  done:     { label: 'Done',      color: '#16A34A', bg: '#DCFCE7',                 border: '#86EFAC' },
  canceled: { label: 'Canceled',  color: '#DC2626', bg: '#FEE2E2',                 border: '#FCA5A5' },
};

function StatusPill({ status, size = 'md' }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  const paddings = size === 'sm' ? '3px 10px' : '4px 12px';
  const fsize = size === 'sm' ? '0.72rem' : '0.78rem';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: paddings,
      borderRadius: '9999px',
      backgroundColor: meta.bg,
      border: `1.5px solid ${meta.border}`,
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
        backgroundColor: '#FFFFFF',
        border: active ? '1.5px solid #4A90E2' : '1px solid #EDF2F7',
        borderRadius: '18px',
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0,
        boxShadow: active
          ? '0 4px 16px rgba(74,144,226,0.12)'
          : '0 2px 12px rgba(0,0,0,0.04)',
      }}
      onMouseOver={e => {
        if (!active) {
          e.currentTarget.style.borderColor = '#CBD5E1';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
        }
      }}
      onMouseOut={e => {
        if (!active) {
          e.currentTarget.style.borderColor = '#EDF2F7';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>{label}</div>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          backgroundColor: accent || '#EBF3FC',
          color: color || '#4A90E2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{
        fontSize: '2rem',
        fontWeight: 800,
        color: '#0F172A',
        lineHeight: 1.1,
      }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>{sub}</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              backgroundColor: '#EBF3FC',
              border: '1px solid #BFDBFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A90E2',
            }}>
              <Truck size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Delivery Orders
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748B' }}>
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
              backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1',
              color: '#334155', padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
              fontSize: '0.84rem', fontWeight: 600, transition: 'all 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseOver={e => {
              e.currentTarget.style.color = '#0F172A';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = '#334155';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#4A90E2',
              color: '#fff', border: '1px solid #4A90E2', padding: '9px 18px',
              borderRadius: '10px', fontWeight: 600, fontSize: '0.84rem',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(74,144,226,0.25)',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.backgroundColor = '#3B7DC4';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,226,0.35)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.backgroundColor = '#4A90E2';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,144,226,0.25)';
            }}
          >
            <Plus size={16} /> New Delivery Order
          </button>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard
          label="To Deliver"
          value={stats.to_deliver_count ?? deliveries.filter(d => ['draft','waiting','ready'].includes(d.status)).length}
          sub="Active outgoing orders"
          color="#4A90E2"
          accent="#EBF3FC"
          icon={Boxes}
          onClick={() => setStatusFilter('all')}
          active={statusFilter === 'all'}
        />
        <KpiCard
          label="Ready to Ship"
          value={readyCount}
          sub="Pick & pack verified"
          color="#2563EB"
          accent="#EBF3FC"
          icon={PackageCheck}
          onClick={() => setStatusFilter('ready')}
          active={statusFilter === 'ready'}
        />
        <KpiCard
          label="Waiting Stock"
          value={stats.waiting_count ?? 0}
          sub="Awaiting inventory"
          color="#D97706"
          accent="#FEF3C7"
          icon={Timer}
          onClick={() => setStatusFilter('waiting')}
          active={statusFilter === 'waiting'}
        />
        <KpiCard
          label="Late Orders"
          value={stats.late_count ?? 0}
          sub="Schedule date passed"
          color="#DC2626"
          accent="#FEE2E2"
          icon={AlertTriangle}
          onClick={() => setStatusFilter('all')}
          active={false}
        />
        <KpiCard
          label="Completed"
          value={stats.done_count ?? deliveries.filter(d => d.status === 'done').length}
          sub="Stock already deducted"
          color="#16A34A"
          accent="#DCFCE7"
          icon={CheckCircle2}
          onClick={() => setStatusFilter('done')}
          active={statusFilter === 'done'}
        />
      </div>

      {/* ── Controls Bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap',
        backgroundColor: '#FFFFFF', border: '1px solid #EDF2F7',
        borderRadius: '14px', padding: '14px 18px', marginBottom: '20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#F8FAFD', border: '1px solid #CBD5E1',
          borderRadius: '8px', padding: '8px 14px', flex: 1, minWidth: '220px', maxWidth: '380px',
        }}>
          <Search size={15} color="#64748B" />
          <input
            type="text"
            placeholder="Search reference, contact, address..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#0F172A', fontSize: '0.85rem', width: '100%', outline: 'none' }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
              <XCircle size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'draft', 'waiting', 'ready', 'done', 'canceled'].map(st => {
            const isActive = statusFilter === st;
            const meta = STATUS_META[st] || { label: 'All Orders', color: '#4A90E2', bg: '#EBF3FC', border: '#4A90E2' };
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                  backgroundColor: isActive ? meta.bg : '#F8FAFD',
                  border: `1.5px solid ${isActive ? meta.border : '#CBD5E1'}`,
                  color: isActive ? meta.color : '#475569',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
                onMouseOver={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#0F172A';
                    e.currentTarget.style.borderColor = '#94A3B8';
                  }
                }}
                onMouseOut={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F8FAFD';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.borderColor = '#CBD5E1';
                  }
                }}
              >
                {st === 'all' ? 'All Orders' : meta.label || st}
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #CBD5E1', marginLeft: 'auto', backgroundColor: '#F8FAFD' }}>
          {[['list', LayoutList], ['kanban', Columns3]].map(([mode, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              title={`${mode} view`}
              style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                backgroundColor: viewMode === mode ? '#EBF3FC' : 'transparent',
                color: viewMode === mode ? '#4A90E2' : '#64748B',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '70px 0', color: '#64748B' }}>
          <div style={{
            display: 'inline-block', width: '32px', height: '32px',
            border: '3px solid #EDF2F7',
            borderTopColor: '#4A90E2', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ marginTop: '14px', fontSize: '0.875rem' }}>Loading delivery orders...</p>
        </div>

      ) : error ? (
        <div style={{
          padding: '20px 24px', backgroundColor: '#FEE2E2',
          border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626',
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
          textAlign: 'center', padding: '64px 24px',
          backgroundColor: '#FFFFFF', border: '1.5px dashed #CBD5E1',
          borderRadius: '18px', color: '#64748B',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            backgroundColor: '#EBF3FC', border: '1px solid #BFDBFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: '#4A90E2',
          }}>
            <Truck size={26} />
          </div>
          <h3 style={{ color: '#0F172A', margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800 }}>
            No delivery orders found
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 24px', color: '#64748B' }}>
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
                  padding: '9px 18px', borderRadius: '10px', border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF', color: '#334155', cursor: 'pointer', fontSize: '0.85rem',
                  fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              style={{
                padding: '9px 20px', borderRadius: '10px', border: '1px solid #4A90E2',
                background: '#4A90E2',
                color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 8px rgba(74,144,226,0.25)',
              }}
            >
              <Plus size={15} /> Create Delivery Order
            </button>
          </div>
        </div>

      ) : viewMode === 'list' ? (
        /* ── LIST TABLE ─────────────────────────────────────────────── */
        <div style={{
          backgroundColor: '#FFFFFF', border: '1px solid #EDF2F7',
          borderRadius: '18px', overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          {/* Toolbar */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #EDF2F7',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#F8FAFD',
          }}>
            <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
              Showing <strong style={{ color: '#0F172A' }}>{filteredDeliveries.length}</strong> order{filteredDeliveries.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && <span style={{ color: STATUS_META[statusFilter]?.color || '#4A90E2', fontWeight: 700 }}> — {statusFilter}</span>}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EDF2F7', backgroundColor: '#F8FAFD' }}>
                  {['Reference', 'Customer / Contact', 'From Location', 'Scheduled', 'Items', 'Status', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '14px 18px', textAlign: i === 6 ? 'right' : 'left',
                      color: '#64748B', fontSize: '0.72rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((item) => {
                  const late = isLate(item.schedule_date, item.status);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/deliveries/${item.id}`)}
                      style={{
                        cursor: 'pointer', transition: 'background-color 0.12s',
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: 'transparent',
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFD'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Reference */}
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                            backgroundColor: item.status === 'done'
                              ? '#DCFCE7' : item.status === 'ready'
                              ? '#EBF3FC' : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: item.status === 'done' ? '#16A34A' : item.status === 'ready' ? '#4A90E2' : '#64748B',
                          }}>
                            <Truck size={17} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                              {item.reference}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                              {item.operation_type || 'Delivery Orders'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.to_contact || '—'}
                        </div>
                        {item.delivery_address && (
                          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '3px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={11} style={{ marginRight: '3px', verticalAlign: 'middle', color: '#94A3B8' }} />
                            {item.delivery_address}
                          </div>
                        )}
                      </td>

                      {/* From Location */}
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>
                          {item.from_location_name || 'Stock Room'}
                        </div>
                        {item.from_location_code && (
                          <code style={{
                            fontSize: '0.72rem', color: '#4A90E2', backgroundColor: '#EBF3FC',
                            padding: '2px 6px', borderRadius: '4px', marginTop: '3px', display: 'inline-block',
                            fontFamily: 'monospace', fontWeight: 700,
                          }}>
                            {item.from_location_code}
                          </code>
                        )}
                      </td>

                      {/* Scheduled Date */}
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        {item.schedule_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {late ? (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                color: '#DC2626', fontWeight: 700,
                                backgroundColor: '#FEE2E2',
                                border: '1px solid #FECACA',
                                padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem',
                              }}>
                                <AlertTriangle size={12} />
                                {item.schedule_date.split('T')[0]} LATE
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '0.82rem', fontWeight: 500 }}>
                                <Calendar size={13} color="#94A3B8" />
                                {item.schedule_date.split('T')[0]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Items */}
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '9999px',
                          backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0',
                          color: '#475569', fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          <Package size={12} color="#64748B" />
                          {item.line_count ?? 0} item{(item.line_count ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 18px' }}>
                        <StatusPill status={item.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); navigate(`/deliveries/${item.id}`); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 12px', borderRadius: '8px', border: '1px solid #BFDBFE',
                            backgroundColor: '#EBF3FC', color: '#4A90E2',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                            transition: 'all 0.15s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#4A90E2'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#4A90E2'; }}
                          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#EBF3FC'; e.currentTarget.style.color = '#4A90E2'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
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
                backgroundColor: '#FFFFFF', border: '1px solid #EDF2F7',
                borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}>
                {/* Column Header */}
                <div style={{
                  padding: '14px 18px', borderBottom: '1px solid #EDF2F7',
                  backgroundColor: `${meta.bg}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {meta.label}
                  </span>
                  <span style={{
                    backgroundColor: '#FFFFFF', border: `1.5px solid ${meta.border}`,
                    color: meta.color, borderRadius: '9999px', padding: '2px 8px',
                    fontSize: '0.72rem', fontWeight: 800,
                  }}>
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px', backgroundColor: '#F8FAFD' }}>
                  {colItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 10px', color: '#94A3B8', fontSize: '0.82rem' }}>
                      No {col} orders
                    </div>
                  ) : colItems.map(item => {
                    const late = isLate(item.schedule_date, item.status);
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/deliveries/${item.id}`)}
                        style={{
                          backgroundColor: '#FFFFFF', border: '1px solid #EDF2F7',
                          borderRadius: '12px', padding: '14px', cursor: 'pointer',
                          transition: 'all 0.15s', borderLeft: `3.5px solid ${meta.color}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                        }}
                      >
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#4A90E2', marginBottom: '6px' }}>
                          {item.reference}
                        </div>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.88rem', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.to_contact || 'Customer'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748B' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Package size={12} color="#64748B" />
                            {item.line_count ?? 0} items
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: late ? '#DC2626' : '#64748B', fontWeight: late ? 700 : 500 }}>
                            {late && <AlertTriangle size={11} />}
                            <Calendar size={12} color={late ? '#DC2626' : '#94A3B8'} />
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
