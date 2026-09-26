// client/src/features/products/ProductsPage.jsx
import { useState } from 'react';
import { useProducts } from './useProducts';
import ProductForm from './ProductForm';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import styles from './ProductsPage.module.css';

function StockBadge({ qty, low = 10 }) {
  if (qty === 0) return <span className={styles.badgeOut}>Out of Stock</span>;
  if (qty <= low) return <span className={styles.badgeLow}>{qty} (Low)</span>;
  return <span className={styles.badgeOk}>{qty}</span>;
}

export default function ProductsPage() {
  const {
    products, categories, loading, error,
    search, setSearch,
    filterCategory, setFilterCategory,
    createProduct, updateProduct, deleteProduct,
    createCategory,
  } = useProducts();

  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  function openCreate() { setEditTarget(null); setShowForm(true); }
  function openEdit(p)  { setEditTarget(p);    setShowForm(true); }
  function closeForm()  { setShowForm(false); setEditTarget(null); }

  async function handleSave(data) {
    if (editTarget) {
      await updateProduct(editTarget.id, data);
    } else {
      await createProduct(data);
    }
  }
  // Attach createCategory to the save fn so ProductForm can call it
  handleSave._createCategory = createCategory;

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const totalProducts = products.length;
  const outOfStock    = products.filter((p) => Number(p.on_hand_qty) === 0).length;
  const lowStock      = products.filter((p) => Number(p.on_hand_qty) > 0 && Number(p.on_hand_qty) <= 10).length;

  return (
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>Manage your product catalog and stock levels</p>
        </div>
        <Button onClick={openCreate}>+ New Product</Button>
      </div>

      {/* ── KPI Strip ── */}
      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>{totalProducts}</span>
          <span className={styles.kpiLabel}>Total Products</span>
        </div>
        <div className={`${styles.kpi} ${styles.kpiWarn}`}>
          <span className={styles.kpiValue}>{lowStock}</span>
          <span className={styles.kpiLabel}>Low Stock</span>
        </div>
        <div className={`${styles.kpi} ${styles.kpiDanger}`}>
          <span className={styles.kpiValue}>{outOfStock}</span>
          <span className={styles.kpiLabel}>Out of Stock</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <FormField.Input
          className={styles.searchInput}
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormField.Select
          className={styles.catFilter}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </FormField.Select>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.empty}>Loading products…</div>
        ) : error ? (
          <div className={styles.errorMsg}>{error}</div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            {search || filterCategory ? 'No products match your filters.' : 'No products yet. Click "+ New Product" to get started.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Per Unit Cost</th>
                <th>On Hand</th>
                <th>Free to Use</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={Number(p.on_hand_qty) === 0 ? styles.rowOutOfStock : ''}>
                  <td className={styles.productName}>{p.name}</td>
                  <td><code className={styles.sku}>{p.sku}</code></td>
                  <td>{p.category_name ?? <span className={styles.muted}>—</span>}</td>
                  <td>{p.unit_of_measure ?? <span className={styles.muted}>—</span>}</td>
                  <td>₹{Number(p.per_unit_cost).toFixed(2)}</td>
                  <td><StockBadge qty={Number(p.on_hand_qty)} /></td>
                  <td>{Number(p.free_to_use_qty)}</td>
                  <td>
                    <div className={styles.actions}>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(p)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Product Form Modal ── */}
      {showForm && (
        <ProductForm
          product={editTarget}
          categories={categories}
          locations={[]}         /* pass locations from a useLocations hook when available */
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className={styles.overlay}>
          <div className={styles.confirmBox}>
            <h3>Delete Product?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              This cannot be undone.
            </p>
            {Number(deleteConfirm.on_hand_qty) > 0 && (
              <p className={styles.deleteWarn}>
                ⚠ This product has {deleteConfirm.on_hand_qty} units in stock.
              </p>
            )}
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
