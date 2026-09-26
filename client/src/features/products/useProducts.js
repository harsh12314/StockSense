// client/src/features/products/useProducts.js
import { useState, useEffect, useCallback } from 'react';
import { productsApi } from '../../api/products';

export function useProducts() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const data = await productsApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search)         params.search = search;
      if (filterCategory) params.category_id = filterCategory;
      const data = await productsApi.getProducts(params);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); },  [fetchProducts]);

  const createProduct = async (formData) => {
    const created = await productsApi.createProduct(formData);
    setProducts((prev) => [...prev, created]);
    return created;
  };

  const updateProduct = async (id, formData) => {
    const updated = await productsApi.updateProduct(id, formData);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProduct = async (id) => {
    await productsApi.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const createCategory = async (name) => {
    const cat = await productsApi.createCategory(name);
    setCategories((prev) => [...prev, cat]);
    return cat;
  };

  return {
    products, categories, loading, error,
    search, setSearch,
    filterCategory, setFilterCategory,
    createProduct, updateProduct, deleteProduct,
    createCategory, refetch: fetchProducts,
  };
}
