/**
 * AdminUsers.jsx — User management page.
 * Searchable, sortable user table with status indicators and quick actions.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, ShieldOff, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../api';
import StorageBar from '../../components/admin/StorageBar';

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
};

const statusColors = {
  active: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
  disabled: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  over_quota: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  near_quota: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/admin/users')
      .then(res => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.status.includes(q)
      );
    }
    result.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [users, search, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp size={14} style={{ color: '#a78bfa' }} />
      : <ChevronDown size={14} style={{ color: '#a78bfa' }} />;
  };

  if (loading) {
    return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 400, borderRadius: 16 }} /></div>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Users</h1>
          <p style={styles.pageSubtitle}>{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={styles.searchWrap}>
          <Search size={16} style={{ color: '#475569' }} />
          <input
            className="input"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'none', fontSize: 13, flex: 1 }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={{ ...styles.th, flex: 2, cursor: 'pointer' }} onClick={() => toggleSort('username')}>
            User <SortIcon field="username" />
          </div>
          <div style={{ ...styles.th, flex: 2 }}>Storage</div>
          <div style={{ ...styles.th, flex: 1, cursor: 'pointer' }} onClick={() => toggleSort('file_count')}>
            Files <SortIcon field="file_count" />
          </div>
          <div style={{ ...styles.th, flex: 1 }}>Devices</div>
          <div style={{ ...styles.th, flex: 1 }}>Status</div>
          <div style={{ ...styles.th, flex: 1 }}>Actions</div>
        </div>

        {filtered.map(user => {
          const sc = statusColors[user.status] || statusColors.active;
          return (
            <div key={user.id} style={styles.row}>
              <div style={{ ...styles.td, flex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={styles.avatar}>
                  {user.username[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>
                      {user.username}
                    </span>
                    {user.is_admin && (
                      <Shield size={14} style={{ color: '#f59e0b' }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{user.email}</div>
                </div>
              </div>
              <div style={{ ...styles.td, flex: 2 }}>
                <StorageBar used={user.storage_used} quota={user.storage_quota} height={6} />
              </div>
              <div style={{ ...styles.td, flex: 1, color: '#94a3b8', fontSize: 14 }}>
                {user.file_count}
              </div>
              <div style={{ ...styles.td, flex: 1, color: '#94a3b8', fontSize: 14 }}>
                {user.device_count}
              </div>
              <div style={{ ...styles.td, flex: 1 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: sc.color,
                  background: sc.bg,
                  padding: '4px 10px',
                  borderRadius: 6,
                  textTransform: 'capitalize',
                }}>
                  {user.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ ...styles.td, flex: 1 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  title="View details"
                >
                  <Eye size={16} /> View
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
            No users found
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  pageTitle: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#475569' },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(12, 12, 20, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: '0 12px',
    width: 260,
  },
  tableCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    background: 'rgba(255, 255, 255, 0.01)',
  },
  th: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    userSelect: 'none',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background 0.15s ease',
  },
  td: {
    padding: '0 8px',
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  },
};
