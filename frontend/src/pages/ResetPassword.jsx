/**
 * ResetPassword.jsx — Dedicated page to reset a password using a token.
 */
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password strength validation
  const validations = [
    { label: 'At least 8 characters', test: p => p.length >= 8 },
    { label: 'One uppercase letter', test: p => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: p => /[a-z]/.test(p) },
    { label: 'One number', test: p => /[0-9]/.test(p) },
    { label: 'One special character', test: p => /[^A-Za-z0-9]/.test(p) },
  ];
  
  const allValid = validations.every(v => v.test(password)) && password === confirmPassword && password.length > 0;

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allValid || !token) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/reset-password', {
        token,
        new_password: password
      });
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.orbContainer}>
        <div style={{ ...styles.orb, ...styles.orb1 }} />
        <div style={{ ...styles.orb, ...styles.orb2 }} />
      </div>

      <div style={styles.card}>
        <div style={styles.branding}>
          <div style={styles.logoIcon}>
            <ShieldCheck size={28} strokeWidth={1.5} />
          </div>
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>Enter a new, strong password below</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {success ? (
          <div style={styles.successBox}>
            <CheckCircle size={32} style={{ color: '#10b981', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, color: '#e2e8f0', margin: '0 0 8px' }}>Password Reset!</h3>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.5 }}>
              {success}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textDecoration: 'none' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter new password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44, width: '100%' }}
                  disabled={!token || loading}
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
              <label style={styles.label}>Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ width: '100%' }}
                disabled={!token || loading}
              />
            </div>

            {/* Validation Checklist */}
            <div style={styles.validationBox}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
                Password Requirements:
              </div>
              <div style={styles.validationGrid}>
                {validations.map((v, i) => {
                  const isValid = v.test(password);
                  return (
                    <div key={i} style={{ ...styles.validationItem, color: isValid ? '#10b981' : '#64748b' }}>
                      <CheckCircle size={14} style={{ marginRight: 6 }} />
                      {v.label}
                    </div>
                  );
                })}
                <div style={{ 
                  ...styles.validationItem, 
                  color: (confirmPassword && password === confirmPassword) ? '#10b981' : '#64748b' 
                }}>
                  <CheckCircle size={14} style={{ marginRight: 6 }} />
                  Passwords match
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={!allValid || !token || loading}
            >
              {loading ? 'Saving...' : (
                <>
                  <Lock size={18} style={{ marginRight: 8 }} />
                  Reset Password
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, position: 'relative', overflow: 'hidden', background: '#0a0a0f',
  },
  orbContainer: { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.4 },
  orb1: { width: 400, height: 400, background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', top: '10%', left: '15%', animation: 'float 8s ease-in-out infinite' },
  orb2: { width: 350, height: 350, background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', bottom: '15%', right: '10%', animation: 'float 10s ease-in-out infinite reverse' },
  card: {
    width: '100%', maxWidth: 440, padding: '40px 36px',
    background: 'rgba(16, 16, 28, 0.7)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1,
  },
  branding: { textAlign: 'center', marginBottom: 28 },
  logoIcon: {
    width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff',
  },
  title: { fontSize: 26, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8' },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444', padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 20,
    textAlign: 'center',
  },
  successBox: { textAlign: 'center', padding: '10px 0' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#94a3b8', paddingLeft: 2 },
  passwordWrapper: { position: 'relative' },
  eyeButton: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  validationBox: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)',
    padding: 16, borderRadius: 12, marginTop: 4,
  },
  validationGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  validationItem: {
    display: 'flex', alignItems: 'center', fontSize: 12, transition: 'color 0.2s ease',
  },
  submitBtn: { width: '100%', padding: '14px 20px', fontSize: 15, fontWeight: 600, marginTop: 8 },
};
