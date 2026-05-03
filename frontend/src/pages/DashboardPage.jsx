import { useEffect, useState } from 'react';
import { Package, Warehouse, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import { StatCard, Card, PageHeader, Spinner, Badge } from '../components/ui';
import { format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import { t } from '../i18n';

const COLORS = ['#6c63ff', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

// Метки типов операций на русском
const TX_TYPE_LABEL = { IN: 'ПРИХОД', OUT: 'РАСХОД', ADJUSTMENT: 'КОРР.' };
const TX_TYPE_COLOR = { IN: 'green', OUT: 'red', ADJUSTMENT: 'amber' };

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [txReport, setTxReport] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [invReport, setInvReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, tx, top, inv] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/reports/transactions?groupBy=day'),
          api.get('/reports/top-products?limit=5'),
          api.get('/reports/inventory'),
        ]);
        setStats(s.data.stats);
        setTxReport(tx.data.report.slice(-14));
        setTopProducts(top.data.products);
        setInvReport(inv.data.report);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '60vh',
        gap: '12px', color: 'var(--text-3)',
      }}>
        <Spinner /> {t.common.loading}
      </div>
    );
  }

  const pieData = invReport?.byCategory?.map((c) => ({
    name: c.category, value: c.totalQuantity,
  })) || [];

  const today = format(new Date(), 'd MMMM yyyy', { locale: dateFnsRu });

  return (
    <div>
      <PageHeader
        title={t.dashboard.title}
        subtitle={`${t.dashboard.subtitle} ${today}`}
      />

      {/* Карточки статистики */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <StatCard title={t.dashboard.totalProducts}  value={stats?.totalProducts || 0}  icon={Package}       color="accent" />
        <StatCard title={t.dashboard.inventoryValue} value={`${(stats?.totalInventoryValue || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`} icon={DollarSign} color="green" />
        <StatCard title={t.dashboard.lowStock}       value={stats?.lowStock || 0}        icon={AlertTriangle} color="amber" />
        <StatCard title={t.dashboard.outOfStock}     value={stats?.outOfStock || 0}      icon={Warehouse}     color="red"   />
        <StatCard title={t.dashboard.weeklyIn}       value={stats?.weeklyIn || 0}        icon={TrendingUp}    color="blue"  />
        <StatCard title={t.dashboard.weeklyOut}      value={stats?.weeklyOut || 0}       icon={TrendingDown}  color="accent"/>
      </div>

      {/* Графики */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <Card>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            marginBottom: '1.25rem', fontSize: '1rem',
          }}>
            {t.dashboard.activityChart}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={txReport} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6c63ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c63ff" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
              <Tooltip contentStyle={{
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text)',
              }} />
              <Area type="monotone" dataKey="in"  stroke="#6c63ff" strokeWidth={2} fill="url(#gIn)"  name={t.dashboard.stockIn}  />
              <Area type="monotone" dataKey="out" stroke="#22c55e" strokeWidth={2} fill="url(#gOut)" name={t.dashboard.stockOut} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            marginBottom: '1.25rem', fontSize: '1rem',
          }}>
            {t.dashboard.byCategory}
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="45%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(val) => (
                  <span style={{ color: 'var(--text-2)', fontSize: '0.75rem' }}>{val}</span>
                )} />
                <Tooltip contentStyle={{
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text)',
                }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem 0', fontSize: '0.85rem' }}>
              {t.common.noData}
            </div>
          )}
        </Card>
      </div>

      {/* Последние операции + Топ продаж */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            marginBottom: '1rem', fontSize: '1rem',
          }}>
            {t.dashboard.recentTx}
          </h3>
          {stats?.recentTransactions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats.recentTransactions.slice(0, 8).map((tx) => (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.75rem', background: 'var(--bg-3)', borderRadius: '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{tx.product?.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                      {format(new Date(tx.createdAt), 'd MMM, HH:mm', { locale: dateFnsRu })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge color={TX_TYPE_COLOR[tx.type] || 'default'}>
                      {TX_TYPE_LABEL[tx.type] || tx.type}
                    </Badge>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem' }}>
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

        <Card>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            marginBottom: '1rem', fontSize: '1rem',
          }}>
            {t.dashboard.topSelling}
          </h3>
          {topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topProducts.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '0.5rem 0.75rem', background: 'var(--bg-3)', borderRadius: '8px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: 'var(--text-3)', fontSize: '0.85rem', width: '18px',
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                      {p.sku}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: 'var(--green)', fontSize: '0.875rem',
                  }}>
                    {p.totalQuantity} {t.common.units}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
              {t.dashboard.noTopProducts}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
