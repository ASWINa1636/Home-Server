/**
 * AdminLayout.jsx — Admin panel layout wrapper.
 * Sidebar + routed content area.
 */
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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

  return (
    <div style={styles.layout}>
      <AdminSidebar
        pendingRequests={stats.pendingRequests}
        unreadMessages={stats.unreadMessages}
        pendingDeletions={stats.pendingDeletions}
      />
      <main style={styles.main}>
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
};
