'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { GreenApiClient } from '@/services/greenApiClient';
import {
  Send,
  User,
  Trash2,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  MessageSquare,
  MoreVertical,
} from 'lucide-react';

interface ChatWindowProps {
  onOpenNewChat: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onOpenNewChat }) => {
  const {
    activeChat,
    activeMessages,
    sendMessage,
    isSending,
    clearMessages,
    deleteChat,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeChat?.chatId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [activeMessages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Auto-grow textarea up to 120px
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const formatMessageTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // If no chat is selected, show elegant Apple-style empty placeholder
  if (!activeChat) {
    return (
      <main style={styles.emptyContainer}>
        <div style={styles.emptyContent}>
          <div style={styles.emptyIconCircle}>
            <MessageSquare size={36} color="var(--accent-color)" />
          </div>
          <h2 style={styles.emptyTitle}>GREEN-API Мессенджер</h2>
          <p style={styles.emptySubtitle}>
            Выберите контакт из списка слева или начните новый чат по номеру телефона получателя в MAX или WhatsApp.
          </p>
          <button onClick={onOpenNewChat} style={styles.emptyActionBtn}>
            Начать диалог
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.chatWindow}>
      {/* Header */}
      <header style={styles.header} className="glass-effect">
        <div style={styles.headerInfo}>
          <div style={styles.avatarCircle}>
            <User size={20} color="#ffffff" />
          </div>
          <div>
            <h2 style={styles.headerName}>
              {GreenApiClient.formatChatDisplay(activeChat.chatId)}
            </h2>
            <span style={styles.headerChatId}>{activeChat.chatId}</span>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={styles.menuBtn}
            title="Опции чата"
          >
            <MoreVertical size={18} color="var(--text-secondary)" />
          </button>

          {showMenu && (
            <div style={styles.menuDropdown} className="glass-effect">
              <button
                onClick={() => {
                  clearMessages(activeChat.chatId);
                  setShowMenu(false);
                }}
                style={styles.menuItem}
              >
                Очистить переписку
              </button>
              <button
                onClick={() => {
                  deleteChat(activeChat.chatId);
                  setShowMenu(false);
                }}
                style={{ ...styles.menuItem, color: 'var(--accent-red)' }}
              >
                <Trash2 size={14} style={{ marginRight: 6 }} />
                Удалить чат
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div style={styles.messageList}>
        {activeMessages.length === 0 ? (
          <div style={styles.noMessagesContainer}>
            <p style={styles.noMessagesText}>
              История пуста. Отправьте первое текстовое сообщение получателю.
            </p>
          </div>
        ) : (
          activeMessages.map((msg) => {
            const isOutgoing = msg.direction === 'outgoing';

            return (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    backgroundColor: isOutgoing
                      ? 'var(--bubble-outgoing)'
                      : 'var(--bubble-incoming)',
                    color: isOutgoing
                      ? 'var(--bubble-outgoing-text)'
                      : 'var(--bubble-incoming-text)',
                    borderRadius: isOutgoing
                      ? '18px 18px 4px 18px'
                      : '18px 18px 18px 4px',
                  }}
                >
                  {!isOutgoing && msg.senderName && (
                    <span style={styles.senderHeader}>{msg.senderName}</span>
                  )}

                  <div style={styles.messageText}>{msg.text}</div>

                  <div
                    style={{
                      ...styles.messageMeta,
                      justifyContent: 'flex-end',
                      color: isOutgoing
                        ? 'rgba(255, 255, 255, 0.75)'
                        : 'var(--text-tertiary)',
                    }}
                  >
                    <span style={styles.timestamp}>
                      {formatMessageTime(msg.timestamp)}
                    </span>

                    {isOutgoing && (
                      <span style={styles.metaIcon}>
                        {msg.status === 'sending' ? (
                          <Clock size={12} color="rgba(255, 255, 255, 0.8)" />
                        ) : msg.status === 'sent' ? (
                          <Check size={13} color="rgba(255, 255, 255, 0.9)" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck size={13} color="#ffffff" />
                        ) : (
                          <AlertCircle size={13} color="var(--accent-amber)" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <footer style={styles.inputContainer} className="glass-effect">
        <form onSubmit={handleSend} style={styles.inputForm}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение в MAX (Enter для отправки)..."
            style={styles.textarea}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            style={{
              ...styles.sendButton,
              backgroundColor: inputText.trim()
                ? 'var(--accent-color)'
                : 'var(--text-tertiary)',
              cursor: inputText.trim() && !isSending ? 'pointer' : 'default',
            }}
          >
            <Send size={16} color="#ffffff" />
          </button>
        </form>
      </footer>
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  chatWindow: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-surface-elevated)',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    height: '60px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-surface)',
    zIndex: 5,
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0071e3 0%, #42a5f5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'var(--text-primary)',
  },
  headerChatId: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  headerActions: {
    position: 'relative',
  },
  menuBtn: {
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    top: '40px',
    right: 0,
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    padding: '6px',
    minWidth: '180px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  menuItem: {
    padding: '8px 12px',
    fontSize: '13px',
    textAlign: 'left',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.15s ease',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  noMessagesContainer: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    textAlign: 'center',
  },
  noMessagesText: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '68%',
    padding: '10px 14px',
    position: 'relative',
    wordBreak: 'break-word',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  senderHeader: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--accent-color)',
    marginBottom: '2px',
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '1.45',
    whiteSpace: 'pre-wrap',
  },
  messageMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    marginTop: '2px',
  },
  timestamp: {
    fontSize: '10px',
  },
  metaIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  inputContainer: {
    padding: '12px 20px',
    borderTop: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-surface)',
  },
  inputForm: {
    display: 'flex',
    alignItems: 'flex-end',
    backgroundColor: 'var(--bg-input)',
    borderRadius: 'var(--radius-lg)',
    padding: '6px 8px 6px 16px',
    gap: '10px',
  },
  textarea: {
    flex: 1,
    maxHeight: '120px',
    resize: 'none',
    fontSize: '14px',
    lineHeight: '1.4',
    color: 'var(--text-primary)',
    padding: '6px 0',
  },
  sendButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: '2px',
    transition: 'all var(--transition-fast)',
  },
  emptyContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    padding: '24px',
  },
  emptyContent: {
    maxWidth: '420px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyIconCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 113, 227, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontSize: '22px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  emptyActionBtn: {
    marginTop: '8px',
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    padding: '11px 22px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-sm)',
  },
};
