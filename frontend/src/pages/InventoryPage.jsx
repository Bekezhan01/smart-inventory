import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Warehouse, Edit2, ArrowUpDown } from 'lucide-react';
import api from '../services/api';
import {
  PageHeader, Button, Card, StatCard, Table, Tr, Td, Badge,
  Modal, FormGroup, Spinner, EmptyState,
} from '../components/ui';
import toast from 'react-hot-toast';
import { t } from '../i18n';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [txModal, setTxModal] = useState(null);
  const [form, setForm] = useState({ quantity: '', minStock: '', maxStock: '', location: '' });
  const [txForm, setTxForm] = useState({ type: 'IN', quantity: 1, note: '' });
  const [saving, setSaving] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, sum, al] = await Promise.all([
        api.get('/inventory', { params: { limit: 50, ...(lowStockOnly ? { lowStock: 'true' } : {}) } }),
        api.get('/inventory/summary'),
        api.get('/inventory/alerts'),
      ]);
      setInventory(inv.data.inventory);
      setSummary(sum.data.summary);
      setAlerts(al.data.alerts);
    } finally {
      setLoading(false);
    }
  }, [lowStockOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      quantity: item.quantity,
      minStock: item.minStock,
      maxStock: item.maxStock,
      location: item.location || '',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/inventory/${editItem.productId}`, form);
      toast.success(t.inventory.updated);
      setEditItem(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || t.inventory.updateFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/transactions', {
        productId: txModal.productId,
        ...txForm,
        quantity: Number(txForm.quantity),
      });
      toast.success(t.inventory.txRecorded);
      setTxModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || t.inventory.txFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t.inventory.title} subtitle={t.inventory.subtitle} />

      {/* Карточки сводки */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem', marginBottom: '1.5rem',
        }}>
          <StatCard title={t.inventory.totalProducts}  value={summary.totalProducts} icon={Warehouse}     color="accent" />
          <StatCard title={t.inventory.lowStockAlerts} value={summary.lowStock}      icon={AlertTriangle} color="amber"  />
          <StatCard title={t.inventory.outOfStock}     value={summary.outOfStock}    icon={AlertTriangle} color="red"    />
          <StatCard
            title={t.inventory.totalValue}
            value={`${summary.totalValue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`}
            color="green"
          />
        </div>
      )}

      {/* Баннер предупреждений */}
      {alerts.length > 0 && (
        <div style={{
          background: 'var(--amber-dim)', border: '1px solid var(--amber)',
          borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '1rem', fontSize: '0.875rem',
        }}>
          <AlertTriangle size={16} color="var(--amber)" />
          <span style={{ color: 'var(--amber)' }}>
            <strong>{alerts.length}</strong> {t.inventory.alertBanner}
          </span>
        </div>
      )}

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <Button
          variant={lowStockOnly ? 'primary' : 'secondary'}
          size="sm"
          icon={AlertTriangle}
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >
          {lowStockOnly ? t.inventory.showingLowOnly : t.inventory.showLowOnly}
        </Button>
        <Button variant="secondary" size="sm" onClick={fetchData}>
          {t.common.refresh}
        </Button>
      </div>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '12px', color: 'var(--text-3)' }}>
            <Spinner /> {t.common.loading}
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title={t.inventory.noRecords}
            description={t.inventory.noRecordsHint}
          />
        ) : (
          <Table headers={[
            t.inventory.product,
            t.products.sku,
            t.common.category,
            t.common.location,
            t.inventory.qty,
            t.inventory.min,
            t.inventory.max,
            t.common.status,
            t.common.actions,
          ]}>
            {inventory.map((item) => (
              <Tr key={item.id}>
                <Td><span style={{ fontWeight: 600 }}>{item.product?.name}</span></Td>
                <Td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    {item.product?.sku}
                  </span>
                </Td>
                <Td><Badge>{item.product?.category?.name || '—'}</Badge></Td>
                <Td>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                    {item.location || '—'}
                  </span>
                </Td>
                <Td>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem',
                    color: item.quantity === 0 ? 'var(--red)'
                      : item.isLowStock ? 'var(--amber)'
                      : 'var(--green)',
                  }}>
                    {item.quantity}
                  </span>
                </Td>
                <Td>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                    {item.minStock}
                  </span>
                </Td>
                <Td>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                    {item.maxStock}
                  </span>
                </Td>
                <Td>
                  {item.quantity === 0
                    ? <Badge color="red">{t.inventory.outOfStockBadge}</Badge>
                    : item.isLowStock
                    ? <Badge color="amber">{t.inventory.lowStock}</Badge>
                    : item.isOverStock
                    ? <Badge color="blue">{t.inventory.overstock}</Badge>
                    : <Badge color="green">{t.inventory.normal}</Badge>
                  }
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="secondary" size="sm" icon={ArrowUpDown}
                      onClick={() => { setTxModal(item); setTxForm({ type: 'IN', quantity: 1, note: '' }); }}
                    >
                      {t.inventory.txButton}
                    </Button>
                    <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEdit(item)} />
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Модальное окно редактирования склада */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title={`${t.inventory.updateTitle} — ${editItem?.product?.name}`}
      >
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <FormGroup label={t.common.quantity}>
              <input
                type="number" min="0" value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              />
            </FormGroup>
            <FormGroup label={t.common.location}>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder={t.inventory.locationPlaceholder}
              />
            </FormGroup>
            <FormGroup label={t.inventory.min}>
              <input
                type="number" min="0" value={form.minStock}
                onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))}
              />
            </FormGroup>
            <FormGroup label={t.inventory.max}>
              <input
                type="number" min="0" value={form.maxStock}
                onChange={(e) => setForm((p) => ({ ...p, maxStock: e.target.value }))}
              />
            </FormGroup>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditItem(null)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.common.saving : t.common.update}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно быстрой операции */}
      <Modal
        isOpen={!!txModal}
        onClose={() => setTxModal(null)}
        title={`${t.inventory.txTitle} — ${txModal?.product?.name}`}
      >
        <form onSubmit={handleTransaction}>
          <FormGroup label={t.common.type}>
            <select
              value={txForm.type}
              onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="IN">{t.transactions.typeIN}</option>
              <option value="OUT">{t.transactions.typeOUT}</option>
              <option value="ADJUSTMENT">{t.transactions.typeADJ}</option>
            </select>
          </FormGroup>
          <FormGroup label={`${t.common.quantity} *`}>
            <input
              type="number" min="1" required value={txForm.quantity}
              onChange={(e) => setTxForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </FormGroup>
          <FormGroup label={t.common.note}>
            <input
              value={txForm.note}
              onChange={(e) => setTxForm((p) => ({ ...p, note: e.target.value }))}
              placeholder={t.common.optional}
            />
          </FormGroup>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
            {t.inventory.currentStock}{' '}
            <strong style={{ color: 'var(--text)' }}>{txModal?.quantity}</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setTxModal(null)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.inventory.recording : t.inventory.record}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
