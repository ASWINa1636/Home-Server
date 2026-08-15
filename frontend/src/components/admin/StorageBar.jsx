/**
 * StorageBar.jsx — Visual storage usage bar (used/quota).
 * Shows percentage, color-coded (green→yellow→red).
 */
export default function StorageBar({ used, quota, showLabels = true, height = 8 }) {
  const percentage = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;

  const getColor = () => {
    if (percentage >= 100) return '#ef4444';
    if (percentage >= 90) return '#f59e0b';
    if (percentage >= 70) return '#eab308';
    return '#10b981';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
    return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
  };

  return (
    <div>
      {showLabels && (
        <div style={styles.labels}>
          <span style={{ color: getColor(), fontWeight: 500 }}>
            {formatSize(used)}
          </span>
          <span style={{ color: '#475569' }}>
            / {formatSize(quota)} ({percentage.toFixed(1)}%)
          </span>
        </div>
      )}
      <div style={{ ...styles.track, height }}>
        <div style={{
          ...styles.fill,
          width: `${percentage}%`,
          background: percentage >= 90
            ? `linear-gradient(90deg, ${getColor()}, ${getColor()}dd)`
            : `linear-gradient(90deg, ${getColor()}, ${getColor()}bb)`,
          height,
        }} />
      </div>
    </div>
  );
}

const styles = {
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 6,
  },
  track: {
    width: '100%',
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
    transition: 'width 0.5s ease',
  },
};
