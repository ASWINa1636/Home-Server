/**
 * AdminDevices.jsx — All devices list with revoke functionality.
 */
import { useState, useEffect } from 'react';
import { Smartphone, Wifi, WifiOff } from 'lucide-react';
import api from '../../api';
import ConfirmModal from '../../components/admin/ConfirmModal';
import { useToast } from '../../contexts/ToastContext';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : 'Unknown';

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    api.get('/api/admin/devices')
      .then(res => setDevices(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const revoke = async () => {
    if (!revokeTarget) return;
    try {
      await api.delete(`/api/admin/devices/${revokeTarget.id}`);
      addToast(`Device '${revokeTarget.device_name}' revoked`, 'success');
      load();
    } catch { addToast('Failed to revoke device', 'error'); }
    setRevokeTarget(null);
  };

  const active = devices.filter(d => d.is_active);
  const revoked = devices.filter(d => !d.is_active);

  if (loading) {
    return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 400, borderRadius: 16 }} /></div>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {revokeTarget && (
        <ConfirmModal
          title="Revoke Device"
          message={`Revoke access for "${revokeTarget.device_name}" used by ${revokeTarget.username}?`}
          confirmText="Revoke"
          confirmColor="#ef4444"
          onConfirm={revoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}

      <h1 style={styles.pageTitle}>Devices</h1>
      <p style={styles.pageSubtitle}>
        {active.length} active device{active.length !== 1 ? 's' : ''} • {revoked.length} revoked
      </p>

      {/* Active devices */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <Wifi size={16} style={{ color: '#10b981' }} /> Active Devices
        </h3>
        <div style={styles.card}>
          {active.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 14 }}>No active devices</p>
          ) : active.map(d => (
            <div key={d.id} style={styles.row}>
              <Smartphone size={18} style={{ color: '#10b981' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>
                  {d.device_name}
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  {d.username} • {d.ip_address} • Last seen {formatDate(d.last_seen)}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444', fontSize: 12 }}
                onClick={() => setRevokeTarget(d)}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Revoked devices */}
      {revoked.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <WifiOff size={16} style={{ color: '#475569' }} /> Revoked Devices
          </h3>
          <div style={styles.card}>
            {revoked.map(d => (
              <div key={d.id} style={{ ...styles.row, opacity: 0.5 }}>
                <Smartphone size={18} style={{ color: '#475569' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#94a3b8' }}>{d.device_name}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    {d.username} • {d.ip_address} • {formatDate(d.last_seen)}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#475569', padding: '3px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  Revoked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageTitle: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#475569', marginBottom: 28 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 14, padding: '4px 20px',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
};
