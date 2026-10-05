'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { GreenApiClient } from '@/services/greenApiClient';
import {
  ChevronLeft,
  Plus,
  Mic,
  ArrowUp,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MessageSquare,
  Trash2,
  MoreVertical,
} from 'lucide-react';

interface ChatWindowProps {
  onOpenNewChat: () => void;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onOpenNewChat, onBack }) => {
  const {
    activeChat,
    activeMessages,
    sendMessage,
    isSending,
    clearMessages,
    deleteChat,
    lastSendError,
    clearSendError,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
  };

  const formatMessageTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (nameOrId: string) => {
    const clean = nameOrId.replace(/@.*$/, '');
    if (clean.length >= 2) return clean.slice(-2);
    return '💬';
  };

  if (!activeChat) {
    return (
      <main style={styles.emptyContainer}>
        <div style={styles.emptyContent}>
          <div style={styles.emptyIconCircle}>
            <MessageSquare size={38} color="var(--accent-color)" />
          </div>
          <h2 style={styles.emptyTitle}>GREEN-API Мессенджер</h2>
          <p style={styles.emptySubtitle}>
            Выберите диалог из списка или нажмите кнопку ниже, чтобы ввести номер собеседника в MAX / WhatsApp.
          </p>
          <button onClick={onOpenNewChat} style={styles.emptyActionBtn}>
            Начать диалог
          </button>
        </div>
      </main>
    );
  }

  const displayName = GreenApiClient.formatChatDisplay(activeChat.chatId);

  return (
    <main style={styles.chatWindow}>
      {/* Header matching screenshot */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={onBack}
            style={styles.backButton}
            title="Назад к списку чатов"
          >
            <ChevronLeft size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <div style={styles.headerCenter}>
          <h2 style={styles.headerName}>{displayName}</h2>
          <span style={styles.headerStatus}>был(а) недавно</span>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.headerAvatar}>
            <span>{getInitials(activeChat.chatId)}</span>
          </div>

          <button
            onClick={() => setShowMenu(!showMenu)}
            style={styles.menuToggleBtn}
            title="Меню"
          >
            <MoreVertical size={18} color="var(--text-tertiary)" />
          </button>

          {showMenu && (
            <div style={styles.menuDropdown}>
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
                Удалить диалог
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Floating error banner if sending fails */}
      {lastSendError && (
        <div style={styles.errorBanner}>
          <div style={styles.errorBannerContent}>
            <AlertCircle size={16} color="var(--accent-red)" style={{ flexShrink: 0 }} />
            <span style={styles.errorBannerText}>{lastSendError}</span>
          </div>
          <button onClick={clearSendError} style={styles.errorDismissBtn} title="Закрыть">
            ✕
          </button>
        </div>
      )}

      {/* Messages Canvas */}
      <div style={styles.messageList}>
        {/* Date pill divider */}
        <div style={styles.dateDividerWrap}>
          <span style={styles.dateDivider}>Сегодня</span>
        </div>

        {activeMessages.length === 0 ? (
          <div style={styles.noMessagesContainer}>
            <p style={styles.noMessagesText}>
              История пуста. Отправьте текстовое сообщение получателю в MAX.
            </p>
          </div>
        ) : (
          activeMessages.map((msg, index) => {
            const isOutgoing = msg.direction === 'outgoing';
            const isFirstUnread =
              !isOutgoing &&
              activeChat.unreadCount > 0 &&
              index === activeMessages.length - activeChat.unreadCount;

            return (
              <React.Fragment key={msg.id}>
                {isFirstUnread && (
                  <div style={styles.unreadBanner}>
                    <span style={styles.unreadBannerText}>Непрочитанные сообщения</span>
                  </div>
                )}

                <div
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
                            <Clock size={11} color="rgba(255, 255, 255, 0.75)" />
                          ) : msg.status === 'sent' ? (
                            <Check size={12} color="rgba(255, 255, 255, 0.85)" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck size={12} color="#ffffff" />
                          ) : (
                            <AlertCircle size={12} color="var(--accent-amber)" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Dock matching screenshot */}
      <footer style={styles.inputContainer}>
        {/* Plus attachment icon on left */}
        <button
          type="button"
          onClick={onOpenNewChat}
          style={styles.attachBtn}
          title="Действия"
        >
          <Plus size={20} color="var(--text-tertiary)" />
        </button>

        {/* Input Pill */}
        <form onSubmit={handleSend} style={styles.inputForm}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение"
            style={styles.textarea}
          />

          {inputText.trim() ? (
            <button
              type="submit"
              disabled={isSending}
              style={styles.sendActiveBtn}
              title="Отправить (Enter)"
            >
              <ArrowUp size={18} color="#ffffff" strokeWidth={2.5} />
            </button>
          ) : (
            <button type="button" style={styles.micBtn} title="Голосовое сообщение">
              <Mic size={18} color="var(--text-tertiary)" />
            </button>
          )}
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    zIndex: 5,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    width: '40px',
  },
  backButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#f2f2f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  headerName: {
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'var(--text-primary)',
  },
  headerStatus: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '1px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
  },
  headerAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #007aff 0%, #00c6ff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  menuToggleBtn: {
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    top: '42px',
    right: 0,
    backgroundColor: '#ffffff',
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
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderBottom: '1px solid rgba(255, 59, 48, 0.2)',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 4,
  },
  errorBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  errorBannerText: {
    fontSize: '12.5px',
    color: 'var(--accent-red)',
    lineHeight: '1.4',
  },
  errorDismissBtn: {
    padding: '4px 8px',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    cursor: 'pointer',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#ffffff',
  },
  dateDividerWrap: {
    display: 'flex',
    justifyContent: 'center',
    margin: '10px 0 16px',
  },
  dateDivider: {
    fontSize: '11.5px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  unreadBanner: {
    width: '100%',
    backgroundColor: '#f2f2f7',
    padding: '5px 0',
    textAlign: 'center',
    margin: '12px 0 8px',
    borderRadius: '4px',
  },
  unreadBannerText: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
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
    fontSize: '13.5px',
    color: 'var(--text-tertiary)',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '62%',
    padding: '9px 13px',
    position: 'relative',
    wordBreak: 'break-word',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  senderHeader: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--accent-color)',
    marginBottom: '1px',
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
  },
  messageMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10.5px',
    marginTop: '1px',
  },
  timestamp: {
    fontSize: '10.5px',
  },
  metaIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  inputContainer: {
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderTop: '1px solid var(--border-subtle)',
  },
  attachBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#f2f2f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputForm: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5ea',
    borderRadius: '24px',
    padding: '4px 8px 4px 16px',
    gap: '8px',
  },
  textarea: {
    flex: 1,
    maxHeight: '100px',
    resize: 'none',
    fontSize: '14.5px',
    lineHeight: '1.4',
    color: 'var(--text-primary)',
    padding: '6px 0',
  },
  sendActiveBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(0, 122, 255, 0.35)',
  },
  micBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbfbfd',
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px',
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
    padding: '11px 24px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
  },
};
