import { useEffect, useState, useCallback } from 'react';
import { Plus, ArrowLeftRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import api from '../services/api';
import {
  PageHeader, Button, Card, Table, Tr, Td, Badge,
  Modal, FormGroup, Spinner, EmptyState,
} from '../components/ui';
import toast from 'react-hot-toast';
import { t } from '../i18n';

// Тип → цвет и метка
const TYPE_CONFIG = {
  IN:         { color: 'green', icon: ArrowDownCircle, label: t.transactions.labelIN  },
  OUT:        { color: 'red',   icon: ArrowUpCircle,   label: t.transactions.labelOUT },
  ADJUSTMENT: { color: 'amber', icon: ArrowLeftRight,  label: t.transactions.labelADJ },
};

// Метка фильтра «Все»
const FILTER_LABELS = {
  '':           t.common.all,
  IN:           t.transactions.labelIN,
  OUT:          t.transactions.labelOUT,
  ADJUSTMENT:   t.transactions.labelADJ,
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ type: '', page: 1 });
  const [form, setForm] = useState({ productId: '', type: 'IN', quantity: 1, note: '', unitPrice: '' });

  const fetchTx = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions', { params: { ...filters, limit: 20 } });
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTx(); }, [fetchTx]);
  useEffect(() => {
    api.get('/products', { params: { limit: 100 } }).then((r) => setProducts(r.data.products));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/transactions', { ...form, quantity: Number(form.quantity) });
      toast.success(t.transactions.recorded);
      setModalOpen(false);
      setForm({ productId: '', type: 'IN', quantity: 1, note: '', unitPrice: '' });
      fetchTx();
    } catch (err) {
      toast.error(err.response?.data?.message || t.transactions.recordFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t.transactions.title}
        subtitle={`${pagination.total || 0} ${t.transactions.totalCount}`}
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            {t.transactions.recordBtn}
          </Button>
        }
      />

      {/* Фильтры по типу */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginRight: '4px' }}>
            {t.transactions.filterLabel}
          </span>
          {Object.entries(FILTER_LABELS).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilters((f) => ({ ...f, type: value, page: 1 }))}
              style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                background: filters.type === value ? 'var(--accent)' : 'var(--bg-3)',
                color: filters.type === value ? '#fff' : 'var(--text-2)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '12px', color: 'var(--text-3)' }}>
            <Spinner /> {t.common.loading}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={t.transactions.noTransactions}
            description={t.transactions.noTxHint}
          />
        ) : (
          <>
            <Table headers={[
              t.transactions.dateCol,
              t.transactions.product,
              t.transactions.typeCol,
              t.transactions.qtyCol,
              t.transactions.priceCol,
              t.transactions.userCol,
              t.transactions.noteCol,
            ]}>
              {transactions.map((tx) => {
                const tc = TYPE_CONFIG[tx.type] || TYPE_CONFIG.IN;
                return (
                  <Tr key={tx.id}>
                    <Td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {format(new Date(tx.createdAt), 'd MMM yyyy', { locale: dateFnsRu })}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        {format(new Date(tx.createdAt), 'HH:mm')}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{tx.product?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        {tx.product?.sku}
                      </div>
                    </Td>
                    <Td><Badge color={tc.color}>{tc.label}</Badge></Td>
                    <Td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: tx.type === 'IN' ? 'var(--green)'
                          : tx.type === 'OUT' ? 'var(--red)'
                          : 'var(--amber)',
                      }}>
                        {tx.type === 'IN' ? '+' : tx.type === 'OUT' ? '-' : '~'}{tx.quantity}
                      </span>
                    </Td>
                    <Td>
                      {tx.unitPrice
                        ? <span style={{ fontFamily: 'var(--font-mono)' }}>
                            {Number(tx.unitPrice).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₸
                          </span>
                        : '—'
                      }
                    </Td>
                    <Td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{tx.user?.name}</span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{tx.note || '—'}</span>
                    </Td>
                  </Tr>
                );
              })}
            </Table>

            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1rem' }}>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setFilters((f) => ({ ...f, page: p }))} style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: p === filters.page ? 'var(--accent)' : 'var(--bg-3)',
                    color: p === filters.page ? '#fff' : 'var(--text-2)',
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

      {/* Модальное окно новой операции */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t.transactions.modalTitle}>
        <form onSubmit={handleSubmit}>
          <FormGroup label={`${t.transactions.product} *`}>
            <select
              required value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
            >
              <option value="">{t.transactions.selectProduct}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {t.transactions.stockLabel} {p.inventory?.quantity ?? '?'}
                </option>
              ))}
            </select>
          </FormGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <FormGroup label={`${t.transactions.txType} *`}>
              <select
                required value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="IN">{t.transactions.typeIN}</option>
                <option value="OUT">{t.transactions.typeOUT}</option>
                <option value="ADJUSTMENT">{t.transactions.typeADJ}</option>
              </select>
            </FormGroup>
            <FormGroup label={`${t.common.quantity} *`}>
              <input
                type="number" min="1" required value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </FormGroup>
            <FormGroup label={t.transactions.unitPrice}>
              <input
                type="number" min="0" step="0.01" value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                placeholder="0.00"
              />
            </FormGroup>
          </div>

          <FormGroup label={t.common.note}>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder={t.transactions.notePlaceholder}
            />
          </FormGroup>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.transactions.recording : t.transactions.recordAction}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
