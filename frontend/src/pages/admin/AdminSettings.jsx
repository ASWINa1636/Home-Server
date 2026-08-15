/**
 * AdminSettings.jsx — Admin system settings & CLI helper page.
 */
import { Shield, Key, HardDrive, Terminal } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={styles.pageTitle}>System Settings & Security</h1>
      <p style={styles.pageSubtitle}>Configuration overview and CLI management commands</p>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <Shield size={20} style={{ color: '#7c3aed' }} />
          <h3 style={styles.sectionTitle}>Security Settings</h3>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>SECRET_KEY Enforcement</span>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>Active (Validated at startup)</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Rate Limiting (slowapi)</span>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>Active (Auth: 3-5/min, Admin: 2/min)</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Security Headers Middleware</span>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>Active (CSP, HSTS/Frame DENY, nosniff)</span>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <Terminal size={20} style={{ color: '#06b6d4' }} />
          <h3 style={styles.sectionTitle}>CLI Admin Promotion Tool</h3>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
          You can promote any registered user to admin directly from the terminal using the helper script:
        </p>

        <div style={styles.codeBlock}>
          <code style={{ color: '#a78bfa' }}>cd ~/homeserver/backend && source ../env/bin/activate</code>
          <br />
          <code style={{ color: '#22d3ee' }}>python promote_admin.py &lt;username&gt;</code>
          <br />
          <code style={{ color: '#94a3b8' }}># To demote: python promote_admin.py &lt;username&gt; --demote</code>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageTitle: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#475569', marginBottom: 28 },
  card: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 16, padding: 24, marginBottom: 20,
  },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#e2e8f0' },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  infoLabel: { fontSize: 14, color: '#94a3b8' },
  codeBlock: {
    background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 10,
    fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6,
  },
};
