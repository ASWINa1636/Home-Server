/**
 * AdminLayout.jsx — Admin panel layout wrapper.
 * Sidebar + routed content area.
 * Mobile: sidebar becomes off-canvas drawer with hamburger toggle.
 */
import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminUserDetail from './AdminUserDetail';
import AdminDevices from './AdminDevices';
import AdminStorageRequests from './AdminStorageRequests';
import AdminMessages from './AdminMessages';
import AdminDeletionRequests from './AdminDeletionRequests';
import AdminAuditLog from './AdminAuditLog';
import AdminSettings from './AdminSettings';
import api from '../../api';

export default function AdminLayout() {
  const [stats, setStats] = useState({ pendingRequests: 0, unreadMessages: 0, pendingDeletions: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const loadStats = () => {
    api.get('/api/admin/overview')
      .then(res => setStats({
        pendingRequests: res.data.pending_requests || 0,
        unreadMessages: res.data.unread_messages || 0,
        pendingDeletions: res.data.pending_deletions || 0,
      }))
      .catch(() => {});
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 20000);
    return () => clearInterval(interval);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={styles.layout}>
      <AdminSidebar
        pendingRequests={stats.pendingRequests}
        unreadMessages={stats.unreadMessages}
        pendingDeletions={stats.pendingDeletions}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main style={styles.main} className="admin-main">
        {/* Mobile header with hamburger */}
        <div className="admin-mobile-header" style={styles.mobileHeader}>
          <button
            className="btn btn-ghost btn-icon mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={styles.hamburgerBtn}
          >
            <Menu size={20} />
          </button>
          <span style={styles.mobileTitle}>Admin Panel</span>
        </div>
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:userId" element={<AdminUserDetail />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="devices" element={<AdminDevices />} />
          <Route path="storage-requests" element={<AdminStorageRequests />} />
          <Route path="deletion-requests" element={<AdminDeletionRequests />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0f',
  },
  main: {
    flex: 1,
    marginLeft: 260,
    padding: '24px 32px',
    minHeight: '100vh',
  },
  mobileHeader: {
    display: 'none',
    alignItems: 'center',
    gap: 12,
    padding: '0 0 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    marginBottom: 16,
  },
  hamburgerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    color: '#e2e8f0',
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e2e8f0, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
};
