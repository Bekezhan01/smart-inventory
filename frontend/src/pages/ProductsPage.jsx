import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import api from '../services/api';
import {
  PageHeader, Button, Card, Table, Tr, Td, Badge,
  Modal, FormGroup, Spinner, EmptyState,
} from '../components/ui';
import toast from 'react-hot-toast';
import { t } from '../i18n';

const EMPTY_FORM = {
  name: '', sku: '', barcode: '', price: '', categoryId: '',
  description: '', initialQuantity: 0, minStock: 0, maxStock: 1000, location: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { search, page, limit: 15 } });
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.categories));
  }, []);

  const openCreate = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      name: p.name, sku: p.sku, barcode: p.barcode || '',
      price: p.price, categoryId: p.categoryId || '',
      description: p.description || '',
      initialQuantity: p.inventory?.quantity || 0,
      minStock: p.inventory?.minStock || 0,
      maxStock: p.inventory?.maxStock || 1000,
      location: p.inventory?.location || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, form);
        toast.success(t.products.updated);
      } else {
        await api.post('/products', form);
        toast.success(t.products.created);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || t.products.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.products.deleteConfirm)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success(t.products.deleted);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || t.products.deleteFailed);
    }
  };

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title={t.products.title}
        subtitle={`${pagination.total || 0} ${t.products.totalCount}`}
        actions={<Button icon={Plus} onClick={openCreate}>{t.products.addProduct}</Button>}
      />

      {/* Поиск */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={15} style={{
            position: 'absolute', left: '10px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-3)',
          }} />
          <input
            placeholder={t.products.searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: '34px' }}
          />
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '12px', color: 'var(--text-3)' }}>
            <Spinner /> {t.common.loading}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t.products.notFound}
            description={t.products.notFoundHint}
          />
        ) : (
          <>
            <Table headers={[
              t.common.name,
              t.products.sku,
              t.common.category,
              t.common.price,
              t.common.quantity,
              t.common.status,
              t.common.actions,
            ]}>
              {products.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        {p.description.slice(0, 40)}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                      {p.sku}
                    </span>
                  </Td>
                  <Td><Badge>{p.category?.name || '—'}</Badge></Td>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {Number(p.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                    </span>
                  </Td>
                  <Td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 600,
                      color: p.inventory?.quantity === 0 ? 'var(--red)'
                        : p.inventory?.quantity <= p.inventory?.minStock ? 'var(--amber)'
                        : 'var(--green)',
                    }}>
                      {p.inventory?.quantity ?? '—'}
                    </span>
                    {p.inventory?.location && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: '6px' }}>
                        @{p.inventory.location}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {p.inventory?.quantity === 0
                      ? <Badge color="red">{t.products.outOfStock}</Badge>
                      : p.inventory?.quantity <= p.inventory?.minStock
                      ? <Badge color="amber">{t.products.lowStock}</Badge>
                      : <Badge color="green">{t.products.inStock}</Badge>
                    }
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEdit(p)}>
                        {t.common.edit}
                      </Button>
                      <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(p.id)} />
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>

            {/* Пагинация */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1rem' }}>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: p === page ? 'var(--accent)' : 'var(--bg-3)',
                    color: p === page ? '#fff' : 'var(--text-2)',
                    cursor: 'pointer', fontSize: '0.85rem',
                  }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? t.products.editProduct : t.products.createProduct}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <FormGroup label={`${t.products.productName} *`}>
              <input required value={form.name} onChange={f('name')} placeholder={t.products.namePlaceholder} />
            </FormGroup>
            <FormGroup label={`${t.products.sku} *`}>
              <input required value={form.sku} onChange={f('sku')} placeholder={t.products.skuPlaceholder} />
            </FormGroup>
            <FormGroup label={t.products.barcode}>
              <input value={form.barcode} onChange={f('barcode')} placeholder={t.common.optional} />
            </FormGroup>
            <FormGroup label={`${t.common.price} *`}>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={f('price')} placeholder="0.00" />
            </FormGroup>
            <FormGroup label={t.common.category}>
              <select value={form.categoryId} onChange={f('categoryId')}>
                <option value="">{t.common.none}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label={t.common.location}>
              <input value={form.location} onChange={f('location')} placeholder={t.products.locationPlaceholder} />
            </FormGroup>
            {!editProduct && (
              <FormGroup label={t.products.initialQty}>
                <input type="number" min="0" value={form.initialQuantity} onChange={f('initialQuantity')} />
              </FormGroup>
            )}
            <FormGroup label={t.products.minStock}>
              <input type="number" min="0" value={form.minStock} onChange={f('minStock')} />
            </FormGroup>
          </div>
          <FormGroup label={t.common.description}>
            <textarea rows={2} value={form.description} onChange={f('description')} placeholder={t.products.descPlaceholder} />
          </FormGroup>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.common.saving : editProduct ? t.common.update : t.common.create}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
