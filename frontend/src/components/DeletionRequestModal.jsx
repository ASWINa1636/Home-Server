/**
 * DeletionRequestModal.jsx — Modal for normal users to request account deletion.
 */
import { useState, useEffect } from 'react';
import { UserX, AlertTriangle, X } from 'lucide-react';
import api from '../api';
import { useToast } from '../contexts/ToastContext';

export default function DeletionRequestModal({ isOpen, onClose }) {
  const [reason, setReason] = useState('');
  const [existingRequest, setExistingRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const checkStatus = () => {
    api.get('/api/user/deletion-request')
      .then(res => setExistingRequest(res.data.has_request ? res.data : null))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await api.post('/api/user/deletion-request', { reason });
      addToast(res.data.message, 'success');
      setReason('');
      checkStatus();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserX size={20} style={{ color: '#ef4444' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Request Account Deletion</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#475569' }}>Checking status...</div>
        ) : existingRequest ? (
          <div style={{ padding: 20 }}>
            <div style={styles.statusBox}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Status of your deletion request:</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: existingRequest.status === 'approved' ? '#ef4444' : existingRequest.status === 'rejected' ? '#10b981' : '#f59e0b', marginTop: 4 }}>
                {existingRequest.status.toUpperCase()}
              </div>
              {existingRequest.admin_response && (
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
                  Note from Admin: "{existingRequest.admin_response}"
                </div>
              )}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            <div style={styles.warningAlert}>
              <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                Requesting account deletion will submit a request to the administrator. If approved, all your stored files, account history, and devices will be permanently deleted.
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Reason for deletion (optional):
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Let us know why you are leaving..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%', fontSize: 13, resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={submitting}
                style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600 }}
              >
                {submitting ? 'Submitting...' : 'Submit Deletion Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  content: {
    background: 'rgba(16, 16, 28, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 20, width: 440, maxWidth: '90vw', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)',
  },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 },
  statusBox: { background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, textAlign: 'center' },
  warningAlert: {
    display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)', padding: 12, borderRadius: 10, marginBottom: 16,
  },
};
