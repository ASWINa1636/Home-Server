/**
 * ChangePasswordModal.jsx — Modal for logged-in users to change their password securely.
 */
import { useState } from 'react';
import { Lock, X, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();

  const validations = [
    { label: 'At least 8 characters', test: p => p.length >= 8 },
    { label: 'One uppercase letter', test: p => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: p => /[a-z]/.test(p) },
    { label: 'One number', test: p => /[0-9]/.test(p) },
    { label: 'One special character', test: p => /[^A-Za-z0-9]/.test(p) },
  ];
  
  const isStrengthValid = validations.every(v => v.test(newPassword));
  const isMatchValid = newPassword === confirmPassword && newPassword.length > 0;
  const isDifferentFromCurrent = newPassword !== currentPassword;
  const allValid = isStrengthValid && isMatchValid && isDifferentFromCurrent && currentPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allValid || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      // Update session with new token to prevent being logged out
      if (res.data.token) {
        // Assuming your auth context has a way to just set the token seamlessly,
        // or we just reuse `login(token, username, isAdmin)` if we had access to them.
        // For now, we will simply rely on the token update in local storage if login is called.
        // If login requires username/isAdmin, we might just update localStorage directly 
        // and api.defaults.headers, but let's see if login handles it.
        const userStr = localStorage.getItem('homeserver_user');
        const adminStr = localStorage.getItem('homeserver_admin');
        if (userStr) {
          login(res.data.token, userStr, adminStr === 'true');
        }
      }
      
      addToast(res.data.message, 'success');
      handleClose();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={20} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Change Password</h3>
          </div>
          <button type="button" style={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Current Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                style={{ width: '100%', paddingRight: 44 }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input"
              placeholder="Enter new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={styles.validationBox}>
            <div style={styles.validationGrid}>
              {validations.map((v, i) => {
                const isValid = v.test(newPassword);
                return (
                  <div key={i} style={{ ...styles.validationItem, color: isValid ? '#10b981' : '#64748b' }}>
                    <CheckCircle size={14} style={{ marginRight: 6 }} />
                    {v.label}
                  </div>
                );
              })}
              <div style={{ 
                ...styles.validationItem, 
                color: isMatchValid ? '#10b981' : '#64748b' 
              }}>
                <CheckCircle size={14} style={{ marginRight: 6 }} />
                Passwords match
              </div>
              <div style={{ 
                ...styles.validationItem, 
                color: (newPassword.length > 0 && isDifferentFromCurrent) ? '#10b981' : '#64748b' 
              }}>
                <CheckCircle size={14} style={{ marginRight: 6 }} />
                Different from current
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!allValid || loading}>
              {loading ? 'Saving...' : 'Change Password'}
            </button>
          </div>
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
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)',
  },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 500, color: '#94a3b8', paddingLeft: 2 },
  passwordWrapper: { position: 'relative' },
  eyeButton: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  validationBox: {
    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
    padding: 12, borderRadius: 10,
  },
  validationGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
  },
  validationItem: {
    display: 'flex', alignItems: 'center', fontSize: 11, transition: 'color 0.2s ease',
  },
};
