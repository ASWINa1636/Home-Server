/**
 * StorageRequestModal.jsx — Modal for normal users to request additional storage quota.
 */
import { useState, useEffect } from 'react';
import { HardDrive, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../api';
import { useToast } from '../contexts/ToastContext';

export default function StorageRequestModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const loadRequests = () => {
    api.get('/api/user/storage-requests')
      .then(res => setMyRequests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await api.post('/api/user/storage-request', {
        requested_amount: parseInt(amount, 10),
        message,
      });
      addToast(res.data.message, 'success');
      setMessage('');
      loadRequests();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasPending = myRequests.some(r => r.status === 'pending');

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HardDrive size={20} style={{ color: '#7c3aed' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Request Additional Storage</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {hasPending ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={styles.pendingCard}>
              <Clock size={28} style={{ color: '#f59e0b', marginBottom: 8 }} />
              <h4 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Pending Storage Request</h4>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                You already have a pending request awaiting admin review.
              </p>
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Additional Storage Amount:
              </label>
              <select
                className="select"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ width: '100%', fontSize: 14 }}
              >
                <option value={5}>+ 5 GB</option>
                <option value={10}>+ 10 GB</option>
                <option value={20}>+ 20 GB</option>
                <option value={50}>+ 50 GB</option>
                <option value={100}>+ 100 GB</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Reason / Note for Admin (optional):
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Explain why you need more storage space..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ width: '100%', fontSize: 13, resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Storage Request'}
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
  pendingCard: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: 20, borderRadius: 14 },
};
