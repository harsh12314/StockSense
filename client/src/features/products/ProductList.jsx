import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  AlertTriangle,
  CheckCircle,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  LayoutList,
  Filter,
} from 'lucide-react';
import { get, post, put, del } from '../../api/client';
import CreateProductModal from './CreateProductModal';

/* ── tiny inline-edit cell ── */
function InlineStockCell({ productId, initialQty, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(initialQty));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  async function save() {
    const newQty = parseInt(val, 10);
    if (isNaN(newQty) || newQty === initialQty) { setEditing(false); return; }
    setSaving(true);
    try {
      await put(`/products/${productId}/stock`, { on_hand_qty: newQty });
      onSaved(productId, newQty);
    } catch (err) {
      alert(`Stock update failed: ${err.message}`);
      setVal(String(initialQty));
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          style={{
            width: '72px',
            padding: '4px 8px',
            background: 'var(--bg-parchment-warm)',
            border: '1px solid var(--customs-navy)',
            borderRadius: '4px',
            color: 'var(--ink-primary)',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
          }}
        />
        {saving && <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>saving…</span>}
      </div>
    );
  }

  const isLow = initialQty <= 5;
  const isOut = initialQty === 0;
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit on-hand quantity"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '3px 8px',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: isOut
          ? 'var(--stamp-vermilion)'
          : isLow
          ? 'var(--wax-amber)'
          : 'var(--merchant-green)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
    >
      {isOut && <AlertTriangle size={12} />}
      {initialQty}
      <Pencil size={10} style={{ opacity: 0.4 }} />
    </button>
  );
}

/* ── main component ── */
export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => { load(); }, [categoryFilter, lowStockOnly]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (lowStockOnly) params.set('low_stock', '1');
      const qs = params.toString() ? `?${params}` : '';
      const [prodRes, catRes] = await Promise.all([
        get(`/products${qs}`).catch(() => ({ success: true, data: [] })),
        get('/products/categories').catch(() => ({ success: true, data: [] })),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleStockSaved(productId, newQty) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, on_hand_qty: newQty, free_to_use_qty: newQty } : p
      )
    );
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await del(`/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  /* ── client-side search + sort ── */
  const filtered = products
    .filter((p) => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.category_name || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.2 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: 'var(--customs-navy)' }} />
      : <ChevronDown size={12} style={{ color: 'var(--customs-navy)' }} />;
  }

  /* ── KPI counts ── */
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.on_hand_qty > 0 && p.on_hand_qty <= 5).length;
  const outOfStockCount = products.filter((p) => p.on_hand_qty === 0).length;
  const totalValue = products.reduce(
    (sum, p) => sum + (Number(p.per_unit_cost) || 0) * (Number(p.on_hand_qty) || 0),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-heading" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Products &amp; Stock Inventory
          </h1>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage catalogue, monitor reorder safety thresholds, and edit stock inline across storage zones.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            New Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Products</div>
          <div className="kpi-value">{totalProducts}</div>
          <div className="kpi-subtitle">In catalogue</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ color: 'var(--stamp-vermilion)' }}>Out of Stock</div>
          <div className="kpi-value" style={{ color: 'var(--stamp-vermilion)' }}>{outOfStockCount}</div>
          <div className="kpi-subtitle">Zero on-hand qty</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ color: 'var(--wax-amber)' }}>Low Stock</div>
          <div className="kpi-value" style={{ color: 'var(--wax-amber)' }}>{lowStockCount}</div>
          <div className="kpi-subtitle">≤ 5 units remaining</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title" style={{ color: 'var(--merchant-green)' }}>Stock Value</div>
          <div className="kpi-value" style={{ color: 'var(--merchant-green)', fontSize: '1.2rem' }}>
            ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="kpi-subtitle">Cost × on-hand</div>
        </div>
      </div>

      {/* Filters / Controls */}
      <div className="table-controls" style={{ marginTop: '24px', flexWrap: 'wrap', gap: '10px' }}>
        {/* Search */}
        <div className="search-bar" style={{ flex: '1 1 220px', minWidth: '200px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search name, SKU, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category dropdown */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--surface-sheet)',
            border: '1px solid var(--rule-border)',
            borderRadius: '6px',
            color: 'var(--ink-primary)',
            fontSize: '0.85rem',
            minWidth: '160px',
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Low-stock toggle */}
        <button
          type="button"
          className={`btn btn-sm ${lowStockOnly ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setLowStockOnly((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <AlertTriangle size={14} />
          Low Stock Only
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
          <div style={{
            display: 'inline-block', width: '28px', height: '28px',
            border: '3px solid var(--rule-border)', borderTopColor: 'var(--customs-navy)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ marginTop: '12px', fontSize: '0.875rem' }}>Loading products…</p>
        </div>
      ) : error ? (
        <div style={{
          padding: '20px', background: 'var(--stamp-vermilion-bg)',
          color: 'var(--stamp-vermilion)', borderRadius: '8px', marginTop: '16px',
          border: '1px solid rgba(248,113,113,0.15)',
        }}>
          <strong>Error loading products:</strong> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', marginTop: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'var(--customs-navy-bg)', color: 'var(--customs-navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Package size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
            {search || categoryFilter || lowStockOnly ? 'No products match your filters' : 'No products yet'}
          </h3>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.875rem', marginTop: '8px', maxWidth: '360px', margin: '8px auto 20px' }}>
            {search || categoryFilter || lowStockOnly
              ? 'Try clearing the filters.'
              : 'Create your first product to start tracking stock.'}
          </p>
          {!search && !categoryFilter && !lowStockOnly && (
            <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} /> Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="data-table-wrapper" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('name')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Product <SortIcon field="name" />
                  </span>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('sku')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    SKU / Code <SortIcon field="sku" />
                  </span>
                </th>
                <th>Category</th>
                <th>UoM</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                  onClick={() => toggleSort('per_unit_cost')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Per Unit Cost <SortIcon field="per_unit_cost" />
                  </span>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                  onClick={() => toggleSort('on_hand_qty')}
                  title="Click number in row to edit"
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    On Hand <SortIcon field="on_hand_qty" />
                  </span>
                </th>
                <th style={{ textAlign: 'center' }}>Free to Use</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const isOut = product.on_hand_qty === 0;
                const isLow = product.on_hand_qty > 0 && product.on_hand_qty <= 5;
                return (
                  <tr
                    key={product.id}
                    style={isOut ? { background: 'rgba(45,24,24,0.3)' } : undefined}
                  >
                    {/* Product name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '6px',
                          background: 'var(--customs-navy-bg)',
                          border: '1px solid rgba(147,197,253,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--customs-navy)', flexShrink: 0,
                        }}>
                          <Package size={14} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink-primary)', fontSize: '0.875rem' }}>
                            {product.name}
                          </div>
                          {isOut && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--stamp-vermilion)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={10} /> Out of stock
                            </div>
                          )}
                          {isLow && !isOut && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--wax-amber)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={10} /> Low stock
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--ink-secondary)',
                        padding: '2px 8px',
                        background: 'var(--rule-subtle)',
                        borderRadius: '4px',
                        border: '1px solid var(--rule-border)',
                        letterSpacing: '0.04em',
                      }}>
                        {product.sku}
                      </span>
                    </td>

                    {/* Category */}
                    <td>
                      {product.category_name ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '0.78rem', padding: '2px 8px',
                          background: 'rgba(147,197,253,0.08)',
                          color: 'var(--customs-navy)',
                          borderRadius: '10px',
                          border: '1px solid rgba(147,197,253,0.15)',
                        }}>
                          <Tag size={10} />
                          {product.category_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>

                    {/* UoM */}
                    <td>
                      <span style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem' }}>
                        {product.unit_of_measure || '—'}
                      </span>
                    </td>

                    {/* Cost */}
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--ink-primary)', fontWeight: 500 }}>
                        {product.per_unit_cost != null
                          ? `₹${Number(product.per_unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </span>
                    </td>

                    {/* On Hand — inline editable */}
                    <td style={{ textAlign: 'center' }}>
                      <InlineStockCell
                        productId={product.id}
                        initialQty={Number(product.on_hand_qty) || 0}
                        onSaved={handleStockSaved}
                      />
                    </td>

                    {/* Free to use */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
                        {Number(product.free_to_use_qty) || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDelete(product)}
                          title="Delete product"
                          style={{ color: 'var(--stamp-vermilion)', borderColor: 'rgba(248,113,113,0.2)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', color: 'var(--ink-muted)', fontSize: '0.75rem', borderTop: '1px solid var(--rule-border)' }}>
            Showing {filtered.length} of {products.length} products
          </div>
        </div>
      )}

      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newProduct) => {
          setProducts((prev) => [...prev, newProduct]);
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
}
