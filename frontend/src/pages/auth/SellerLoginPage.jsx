import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Fingerprint, KeyRound, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { t } from '../../i18n';

const MODE = { FACE: 'face', PIN: 'pin' };

export default function SellerLoginPage() {
  const [email, setEmail]     = useState('');
  const [pin, setPin]         = useState('');
  const [mode, setMode]       = useState(MODE.FACE);
  const [faceState, setFaceState] = useState('idle'); // idle | scanning | success | error
  const { loginWithFaceId, loginWithPin, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleFaceId = async () => {
    if (!email) { toast.error('Введите email'); return; }
    setFaceState('scanning');
    const result = await loginWithFaceId(email);
    if (result.success) {
      setFaceState('success');
      toast.success(t.auth.welcomeBack);
      setTimeout(() => navigate('/pos'), 600);
    } else {
      setFaceState('error');
      toast.error(result.error);
      setTimeout(() => setFaceState('idle'), 2500);
    }
  };

  const handlePin = async (e) => {
    e.preventDefault();
    const result = await loginWithPin(email, pin);
    if (result.success) {
      toast.success(t.auth.welcomeBack);
      navigate('/pos');
    } else {
      toast.error(result.error);
      setPin('');
    }
  };

  const handlePinKey = (digit) => {
    if (pin.length < 8) setPin((p) => p + digit);
  };

  const faceIcon = {
    idle:     <Fingerprint size={56} color="var(--accent-2)" />,
    scanning: <Loader2 size={56} color="var(--accent-2)" style={{ animation: 'spin 1s linear infinite' }} />,
    success:  <CheckCircle2 size={56} color="var(--green)" />,
    error:    <XCircle size={56} color="var(--red)" />,
  };

  const faceLabel = {
    idle:     t.auth.faceId,
    scanning: t.auth.scanFace,
    success:  'Успешно!',
    error:    'Попробуйте снова',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1rem',
      backgroundImage: 'radial-gradient(ellipse at 70% 100%, rgba(34,197,94,0.1) 0%, transparent 55%)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>
            {t.auth.sellerTitle}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Продавец</p>
        </div>

        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '1.75rem',
        }}>
          {/* Email field (always visible) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
              {t.auth.email}
            </label>
            <input type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-3)', borderRadius: '8px',
            padding: '3px', marginBottom: '1.5rem',
          }}>
            {[MODE.FACE, MODE.PIN].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '0.45rem', borderRadius: '6px', border: 'none',
                background: mode === m ? 'var(--bg-4)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-3)',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                transition: 'all 0.15s',
              }}>
                {m === MODE.FACE ? <><Fingerprint size={14} /> Face ID</> : <><KeyRound size={14} /> PIN</>}
              </button>
            ))}
          </div>

          {/* Face ID panel */}
          {mode === MODE.FACE && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: faceState === 'success' ? 'var(--green-dim)'
                  : faceState === 'error' ? 'var(--red-dim)'
                  : 'var(--accent-dim)',
                border: `2px solid ${faceState === 'success' ? 'var(--green)'
                  : faceState === 'error' ? 'var(--red)'
                  : 'var(--accent)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
                transition: 'all 0.3s',
              }}>
                {faceIcon[faceState]}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>
                {faceState === 'idle' && 'Нажмите для биометрического входа'}
                {faceState === 'scanning' && 'Смотрите в камеру…'}
                {faceState === 'success' && 'Личность подтверждена'}
                {faceState === 'error' && 'Попробуйте ещё раз или используйте PIN'}
              </p>

              <button
                onClick={handleFaceId}
                disabled={loading || faceState === 'scanning' || faceState === 'success'}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: faceState === 'success' ? 'var(--green)' : 'var(--accent)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', opacity: faceState === 'scanning' ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <Fingerprint size={18} />
                {faceLabel[faceState]}
              </button>
            </div>
          )}

          {/* PIN panel */}
          {mode === MODE.PIN && (
            <form onSubmit={handlePin}>
              {/* PIN dots display */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1.25rem',
              }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: i < pin.length ? 'var(--accent)' : 'var(--border)',
                    border: '2px solid',
                    borderColor: i < pin.length ? 'var(--accent)' : 'var(--border-2)',
                    transition: 'all 0.15s',
                  }} />
                ))}
              </div>

              {/* Numpad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1rem' }}>
                {['1','2','3','4','5','6','7','8','9','',  '0','⌫'].map((key, i) => (
                  <button
                    key={i} type="button"
                    onClick={() => {
                      if (key === '⌫') setPin((p) => p.slice(0, -1));
                      else if (key !== '') handlePinKey(key);
                    }}
                    disabled={key === ''}
                    style={{
                      padding: '1rem', borderRadius: '10px',
                      background: key === '' ? 'transparent' : key === '⌫' ? 'var(--red-dim)' : 'var(--bg-3)',
                      border: `1px solid ${key === '' ? 'transparent' : key === '⌫' ? 'var(--red)' : 'var(--border)'}`,
                      color: key === '⌫' ? 'var(--red)' : 'var(--text)',
                      fontSize: '1.2rem', fontWeight: 600, cursor: key === '' ? 'default' : 'pointer',
                      fontFamily: 'var(--font-display)',
                      transition: 'background 0.1s',
                    }}
                    onMouseDown={(e) => { if (key && key !== '') e.currentTarget.style.background = 'var(--bg-4)'; }}
                    onMouseUp={(e) => { if (key && key !== '' && key !== '⌫') e.currentTarget.style.background = 'var(--bg-3)'; }}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <button
                type="submit" disabled={loading || pin.length < 4}
                style={{
                  width: '100%', padding: '0.75rem', background: 'var(--accent)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                  fontWeight: 700, fontSize: '0.95rem', cursor: pin.length < 4 ? 'not-allowed' : 'pointer',
                  opacity: pin.length < 4 ? 0.5 : 1, fontFamily: 'var(--font-display)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <KeyRound size={16} />
                {loading ? 'Проверка…' : 'Войти по PIN'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/login" style={{
            color: 'var(--text-3)', fontSize: '0.85rem', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
          }}>
            <ArrowLeft size={14} /> {t.auth.adminLogin}
          </Link>
        </div>

      </div>
    </div>
  );
}
