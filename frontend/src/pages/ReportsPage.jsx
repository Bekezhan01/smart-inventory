import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import api from '../services/api';
import { PageHeader, Card, Badge, Spinner, Table, Tr, Td } from '../components/ui';
import { t } from '../i18n';

const TREND_CONFIG = {
  increasing: { color: 'var(--green)', icon: TrendingUp,  label: t.reports.trendRising  },
  decreasing: { color: 'var(--red)',   icon: TrendingDown, label: t.reports.trendFalling },
  stable:     { color: 'var(--text-3)', icon: Minus,       label: t.reports.trendStable  },
};

// Метки группировки
const GROUP_LABELS = {
  day:   t.reports.groupDay,
  week:  t.reports.groupWeek,
  month: t.reports.groupMonth,
};

export default function ReportsPage() {
  const [txReport, setTxReport]   = useState([]);
  const [invReport, setInvReport] = useState(null);
  const [topIn, setTopIn]         = useState([]);
  const [topOut, setTopOut]       = useState([]);
  const [forecast, setForecast]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [groupBy, setGroupBy]     = useState('day');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [tx, inv, tIn, tOut, fc] = await Promise.all([
          api.get(`/reports/transactions?groupBy=${groupBy}`),
          api.get('/reports/inventory'),
          api.get('/reports/top-products?type=IN&limit=8'),
          api.get('/reports/top-products?type=OUT&limit=8'),
          api.get('/reports/forecast'),
        ]);
        setTxReport(tx.data.report.slice(-30));
        setInvReport(inv.data.report);
        setTopIn(tIn.data.products);
        setTopOut(tOut.data.products);
        setForecast(fc.data.forecast);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [groupBy]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '60vh',
        gap: '12px', color: 'var(--text-3)',
      }}>
        <Spinner /> {t.reports.generating}
      </div>
    );
  }

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--bg-3)', border: '1px solid var(--border)',
      borderRadius: '8px', color: 'var(--text)',
    },
  };

  return (
    <div>
      <PageHeader title={t.reports.title} subtitle={t.reports.subtitle} />

      {/* Стоимость и количество по категориям */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>
            {t.reports.valueByCategory}
          </h3>
          {invReport?.byCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invReport.byCategory} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [
                    `${Number(v).toLocaleString('ru-RU')} ₸`,
                    t.reports.valueTooltip,
                  ]}
                />
                <Bar dataKey="totalValue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>
              {t.common.noData}
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>
            {t.reports.qtyByCategory}
          </h3>
          {invReport?.byCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invReport.byCategory} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [v, t.reports.quantity]}
                />
                <Bar dataKey="totalQuantity" fill="var(--green)" radius={[4, 4, 0, 0]} name={t.reports.quantity} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>
              {t.common.noData}
            </div>
          )}
        </Card>
      </div>

      {/* Динамика операций */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
            {t.reports.txTrends}
          </h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {Object.entries(GROUP_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGroupBy(key)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: groupBy === key ? 'var(--accent)' : 'var(--bg-3)',
                  color: groupBy === key ? '#fff' : 'var(--text-2)',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {txReport.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={txReport} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                tickFormatter={(d) => groupBy === 'day' ? d.slice(5) : d}
              />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Legend formatter={(val) => (
                <span style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{val}</span>
              )} />
              <Line type="monotone" dataKey="in"  stroke="var(--accent)" strokeWidth={2} dot={false} name={t.reports.stockIn}  />
              <Line type="monotone" dataKey="out" stroke="var(--green)"  strokeWidth={2} dot={false} name={t.reports.stockOut} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>
            {t.reports.noTxInRange}
          </div>
        )}
      </Card>

      {/* Топ поступлений / отгрузок */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            {t.reports.topReceived}
          </h3>
          {topIn.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topIn.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: '0.8rem', width: '20px' }}>
                    #{i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.sku}</div>
                  </div>
                  <Badge color="green">+{p.totalQuantity}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
              {t.common.noData}
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            {t.reports.topDispatched}
          </h3>
          {topOut.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topOut.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: '0.8rem', width: '20px' }}>
                    #{i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.sku}</div>
                  </div>
                  <Badge color="red">-{p.totalQuantity}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
              {t.common.noData}
            </div>
          )}
        </Card>
      </div>

      {/* Прогноз спроса */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
            {t.reports.forecastTitle}
          </h3>
          <Badge color="accent">{t.reports.forecastBadge}</Badge>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
            {t.reports.forecastHint}
          </span>
        </div>

        {forecast.length > 0 ? (
          <Table headers={[
            t.common.name,
            t.reports.currentStock,
            t.reports.avgDailyDemand,
            t.reports.forecast7d,
            t.reports.daysOfStock,
            t.reports.trend,
            t.reports.reorder,
          ]}>
            {forecast.map((f) => {
              const tc = TREND_CONFIG[f.trend] || TREND_CONFIG.stable;
              const TrendIcon = tc.icon;
              return (
                <Tr key={f.product?.id}>
                  <Td>
                    <div style={{ fontWeight: 500 }}>{f.product?.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                      {f.product?.sku}
                    </div>
                  </Td>
                  <Td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 600,
                      color: f.currentStock === 0 ? 'var(--red)'
                        : f.currentStock < 10 ? 'var(--amber)'
                        : 'var(--green)',
                    }}>
                      {f.currentStock}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {f.avgDailyDemand}{t.common.perDay}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {f.forecastNext7Days} {t.common.units}
                    </span>
                  </Td>
                  <Td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 600,
                      color: f.daysOfStock === 999 ? 'var(--text-3)'
                        : f.daysOfStock < 7  ? 'var(--red)'
                        : f.daysOfStock < 14 ? 'var(--amber)'
                        : 'var(--green)',
                    }}>
                      {f.daysOfStock === 999 ? t.common.infinity : `${f.daysOfStock}д`}
                    </span>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: tc.color }}>
                      <TrendIcon size={14} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{tc.label}</span>
                    </div>
                  </Td>
                  <Td>
                    {f.needsReorder
                      ? (
                        <Badge color="red">
                          <AlertTriangle size={10} style={{ display: 'inline', marginRight: '3px' }} />
                          {t.reports.reorderNow}
                        </Badge>
                      )
                      : <Badge color="green">{t.common.ok}</Badge>
                    }
                  </Td>
                </Tr>
              );
            })}
          </Table>
        ) : (
          <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>
            {t.reports.noForecast}
          </div>
        )}
      </Card>
    </div>
  );
}
