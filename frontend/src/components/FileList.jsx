/**
 * FileList.jsx — List/table view of files.
 * Sortable columns, selection, inline actions.
 */
import { useState } from 'react';
import { Eye, Download, Trash2, Edit3, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';
import { formatSize, formatDate, getFileIcon, getViewType, getFileColor, cleanName, getFileExtension } from '../utils/fileUtils';

export default function FileList({
  files, folders, selected, onSelect, onSelectAll, onView, onDownload,
  onDelete, onRename, onNavigateFolder, onDeleteFolder, onGoBack,
  currentPath, search, sortBy, sortDir, onSort
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState('');

  const startRename = (file) => {
    setRenamingId(file.id);
    setNewName(cleanName(file.name));
  };

  const submitRename = (id) => {
    if (newName.trim()) onRename(id, newName.trim());
    setRenamingId(null);
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp size={14} style={{ color: '#a78bfa' }} />
      : <ChevronDown size={14} style={{ color: '#a78bfa' }} />;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerCheck}>
          <input
            type="checkbox"
            checked={files.length > 0 && selected.size === files.length}
            onChange={onSelectAll}
            style={styles.checkbox}
          />
        </div>
        <div style={{ ...styles.headerCell, flex: 3, cursor: 'pointer' }} onClick={() => onSort('name')}>
          Name <SortIcon field="name" />
        </div>
        <div style={{ ...styles.headerCell, flex: 1, cursor: 'pointer' }} onClick={() => onSort('size')}>
          Size <SortIcon field="size" />
        </div>
        <div style={{ ...styles.headerCell, flex: 1, cursor: 'pointer' }} onClick={() => onSort('date')}>
          Modified <SortIcon field="date" />
        </div>
        <div style={{ ...styles.headerCell, flex: 1 }}>
          Actions
        </div>
      </div>

      {/* Go back row */}
      {currentPath !== '/' && !search && (
        <div style={styles.row} onClick={onGoBack}>
          <div style={styles.rowCheck} />
          <div style={{ ...styles.rowCell, flex: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⬆️</span>
            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Go back</span>
          </div>
          <div style={{ ...styles.rowCell, flex: 1 }} />
          <div style={{ ...styles.rowCell, flex: 1 }} />
          <div style={{ ...styles.rowCell, flex: 1 }} />
        </div>
      )}

      {/* Folder rows */}
      {folders.map(folder => (
        <div key={folder} style={{ ...styles.row, cursor: 'pointer' }}>
          <div style={styles.rowCheck} />
          <div
            style={{ ...styles.rowCell, flex: 3, display: 'flex', alignItems: 'center', gap: 10 }}
            onClick={() => onNavigateFolder(folder)}
          >
            <span style={{ fontSize: 18 }}>📁</span>
            <span style={styles.folderNameText}>{folder}</span>
          </div>
          <div style={{ ...styles.rowCell, flex: 1, color: '#475569' }}>—</div>
          <div style={{ ...styles.rowCell, flex: 1, color: '#475569' }}>—</div>
          <div style={{ ...styles.rowCell, flex: 1 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#94a3b8' }}
              onClick={(e) => { e.stopPropagation(); onNavigateFolder(folder); }}
            >
              <FolderOpen size={14} /> Open
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#ef4444' }}
              onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder); }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* File rows */}
      {files.map(file => {
        const isSelected = selected.has(file.id);
        const viewType = getViewType(cleanName(file.name));
        const color = getFileColor(cleanName(file.name));
        const ext = getFileExtension(cleanName(file.name)).toUpperCase();

        return (
          <div
            key={file.id}
            style={{
              ...styles.row,
              background: isSelected ? 'rgba(124, 58, 237, 0.06)' : 'transparent',
            }}
          >
            <div style={styles.rowCheck}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(file.id)}
                style={styles.checkbox}
              />
            </div>
            <div style={{ ...styles.rowCell, flex: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* File type badge */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: color,
                flexShrink: 0,
                letterSpacing: '0.02em',
              }}>
                {ext.slice(0, 4)}
              </div>

              {renamingId === file.id ? (
                <input
                  className="input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitRename(file.id); if (e.key === 'Escape') setRenamingId(null); }}
                  style={{ fontSize: 13, padding: '6px 10px', flex: 1 }}
                  autoFocus
                />
              ) : (
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  <span
                    style={{ fontSize: 14, color: '#e2e8f0', cursor: viewType ? 'pointer' : 'default' }}
                    onClick={() => viewType && onView(file)}
                  >
                    {cleanName(file.name)}
                  </span>
                  {search && file.folder !== currentPath && (
                    <span style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>{file.folder}</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ ...styles.rowCell, flex: 1, color: '#94a3b8', fontSize: 13 }}>
              {formatSize(file.size)}
            </div>
            <div style={{ ...styles.rowCell, flex: 1, color: '#475569', fontSize: 13 }}>
              {formatDate(file.created)}
            </div>
            <div style={{ ...styles.rowCell, flex: 1, display: 'flex', gap: 4 }}>
              {viewType && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onView(file)} title="View">
                  <Eye size={15} />
                </button>
              )}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDownload(file.id, file.name)} title="Download">
                <Download size={15} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startRename(file)} title="Rename">
                <Edit3 size={15} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} onClick={() => onDelete(file.id)} title="Delete">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    animation: 'fadeIn 0.3s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    position: 'sticky',
    top: 0,
    background: 'var(--bg-primary)',
    zIndex: 10,
  },
  headerCheck: {
    width: 44,
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    userSelect: 'none',
    padding: '0 8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background 0.15s ease',
  },
  rowCheck: {
    width: 44,
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowCell: {
    padding: '0 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
    accentColor: '#7c3aed',
  },
  folderNameText: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e8c56a',
  },
};
