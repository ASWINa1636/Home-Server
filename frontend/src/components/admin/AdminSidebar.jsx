/**
 * AdminSidebar.jsx — Admin panel navigation sidebar.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Smartphone, HardDrive, Inbox,
  ScrollText, Settings, ArrowLeft, Shield, MessageSquare, UserX
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', path: '/admin', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', path: '/admin/users', label: 'Users', icon: Users },
  { id: 'messages', path: '/admin/messages', label: 'Support Chat', icon: MessageSquare },
  { id: 'devices', path: '/admin/devices', label: 'Devices', icon: Smartphone },
  { id: 'requests', path: '/admin/storage-requests', label: 'Storage Requests', icon: Inbox },
  { id: 'deletions', path: '/admin/deletion-requests', label: 'Deletion Requests', icon: UserX },
  { id: 'audit', path: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({ pendingRequests = 0, unreadMessages = 0, pendingDeletions = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item) => {
    if (item.path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <div style={styles.logoIcon}>
          <Shield size={22} strokeWidth={1.5} />
        </div>
        <span style={styles.logoText}>Admin Panel</span>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navLabel}>Management</div>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = isActive(item);

          let badgeCount = 0;
          if (item.id === 'requests') badgeCount = pendingRequests;
          if (item.id === 'messages') badgeCount = unreadMessages;
          if (item.id === 'deletions') badgeCount = pendingDeletions;

          return (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(active ? styles.navItemActive : {}),
              }}
              onClick={() => navigate(item.path)}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  ...styles.badge,
                  background: item.id === 'messages' ? '#7c3aed' : item.id === 'deletions' ? '#ef4444' : '#f59e0b'
                }}>
                  {badgeCount}
                </span>
              )}
              {active && <div style={styles.activeIndicator} />}
            </button>
          );
        })}
      </nav>

      {/* Back to dashboard */}
      <div style={styles.backArea}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    background: 'rgba(10, 10, 18, 0.95)',
    borderRight: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e2e8f0, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#475569',
    padding: '8px 12px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 450,
    color: '#94a3b8',
    background: 'transparent',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    position: 'relative',
    fontFamily: 'inherit',
    width: '100%',
  },
  navItemActive: {
    color: '#e2e8f0',
    background: 'rgba(239, 68, 68, 0.1)',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    borderRadius: 2,
    background: 'linear-gradient(180deg, #ef4444, #f59e0b)',
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#fff',
    borderRadius: 10,
    padding: '2px 7px',
    minWidth: 20,
    textAlign: 'center',
  },
  backArea: {
    padding: '16px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    fontSize: 14,
    color: '#94a3b8',
    background: 'none',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'color 0.15s ease',
  },
};
