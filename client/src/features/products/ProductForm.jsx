// client/src/features/products/ProductForm.jsx
import { useState } from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import styles from './ProductForm.module.css';

const UNITS = ['Units', 'Kg', 'g', 'L', 'mL', 'Box', 'Piece', 'Dozen', 'Pack', 'Meter', 'cm'];

function validate(form) {
  const errors = {};
  if (!form.name.trim())   errors.name = 'Product name is required';
  if (!form.sku.trim())    errors.sku  = 'SKU is required';
  if (form.per_unit_cost && isNaN(Number(form.per_unit_cost)))
    errors.per_unit_cost = 'Must be a number';
  if (form.initial_stock && isNaN(Number(form.initial_stock)))
    errors.initial_stock = 'Must be a number';
  if (Number(form.initial_stock) > 0 && !form.location_id)
    errors.location_id = 'Select a location to record initial stock';
  return errors;
}

export default function ProductForm({ product, categories, locations = [], onSave, onClose }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name:          product?.name          ?? '',
    sku:           product?.sku           ?? '',
    category_id:   product?.category_id   ?? '',
    unit_of_measure: product?.unit_of_measure ?? '',
    per_unit_cost: product?.per_unit_cost  ?? '',
    initial_stock: '',   // only on create
    location_id:   '',
  });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [apiError, setApiError] = useState('');

  // For adding a new category inline
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setApiError('');
  }

  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    try {
      const payload = {
        name:            form.name.trim(),
        sku:             form.sku.trim(),
        category_id:     form.category_id || null,
        unit_of_measure: form.unit_of_measure || null,
        per_unit_cost:   Number(form.per_unit_cost) || 0,
      };
      if (!isEdit && Number(form.initial_stock) > 0) {
        payload.initial_stock = Number(form.initial_stock);
        payload.location_id   = form.location_id;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
      </Button>
    </>
  );

  return (
    <Modal title={isEdit ? 'Edit Product' : 'New Product'} onClose={onClose} footer={footer}>
      {apiError && <div className={styles.apiError}>{apiError}</div>}

      {/* Name */}
      <FormField label="Product Name" required error={errors.name}>
        <FormField.Input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Wireless Keyboard"
          error={errors.name}
          autoFocus
        />
      </FormField>

      {/* SKU */}
      <FormField label="SKU / Code" required error={errors.sku}
        hint="Unique identifier — auto-uppercased">
        <FormField.Input
          value={form.sku}
          onChange={(e) => set('sku', e.target.value.toUpperCase())}
          placeholder="e.g. KB-001"
          error={errors.sku}
        />
      </FormField>

      {/* Category */}
      <FormField label="Category" error={errors.category_id}>
        {addingCat ? (
          <div className={styles.newCatRow}>
            <FormField.Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category name"
              autoFocus
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!newCat.trim()) return;
                try {
                  const cat = await onSave._createCategory(newCat.trim());
                  set('category_id', String(cat.id));
                  setNewCat('');
                  setAddingCat(false);
                } catch (e) {
                  setApiError(e.message);
                }
              }}
            >Add</Button>
            <Button size="sm" variant="secondary" onClick={() => setAddingCat(false)}>×</Button>
          </div>
        ) : (
          <div className={styles.categoryRow}>
            <FormField.Select
              value={form.category_id}
              onChange={(e) => set('category_id', e.target.value)}
              error={errors.category_id}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </FormField.Select>
            <Button size="sm" variant="ghost" onClick={() => setAddingCat(true)}>+ New</Button>
          </div>
        )}
      </FormField>

      {/* Unit of Measure */}
      <FormField label="Unit of Measure">
        <FormField.Select
          value={form.unit_of_measure}
          onChange={(e) => set('unit_of_measure', e.target.value)}
        >
          <option value="">— Select —</option>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </FormField.Select>
      </FormField>

      {/* Per-unit cost */}
      <FormField label="Per Unit Cost (\u20b9)" error={errors.per_unit_cost}>
        <FormField.Input
          type="number"
          min="0"
          step="0.01"
          value={form.per_unit_cost}
          onChange={(e) => set('per_unit_cost', e.target.value)}
          placeholder="0.00"
          error={errors.per_unit_cost}
        />
      </FormField>

      {/* Initial Stock — only shown on Create */}
      {!isEdit && (
        <>
          <FormField label="Initial Stock (optional)" error={errors.initial_stock}
            hint="Quantity to record on first creation">
            <FormField.Input
              type="number"
              min="0"
              value={form.initial_stock}
              onChange={(e) => set('initial_stock', e.target.value)}
              placeholder="0"
              error={errors.initial_stock}
            />
          </FormField>

          {Number(form.initial_stock) > 0 && (
            <FormField label="Store initial stock at" required error={errors.location_id}>
              <FormField.Select
                value={form.location_id}
                onChange={(e) => set('location_id', e.target.value)}
                error={errors.location_id}
              >
                <option value="">— Select Location —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </FormField.Select>
            </FormField>
          )}
        </>
      )}
    </Modal>
  );
}
