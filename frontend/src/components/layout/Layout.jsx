import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, ArrowLeftRight,
  BarChart3, LogOut, ChevronRight,
} from 'lucide-react';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import { t } from '../../i18n';
import styles from './Layout.module.css';

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: t.nav.dashboard    },
  { to: '/products',     icon: Package,          label: t.nav.products     },
  { to: '/inventory',    icon: Warehouse,        label: t.nav.inventory    },
  { to: '/transactions', icon: ArrowLeftRight,   label: t.nav.transactions },
  { to: '/reports',      icon: BarChart3,        label: t.nav.reports      },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success(t.toast.loggedOut);
    navigate('/login');
  };

  const roleLabel = t.roles[user?.role] || user?.role;

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo} />

        <nav className={styles.nav}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className={styles.chevron} />
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{roleLabel}</span>
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
