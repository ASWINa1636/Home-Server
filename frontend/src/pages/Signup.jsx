/**
 * Signup.jsx — Beautiful signup page with password strength meter.
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import { Eye, EyeOff, UserPlus, Server, Check, X } from 'lucide-react';

function PasswordStrengthMeter({ password }) {
  const checks = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(password) },
  ], [password]);

  const score = checks.filter(c => c.met).length;
  const percent = (score / checks.length) * 100;

  const getColor = () => {
    if (score <= 1) return '#ef4444';
    if (score <= 2) return '#f59e0b';
    if (score <= 3) return '#eab308';
    if (score <= 4) return '#22c55e';
    return '#10b981';
  };

  const getLabel = () => {
    if (score <= 1) return 'Weak';
    if (score <= 2) return 'Fair';
    if (score <= 3) return 'Good';
    if (score <= 4) return 'Strong';
    return 'Excellent';
  };

  if (!password) return null;

  return (
    <div style={{ marginTop: 8, animation: 'fadeIn 0.3s ease' }}>
      {/* Bar */}
      <div style={{
        height: 4,
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          background: getColor(),
          borderRadius: 2,
          transition: 'all 0.3s ease',
        }} />
      </div>

      {/* Label */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 12, color: getColor(), fontWeight: 500 }}>{getLabel()}</span>
        <span style={{ fontSize: 12, color: '#475569' }}>{score}/{checks.length}</span>
      </div>

      {/* Requirements list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {checks.map((check, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: check.met ? '#10b981' : '#475569',
            transition: 'color 0.2s ease',
          }}>
            {check.met ? <Check size={12} /> : <X size={12} />}
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      setError('Please fill in all fields');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/signup', form);
      login(res.data.token, res.data.username);
      addToast('Account created successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Signup failed. Please try again.';
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

      {/* Signup card */}
      <div style={{
        ...styles.card,
        animation: shake ? 'shake 0.5s ease' : 'fadeInUp 0.6s ease',
      }}>
        {/* Branding */}
        <div style={styles.branding}>
          <div style={styles.logoIcon}>
            <Server size={28} strokeWidth={1.5} />
          </div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join your private cloud</p>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIconBadge}>✕</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              id="signup-username"
              type="text"
              className="input"
              placeholder="Choose a username (3-30 chars)"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              id="signup-email"
              type="email"
              className="input"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ paddingRight: 44 }}
                placeholder="Create a strong password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
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
            <PasswordStrengthMeter password={form.password} />
          </div>

          <button
            id="signup-submit"
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
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
    background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
    top: '5%',
    right: '15%',
    animation: 'float 8s ease-in-out infinite',
  },
  orb2: {
    width: 350,
    height: 350,
    background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
    bottom: '10%',
    left: '10%',
    animation: 'float 10s ease-in-out infinite reverse',
  },
  orb3: {
    width: 250,
    height: 250,
    background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
    top: '40%',
    left: '50%',
    animation: 'float 12s ease-in-out infinite 2s',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: '36px 36px',
    background: 'rgba(16, 16, 28, 0.7)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(6, 182, 212, 0.08)',
    position: 'relative',
    zIndex: 1,
  },
  branding: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e2e8f0, #22d3ee)',
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
    marginBottom: 16,
    animation: 'fadeIn 0.3s ease',
  },
  errorIconBadge: {
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
    gap: 18,
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
    top: 20,
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
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#94a3b8',
  },
  link: {
    color: '#22d3ee',
    fontWeight: 500,
  },
};