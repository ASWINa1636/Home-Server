/**
 * UploadZone.jsx — Drag-and-drop upload zone with progress tracking.
 * Supports drag-and-drop overlay, file queue with individual progress bars.
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, File as FileIcon } from 'lucide-react';

export default function UploadZone({ onUpload, uploading, uploadQueue, currentPath }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInput = useRef();
  const folderInput = useRef();

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(files);
    }
  }, [onUpload]);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
    return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div style={styles.dragOverlay}>
          <div style={styles.dragContent}>
            <Upload size={48} style={{ color: '#7c3aed' }} strokeWidth={1.5} />
            <h3 style={styles.dragTitle}>Drop files to upload</h3>
            <p style={styles.dragSubtitle}>
              Files will be uploaded to {currentPath === '/' ? 'Home' : currentPath}
            </p>
          </div>
        </div>
      )}

      {/* Upload buttons */}
      <div style={styles.buttonRow}>
        <button
          id="upload-files-btn"
          className="btn btn-primary"
          onClick={() => fileInput.current.click()}
          disabled={uploading}
        >
          <Upload size={16} />
          Upload Files
        </button>
        <button
          id="upload-folder-btn"
          className="btn"
          onClick={() => folderInput.current.click()}
          disabled={uploading}
        >
          <FileIcon size={16} />
          Upload Folder
        </button>

        <input
          ref={fileInput}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            onUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <input
          ref={folderInput}
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            onUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
      </div>

      {/* Upload progress queue */}
      {uploadQueue && uploadQueue.length > 0 && (
        <div style={styles.queue}>
          <div style={styles.queueHeader}>
            <span style={styles.queueTitle}>
              Uploading {uploadQueue.filter(f => f.status === 'uploading').length > 0
                ? `${uploadQueue.filter(f => f.status === 'done').length}/${uploadQueue.length}`
                : `${uploadQueue.length} files`}
            </span>
          </div>
          <div style={styles.queueList}>
            {uploadQueue.map((item, i) => (
              <div key={i} style={styles.queueItem}>
                <div style={styles.queueItemInfo}>
                  {item.status === 'done' ? (
                    <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  ) : item.status === 'error' ? (
                    <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  ) : (
                    <div style={styles.miniSpinner} />
                  )}
                  <span style={styles.queueFileName}>{item.name}</span>
                  <span style={styles.queueFileSize}>{formatSize(item.size)}</span>
                </div>
                {item.status === 'uploading' && (
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${item.progress || 0}%`,
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  dragOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease',
  },
  dragContent: {
    textAlign: 'center',
    padding: 60,
    border: '2px dashed rgba(124, 58, 237, 0.5)',
    borderRadius: 24,
    background: 'rgba(124, 58, 237, 0.05)',
  },
  dragTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: '#e2e8f0',
    marginTop: 16,
    marginBottom: 8,
  },
  dragSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  queue: {
    marginTop: 16,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    animation: 'fadeInUp 0.3s ease',
  },
  queueHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  queueList: {
    maxHeight: 200,
    overflowY: 'auto',
  },
  queueItem: {
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
  },
  queueItemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  miniSpinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(124, 58, 237, 0.2)',
    borderTopColor: '#7c3aed',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    flexShrink: 0,
  },
  queueFileName: {
    fontSize: 13,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  queueFileSize: {
    fontSize: 12,
    color: '#475569',
    flexShrink: 0,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    background: 'rgba(255, 255, 255, 0.06)',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
};
