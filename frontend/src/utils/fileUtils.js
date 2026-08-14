/**
 * fileUtils.js — Shared file utility functions.
 */

export function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function getFileExtension(name) {
  if (!name) return '';
  return name.split('.').pop().toLowerCase();
}

export function getViewType(name) {
  const ext = getFileExtension(name);
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'cpp', 'c', 'java', 'txt', 'md', 'sh', 'yml', 'yaml', 'toml', 'cfg', 'ini', 'xml', 'sql', 'go', 'rs', 'rb'].includes(ext)) return 'code';
  return null;
}

export function getFileColor(name) {
  const ext = getFileExtension(name);
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return '#ef4444';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return '#f59e0b';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '#10b981';
  if (['pdf'].includes(ext)) return '#ef4444';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '#8b5cf6';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return '#3b82f6';
  if (['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'cpp', 'c', 'java', 'go', 'rs'].includes(ext)) return '#06b6d4';
  if (['txt', 'md'].includes(ext)) return '#94a3b8';
  return '#64748b';
}

export function getFileIcon(name, isFolder) {
  if (isFolder) return '📁';
  const ext = getFileExtension(name);
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return '🎵';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '🖼️';
  if (['pdf'].includes(ext)) return '📄';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '🗜️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'cpp', 'c', 'java'].includes(ext)) return '💻';
  if (['txt', 'md'].includes(ext)) return '📃';
  return '📎';
}

export function cleanName(name) {
  if (!name) return name;
  return name.split('/').pop();
}
