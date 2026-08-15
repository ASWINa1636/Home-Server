/**
 * AdminDeletionRequests.jsx — Account deletion requests management page.
 * Allows admin to view pending/approved/rejected deletion requests and execute permanent account deletion.
 */
import { useState, useEffect } from 'react';
import { UserX, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api';
import AdminHeader from '../../components/admin/AdminHeader';
import ConfirmModal from '../../components/admin/ConfirmModal';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useToast } from '../../contexts/ToastContext';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '';

export default function AdminDeletionRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [responseMsg, setResponseMsg] = useState('');
  const [processing, setProcessing] = useState(false);
  const { addToast } = useToast();

  const load = async () => {
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const res = await api.get(`/api/admin/deletion-requests${query}`);
      setRequests(res.data);
    } catch {}
  };

  const refreshState = useAutoRefresh(load, 20000);

  useEffect(() => {
    load();
  }, [filter]);

  const handleApprove = async () => {
    if (!confirmTarget || processing) return;
    if (confirmUsername.trim() !== confirmTarget.username) {
      addToast(`Please type '${confirmTarget.username}' exactly to confirm deletion`, 'error');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.put(`/api/admin/deletion-requests/${confirmTarget.id}`, {
        action: 'approve',
        response_message: responseMsg || 'Account and data permanently removed.',
      });
      addToast(res.data.message, 'success');
      setConfirmTarget(null);
      setConfirmUsername('');
      setResponseMsg('');
      load();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to approve deletion', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (req) => {
    try {
      const res = await api.put(`/api/admin/deletion-requests/${req.id}`, {
        action: 'reject',
        response_message: 'Deletion request denied by administrator.',
      });
      addToast(res.data.message, 'success');
      load();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to reject deletion request', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <AdminHeader
        title="Account Deletion Requests"
        subtitle="Review user requests to permanently delete their account and associated files"
        refreshState={refreshState}
      />

      {/* Confirmation modal for irreversible deletion */}
      {confirmTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#ef4444', marginBottom: 16 }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#e2e8f0' }}>PERMANENT DELETE WARNING</h3>
            </div>

            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
              This will permanently erase user <strong style={{ color: '#e2e8f0' }}>{confirmTarget.username}</strong>, all their uploaded files, devices, and data from disk. <strong style={{ color: '#ef4444' }}>This action CANNOT be undone.</strong>
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Type <strong style={{ color: '#e2e8f0' }}>{confirmTarget.username}</strong> to confirm:
              </label>
              <input
                className="input"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={confirmTarget.username}
                style={{ fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Optional Admin Message to User:
              </label>
              <input
                className="input"
                value={responseMsg}
                onChange={(e) => setResponseMsg(e.target.value)}
                placeholder="Account deleted per request."
                style={{ fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmTarget(null)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={handleApprove}
                disabled={processing || confirmUsername.trim() !== confirmTarget.username}
              >
                {processing ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
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

      <div style={styles.cardList}>
        {requests.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
            No {filter !== 'all' ? filter : ''} account deletion requests found
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} style={styles.requestCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <UserX size={20} style={{ color: '#ef4444' }} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{req.username}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>{req.email} • Requested {formatDate(req.created_at)}</div>
                  </div>
                </div>

                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8,
                  color: req.status === 'approved' ? '#ef4444' : req.status === 'rejected' ? '#10b981' : '#f59e0b',
                  background: req.status === 'approved' ? 'rgba(239,68,68,0.1)' : req.status === 'rejected' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                }}>
                  {req.status.toUpperCase()}
                </span>
              </div>

              {req.reason && (
                <div style={styles.reasonBox}>
                  <span style={{ fontSize: 12, color: '#475569' }}>User Reason: </span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>"{req.reason}"</span>
                </div>
              )}

              {req.status === 'pending' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    className="btn"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none' }}
                    onClick={() => {
                      setConfirmTarget(req);
                      setConfirmUsername('');
                    }}
                  >
                    <CheckCircle size={16} /> Approve Deletion
                  </button>
                  <button
                    className="btn"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none' }}
                    onClick={() => handleReject(req)}
                  >
                    <XCircle size={16} /> Reject Request
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  tabGroup: { display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10, marginBottom: 20, width: 'fit-content' },
  tab: {
    background: 'none', border: 'none', color: '#94a3b8', padding: '6px 14px',
    fontSize: 13, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
  },
  activeTab: { color: '#e2e8f0', background: 'rgba(124,58,237,0.2)' },
  cardList: { display: 'flex', flexDirection: 'column', gap: 14 },
  requestCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 16, padding: 20,
  },
  reasonBox: { background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 8, marginBottom: 8 },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalContent: {
    background: 'rgba(20, 20, 30, 0.95)', border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 20, padding: 28, width: 460, maxWidth: '90vw',
  },
};
