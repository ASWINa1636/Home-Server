/**
 * AdminOverview.jsx — Admin dashboard overview page.
 * Stat cards, storage chart, activity chart, recent activity with live auto-refresh.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, HardDrive, Smartphone, Inbox,
  UserPlus, Activity, MessageSquare, UserX
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';
import api from '../../api';
import StatCard from '../../components/admin/StatCard';
import AdminHeader from '../../components/admin/AdminHeader';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
};

const chartTooltipStyle = {
  backgroundColor: 'rgba(16, 16, 28, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize: 13,
  color: '#e2e8f0',
};

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [storageChart, setStorageChart] = useState([]);
  const [activityChart, setActivityChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadAllData = async () => {
    try {
      const [overviewRes, storageRes, activityRes] = await Promise.all([
        api.get('/api/admin/overview'),
        api.get('/api/admin/charts/storage'),
        api.get('/api/admin/charts/activity?days=30'),
      ]);
      setStats(overviewRes.data);
      setStorageChart(storageRes.data);
      setActivityChart(activityRes.data);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const refreshState = useAutoRefresh(loadAllData, 20000);

  useEffect(() => {
    loadAllData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <AdminHeader
        title="Dashboard Overview"
        subtitle="Monitor your HomeServer at a glance"
        refreshState={refreshState}
      />

      {/* Stat cards grid */}
      <div style={styles.statGrid}>
        <StatCard
          icon={<Users size={22} />}
          label="Total Users"
          value={stats?.total_users || 0}
          subtitle={`${stats?.new_users_week || 0} new this week`}
          color="#7c3aed"
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          icon={<FileText size={22} />}
          label="Total Files"
          value={stats?.total_files || 0}
          color="#06b6d4"
        />
        <StatCard
          icon={<HardDrive size={22} />}
          label="Total Storage"
          value={formatSize(stats?.total_storage || 0)}
          color="#10b981"
        />
        <StatCard
          icon={<Smartphone size={22} />}
          label="Active Devices"
          value={stats?.total_devices || 0}
          color="#f59e0b"
          onClick={() => navigate('/admin/devices')}
        />
        <StatCard
          icon={<MessageSquare size={22} />}
          label="Support Messages"
          value={stats?.unread_messages || 0}
          subtitle="Unread messages"
          color={stats?.unread_messages > 0 ? '#7c3aed' : '#475569'}
          onClick={() => navigate('/admin/messages')}
        />
        <StatCard
          icon={<Inbox size={22} />}
          label="Storage Requests"
          value={stats?.pending_requests || 0}
          subtitle="Pending approval"
          color={stats?.pending_requests > 0 ? '#f59e0b' : '#475569'}
          onClick={() => navigate('/admin/storage-requests')}
        />
        <StatCard
          icon={<UserX size={22} />}
          label="Deletion Requests"
          value={stats?.pending_deletions || 0}
          subtitle="Pending approval"
          color={stats?.pending_deletions > 0 ? '#ef4444' : '#475569'}
          onClick={() => navigate('/admin/deletion-requests')}
        />
        <StatCard
          icon={<Activity size={22} />}
          label="Active Today"
          value={stats?.active_24h || 0}
          subtitle="Logged in within 24h"
          color="#3b82f6"
        />
      </div>

      {/* Charts */}
      <div style={styles.chartGrid}>
        {/* Storage per user */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Storage Usage by User</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storageChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="username" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `${v} GB`} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v, name) => [
                    `${v} GB`,
                    name === 'used_gb' ? 'Used' : 'Quota'
                  ]}
                />
                <Bar dataKey="used_gb" fill="#7c3aed" radius={[6, 6, 0, 0]} name="used_gb" />
                <Bar dataKey="quota_gb" fill="rgba(255,255,255,0.06)" radius={[6, 6, 0, 0]} name="quota_gb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Login activity */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Login Activity (30 days)</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={v => v.slice(5)}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="logins"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#loginGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 20,
  },
  chartCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: '20px 24px',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 16,
  },
};
