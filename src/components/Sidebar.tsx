'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  SquarePen,
  Search,
  Settings,
  LogOut,
  Radio,
  Check,
  CheckCheck,
  Clock,
  ChevronRight,
  Mic,
  AlertTriangle,
  User,
  RefreshCw,
} from 'lucide-react';
import { GreenApiClient } from '@/services/greenApiClient';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenNewChat }) => {
  const { credentials, logout, instanceState } = useAuth();
  const {
    chats,
    activeChatId,
    selectChat,
    isPolling,
    pollingError,
    syncChats,
    isSyncingChats,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.chatId.toLowerCase().includes(query) ||
      c.lastMessage?.text.toLowerCase().includes(query)
    );
  });

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // Generate distinct pastel gradient for avatars based on chatId
  const getAvatarGradient = (chatId: string) => {
    const gradients = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
      'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)',
      'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
      'linear-gradient(135deg, #007aff 0%, #00c6ff 100%)',
    ];
    let sum = 0;
    for (let i = 0; i < chatId.length; i++) {
      sum += chatId.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  const getInitials = (chatId: string) => {
    const clean = chatId.replace(/@.*$/, '');
    if (clean.length >= 2) {
      return clean.slice(-2);
    }
    return '💬';
  };

  return (
    <aside style={styles.sidebar}>
      {/* Top Bar with 'Чаты' and Action Icons */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Чаты</h1>
        <div style={styles.headerActions}>
          <button
            onClick={syncChats}
            disabled={isSyncingChats}
            style={styles.actionBtn}
            title="Загрузить чаты из WhatsApp"
          >
            <RefreshCw
              size={17}
              color="var(--accent-color)"
              className={isSyncingChats ? 'spin-animation' : ''}
            />
          </button>
          <button
            onClick={onOpenNewChat}
            style={styles.actionBtn}
            title="Новый диалог (ввести номер)"
          >
            <SquarePen size={20} color="var(--accent-color)" />
          </button>
          <button
            onClick={onOpenSettings}
            style={styles.actionBtn}
            title="Настройки инстанса"
          >
            <Settings size={19} color="var(--text-tertiary)" />
          </button>
        </div>
      </div>

      {/* QR Pairing Warning if notAuthorized */}
      {instanceState?.stateInstance === 'notAuthorized' && (
        <div style={styles.notAuthorizedNotice}>
          <AlertTriangle size={14} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
          <span style={styles.notAuthText}>
            Инстанс не авторизован.{' '}
            <a
              href="https://console.green-api.com"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.notAuthLink}
            >
              Отсканируйте QR ↗
            </a>
          </span>
        </div>
      )}

      {/* Search Input Bar */}
      <div style={styles.searchContainer}>
        <div style={styles.searchWrap}>
          <Search size={15} color="var(--text-tertiary)" style={{ marginLeft: 10 }} />
          <input
            type="text"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <Mic size={15} color="var(--text-tertiary)" style={{ marginRight: 10 }} />
        </div>
      </div>

      {/* Chat List */}
      <div style={styles.chatList}>
        {filteredChats.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyTitle}>Нет диалогов</p>
            <p style={styles.emptySubtitle}>
              Нажмите значок <strong>новый чат</strong> вверху справа, чтобы ввести номер собеседника в MAX или WhatsApp.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.chatId === activeChatId;
            const lastMsg = chat.lastMessage;
            const hasUnread = chat.unreadCount > 0;

            return (
              <div
                key={chat.chatId}
                onClick={() => selectChat(chat.chatId)}
                style={{
                  ...styles.chatItem,
                  backgroundColor: isActive ? 'rgba(0, 122, 255, 0.08)' : 'transparent',
                }}
              >
                {/* Blue dot for unread or active indicator */}
                <div style={styles.indicatorSlot}>
                  {hasUnread && <div style={styles.unreadDot} />}
                </div>

                {/* Avatar with initials or icon */}
                <div
                  style={{
                    ...styles.avatarCircle,
                    background: getAvatarGradient(chat.chatId),
                  }}
                >
                  <span style={styles.avatarInitials}>{getInitials(chat.chatId)}</span>
                </div>

                {/* Details */}
                <div style={styles.chatDetails}>
                  <div style={styles.topRow}>
                    <span
                      style={{
                        ...styles.chatName,
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
                      }}
                    >
                      {GreenApiClient.formatChatDisplay(chat.chatId)}
                    </span>
                    <div style={styles.timeWrap}>
                      <span style={styles.chatTime}>
                        {formatTime(lastMsg?.timestamp || chat.updatedAt)}
                      </span>
                      <ChevronRight size={15} color="#c7c7cc" style={{ marginLeft: 2 }} />
                    </div>
                  </div>

                  <div style={styles.bottomRow}>
                    <div style={styles.previewWrap}>
                      {lastMsg?.direction === 'outgoing' && (
                        <span style={styles.statusIcon}>
                          {lastMsg.status === 'sending' ? (
                            <Clock size={11} color="var(--text-tertiary)" />
                          ) : lastMsg.status === 'sent' ? (
                            <Check size={12} color="var(--text-tertiary)" />
                          ) : (
                            <CheckCheck size={12} color="var(--accent-color)" />
                          )}
                        </span>
                      )}
                      <span style={styles.previewText}>
                        {lastMsg
                          ? (lastMsg.direction === 'outgoing' ? 'Вы: ' : '') + lastMsg.text
                          : 'Нет сообщений'}
                      </span>
                    </div>

                    {hasUnread && (
                      <span style={styles.unreadBadge}>{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer with connection status */}
      <div style={styles.footer}>
        <div style={styles.queueStatus}>
          <div
            className={isPolling ? 'pulsing-dot' : ''}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isPolling
                ? 'var(--accent-green)'
                : 'var(--accent-amber)',
            }}
          />
          <span style={styles.queueText}>
            ID: {credentials?.idInstance} {isPolling ? '• Онлайн' : ''}
          </span>
        </div>

        <button onClick={logout} style={styles.logoutBtn} title="Выйти из инстанса">
          <LogOut size={16} color="var(--accent-red)" />
        </button>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '340px',
    height: '100%',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    zIndex: 10,
  },
  header: {
    height: '64px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  actionBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f7',
  },
  notAuthorizedNotice: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderTop: '1px solid rgba(255, 149, 0, 0.2)',
    borderBottom: '1px solid rgba(255, 149, 0, 0.2)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  notAuthText: {
    fontSize: '12px',
    color: 'var(--accent-amber)',
    lineHeight: '1.3',
  },
  notAuthLink: {
    color: 'var(--accent-amber)',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  searchContainer: {
    padding: '0 16px 10px',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-input)',
    borderRadius: '10px',
    height: '36px',
  },
  searchInput: {
    flex: 1,
    padding: '0 8px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  chatList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyContainer: {
    padding: '48px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  emptySubtitle: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.45',
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.15s ease',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
  },
  indicatorSlot: {
    width: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '4px',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color)',
  },
  avatarCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  chatDetails: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: '14.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  timeWrap: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  chatTime: {
    fontSize: '11.5px',
    color: 'var(--text-tertiary)',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    overflow: 'hidden',
  },
  statusIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  previewText: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  unreadBadge: {
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: 'var(--radius-full)',
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footer: {
    height: '46px',
    padding: '0 16px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-sidebar)',
  },
  queueStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  queueText: {
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  logoutBtn: {
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
