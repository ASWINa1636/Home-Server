/**
 * Skeleton.jsx — Shimmer loading skeletons for grid and list views.
 */

export function GridSkeleton({ count = 8 }) {
  return (
    <div style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ ...styles.card, animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton" style={styles.thumbnail} />
          <div style={styles.info}>
            <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 4, marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 6 }) {
  return (
    <div style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ ...styles.row, animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: '30%', borderRadius: 4, marginTop: 6 }} />
          </div>
          <div className="skeleton" style={{ height: 12, width: 60, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
    padding: '4px 0',
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  thumbnail: {
    height: 140,
    width: '100%',
  },
  info: {
    padding: 14,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.02)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};
