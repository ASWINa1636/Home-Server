/**
 * Login.jsx — Beautiful glassmorphic login page with animated background.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import { Eye, EyeOff, LogIn, Server } from 'lucide-react';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please fill in all fields');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', form);
      login(res.data.token, res.data.username, res.data.is_admin);
      addToast(`Welcome back, ${res.data.username}!`, 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid username or password';
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div style={styles.page}>
      {/* Animated background orbs */}
      <div style={styles.orbContainer}>
        <div style={{ ...styles.orb, ...styles.orb1 }} />
        <div style={{ ...styles.orb, ...styles.orb2 }} />
        <div style={{ ...styles.orb, ...styles.orb3 }} />
      </div>

      {/* Login card */}
      <div style={{
        ...styles.card,
        animation: shake ? 'shake 0.5s ease' : 'fadeInUp 0.6s ease',
      }}>
        {/* Branding */}
        <div style={styles.branding}>
          <div style={styles.logoIcon}>
            <Server size={28} strokeWidth={1.5} />
          </div>
          <h1 style={styles.title}>HomeServer</h1>
          <p style={styles.subtitle}>Sign in to your private cloud</p>
        </div>

        {/* Error message */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>✕</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              id="login-username"
              type="text"
              className="input"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ paddingRight: 44 }}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Create one</Link>
        </p>
      </div>

      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    background: '#0a0a0f',
  },
  orbContainer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.4,
  },
  orb1: {
    width: 400,
    height: 400,
    background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
    top: '10%',
    left: '15%',
    animation: 'float 8s ease-in-out infinite',
  },
  orb2: {
    width: 350,
    height: 350,
    background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
    bottom: '15%',
    right: '10%',
    animation: 'float 10s ease-in-out infinite reverse',
  },
  orb3: {
    width: 250,
    height: 250,
    background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
    top: '50%',
    left: '60%',
    animation: 'float 12s ease-in-out infinite 2s',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: '40px 36px',
    background: 'rgba(16, 16, 28, 0.7)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(124, 58, 237, 0.08)',
    position: 'relative',
    zIndex: 1,
  },
  branding: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e2e8f0, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 400,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 20,
    animation: 'fadeIn 0.3s ease',
  },
  errorIcon: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#94a3b8',
    paddingLeft: 2,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    width: '100%',
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 600,
    marginTop: 4,
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#94a3b8',
  },
  link: {
    color: '#a78bfa',
    fontWeight: 500,
  },
};