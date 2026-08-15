/**
 * Dashboard.jsx — Main file management dashboard.
 * Integrates Sidebar, FileGrid/FileList, UploadZone, search, sort, filter.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api';

import Sidebar from '../components/Sidebar';
import FileGrid from '../components/FileGrid';
import FileList from '../components/FileList';
import UploadZone from '../components/UploadZone';
import EmptyState from '../components/EmptyState';
import { GridSkeleton, ListSkeleton } from '../components/Skeleton';
import FileViewer from '../components/FileViewer';
import ContactAdminModal from '../components/ContactAdminModal';
import DeletionRequestModal from '../components/DeletionRequestModal';
import StorageRequestModal from '../components/StorageRequestModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { getViewType, cleanName } from '../utils/fileUtils';

import {
  Search, Grid, List, FolderPlus, X, Download, Trash2, Menu,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const [allFiles, setAllFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [search, setSearch] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const [viewFile, setViewFile] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [showDeletionRequest, setShowDeletionRequest] = useState(false);
  const [showStorageRequest, setShowStorageRequest] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { addToast } = useToast();

  // ---------------------------------------------------------------------------
  // Load files
  // ---------------------------------------------------------------------------
  const loadFiles = useCallback(async () => {
    try {
      const res = await api.get('/api/files/list?folder=all');
      setAllFiles(res.data);
    } catch (err) {
      addToast('Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // ---------------------------------------------------------------------------
  // Computed: folders at current path
  // ---------------------------------------------------------------------------
  const foldersAtPath = useMemo(() => {
    const folders = new Set();
    allFiles.forEach(f => {
      const fp = f.folder || '/';
      if (fp === currentPath) return;
      const base = currentPath === '/' ? '' : currentPath;
      if (!fp.startsWith(base + '/')) return;
      const rest = fp.slice(base.length + 1);
      const next = rest.split('/')[0];
      if (next && next.trim()) folders.add(next);
    });
    let result = Array.from(folders);
    if (search.trim()) {
      result = result.filter(f => f.toLowerCase().includes(search.toLowerCase()));
    }
    return result.sort();
  }, [allFiles, currentPath, search]);

  // ---------------------------------------------------------------------------
  // Computed: files at current path with filters and sort
  // ---------------------------------------------------------------------------
  const filesAtPath = useMemo(() => {
    let files = allFiles.filter(f =>
      (f.folder || '/') === currentPath && f.name !== '.keep'
    );

    // Search filter
    if (search.trim()) {
      files = files.filter(f =>
        cleanName(f.name).toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sidebar type filter
    if (sidebarFilter !== 'all') {
      files = files.filter(f => {
        const ext = cleanName(f.name).split('.').pop().toLowerCase();
        const filterMap = {
          video: ['mp4', 'mkv', 'avi', 'mov', 'webm'],
          audio: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
          image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
          document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'],
          archive: ['zip', 'rar', 'tar', 'gz', '7z'],
        };
        return filterMap[sidebarFilter]?.includes(ext) ?? true;
      });
    }

    // Sort
    files.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = cleanName(a.name).toLowerCase();
        valB = cleanName(b.name).toLowerCase();
      } else if (sortBy === 'size') {
        valA = a.size || 0;
        valB = b.size || 0;
      } else if (sortBy === 'date') {
        valA = a.created || '';
        valB = b.created || '';
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return files;
  }, [allFiles, currentPath, search, sidebarFilter, sortBy, sortDir]);

  // File stats for sidebar
  const fileStats = useMemo(() => ({
    totalFiles: allFiles.filter(f => f.name !== '.keep').length,
    totalSize: allFiles.reduce((sum, f) => sum + (f.size || 0), 0),
  }), [allFiles]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const navigateToFolder = (folder) => {
    setCurrentPath(currentPath === '/' ? '/' + folder : currentPath + '/' + folder);
    setSelected(new Set());
    setSearch('');
  };

  const goBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
    setSelected(new Set());
  };

  const breadcrumbs = useMemo(() => {
    if (currentPath === '/') return [{ name: 'Home', path: '/' }];
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', path: '/' }];
    parts.forEach((p, i) => crumbs.push({
      name: p,
      path: '/' + parts.slice(0, i + 1).join('/'),
    }));
    return crumbs;
  }, [currentPath]);

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------
  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filesAtPath.length) setSelected(new Set());
    else setSelected(new Set(filesAtPath.map(f => f.id)));
  };

  const downloadSingle = async (id, name) => {
    try {
      const res = await api.get(`/api/files/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast(`Downloaded ${cleanName(name)}`, 'success');
    } catch {
      addToast('Download failed', 'error');
    }
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    if (selected.size === 1) {
      const id = Array.from(selected)[0];
      const file = filesAtPath.find(f => f.id === id);
      if (file) downloadSingle(id, file.name);
      return;
    }
    try {
      const res = await api.post('/api/files/download-multiple', Array.from(selected), { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'download.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast(`Downloaded ${selected.size} files`, 'success');
    } catch {
      addToast('Download failed', 'error');
    }
  };

  const deleteFile = async (id) => {
    if (!confirm('Delete this file?')) return;
    try {
      await api.delete(`/api/files/${id}`);
      addToast('File deleted', 'success');
      loadFiles();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} file(s)?`)) return;
    try {
      await api.delete('/api/files/delete-multiple', { data: Array.from(selected) });
      setSelected(new Set());
      addToast(`Deleted ${selected.size} files`, 'success');
      loadFiles();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const deleteFolder = async (folderName) => {
    const folderPath = currentPath === '/' ? '/' + folderName : currentPath + '/' + folderName;
    if (!confirm(`Delete folder "${folderName}" and ALL its contents?`)) return;
    const toDelete = allFiles.filter(f => {
      const fp = f.folder || '/';
      return fp === folderPath || fp.startsWith(folderPath + '/');
    });
    if (toDelete.length > 0) {
      try {
        await api.delete('/api/files/delete-multiple', { data: toDelete.map(f => f.id) });
        addToast(`Deleted folder "${folderName}"`, 'success');
      } catch {
        addToast('Delete failed', 'error');
      }
    }
    loadFiles();
  };

  const renameFile = async (id, name) => {
    try {
      await api.put(`/api/files/${id}/rename?new_name=${encodeURIComponent(name)}`);
      addToast('File renamed', 'success');
      loadFiles();
    } catch {
      addToast('Rename failed', 'error');
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const newPath = currentPath === '/'
      ? '/' + newFolderName.trim()
      : currentPath + '/' + newFolderName.trim();

    const blob = new Blob([''], { type: 'text/plain' });
    const placeholderFile = new File([blob], '.keep', { type: 'text/plain' });
    const form = new FormData();
    form.append('file', placeholderFile);
    form.append('folder', newPath);

    try {
      await api.post('/api/files/upload', form);
      setCurrentPath(newPath);
      setNewFolderName('');
      setShowNewFolder(false);
      addToast(`Created folder "${newFolderName.trim()}"`, 'success');
      loadFiles();
    } catch {
      addToast('Failed to create folder', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // Upload handler
  // ---------------------------------------------------------------------------
  const handleUpload = async (selectedFiles) => {
    if (selectedFiles.length === 0) return;

    // --- Client-side Quota Pre-Check ---
    try {
      const infoRes = await api.get('/api/user/storage-info');
      const { used, quota } = infoRes.data;
      if (quota > 0) {
        const remaining = Math.max(0, quota - used);
        const totalUploadSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        if (totalUploadSize > remaining) {
          const reqGB = (totalUploadSize / (1024 ** 3)).toFixed(2);
          const remGB = (remaining / (1024 ** 3)).toFixed(2);
          addToast(
            `Upload blocked: Selected files (${reqGB} GB) exceed your remaining storage quota (${remGB} GB). Please request more storage.`,
            'error'
          );
          setShowStorageRequest(true);
          return;
        }
      }
    } catch {}

    setUploading(true);
    const queue = selectedFiles.map(f => ({
      name: f.name,
      size: f.size,
      status: 'pending',
      progress: 0,
    }));
    setUploadQueue(queue);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadQueue(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'uploading' } : item
      ));

      const form = new FormData();
      form.append('file', file);

      // Determine folder
      let folder = currentPath;
      const relativePath = file.webkitRelativePath || '';
      if (relativePath.includes('/')) {
        const parts = relativePath.split('/');
        parts.pop();
        const subPath = parts.join('/');
        folder = currentPath === '/' ? '/' + subPath : currentPath + '/' + subPath;
      }
      form.append('folder', folder);

      try {
        await api.post('/api/files/upload', form, {
          onUploadProgress: (p) => {
            const progress = Math.round((p.loaded / p.total) * 100);
            setUploadQueue(prev => prev.map((item, idx) =>
              idx === i ? { ...item, progress } : item
            ));
          },
        });
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'done', progress: 100 } : item
        ));
      } catch (err) {
        const detailMsg = err.response?.data?.detail || 'Upload failed';
        addToast(detailMsg, 'error');
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error' } : item
        ));
      }
    }

    setUploading(false);
    addToast(`Uploaded ${selectedFiles.length} file(s)`, 'success');
    loadFiles();

    // Clear queue after 3 seconds
    setTimeout(() => setUploadQueue([]), 3000);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const hasFiles = foldersAtPath.length > 0 || filesAtPath.length > 0;
  const isSearching = search.trim() !== '';
  const isFiltered = sidebarFilter !== 'all';

  const sharedFileProps = {
    files: filesAtPath,
    folders: foldersAtPath,
    selected,
    onSelect: toggleSelect,
    onSelectAll: selectAll,
    onView: setViewFile,
    onDownload: downloadSingle,
    onDelete: deleteFile,
    onRename: renameFile,
    onNavigateFolder: navigateToFolder,
    onDeleteFolder: deleteFolder,
    onGoBack: goBack,
    currentPath,
    search,
    sortBy,
    sortDir,
    onSort: toggleSort,
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <Sidebar
        activeFilter={sidebarFilter}
        onFilterChange={setSidebarFilter}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        fileStats={fileStats}
        onRequestStorage={() => setShowStorageRequest(true)}
        onContactAdmin={() => setShowContactAdmin(true)}
        onRequestDeletion={() => setShowDeletionRequest(true)}
        onChangePassword={() => setShowChangePassword(true)}
      />

      {/* Main content area */}
      <main style={styles.main}>
        {/* Top bar */}
        <header style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <button
              className="btn btn-ghost btn-icon"
              style={styles.menuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            <nav style={styles.breadcrumbs}>
              {breadcrumbs.map((crumb, i, arr) => (
                <span key={crumb.path} style={styles.breadcrumbItem}>
                  <span
                    style={{
                      cursor: i < arr.length - 1 ? 'pointer' : 'default',
                      color: i < arr.length - 1 ? '#94a3b8' : '#e2e8f0',
                      fontWeight: i === arr.length - 1 ? 500 : 400,
                      fontSize: 14,
                    }}
                    onClick={() => i < arr.length - 1 && setCurrentPath(crumb.path)}
                  >
                    {crumb.name}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight size={14} style={{ color: '#334155', margin: '0 4px' }} />
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* Search */}
          <div style={styles.searchWrapper}>
            <Search size={16} style={{ color: '#475569', flexShrink: 0 }} />
            <input
              id="search-input"
              className="input"
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            {search && (
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <UploadZone
              onUpload={handleUpload}
              uploading={uploading}
              uploadQueue={uploadQueue}
              currentPath={currentPath}
            />
            <button
              id="new-folder-btn"
              className="btn"
              onClick={() => setShowNewFolder(!showNewFolder)}
            >
              <FolderPlus size={16} />
              New Folder
            </button>

            {/* Bulk actions */}
            {selected.size > 0 && (
              <>
                <button className="btn btn-success btn-sm" onClick={downloadSelected}>
                  <Download size={15} />
                  Download ({selected.size})
                </button>
                <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                  <Trash2 size={15} />
                  Delete ({selected.size})
                </button>
              </>
            )}
          </div>

          <div style={styles.toolbarRight}>
            {/* Sort dropdown */}
            <select
              className="select"
              value={sortBy + '_' + sortDir}
              onChange={e => {
                const [field, dir] = e.target.value.split('_');
                setSortBy(field);
                setSortDir(dir);
              }}
              style={{ fontSize: 13 }}
            >
              <option value="name_asc">Name A→Z</option>
              <option value="name_desc">Name Z→A</option>
              <option value="size_asc">Size ↑</option>
              <option value="size_desc">Size ↓</option>
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
            </select>

            {/* View toggle */}
            <div style={styles.viewToggle}>
              <button
                className={`btn btn-ghost btn-icon btn-sm`}
                style={{ background: viewMode === 'grid' ? 'rgba(124, 58, 237, 0.15)' : undefined }}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid size={16} />
              </button>
              <button
                className={`btn btn-ghost btn-icon btn-sm`}
                style={{ background: viewMode === 'list' ? 'rgba(124, 58, 237, 0.15)' : undefined }}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div style={styles.newFolderRow}>
            <input
              className="input"
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              style={{ maxWidth: 300 }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={createFolder}>Create</button>
            <button className="btn btn-sm" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>Cancel</button>
          </div>
        )}

        {/* Results summary when searching/filtering */}
        {(isSearching || isFiltered) && !loading && (
          <div style={styles.resultsSummary}>
            Found {foldersAtPath.length} folder(s) and {filesAtPath.length} file(s)
            {isSearching && <span> for "{search}"</span>}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setSidebarFilter('all'); }}
              style={{ marginLeft: 8 }}
            >
              <X size={14} /> Clear
            </button>
          </div>
        )}

        {/* Content area */}
        <div style={styles.content}>
          {loading ? (
            viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />
          ) : hasFiles ? (
            viewMode === 'grid' ? (
              <FileGrid {...sharedFileProps} />
            ) : (
              <FileList {...sharedFileProps} />
            )
          ) : (
            <EmptyState
              type={isSearching ? 'search' : isFiltered ? 'filter' : 'empty'}
              searchQuery={search}
            />
          )}
        </div>
      </main>

      {/* File Viewer overlay */}
      {viewFile && (
        <FileViewer
          file={viewFile}
          onClose={() => setViewFile(null)}
        />
      )}

      {/* Storage Request Modal */}
      <StorageRequestModal
        isOpen={showStorageRequest}
        onClose={() => setShowStorageRequest(false)}
      />

      {/* Support Chat Modal */}
      <ContactAdminModal
        isOpen={showContactAdmin}
        onClose={() => setShowContactAdmin(false)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Account Deletion Request Modal */}
      <DeletionRequestModal
        isOpen={showDeletionRequest}
        onClose={() => setShowDeletionRequest(false)}
      />
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0f',
  },
  main: {
    flex: 1,
    marginLeft: 260,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    background: 'rgba(10, 10, 15, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  menuBtn: {
    display: 'none',
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
    minWidth: 0,
  },
  breadcrumbItem: {
    display: 'flex',
    alignItems: 'center',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(12, 12, 20, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: '0 12px',
    width: 280,
    flexShrink: 0,
    position: 'relative',
  },
  searchInput: {
    border: 'none',
    background: 'none',
    padding: '10px 28px 10px 0',
    fontSize: 13,
    flex: 1,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '16px 24px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: 2,
  },
  newFolderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 24px 16px',
    animation: 'fadeInDown 0.2s ease',
  },
  resultsSummary: {
    padding: '0 24px 8px',
    fontSize: 13,
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: '0 24px 24px',
  },
};

// Add responsive CSS
const responsiveStyle = document.createElement('style');
responsiveStyle.textContent = `
  @media (max-width: 768px) {
    main {
      margin-left: 0 !important;
    }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(responsiveStyle);
}