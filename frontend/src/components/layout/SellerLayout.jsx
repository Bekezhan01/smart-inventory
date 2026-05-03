import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard, Settings, LogOut, BoxSelect, ChevronRight } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { t } from '../../i18n';
import styles from './Layout.module.css';

const NAV = [
  { to: '/pos',          icon: LayoutDashboard, label: t.nav.dashboard, end: true },
  { to: '/pos/sale',     icon: ShoppingCart,    label: t.pos.title     },
  { to: '/pos/settings', icon: Settings,        label: t.nav.settings  },
];

export default function SellerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success(t.toast.loggedOut);
    navigate('/seller-login');
  };

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <BoxSelect size={22} color="var(--amber)" />
          <span>StockOS</span>
          <span style={{
            marginLeft: 'auto', fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
            background: 'var(--amber-dim)', color: 'var(--amber)',
            padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
          }}>POS</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className={styles.chevron} />
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userCard}>
            <div className={styles.avatar} style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{t.roles[user?.role]}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title={t.nav.logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
