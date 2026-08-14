/**
 * FileViewer.jsx — Modal viewer for files.
 * Delegates to VideoPlayer for video files, renders images/audio/code/pdf inline.
 */
import { useState, useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { getViewType, cleanName, getFileIcon } from '../utils/fileUtils';
import VideoPlayer from './VideoPlayer';
import api from '../api';

export default function FileViewer({ file, onClose }) {
  const [codeContent, setCodeContent] = useState('');
  const viewType = getViewType(cleanName(file.name));
  const token = localStorage.getItem('token');
  const viewUrl = `${window.location.origin}/api/files/view/${file.id}?token=${token}`;

  useEffect(() => {
    if (viewType === 'code') {
      api.get(`/api/files/view/${file.id}?token=${token}`, { responseType: 'text' })
        .then(res => setCodeContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)))
        .catch(() => setCodeContent('Unable to load file contents'));
    }
  }, [file.id, viewType, token]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // For video files, render the custom player
  if (viewType === 'video') {
    return (
      <VideoPlayer
        src={viewUrl}
        title={cleanName(file.name)}
        onClose={onClose}
      />
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>{getFileIcon(cleanName(file.name))}</span>
            <span style={styles.headerTitle}>{cleanName(file.name)}</span>
          </div>
          <div style={styles.headerActions}>
            <a href={viewUrl} target="_blank" rel="noopener noreferrer" style={styles.actionLink} title="Open in new tab">
              <ExternalLink size={18} />
            </a>
            <button style={styles.closeButton} onClick={onClose} title="Close (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {viewType === 'image' && (
            <img
              src={viewUrl}
              alt={cleanName(file.name)}
              style={styles.image}
              loading="eager"
            />
          )}

          {viewType === 'audio' && (
            <div style={styles.audioContainer}>
              <div style={styles.audioIcon}>🎵</div>
              <h3 style={styles.audioTitle}>{cleanName(file.name)}</h3>
              <audio
                controls
                autoPlay
                src={viewUrl}
                style={styles.audioPlayer}
              />
            </div>
          )}

          {viewType === 'pdf' && (
            <iframe
              src={viewUrl}
              style={styles.pdfFrame}
              title={cleanName(file.name)}
            />
          )}

          {viewType === 'code' && (
            <pre style={styles.codeBlock}>{codeContent}</pre>
          )}

          {!viewType && (
            <div style={styles.unsupported}>
              <div style={styles.unsupportedIcon}>📎</div>
              <p style={styles.unsupportedText}>Preview not available for this file type</p>
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ marginTop: 16 }}
              >
                <ExternalLink size={16} /> Open in Browser
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.92)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.2s ease',
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(10, 10, 15, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionLink: {
    color: '#94a3b8',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s ease',
    textDecoration: 'none',
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#e2e8f0',
    padding: 8,
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 80px)',
    objectFit: 'contain',
    borderRadius: 8,
    animation: 'scaleIn 0.3s ease',
  },
  audioContainer: {
    textAlign: 'center',
    padding: 40,
  },
  audioIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  audioTitle: {
    fontSize: 18,
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: 24,
  },
  audioPlayer: {
    width: 400,
    maxWidth: '100%',
  },
  pdfFrame: {
    width: '90vw',
    height: 'calc(100vh - 80px)',
    border: 'none',
    borderRadius: 8,
  },
  codeBlock: {
    background: 'rgba(16, 16, 28, 0.8)',
    color: '#d4d4d4',
    padding: 24,
    borderRadius: 12,
    overflow: 'auto',
    maxWidth: '90vw',
    maxHeight: 'calc(100vh - 120px)',
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    textAlign: 'left',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  unsupported: {
    textAlign: 'center',
    padding: 40,
  },
  unsupportedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  unsupportedText: {
    fontSize: 16,
    color: '#94a3b8',
  },
};
