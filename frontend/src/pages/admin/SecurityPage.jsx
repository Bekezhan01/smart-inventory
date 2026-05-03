import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, Activity, LockKeyhole, UserCheck,
  AlertTriangle, ListChecks, RefreshCw, Fingerprint,
} from 'lucide-react';
import api from '../../services/api';
import { PageHeader, Button, Card, StatCard, Table, Tr, Td, Badge, Spinner, EmptyState } from '../../components/ui';

const ROLE_COLOR = { ADMIN: 'accent', OPERATOR: 'green', SELLER: 'amber' };
const STATUS_COLOR = { allowed: 'green', denied: 'red' };
const STATUS_LABEL = { allowed: 'Разрешено', denied: 'Отказано' };

const ACTION_LABEL = {
  'auth:password-login': 'Вход по паролю',
  'auth:pin-login': 'Вход по PIN',
  'auth:webauthn-login': 'Вход Face ID',
  'auth:webauthn-start': 'Запуск Face ID',
  'auth:missing-token': 'Нет токена',
  'auth:invalid-token': 'Неверный токен',
  'auth:expired-token': 'Истёкший токен',
  'access:denied': 'Отказ доступа',
  'users:create': 'Создание пользователя',
  'users:update': 'Изменение пользователя',
  'users:delete': 'Удаление пользователя',
  'webauthn:register-start': 'Регистрация Face ID',
  'webauthn:register-finish': 'Face ID сохранён',
  'webauthn:delete-credential': 'Удаление устройства',
};

const formatAction = (action) => ACTION_LABEL[action] || action;
const shortDate = (value) => new Date(value).toLocaleString('ru-RU', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

export default function SecurityPage() {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const fetchSecurity = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, eventsRes, permissionsRes] = await Promise.all([
        api.get('/security/summary'),
        api.get('/security/events', { params: { status, limit: 50 } }),
        api.get('/security/permissions'),
      ]);
      setSummary(summaryRes.data.summary);
      setEvents(eventsRes.data.events);
      setPermissions(permissionsRes.data.roles);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchSecurity(); }, [fetchSecurity]);

  const total = summary?.total || 0;
  const deniedRate = total ? Math.round(((summary?.denied || 0) / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Контроль доступа"
        subtitle="RBAC, WebAuthn, события безопасности и аудит действий пользователей"
        actions={<Button icon={RefreshCw} variant="secondary" onClick={fetchSecurity}>Обновить</Button>}
      />

      {loading && !summary ? (
        <Card><div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '2rem', color: 'var(--text-3)' }}><Spinner /> Загрузка security-метрик…</div></Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <StatCard title="Событий за 7 дней" value={summary?.total || 0} icon={Activity} color="accent" />
            <StatCard title="Разрешено" value={summary?.allowed || 0} icon={UserCheck} color="green" />
            <StatCard title="Отказано" value={summary?.denied || 0} icon={ShieldAlert} color="red" />
            <StatCard title="Risk rate" value={String(deniedRate) + '%'} icon={AlertTriangle} color={deniedRate > 20 ? 'red' : 'amber'} />
            <StatCard title="Успешные входы" value={summary?.authSuccess || 0} icon={LockKeyhole} color="blue" />
            <StatCard title="Ошибки входа" value={summary?.authFailed || 0} icon={Fingerprint} color="amber" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.8fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            <Card style={{ padding: 0 }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>Журнал доступа</h2>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Последние действия, входы и отказы авторизации</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[['', 'Все'], ['allowed', 'Разрешено'], ['denied', 'Отказано']].map(([value, label]) => (
                    <button key={value} onClick={() => setStatus(value)} style={{
                      padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                      background: status === value ? 'var(--accent)' : 'var(--bg-3)',
                      color: status === value ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              {events.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="Событий пока нет" description="Аудит начнёт заполняться после входов и изменений данных." />
              ) : (
                <Table headers={['Время', 'Пользователь', 'Действие', 'Ресурс', 'Статус', 'IP']}>
                  {events.map((event) => (
                    <Tr key={event.id}>
                      <Td><span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{shortDate(event.createdAt)}</span></Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{event.actorEmail || 'Анонимно'}</div>
                        {event.role && <Badge color={ROLE_COLOR[event.role]}>{event.role}</Badge>}
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{formatAction(event.action)}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>{event.method} {event.path}</div>
                      </Td>
                      <Td><Badge>{event.resource}</Badge></Td>
                      <Td><Badge color={STATUS_COLOR[event.status]}>{STATUS_LABEL[event.status] || event.status} · {event.statusCode}</Badge></Td>
                      <Td><span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>{event.ip || '—'}</span></Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <ListChecks size={18} color="var(--accent-2)" />
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>Топ событий</h2>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>За последние 7 дней</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(summary?.byAction || []).length === 0 ? (
                  <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Данных пока нет.</p>
                ) : summary.byAction.map((item) => {
                  const count = item._count?._all || 0;
                  const width = total ? Math.max(8, Math.round((count / total) * 100)) : 8;
                  return (
                    <div key={item.action}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>{formatAction(item.action)}</span>
                        <span style={{ color: 'var(--text-3)' }}>{count}</span>
                      </div>
                      <div style={{ height: '7px', background: 'var(--bg-3)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: String(width) + '%', height: '100%', background: 'var(--accent)', borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>Матрица контроля доступа</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>RBAC модель: роли, разрешения и условия доступа</p>
            </div>
            <Table headers={['Роль', 'Разрешения', 'Условия доступа']}>
              {permissions.map((role) => (
                <Tr key={role.role}>
                  <Td>
                    <div style={{ fontWeight: 700 }}>{role.label}</div>
                    <Badge color={ROLE_COLOR[role.role]}>{role.role}</Badge>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {role.permissions.map((permission) => <Badge key={permission} color="blue">{permission}</Badge>)}
                    </div>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-2)', fontSize: '0.82rem' }}>
                      {role.conditions.map((condition) => <span key={condition}>• {condition}</span>)}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
