/**
 * ForgotPasswordModal.jsx — Modal to request a password reset link.
 */
import { useState } from 'react';
import { Mail, X, Send } from 'lucide-react';
import api from '../api';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/api/auth/forgot-password', {
        email_or_username: identifier.trim()
      });
      setSuccess(res.data.message);
      setIdentifier('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIdentifier('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={20} style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Reset Password</h3>
          </div>
          <button type="button" style={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {success ? (
            <div style={styles.successBox}>
              <div style={{ fontSize: 13, color: '#10b981', lineHeight: 1.5 }}>{success}</div>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ marginTop: 16, width: '100%' }} 
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 }}>
                Enter your username or email address. If we find a matching account, we will generate a password reset link.
              </p>

              {error && (
                <div style={styles.errorBox}>{error}</div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Email or Username
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="name@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ width: '100%', fontSize: 14 }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !identifier.trim()}>
                  {loading ? 'Sending...' : (
                    <>
                      <Send size={16} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
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
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    animation: 'fadeInUp 0.3s ease',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)',
  },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 },
  successBox: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: 16,
    borderRadius: 12,
    textAlign: 'center',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 16,
  }
};
