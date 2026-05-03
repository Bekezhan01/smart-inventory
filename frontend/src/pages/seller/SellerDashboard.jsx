import { useEffect, useState } from 'react';
import { ShoppingCart, TrendingUp, DollarSign, BarChart3, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import api from '../../services/api';
import { StatCard, Card, PageHeader, Badge, Button, Spinner } from '../../components/ui';
import { t } from '../../i18n';
import useAuthStore from '../../context/authStore';

export default function SellerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [sales, setSales]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sum, s] = await Promise.all([
          api.get('/sales/summary'),
          api.get('/sales', { params: { limit: 8 } }),
        ]);
        setSummary(sum.data.summary);
        setSales(s.data.sales);
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

  const PAY_LABEL = { cash: 'Наличные', card: 'Карта', qr: 'QR' };
  const PAY_COLOR = { cash: 'green', card: 'blue', qr: 'accent' };

  return (
    <div>
      <PageHeader
        title={t.nav.dashboard}
        subtitle={`${user?.name} · ${format(new Date(), 'd MMMM yyyy', { locale: dateFnsRu })}`}
        actions={
          <Button icon={Plus} onClick={() => navigate('/pos/sale')}>
            {t.pos.title}
          </Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          title={t.dashboard.todayRevenue}
          value={`${(summary?.todayRevenue || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`}
          icon={DollarSign} color="green"
        />
        <StatCard title={t.dashboard.todaySales}  value={summary?.todaySales  || 0} icon={ShoppingCart} color="accent" />
        <StatCard
          title={t.dashboard.monthRevenue}
          value={`${(summary?.monthRevenue || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`}
          icon={TrendingUp} color="blue"
        />
        <StatCard title={t.dashboard.monthSales} value={summary?.monthSales || 0} icon={BarChart3} color="amber" />
      </div>

      {/* Quick access */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/pos/sale')}
          style={{
            width: '100%', padding: '1.5rem', background: 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
            boxShadow: '0 4px 24px rgba(108,99,255,0.3)',
            transition: 'filter 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
        >
          <ShoppingCart size={24} />
          Открыть кассу — оформить продажу
        </button>
      </div>

      {/* Recent sales */}
      <Card>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
          Последние продажи
        </h3>
        {sales.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sales.map((s) => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0.75rem', background: 'var(--bg-3)', borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {s.items?.length} {s.items?.length === 1 ? 'позиция' : 'позиции'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    {format(new Date(s.createdAt), 'd MMM HH:mm', { locale: dateFnsRu })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Badge color={PAY_COLOR[s.paymentMethod] || 'default'}>
                    {PAY_LABEL[s.paymentMethod] || s.paymentMethod}
                  </Badge>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)', fontSize: '0.9rem' }}>
                    {Number(s.totalAmount).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
            Продаж пока нет. Начните оформление через кассу!
          </div>
        )}
      </Card>
    </div>
  );
}
