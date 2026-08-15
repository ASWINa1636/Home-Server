/**
 * ConfirmModal.jsx — Confirmation dialog for destructive actions.
 */
export default function ConfirmModal({ title, message, confirmText = 'Confirm', confirmColor = '#ef4444', onConfirm, onCancel }) {
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: confirmColor, color: '#fff', border: 'none' }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.15s ease',
  },
  modal: {
    background: 'rgba(16, 16, 28, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: '28px 32px',
    maxWidth: 420,
    width: '90%',
    animation: 'scaleIn 0.2s ease',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: 24,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
};
