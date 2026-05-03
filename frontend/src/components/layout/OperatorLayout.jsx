import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Warehouse, ArrowLeftRight, Package, LogOut, BoxSelect, ChevronRight, LayoutDashboard } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { t } from '../../i18n';
import styles from './Layout.module.css';

const NAV = [
  { to: '/operator',             icon: LayoutDashboard, label: t.nav.dashboard    },
  { to: '/operator/inventory',   icon: Warehouse,       label: t.nav.inventory    },
  { to: '/operator/transactions',icon: ArrowLeftRight,  label: t.nav.transactions },
  { to: '/operator/products',    icon: Package,         label: t.nav.products     },
];

export default function OperatorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success(t.toast.loggedOut);
    navigate('/login');
  };

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <BoxSelect size={22} color="var(--green)" />
          <span>StockOS</span>
          <span style={{
            marginLeft: 'auto', fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
            background: 'var(--green-dim)', color: 'var(--green)',
            padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
          }}>ОПЕ</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/operator'}
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
            <div className={styles.avatar} style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
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
