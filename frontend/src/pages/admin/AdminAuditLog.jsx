/**
 * AdminAuditLog.jsx — Paginated audit log page.
 * Displays all administrative actions with timestamp, admin username, action type, IP address, and details.
 */
import { useState, useEffect } from 'react';
import { ScrollText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import api from '../../api';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
}) : '';

const actionBadges = {
  set_quota: { color: '#7c3aed', label: 'Set Quota' },
  toggle_active: { color: '#ef4444', label: 'Toggle Active' },
  toggle_admin: { color: '#f59e0b', label: 'Toggle Admin' },
  force_logout: { color: '#eab308', label: 'Force Logout' },
  revoke_device: { color: '#3b82f6', label: 'Revoke Device' },
  approve_storage_request: { color: '#10b981', label: 'Approve Request' },
  reject_storage_request: { color: '#ef4444', label: 'Reject Request' },
};

export default function AdminAuditLog() {
  const [data, setData] = useState({ logs: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const load = () => {
    setLoading(true);
    let url = `/api/admin/audit-logs?page=${page}&limit=50`;
    if (actionFilter) url += `&action_filter=${actionFilter}`;

    api.get(url)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, actionFilter]);

  const totalPages = Math.ceil((data.total || 0) / 50) || 1;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Audit Log</h1>
          <p style={styles.pageSubtitle}>Immutable history of administrative actions</p>
        </div>

        {/* Action filter */}
        <select
          className="input"
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          style={{ width: 200, fontSize: 13 }}
        >
          <option value="">All Actions</option>
          <option value="set_quota">Set Quota</option>
          <option value="toggle_active">Toggle Active</option>
          <option value="toggle_admin">Toggle Admin</option>
          <option value="force_logout">Force Logout</option>
          <option value="revoke_device">Revoke Device</option>
          <option value="approve_storage_request">Approve Request</option>
          <option value="reject_storage_request">Reject Request</option>
        </select>
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 300, borderRadius: 14 }} /></div>
        ) : data.logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
            No audit logs found
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Admin</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Target User ID</th>
                <th style={styles.th}>IP Address</th>
                <th style={styles.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map(log => {
                const badge = actionBadges[log.action] || { color: '#94a3b8', label: log.action };
                return (
                  <tr key={log.id} style={styles.tr}>
                    <td style={{ ...styles.td, color: '#94a3b8', fontSize: 12 }}>{formatDate(log.created_at)}</td>
                    <td style={{ ...styles.td, color: '#e2e8f0', fontWeight: 500 }}>{log.admin_username}</td>
                    <td style={styles.td}>
                      <span style={{
                        fontSize: 12, fontWeight: 500, color: badge.color,
                        background: `${badge.color}15`, padding: '3px 8px', borderRadius: 6,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: '#94a3b8' }}>{log.target_user_id || '—'}</td>
                    <td style={{ ...styles.td, color: '#475569', fontFamily: 'var(--font-mono)' }}>{log.ip_address || '—'}</td>
                    <td style={{ ...styles.td, color: '#94a3b8', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Page {page} of {totalPages}</span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#475569' },
  card: { background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 16, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  th: { padding: '14px 18px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '12px 18px', fontSize: 13 },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' },
};
