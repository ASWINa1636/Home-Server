/**
 * StatCard.jsx — Reusable stat card for admin dashboard.
 * Displays an icon, value, label, and optional trend indicator.
 */
export default function StatCard({ icon, label, value, subtitle, color = '#7c3aed', onClick }) {
  return (
    <div
      style={{
        ...styles.card,
        cursor: onClick ? 'pointer' : 'default',
        borderColor: onClick ? 'rgba(255,255,255,0.06)' : 'transparent',
      }}
      onClick={onClick}
    >
      <div style={{ ...styles.iconWrap, background: `${color}15` }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div style={styles.info}>
        <div style={styles.value}>{value}</div>
        <div style={styles.label}>{label}</div>
        {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 22px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    transition: 'all 0.2s ease',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    fontSize: 24,
    fontWeight: 700,
    color: '#e2e8f0',
    lineHeight: 1.2,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
};
