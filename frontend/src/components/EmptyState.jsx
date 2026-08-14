/**
 * EmptyState.jsx — Context-aware empty state display.
 */
import { FolderOpen, Search, Upload } from 'lucide-react';

export default function EmptyState({ type = 'empty', searchQuery = '' }) {
  const configs = {
    empty: {
      icon: FolderOpen,
      title: 'Nothing here yet',
      description: 'Upload files or create a folder to get started',
      color: '#7c3aed',
    },
    search: {
      icon: Search,
      title: `No results for "${searchQuery}"`,
      description: 'Try a different search term or clear your filters',
      color: '#06b6d4',
    },
    filter: {
      icon: FolderOpen,
      title: 'No files match this filter',
      description: 'Try a different category or upload matching files',
      color: '#f59e0b',
    },
  };

  const config = configs[type] || configs.empty;
  const Icon = config.icon;

  return (
    <div style={styles.container}>
      <div style={{ ...styles.iconContainer, background: `rgba(${config.color === '#7c3aed' ? '124,58,237' : config.color === '#06b6d4' ? '6,182,212' : '245,158,11'}, 0.1)` }}>
        <Icon size={40} style={{ color: config.color }} strokeWidth={1.5} />
      </div>
      <h3 style={styles.title}>{config.title}</h3>
      <p style={styles.description}>{config.description}</p>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    animation: 'fadeIn 0.4s ease',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    maxWidth: 300,
    lineHeight: 1.5,
  },
};
