import React, { useState, useEffect } from 'react';
import { X, Package, Tag, Ruler, DollarSign, Hash, Boxes, Plus } from 'lucide-react';
import { post, get } from '../../api/client';

const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'box', 'pack', 'set', 'pair', 'roll', 'm', 'ft'];

export default function CreateProductModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_of_measure: 'pcs',
    per_unit_cost: '',
    initial_stock: '',
  });
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setForm({ name: '', sku: '', category_id: '', unit_of_measure: 'pcs', per_unit_cost: '', initial_stock: '' });
      setErrors({});
      setSubmitError('');
      setShowNewCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

  async function loadCategories() {
    try {
      const res = await get('/products/categories');
      setCategories(res.data || []);
    } catch {
      setCategories([]);
    }
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.sku.trim()) errs.sku = 'SKU / Code is required';
    if (form.initial_stock && isNaN(Number(form.initial_stock))) errs.initial_stock = 'Must be a valid number';
    if (form.per_unit_cost && isNaN(Number(form.per_unit_cost))) errs.per_unit_cost = 'Must be a valid number';
    return errs;
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const res = await post('/products/categories', { name: newCategoryName.trim() });
      setCategories((prev) => [...prev, res.data]);
      setForm((prev) => ({ ...prev, category_id: String(res.data.id) }));
      setShowNewCategory(false);
      setNewCategoryName('');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setSubmitError('');
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category_id: form.category_id ? parseInt(form.category_id, 10) : undefined,
        unit_of_measure: form.unit_of_measure || undefined,
        per_unit_cost: form.per_unit_cost !== '' ? parseFloat(form.per_unit_cost) : 0,
        initial_stock: form.initial_stock !== '' ? parseInt(form.initial_stock, 10) : 0,
      };
      const res = await post('/products', payload);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create product.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: '540px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}>
              <Package size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                New Product
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0' }}>
                Add an item to your central inventory catalogue
              </p>
            </div>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ margin: 0 }}>
          <div className="modal-body">
            {submitError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                fontSize: '0.85rem',
              }}>
                {submitError}
              </div>
            )}

            {/* Product Name */}
            <div className="form-group">
              <label htmlFor="prod-name">
                <Package size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: '#3B82F6' }} />
                Product Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                id="prod-name"
                type="text"
                placeholder="e.g. Office Chair Pro"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                autoFocus
                required
              />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>

            {/* SKU / Code */}
            <div className="form-group">
              <label htmlFor="prod-sku">
                <Hash size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: '#3B82F6' }} />
                SKU / Code <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                id="prod-sku"
                type="text"
                placeholder="e.g. CHAIR-PRO-001"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                required
              />
              {errors.sku && <div className="field-error">{errors.sku}</div>}
            </div>

            {/* Category dropdown + New button */}
            <div className="form-group">
              <label htmlFor="prod-category">
                <Tag size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: '#3B82F6' }} />
                Category
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  id="prod-category"
                  value={form.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">— Select category —</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowNewCategory((v) => !v)}
                  title="Add new category"
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> New
                </button>
              </div>

              {showNewCategory && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleAddCategory}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Unit of Measure + Per Unit Cost */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label htmlFor="prod-uom">
                  <Ruler size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: '#3B82F6' }} />
                  Unit of Measure
                </label>
                <select
                  id="prod-uom"
                  value={form.unit_of_measure}
                  onChange={(e) => set('unit_of_measure', e.target.value)}
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prod-cost">
                  <DollarSign size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: '#3B82F6' }} />
                  Per Unit Cost (₹)
                </label>
                <input
                  id="prod-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.per_unit_cost}
                  onChange={(e) => set('per_unit_cost', e.target.value)}
                />
                {errors.per_unit_cost && <div className="field-error">{errors.per_unit_cost}</div>}
              </div>
            </div>

            {/* Initial Stock */}
            <div className="form-group">
              <label htmlFor="prod-stock">
                <Boxes size={13} style={{ marginRight: 4, verticalAlign: 'middle', color: '#3B82F6' }} />
                Initial Stock
                <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                step="1"
                placeholder="0 — leave blank to skip"
                value={form.initial_stock}
                onChange={(e) => set('initial_stock', e.target.value)}
              />
              {errors.initial_stock && <div className="field-error">{errors.initial_stock}</div>}
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                Will be automatically allocated to default warehouse storage and logged to Move History.
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: '120px' }}
            >
              {loading ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
