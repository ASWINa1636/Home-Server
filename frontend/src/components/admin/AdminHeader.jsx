/**
 * AdminHeader.jsx — Top bar for admin dashboard.
 * Displays page title, live auto-refresh controls, last updated timestamp, and manual refresh button.
 */
import { RefreshCw, Clock } from 'lucide-react';

const formatTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

export default function AdminHeader({ title, subtitle, refreshState }) {
  const { lastUpdated, isRefreshing, refresh, intervalMs, updateInterval } = refreshState || {};

  return (
    <header style={styles.header}>
      <div>
        {title && <h1 style={styles.title}>{title}</h1>}
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      {refreshState && (
        <div style={styles.controls}>
          {/* Timestamp */}
          <div style={styles.timestamp} title="Last updated timestamp">
            <Clock size={14} style={{ color: '#94a3b8' }} />
            <span>Updated {formatTime(lastUpdated)}</span>
          </div>

          {/* Refresh interval dropdown */}
          <select
            className="input"
            value={intervalMs}
            onChange={(e) => updateInterval(parseInt(e.target.value, 10))}
            style={styles.select}
            title="Auto-refresh frequency"
          >
            <option value={15000}>Auto: 15s</option>
            <option value={30000}>Auto: 30s</option>
            <option value={60000}>Auto: 60s</option>
            <option value={0}>Auto: Off</option>
          </select>

          {/* Refresh button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={refresh}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0' }}
            title="Refresh now"
          >
            <RefreshCw
              size={15}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : undefined,
                color: isRefreshing ? '#7c3aed' : '#94a3b8',
              }}
            />
            <span>Refresh</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#475569' },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '6px 14px',
    borderRadius: 12,
  },
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#94a3b8',
  },
  select: {
    width: 'auto',
    padding: '4px 10px',
    fontSize: 12,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
};
