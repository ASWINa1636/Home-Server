/**
 * AdminStorageRequests.jsx — Storage increase requests management page.
 * Allows admin to view pending/approved/rejected requests and approve/reject with new quota setting.
 */
import { useState, useEffect } from 'react';
import { Inbox, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../api';
import StorageBar from '../../components/admin/StorageBar';
import { useToast } from '../../contexts/ToastContext';

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '';

export default function AdminStorageRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [processingId, setProcessingId] = useState(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [newQuotaGb, setNewQuotaGb] = useState('');
  const { addToast } = useToast();

  const load = () => {
    const query = filter === 'all' ? '' : `?status=${filter}`;
    api.get(`/api/admin/storage-requests${query}`)
      .then(res => setRequests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id, action) => {
    try {
      const payload = {
        action,
        new_quota_gb: action === 'approve' ? parseFloat(newQuotaGb) : null,
        response_message: responseMsg,
      };
      const res = await api.put(`/api/admin/storage-requests/${id}`, payload);
      addToast(res.data.message, 'success');
      setProcessingId(null);
      setResponseMsg('');
      setNewQuotaGb('');
      load();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to process request', 'error');
    }
  };

  if (loading) {
    return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 400, borderRadius: 16 }} /></div>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Storage Requests</h1>
          <p style={styles.pageSubtitle}>Review and manage user storage expansion requests</p>
        </div>

        {/* Status filter tabs */}
        <div style={styles.tabGroup}>
          {['pending', 'approved', 'rejected', 'all'].map(t => (
            <button
              key={t}
              style={{
                ...styles.tab,
                ...(filter === t ? styles.activeTab : {}),
              }}
              onClick={() => setFilter(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        {requests.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
            No {filter !== 'all' ? filter : ''} storage requests found
          </div>
        ) : (
          requests.map(req => {
            const isProcessing = processingId === req.id;
            const reqGb = (req.requested_amount / (1024 ** 3)).toFixed(1);

            return (
              <div key={req.id} style={styles.requestCard}>
                <div style={styles.topRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={styles.avatar}>{req.username[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{req.username}</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>Requested {formatDate(req.created_at)}</div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 8,
                    color: req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b',
                    background: req.status === 'approved' ? 'rgba(16,185,129,0.1)' : req.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  }}>
                    {req.status.toUpperCase()}
                  </span>
                </div>

                <div style={styles.detailsRow}>
                  <div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Current Usage</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{formatSize(req.current_usage)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Requested Increase</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>+{reqGb} GB</div>
                  </div>
                </div>

                {req.message && (
                  <div style={styles.msgBox}>
                    <span style={{ fontSize: 12, color: '#475569' }}>User reason: </span>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>"{req.message}"</span>
                  </div>
                )}

                {req.admin_response && (
                  <div style={styles.responseBox}>
                    <span style={{ fontSize: 12, color: '#475569' }}>Admin response: </span>
                    <span style={{ fontSize: 13, color: '#e2e8f0' }}>"{req.admin_response}"</span>
                  </div>
                )}

                {/* Actions for pending requests */}
                {req.status === 'pending' && (
                  <div style={{ marginTop: 14 }}>
                    {!isProcessing ? (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          className="btn"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none' }}
                          onClick={() => {
                            setProcessingId(req.id);
                            setNewQuotaGb(reqGb);
                          }}
                        >
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button
                          className="btn"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none' }}
                          onClick={() => {
                            setProcessingId(req.id);
                            setNewQuotaGb('');
                          }}
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    ) : (
                      <div style={styles.processForm}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: '#94a3b8' }}>New Quota (GB):</span>
                          <input
                            className="input"
                            type="number"
                            step="1"
                            value={newQuotaGb}
                            onChange={e => setNewQuotaGb(e.target.value)}
                            style={{ width: 100, fontSize: 13 }}
                          />
                        </div>
                        <input
                          className="input"
                          placeholder="Optional note for user..."
                          value={responseMsg}
                          onChange={e => setResponseMsg(e.target.value)}
                          style={{ fontSize: 13, marginTop: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAction(req.id, 'approve')}
                          >
                            Confirm Approval
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                            onClick={() => handleAction(req.id, 'reject')}
                          >
                            Confirm Rejection
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setProcessingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#475569' },
  tabGroup: { display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10 },
  tab: {
    background: 'none', border: 'none', color: '#94a3b8', padding: '6px 14px',
    fontSize: 13, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
  },
  activeTab: { color: '#e2e8f0', background: 'rgba(124,58,237,0.2)' },
  card: { display: 'flex', flexDirection: 'column', gap: 14 },
  requestCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 14, padding: 20,
  },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600,
  },
  detailsRow: { display: 'flex', gap: 32, marginBottom: 12 },
  msgBox: { background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 8, marginBottom: 8 },
  responseBox: { background: 'rgba(124,58,237,0.08)', padding: '8px 12px', borderRadius: 8, marginBottom: 8 },
  processForm: { background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, marginTop: 10 },
};
