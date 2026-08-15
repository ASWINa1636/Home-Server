/**
 * ContactAdminModal.jsx — Floating chat widget for normal users on the Dashboard.
 * Allows users to send messages to the admin team and view incoming responses.
 */
import { useState, useEffect } from 'react';
import { MessageSquare, X, Send, CheckCheck } from 'lucide-react';
import api from '../api';
import { useToast } from '../contexts/ToastContext';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '';

export default function ContactAdminModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  const loadMessages = () => {
    api.get('/api/user/messages')
      .then(res => setMessages(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      await api.post('/api/user/messages', {
        subject,
        content,
      });
      setContent('');
      setSubject('');
      addToast('Message sent to admin', 'success');
      loadMessages();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.iconCircle}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Contact Admin</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Direct support message thread</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Message history */}
        <div style={styles.historyBox}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: 20 }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: 30, fontSize: 13 }}>
              No previous messages with admin. Send a message below!
            </div>
          ) : (
            messages.map(m => (
              <div
                key={m.id}
                style={{
                  ...styles.bubbleWrapper,
                  justifyContent: m.is_from_admin ? 'flex-start' : 'flex-end',
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    ...(m.is_from_admin ? styles.adminBubble : styles.userBubble),
                  }}
                >
                  {m.subject && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: m.is_from_admin ? '#38bdf8' : '#a78bfa', marginBottom: 2 }}>
                      Subject: {m.subject}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  <div style={styles.bubbleFooter}>
                    <span>{formatDate(m.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Send message form */}
        <form onSubmit={handleSend} style={styles.form}>
          <input
            className="input"
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ fontSize: 13, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              className="input"
              rows={2}
              placeholder="Type your message to admin..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ flex: 1, fontSize: 13, resize: 'none', fontFamily: 'inherit' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !content.trim()}
              style={{ alignSelf: 'flex-end', height: 42, padding: '0 16px' }}
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalCard: {
    background: 'rgba(16, 16, 28, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 20, width: 480, maxWidth: '92vw', height: 540,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)',
  },
  iconCircle: {
    width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
  },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 },
  historyBox: {
    flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10,
  },
  bubbleWrapper: { display: 'flex', width: '100%' },
  bubble: { maxWidth: '80%', padding: '10px 14px', borderRadius: 14 },
  userBubble: { background: 'rgba(124, 58, 237, 0.25)', border: '1px solid rgba(124, 58, 237, 0.3)', borderBottomRightRadius: 4 },
  adminBubble: { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderBottomLeftRadius: 4 },
  bubbleFooter: { fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right' },
  form: { padding: 16, borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' },
};
