/**
 * AdminUserDetail.jsx — Detailed view for a single user.
 * Profile info, storage chart, devices, files, admin actions.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, ShieldOff, Ban, CheckCircle, LogOut,
  HardDrive, Smartphone, FileText, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import api from '../../api';
import StorageBar from '../../components/admin/StorageBar';
import StatCard from '../../components/admin/StatCard';
import ConfirmModal from '../../components/admin/ConfirmModal';
import { useToast } from '../../contexts/ToastContext';

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : 'Never';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotaInput, setQuotaInput] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    api.get(`/api/admin/users/${userId}`)
      .then(res => {
        setUser(res.data);
        setQuotaInput((res.data.storage_quota / (1024 ** 3)).toFixed(1));
      })
      .catch(() => addToast('Failed to load user', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [userId]);

  const setQuota = async () => {
    try {
      const gb = parseFloat(quotaInput);
      if (isNaN(gb) || gb <= 0) { addToast('Invalid quota', 'error'); return; }
      await api.put(`/api/admin/users/${userId}/quota`, { quota_gb: gb });
      addToast(`Quota set to ${gb} GB`, 'success');
      load();
    } catch { addToast('Failed to update quota', 'error'); }
  };

  const toggleActive = async () => {
    try {
      const res = await api.put(`/api/admin/users/${userId}/toggle-active`);
      addToast(res.data.message, 'success');
      load();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed', 'error');
    }
    setConfirm(null);
  };

  const toggleAdmin = async () => {
    try {
      const res = await api.put(`/api/admin/users/${userId}/toggle-admin`);
      addToast(res.data.message, 'success');
      load();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed', 'error');
    }
    setConfirm(null);
  };

  const forceLogout = async () => {
    try {
      const res = await api.delete(`/api/admin/users/${userId}/force-logout`);
      addToast(res.data.message, 'success');
      load();
    } catch { addToast('Failed', 'error'); }
    setConfirm(null);
  };

  const revokeDevice = async (deviceId) => {
    try {
      await api.delete(`/api/admin/devices/${deviceId}`);
      addToast('Device revoked', 'success');
      load();
    } catch { addToast('Failed', 'error'); }
  };

  if (loading || !user) {
    return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 400, borderRadius: 16 }} /></div>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          confirmColor={confirm.color}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <button style={styles.backBtn} onClick={() => navigate('/admin/users')}>
        <ArrowLeft size={18} /> Back to Users
      </button>

      <div style={styles.profileHeader}>
        <div style={styles.avatarLg}>{user.username[0].toUpperCase()}</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={styles.name}>{user.username}</h1>
            {user.is_admin && (
              <span style={styles.adminBadge}>
                <Shield size={14} /> Admin
              </span>
            )}
            <span style={{
              ...styles.statusBadge,
              color: user.is_active ? '#10b981' : '#ef4444',
              background: user.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            }}>
              {user.is_active ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p style={styles.email}>{user.email}</p>
          <p style={styles.meta}>Joined {formatDate(user.created_at)} • Last login {formatDate(user.last_login)}</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <StatCard icon={<HardDrive size={20} />} label="Storage Used" value={formatSize(user.storage_used)} color="#7c3aed" />
        <StatCard icon={<FileText size={20} />} label="Files" value={user.file_count} color="#06b6d4" />
        <StatCard icon={<Smartphone size={20} />} label="Active Devices" value={user.device_count} color="#f59e0b" />
        <StatCard icon={<Clock size={20} />} label="Last Login" value={user.last_login ? 'Recent' : 'Never'} color="#3b82f6" />
      </div>

      {/* Storage section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Storage Quota</h3>
        <div style={styles.card}>
          <StorageBar used={user.storage_used} quota={user.storage_quota} />
          <div style={styles.quotaRow}>
            <input
              className="input"
              type="number"
              step="0.5"
              min="0.5"
              value={quotaInput}
              onChange={e => setQuotaInput(e.target.value)}
              style={{ width: 120, fontSize: 14 }}
            />
            <span style={{ color: '#475569', fontSize: 14 }}>GB</span>
            <button className="btn btn-primary" onClick={setQuota}>Update Quota</button>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Actions</h3>
        <div style={styles.actionsRow}>
          <button
            className="btn"
            onClick={() => setConfirm({
              title: user.is_active ? 'Disable User' : 'Enable User',
              message: user.is_active
                ? `This will prevent ${user.username} from logging in.`
                : `This will re-enable ${user.username}'s account.`,
              confirmText: user.is_active ? 'Disable' : 'Enable',
              color: user.is_active ? '#ef4444' : '#10b981',
              onConfirm: toggleActive,
            })}
          >
            {user.is_active ? <><Ban size={16} /> Disable Account</> : <><CheckCircle size={16} /> Enable Account</>}
          </button>

          <button
            className="btn"
            onClick={() => setConfirm({
              title: user.is_admin ? 'Demote Admin' : 'Promote to Admin',
              message: user.is_admin
                ? `Remove admin privileges from ${user.username}?`
                : `Grant admin privileges to ${user.username}?`,
              confirmText: user.is_admin ? 'Demote' : 'Promote',
              color: user.is_admin ? '#ef4444' : '#7c3aed',
              onConfirm: toggleAdmin,
            })}
          >
            {user.is_admin ? <><ShieldOff size={16} /> Demote Admin</> : <><Shield size={16} /> Promote to Admin</>}
          </button>

          <button
            className="btn"
            onClick={() => setConfirm({
              title: 'Force Logout',
              message: `Revoke all active device sessions for ${user.username}?`,
              confirmText: 'Force Logout',
              color: '#f59e0b',
              onConfirm: forceLogout,
            })}
          >
            <LogOut size={16} /> Force Logout All
          </button>
        </div>
      </div>

      {/* Devices */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Devices ({(user.devices || []).length})</h3>
        <div style={styles.card}>
          {(user.devices || []).length === 0 ? (
            <p style={{ color: '#475569', fontSize: 14 }}>No devices recorded</p>
          ) : (
            (user.devices || []).map(d => (
              <div key={d.id} style={styles.deviceRow}>
                <Smartphone size={16} style={{ color: d.is_active ? '#10b981' : '#475569' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#e2e8f0' }}>{d.device_name}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{d.ip_address} • {formatDate(d.last_seen)}</div>
                </div>
                <span style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  color: d.is_active ? '#10b981' : '#475569',
                  background: d.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                }}>
                  {d.is_active ? 'Active' : 'Revoked'}
                </span>
                {d.is_active && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => revokeDevice(d.id)}
                    style={{ fontSize: 12 }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Files */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Files ({(user.recent_files || []).length})</h3>
        <div style={styles.card}>
          {(user.recent_files || []).length === 0 ? (
            <p style={{ color: '#475569', fontSize: 14 }}>No files uploaded</p>
          ) : (
            (user.recent_files || []).map(f => (
              <div key={f.id} style={styles.fileRow}>
                <FileText size={16} style={{ color: '#94a3b8' }} />
                <span style={{ flex: 1, fontSize: 14, color: '#e2e8f0' }}>{f.name}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>{formatSize(f.size)}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>{f.folder}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    fontSize: 14, color: '#94a3b8', background: 'none', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20,
  },
  profileHeader: {
    display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
  },
  avatarLg: {
    width: 64, height: 64, borderRadius: 16,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  name: { fontSize: 26, fontWeight: 700, color: '#e2e8f0' },
  email: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  meta: { fontSize: 12, color: '#475569', marginTop: 4 },
  adminBadge: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 12, fontWeight: 600, color: '#f59e0b',
    background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 8,
  },
  statusBadge: {
    fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12, marginBottom: 28,
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 12,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 14, padding: 20,
  },
  quotaRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginTop: 16,
  },
  actionsRow: {
    display: 'flex', gap: 10, flexWrap: 'wrap',
  },
  deviceRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
};
