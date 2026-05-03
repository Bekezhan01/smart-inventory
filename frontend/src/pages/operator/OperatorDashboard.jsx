import { useEffect, useState } from 'react';
import { Warehouse, AlertTriangle, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import api from '../../services/api';
import { StatCard, Card, PageHeader, Badge, Spinner } from '../../components/ui';
import { t } from '../../i18n';
import useAuthStore from '../../context/authStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OperatorDashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary]   = useState(null);
  const [alerts, setAlerts]     = useState([]);
  const [txReport, setTxReport] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sum, al, tx, recent] = await Promise.all([
          api.get('/inventory/summary'),
          api.get('/inventory/alerts'),
          api.get('/reports/transactions?groupBy=day'),
          api.get('/transactions', { params: { limit: 8 } }),
        ]);
        setSummary(sum.data.summary);
        setAlerts(al.data.alerts);
        setTxReport(tx.data.report.slice(-14));
        setRecentTx(recent.data.transactions);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '12px', color: 'var(--text-3)' }}>
        <Spinner /> {t.common.loading}
      </div>
    );
  }

  const TX_COLOR = { IN: 'green', OUT: 'red', ADJUSTMENT: 'amber', SALE: 'blue' };
  const TX_LABEL = { IN: 'ПРИХОД', OUT: 'РАСХОД', ADJUSTMENT: 'КОРР.', SALE: 'ПРОДАЖА' };

  return (
    <div>
      <PageHeader
        title={t.nav.dashboard}
        subtitle={`Добро пожаловать, ${user?.name} · ${format(new Date(), 'd MMMM yyyy', { locale: dateFnsRu })}`}
      />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title={t.inventory.totalProducts}  value={summary?.totalProducts || 0}  icon={Warehouse}      color="accent" />
        <StatCard title={t.inventory.lowStockAlerts} value={summary?.lowStock || 0}       icon={AlertTriangle}  color="amber"  />
        <StatCard title={t.inventory.outOfStock}     value={summary?.outOfStock || 0}     icon={AlertTriangle}  color="red"    />
        <StatCard
          title={t.inventory.totalValue}
          value={`${(summary?.totalValue || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸`}
          color="green"
        />
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div style={{
          background: 'var(--amber-dim)', border: '1px solid var(--amber)',
          borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '1.5rem', fontSize: '0.875rem',
        }}>
          <AlertTriangle size={16} color="var(--amber)" />
          <span style={{ color: 'var(--amber)' }}>
            <strong>{alerts.length}</strong> {t.inventory.alertBanner}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
        {/* Chart */}
        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>
            {t.dashboard.activityChart}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={txReport} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gIn2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} />
              <Area type="monotone" dataKey="in"  stroke="#6c63ff" strokeWidth={2} fill="url(#gIn2)"  name="Приход" />
              <Area type="monotone" dataKey="out" stroke="#22c55e" strokeWidth={2} fill="url(#gOut2)" name="Расход" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent transactions */}
        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            {t.dashboard.recentTx}
          </h3>
          {recentTx.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentTx.map((tx) => (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.75rem', background: 'var(--bg-3)', borderRadius: '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{tx.product?.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                      {format(new Date(tx.createdAt), 'd MMM HH:mm', { locale: dateFnsRu })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Badge color={TX_COLOR[tx.type] || 'default'}>{TX_LABEL[tx.type] || tx.type}</Badge>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.82rem', color: tx.type === 'OUT' ? 'var(--red)' : 'var(--green)' }}>
                      {tx.type === 'OUT' ? '-' : '+'}{tx.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
              {t.dashboard.noTransactions}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
