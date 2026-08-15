/**
 * AdminMessages.jsx — Support Chat management page for Admin.
 * Two-pane layout: Left pane shows conversation threads per user with unread badges.
 * Right pane displays the active message history + admin reply input box.
 */
import { useState, useEffect } from 'react';
import { MessageSquare, Send, User as UserIcon, CheckCheck, Clock } from 'lucide-react';
import api from '../../api';
import AdminHeader from '../../components/admin/AdminHeader';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useToast } from '../../contexts/ToastContext';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '';

export default function AdminMessages() {
  const [threads, setThreads] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  const loadThreads = async () => {
    try {
      const res = await api.get('/api/admin/messages');
      setThreads(res.data);
      if (!selectedUserId && res.data.length > 0) {
        setSelectedUserId(res.data[0].user_id);
      }
    } catch {}
  };

  const loadActiveThread = async (uid) => {
    if (!uid) return;
    try {
      const res = await api.get(`/api/admin/messages/${uid}`);
      setActiveThread(res.data);
      // Reload threads list to update unread counts
      loadThreads();
    } catch {}
  };

  const refreshState = useAutoRefresh(() => {
    loadThreads();
    if (selectedUserId) loadActiveThread(selectedUserId);
  }, 15000);

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadActiveThread(selectedUserId);
    }
  }, [selectedUserId]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedUserId || sending) return;

    setSending(true);
    try {
      await api.post(`/api/admin/messages/${selectedUserId}`, { content: replyText });
      setReplyText('');
      loadActiveThread(selectedUserId);
      addToast('Reply sent successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send reply', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <AdminHeader
        title="Support Chat"
        subtitle="Communicate directly with users and answer support requests"
        refreshState={refreshState}
      />

      <div style={styles.container}>
        {/* Left pane: Conversation Threads */}
        <div style={styles.threadList}>
          <div style={styles.paneHeader}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>USER THREADS ({threads.length})</span>
          </div>

          {threads.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#475569', fontSize: 13 }}>
              No message conversations yet
            </div>
          ) : (
            threads.map(t => {
              const isSelected = selectedUserId === t.user_id;
              return (
                <div
                  key={t.user_id}
                  style={{
                    ...styles.threadCard,
                    ...(isSelected ? styles.selectedThreadCard : {}),
                  }}
                  onClick={() => setSelectedUserId(t.user_id)}
                >
                  <div style={styles.avatar}>
                    {t.username[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{t.username}</span>
                      <span style={{ fontSize: 11, color: '#475569' }}>
                        {formatDate(t.last_message.created_at)}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {t.last_message.is_from_admin ? 'You: ' : ''}{t.last_message.content || 'No messages'}
                    </div>
                  </div>

                  {t.unread_count > 0 && (
                    <span style={styles.unreadBadge}>{t.unread_count}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right pane: Message History & Input */}
        <div style={styles.chatPane}>
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div style={styles.chatHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={styles.avatar}>{activeThread.username[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{activeThread.username}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>{activeThread.email}</div>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={styles.messageBox}>
                {activeThread.messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 40 }}>
                    No messages in this thread
                  </div>
                ) : (
                  activeThread.messages.map(m => (
                    <div
                      key={m.id}
                      style={{
                        ...styles.bubbleWrapper,
                        justifyContent: m.is_from_admin ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          ...styles.bubble,
                          ...(m.is_from_admin ? styles.adminBubble : styles.userBubble),
                        }}
                      >
                        {m.subject && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: m.is_from_admin ? '#a78bfa' : '#38bdf8', marginBottom: 4 }}>
                            Subject: {m.subject}
                          </div>
                        )}
                        <div style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                        <div style={styles.bubbleFooter}>
                          <span>{formatDate(m.created_at)}</span>
                          {m.is_from_admin && <CheckCheck size={14} style={{ color: m.is_read ? '#10b981' : '#64748b' }} />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} style={styles.inputArea}>
                <input
                  className="input"
                  placeholder={`Reply to ${activeThread.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ flex: 1, fontSize: 14 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || !replyText.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Send size={16} /> Send
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: 14 }}>
              Select a conversation thread on the left to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: 20,
    height: 'calc(100vh - 180px)',
    minHeight: 500,
  },
  threadList: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  paneHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  threadCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  selectedThreadCard: {
    background: 'rgba(124, 58, 237, 0.15)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 600,
    flexShrink: 0,
  },
  unreadBadge: {
    background: '#ef4444',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 10,
    padding: '2px 8px',
    marginLeft: 4,
  },
  chatPane: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    background: 'rgba(0,0,0,0.2)',
  },
  messageBox: {
    flex: 1,
    padding: 20,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  bubbleWrapper: {
    display: 'flex',
    width: '100%',
  },
  bubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: 16,
    position: 'relative',
  },
  userBubble: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderBottomLeftRadius: 4,
  },
  adminBubble: {
    background: 'rgba(124, 58, 237, 0.25)',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderBottomRightRadius: 4,
  },
  bubbleFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
    fontSize: 10,
    color: '#94a3b8',
  },
  inputArea: {
    display: 'flex',
    gap: 12,
    padding: 16,
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    background: 'rgba(0,0,0,0.2)',
  },
};
