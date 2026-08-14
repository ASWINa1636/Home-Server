/**
 * FileGrid.jsx — Grid view of files with beautiful cards.
 * Hover effects, selection, view/download/delete actions.
 */
import { useState } from 'react';
import { Eye, Download, Trash2, Edit3, Film, Music, Image as ImageIcon, FileText, Archive, Code, File as FileIcon } from 'lucide-react';
import { formatSize, formatDate, getFileExtension, getViewType, getFileColor, cleanName } from '../utils/fileUtils';

function FileTypeIcon({ name, size = 28 }) {
  const ext = getFileExtension(name);
  const color = getFileColor(name);

  const icons = {
    video: Film,
    audio: Music,
    image: ImageIcon,
    pdf: FileText,
    code: Code,
  };

  const viewType = getViewType(name);
  const Icon = icons[viewType] || FileIcon;

  return (
    <div style={{
      width: 52,
      height: 52,
      borderRadius: 14,
      background: `${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Icon size={size} style={{ color }} strokeWidth={1.5} />
    </div>
  );
}

export default function FileGrid({
  files, folders, selected, onSelect, onView, onDownload,
  onDelete, onRename, onNavigateFolder, onDeleteFolder, onGoBack,
  currentPath, search
}) {
  const [hoveredId, setHoveredId] = useState(null);
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

  return (
    <div style={styles.grid}>
      {/* Go back card */}
      {currentPath !== '/' && !search && (
        <div style={styles.folderCard} onClick={onGoBack}>
          <div style={styles.folderIcon}>⬆️</div>
          <span style={styles.folderName}>Go back</span>
        </div>
      )}

      {/* Folder cards */}
      {folders.map(folder => (
        <div key={folder} style={styles.folderCard}>
          <div style={styles.folderCardInner} onClick={() => onNavigateFolder(folder)}>
            <div style={styles.folderIcon}>📁</div>
            <span style={styles.folderName}>{folder}</span>
          </div>
          <button
            style={styles.folderDeleteBtn}
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder); }}
            title="Delete folder"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* File cards */}
      {files.map(file => {
        const isSelected = selected.has(file.id);
        const isHovered = hoveredId === file.id;
        const viewType = getViewType(cleanName(file.name));
        const token = localStorage.getItem('token');
        const thumbUrl = viewType === 'image'
          ? `${window.location.origin}/api/files/view/${file.id}?token=${token}`
          : null;

        return (
          <div
            key={file.id}
            style={{
              ...styles.fileCard,
              borderColor: isSelected ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255, 255, 255, 0.04)',
              background: isSelected ? 'rgba(124, 58, 237, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              transform: isHovered ? 'translateY(-2px)' : 'none',
              boxShadow: isHovered ? '0 8px 30px rgba(0, 0, 0, 0.3)' : 'none',
            }}
            onMouseEnter={() => setHoveredId(file.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Thumbnail area */}
            <div style={styles.thumbnailArea}>
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={cleanName(file.name)}
                  style={styles.thumbnailImg}
                  loading="lazy"
                />
              ) : (
                <FileTypeIcon name={cleanName(file.name)} />
              )}

              {/* Selection checkbox */}
              <div style={{
                ...styles.checkbox,
                opacity: isSelected || isHovered ? 1 : 0,
              }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(file.id)}
                  style={styles.checkboxInput}
                />
              </div>

              {/* Hover overlay with actions */}
              {isHovered && (
                <div style={styles.hoverOverlay}>
                  {viewType && (
                    <button style={styles.actionBtn} onClick={() => onView(file)} title="View">
                      <Eye size={16} />
                    </button>
                  )}
                  <button style={styles.actionBtn} onClick={() => onDownload(file.id, file.name)} title="Download">
                    <Download size={16} />
                  </button>
                  <button style={styles.actionBtn} onClick={() => startRename(file)} title="Rename">
                    <Edit3 size={16} />
                  </button>
                  <button style={{ ...styles.actionBtn, color: '#ef4444' }} onClick={() => onDelete(file.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* File info */}
            <div style={styles.fileInfo}>
              {renamingId === file.id ? (
                <div style={styles.renameRow}>
                  <input
                    className="input"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitRename(file.id); if (e.key === 'Escape') setRenamingId(null); }}
                    style={{ fontSize: 13, padding: '6px 10px' }}
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  style={styles.fileName}
                  title={cleanName(file.name)}
                  onClick={() => viewType && onView(file)}
                >
                  {cleanName(file.name)}
                </div>
              )}
              <div style={styles.fileMeta}>
                <span>{formatSize(file.size)}</span>
                <span>·</span>
                <span>{formatDate(file.created)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 14,
    animation: 'fadeIn 0.3s ease',
  },
  folderCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  folderCardInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  folderIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  folderName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e8c56a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  folderDeleteBtn: {
    background: 'none',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    opacity: 0.6,
    transition: 'all 0.15s ease',
  },
  fileCard: {
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    cursor: 'default',
  },
  thumbnailArea: {
    height: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  checkbox: {
    position: 'absolute',
    top: 10,
    left: 10,
    transition: 'opacity 0.15s ease',
  },
  checkboxInput: {
    width: 18,
    height: 18,
    cursor: 'pointer',
    accentColor: '#7c3aed',
  },
  hoverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    padding: '8px',
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
    animation: 'fadeIn 0.15s ease',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    border: 'none',
    color: '#e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  fileInfo: {
    padding: '12px 14px',
  },
  fileName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  fileMeta: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
  },
  renameRow: {
    display: 'flex',
    gap: 6,
  },
};
