import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { t } from '../../i18n';

export default function LoginPage() {
  const [form, setForm] = useState({ email: 'admin@stockos.com', password: 'admin123' });
  const [showPw, setShowPw] = useState(false);
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success(t.auth.welcomeBack);
      const user = JSON.parse(localStorage.getItem('user'));
      navigate(user?.role === 'OPERATOR' ? '/operator' : '/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1rem',
      backgroundImage: 'radial-gradient(ellipse at 30% 0%, rgba(108,99,255,0.15) 0%, transparent 55%)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
            {t.auth.title}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>{t.auth.subtitle}</p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px',
            background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: '20px',
            padding: '3px 10px', fontSize: '0.75rem', color: 'var(--blue)',
          }}>
            <ShieldCheck size={12} /> Администратор / Оператор
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '1.75rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>{t.auth.email}</label>
            <input type="email" required autoComplete="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>{t.auth.password}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex',
              }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{
            marginTop: '0.25rem', padding: '0.7rem', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            fontFamily: 'var(--font-display)', transition: 'opacity 0.15s',
          }}>
            {loading ? t.auth.signingIn : t.auth.signIn}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/seller-login" style={{ color: 'var(--accent-2)', fontSize: '0.875rem', textDecoration: 'none' }}>
            {t.auth.sellerLogin} →
          </Link>
        </div>

        <div style={{
          marginTop: '0.75rem', background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
          fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', lineHeight: 1.8,
        }}>
          <div>Admin: admin@stockos.com / admin123</div>
          <div>Operator: operator@stockos.com / operator123</div>
        </div>
      </div>
    </div>
  );
}
