/**
 * Sidebar.jsx — Collapsible sidebar with navigation, storage info, user controls.
 */
import {
  Home, Film, Image, Music, FileText, Archive, HardDrive,
  LogOut, Menu, X, Server, FolderOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { id: 'all', label: 'All Files', icon: Home },
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'image', label: 'Images', icon: Image },
  { id: 'audio', label: 'Music', icon: Music },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'archive', label: 'Archives', icon: Archive },
];

export default function Sidebar({ activeFilter, onFilterChange, isOpen, onToggle, fileStats }) {
  const { username, logout } = useAuth();

  const totalSize = fileStats?.totalSize || 0;
  const totalFiles = fileStats?.totalFiles || 0;

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
    return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={styles.overlay}
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        transform: isOpen ? 'translateX(0)' : undefined,
      }} className={isOpen ? 'sidebar-open' : ''}>
        {/* Logo area */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <Server size={22} strokeWidth={1.5} />
          </div>
          <span style={styles.logoText}>HomeServer</span>
          <button
            style={styles.closeBtn}
            onClick={onToggle}
            className="sidebar-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          <div style={styles.navLabel}>Browse</div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeFilter === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
                onClick={() => {
                  onFilterChange(item.id);
                  if (window.innerWidth < 768) onToggle();
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
                {isActive && <div style={styles.activeIndicator} />}
              </button>
            );
          })}
        </nav>

        {/* Storage info */}
        <div style={styles.storageSection}>
          <div style={styles.navLabel}>Storage</div>
          <div style={styles.storageCard}>
            <HardDrive size={18} style={{ color: '#a78bfa' }} />
            <div style={{ flex: 1 }}>
              <div style={styles.storageText}>
                {formatSize(totalSize)} used
              </div>
              <div style={styles.storageFiles}>
                {totalFiles} file{totalFiles !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* User area */}
        <div style={styles.userArea}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {(username || 'U')[0].toUpperCase()}
            </div>
            <span style={styles.username}>{username}</span>
          </div>
          <button
            id="logout-btn"
            style={styles.logoutBtn}
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          aside:not(.sidebar-open) {
            transform: translateX(-100%) !important;
          }
        }
        .sidebar-close-btn {
          display: none !important;
        }
        @media (max-width: 768px) {
          .sidebar-close-btn {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: 99,
    animation: 'fadeIn 0.2s ease',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    background: 'rgba(10, 10, 18, 0.95)',
    borderRight: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e2e8f0, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    flex: 1,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#475569',
    padding: '8px 12px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 450,
    color: '#94a3b8',
    background: 'transparent',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    position: 'relative',
    fontFamily: 'inherit',
    width: '100%',
  },
  navItemActive: {
    color: '#e2e8f0',
    background: 'rgba(124, 58, 237, 0.12)',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    borderRadius: 2,
    background: 'linear-gradient(180deg, #7c3aed, #06b6d4)',
  },
  storageSection: {
    padding: '0 12px 16px',
  },
  storageCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  storageText: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
  },
  storageFiles: {
    fontSize: 12,
    color: '#475569',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
  },
  username: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e2e8f0',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s ease',
  },
};
