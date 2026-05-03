import { useState, useEffect } from 'react';
import { Fingerprint, Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Card, PageHeader, Button, Badge, FormGroup, Spinner } from '../../components/ui';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { t } from '../../i18n';

export default function SellerSettings() {
  const { user, registerFaceId, loading } = useAuthStore();
  const [credentials, setCredentials] = useState([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [deviceName, setDeviceName] = useState('Мой телефон / компьютер');
  const [registering, setRegistering] = useState(false);

  const fetchProfile = async () => {
    setLoadingCreds(true);
    try {
      const res = await api.get('/auth/profile');
      setCredentials(res.data.user?.webAuthnCredentials || []);
    } finally {
      setLoadingCreds(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleRegister = async () => {
    setRegistering(true);
    const result = await registerFaceId(deviceName);
    if (result.success) {
      toast.success(t.auth.faceIdRegistered);
      fetchProfile();
    } else {
      toast.error(result.error);
    }
    setRegistering(false);
  };

  const handleDeleteCred = async (id) => {
    if (!confirm('Удалить это устройство Face ID?')) return;
    try {
      await api.delete(`/auth/webauthn/credentials/${id}`);
      toast.success('Устройство удалено');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const webAuthnSupported = typeof window !== 'undefined' && window.PublicKeyCredential;

  return (
    <div>
      <PageHeader title={t.nav.settings} subtitle="Настройки Face ID и безопасности" />

      {/* WebAuthn info */}
      {!webAuthnSupported && (
        <div style={{
          background: 'var(--amber-dim)', border: '1px solid var(--amber)',
          borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem',
        }}>
          <AlertCircle size={16} color="var(--amber)" />
          <span style={{ fontSize: '0.875rem', color: 'var(--amber)' }}>
            Face ID требует HTTPS и поддержки WebAuthn в браузере. Используйте Chrome/Safari на современном устройстве.
          </span>
        </div>
      )}

      {/* Face ID registration */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <div style={{ background: 'var(--accent-dim)', borderRadius: '8px', padding: '8px', display: 'flex' }}>
            <Fingerprint size={20} color="var(--accent-2)" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>Face ID / Биометрия</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
              Вход без PIN через встроенный датчик лица или отпечатка
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {user?.faceAuthEnabled
              ? <Badge color="green"><ShieldCheck size={10} style={{ display: 'inline', marginRight: '3px' }} /> Активен</Badge>
              : <Badge color="default">Не настроен</Badge>
            }
          </div>
        </div>

        <FormGroup label={t.auth.deviceName}>
          <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)}
            placeholder="напр. iPhone 15, MacBook Pro" />
        </FormGroup>

        <Button
          icon={Fingerprint}
          onClick={handleRegister}
          disabled={registering || !webAuthnSupported}
        >
          {registering ? 'Регистрация…' : t.auth.registerFaceId}
        </Button>
      </Card>

      {/* Registered devices */}
      <Card>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
          Зарегистрированные устройства
        </h3>
        {loadingCreds ? (
          <div style={{ display: 'flex', gap: '8px', color: 'var(--text-3)', padding: '1rem' }}>
            <Spinner size={16} /> Загрузка…
          </div>
        ) : credentials.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', padding: '1rem 0' }}>
            Устройств не зарегистрировано.
          </div>
        ) : credentials.map((cred) => (
          <div key={cred.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem', background: 'var(--bg-3)', borderRadius: '8px', marginBottom: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Fingerprint size={18} color="var(--accent-2)" />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{cred.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  Создан: {new Date(cred.createdAt).toLocaleDateString('ru-RU')}
                  {cred.lastUsedAt && ` · Использован: ${new Date(cred.lastUsedAt).toLocaleDateString('ru-RU')}`}
                </div>
              </div>
            </div>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDeleteCred(cred.id)} />
          </div>
        ))}
      </Card>

      {/* PIN info */}
      <Card style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--amber-dim)', borderRadius: '8px', padding: '8px', display: 'flex' }}>
            <ShieldCheck size={20} color="var(--amber)" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>PIN-код</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
              {user?.pinEnabled
                ? 'PIN задан. Для смены PIN обратитесь к администратору.'
                : 'PIN не задан. Обратитесь к администратору.'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Badge color={user?.pinEnabled ? 'amber' : 'default'}>
              {user?.pinEnabled ? 'Задан' : 'Не задан'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
