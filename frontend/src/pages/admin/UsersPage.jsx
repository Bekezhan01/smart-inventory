import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Users, Fingerprint, KeyRound, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../services/api';
import {
  PageHeader, Button, Card, Table, Tr, Td, Badge,
  Modal, FormGroup, Spinner, EmptyState,
} from '../../components/ui';
import toast from 'react-hot-toast';
import { t } from '../../i18n';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'SELLER', pin: '', isActive: true };

const ROLE_COLOR = { ADMIN: 'accent', OPERATOR: 'green', SELLER: 'amber' };

export default function UsersPage() {
  const [users, setUsers]       = useState([]);
  const [pagination, setPag]    = useState({});
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModal]   = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [roleFilter, setRole]   = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users', { params: { role: roleFilter, limit: 20 } });
      setUsers(res.data.users);
      setPag(res.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit   = (u)  => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, pin: '', isActive: u.isActive });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.pin)      delete payload.pin;

      if (editUser) {
        await api.put(`/auth/users/${editUser.id}`, payload);
        toast.success(t.users.updated);
      } else {
        await api.post('/auth/register', payload);
        toast.success(t.users.created);
      }
      setModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.users.deleteConfirm)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      toast.success(t.users.deleted);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/auth/users/${user.id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? 'Пользователь деактивирован' : 'Пользователь активирован');
      fetchUsers();
    } catch (err) {
      toast.error('Ошибка');
    }
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title={t.users.title}
        subtitle={`${pagination.total || 0} пользователей`}
        actions={<Button icon={Plus} onClick={openCreate}>{t.users.addUser}</Button>}
      />

      {/* Role filter */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Роль:</span>
          {[['', 'Все'], ['ADMIN', 'Администратор'], ['OPERATOR', 'Оператор'], ['SELLER', 'Продавец']].map(([val, label]) => (
            <button key={val} onClick={() => setRole(val)} style={{
              padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)',
              background: roleFilter === val ? 'var(--accent)' : 'var(--bg-3)',
              color: roleFilter === val ? '#fff' : 'var(--text-2)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            }}>{label}</button>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '12px', color: 'var(--text-3)' }}>
            <Spinner /> {t.common.loading}
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title={t.users.noUsers} />
        ) : (
          <Table headers={['Пользователь', 'Роль', 'Face ID', 'PIN', 'Статус', 'Создан', t.common.actions]}>
            {users.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{u.email}</div>
                </Td>
                <Td><Badge color={ROLE_COLOR[u.role]}>{t.roles[u.role]}</Badge></Td>
                <Td>
                  {u.faceAuthEnabled
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green)' }}>
                        <Fingerprint size={14} /> <span style={{ fontSize: '0.78rem' }}>Активен</span>
                      </div>
                    : <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>—</span>
                  }
                </Td>
                <Td>
                  {u.pinEnabled
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--amber)' }}>
                        <KeyRound size={14} /> <span style={{ fontSize: '0.78rem' }}>Задан</span>
                      </div>
                    : <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>—</span>
                  }
                </Td>
                <Td>
                  <Badge color={u.isActive ? 'green' : 'red'}>
                    {u.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </Td>
                <Td>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEdit(u)}>{t.common.edit}</Button>
                    <button onClick={() => toggleActive(u)} style={{
                      padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                      background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem',
                    }}>
                      {u.isActive ? <ToggleRight size={14} color="var(--green)" /> : <ToggleLeft size={14} color="var(--text-3)" />}
                    </button>
                    <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(u.id)} />
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModal(false)}
        title={editUser ? t.users.editUser : t.users.createUser}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <FormGroup label={`${t.users.name} *`}>
              <input required value={form.name} onChange={f('name')} placeholder="Иван Петров" />
            </FormGroup>
            <FormGroup label={`${t.users.email} *`}>
              <input required type="email" value={form.email} onChange={f('email')} />
            </FormGroup>
            <FormGroup label={editUser ? 'Новый пароль (оставьте пустым)' : `${t.users.password} *`}>
              <input type="password" required={!editUser} value={form.password} onChange={f('password')}
                placeholder={editUser ? 'Не менять' : 'Минимум 6 символов'} autoComplete="new-password" />
            </FormGroup>
            <FormGroup label={`${t.users.role} *`}>
              <select required value={form.role} onChange={f('role')}>
                <option value="ADMIN">Администратор</option>
                <option value="OPERATOR">Оператор</option>
                <option value="SELLER">Продавец</option>
              </select>
            </FormGroup>
            {(form.role === 'SELLER') && (
              <FormGroup label={`${t.users.pin} (${t.users.pinHint})`}>
                <input type="password" value={form.pin} onChange={f('pin')}
                  placeholder="1234" inputMode="numeric" pattern="\d{4,8}" />
              </FormGroup>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setModal(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.common.saving : editUser ? t.common.update : t.common.create}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
