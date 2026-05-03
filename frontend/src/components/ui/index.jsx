// Stat Card
export function StatCard({ title, value, icon: Icon, color = 'accent', change, suffix = '' }) {
  const colorMap = {
    accent: { bg: 'var(--accent-dim)', color: 'var(--accent-2)' },
    green: { bg: 'var(--green-dim)', color: 'var(--green)' },
    red: { bg: 'var(--red-dim)', color: 'var(--red)' },
    amber: { bg: 'var(--amber-dim)', color: 'var(--amber)' },
    blue: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  };
  const c = colorMap[color] || colorMap.accent;

  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && (
          <div style={{ background: c.bg, color: c.color, borderRadius: '8px', padding: '6px', display: 'flex' }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
        {value}{suffix}
      </div>
      {change !== undefined && (
        <span style={{ fontSize: '0.75rem', color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last week
        </span>
      )}
    </div>
  );
}

// Badge
export function Badge({ children, color = 'default' }) {
  const styles = {
    default: { bg: 'var(--bg-4)', color: 'var(--text-2)' },
    green: { bg: 'var(--green-dim)', color: 'var(--green)' },
    red: { bg: 'var(--red-dim)', color: 'var(--red)' },
    amber: { bg: 'var(--amber-dim)', color: 'var(--amber)' },
    blue: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
    accent: { bg: 'var(--accent-dim)', color: 'var(--accent-2)' },
  };
  const s = styles[color] || styles.default;
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: '6px',
      padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600,
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// Button
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', icon: Icon }) {
  const variants = {
    primary: { bg: 'var(--accent)', color: '#fff', border: 'transparent' },
    secondary: { bg: 'var(--bg-3)', color: 'var(--text)', border: 'var(--border)' },
    danger: { bg: 'var(--red-dim)', color: 'var(--red)', border: 'var(--red)' },
    ghost: { bg: 'transparent', color: 'var(--text-2)', border: 'transparent' },
  };
  const sizes = {
    sm: { padding: '0.35rem 0.75rem', fontSize: '0.8rem' },
    md: { padding: '0.55rem 1rem', fontSize: '0.875rem' },
    lg: { padding: '0.7rem 1.4rem', fontSize: '0.95rem' },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: v.bg, color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: 'var(--radius)',
        padding: s.padding, fontSize: s.fontSize,
        fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        transition: 'opacity 0.15s, filter 0.15s',
        filter: 'none',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

// Card
export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      ...style,
    }}>
      {children}
    </div>
  );
}

// Page header
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: '3px' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

// Loading spinner
export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid var(--border)`,
      borderTopColor: 'var(--accent)', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
      {Icon && <Icon size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />}
      <p style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>{title}</p>
      {description && <p style={{ fontSize: '0.85rem' }}>{description}</p>}
    </div>
  );
}

// Table
export function Table({ headers, children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '0.6rem 1rem', textAlign: 'left',
                fontSize: '0.72rem', fontWeight: 600,
                color: 'var(--text-3)', textTransform: 'uppercase',
                letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Table row
export function Tr({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--bg-3)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </tr>
  );
}

// Table cell
export function Td({ children, style }) {
  return (
    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text)', ...style }}>
      {children}
    </td>
  );
}

// Modal
export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-lg)', padding: '1.5rem',
        width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
        animation: 'fadeIn 0.2s ease',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Form group
export function FormGroup({ label, children, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}
