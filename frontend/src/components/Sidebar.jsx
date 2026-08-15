/**
 * Sidebar.jsx — Collapsible sidebar with navigation, storage quota info, admin link, user controls.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Film, Image, Music, FileText, Archive, HardDrive,
  LogOut, Menu, X, Server, Shield, MessageSquare, UserX, Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import StorageBar from './admin/StorageBar';
import api from '../api';

const NAV_ITEMS = [
  { id: 'all', label: 'All Files', icon: Home },
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'image', label: 'Images', icon: Image },
  { id: 'audio', label: 'Music', icon: Music },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'archive', label: 'Archives', icon: Archive },
];

export default function Sidebar({ activeFilter, onFilterChange, isOpen, onToggle, fileStats, onRequestStorage, onContactAdmin, onRequestDeletion, onChangePassword }) {
  const { username, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    api.get('/api/user/storage-info')
      .then(res => setStorageInfo(res.data))
      .catch(() => {});
  }, [fileStats]);

  const used = storageInfo?.used || fileStats?.totalSize || 0;
  const quota = storageInfo?.quota || (5 * 1024 ** 3);
  const percentage = storageInfo?.percentage || 0;

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

          {/* Admin link if user is admin */}
          {isAdmin && (
            <>
              <div style={{ ...styles.navLabel, marginTop: 16 }}>Admin</div>
              <button
                style={styles.adminNavItem}
                onClick={() => navigate('/admin')}
              >
                <Shield size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span>Admin Dashboard</span>
              </button>
            </>
          )}

          <div style={{ ...styles.navLabel, marginTop: 16 }}>Support & Account</div>
          {onContactAdmin && (
            <button
              style={styles.navItem}
              onClick={onContactAdmin}
            >
              <MessageSquare size={18} style={{ color: '#7c3aed', flexShrink: 0 }} />
              <span>Contact Admin</span>
            </button>
          )}
          {onChangePassword && (
            <button
              style={styles.navItem}
              onClick={onChangePassword}
            >
              <Lock size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>Change Password</span>
            </button>
          )}
          {onRequestDeletion && (
            <button
              style={{ ...styles.navItem, color: '#ef4444' }}
              onClick={onRequestDeletion}
            >
              <UserX size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span>Delete Account</span>
            </button>
          )}
        </nav>

        {/* Storage info with progress bar */}
        <div style={styles.storageSection}>
          <div style={styles.navLabel}>Storage Quota</div>
          <div style={styles.storageCard}>
            <StorageBar used={used} quota={quota} height={6} />
            {onRequestStorage && (
              <button
                style={styles.requestBtn}
                onClick={onRequestStorage}
              >
                Request Storage
              </button>
            )}
          </div>
        </div>

        {/* User area */}
        <div style={styles.userArea}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {(username || 'U')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={styles.username}>{username}</div>
              {isAdmin && <div style={styles.adminTag}>Admin</div>}
            </div>
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
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 99,
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
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
    background: 'rgba(124, 58, 237, 0.15)',
  },
  adminNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 500,
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    fontFamily: 'inherit',
    width: '100%',
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
    padding: '0 12px 12px',
  },
  storageCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
  },
  requestBtn: {
    marginTop: 10,
    width: '100%',
    padding: '6px 0',
    fontSize: 12,
    fontWeight: 500,
    color: '#a78bfa',
    background: 'rgba(124, 58, 237, 0.1)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  userArea: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  },
  username: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  adminTag: {
    fontSize: 10,
    fontWeight: 600,
    color: '#f59e0b',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
};
