'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  Plus,
  Search,
  Settings,
  LogOut,
  Radio,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react';
import { GreenApiClient } from '@/services/greenApiClient';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenNewChat }) => {
  const { credentials, logout, instanceState } = useAuth();
  const { chats, activeChatId, selectChat, isPolling, pollingError } = useChat();

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
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  return (
    <aside style={styles.sidebar}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.instanceInfo}>
          <div style={styles.statusIndicator}>
            <div
              className={isPolling ? 'pulsing-dot' : ''}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isPolling
                  ? 'var(--accent-green)'
                  : instanceState?.stateInstance === 'authorized'
                  ? 'var(--accent-green)'
                  : 'var(--accent-amber)',
              }}
            />
            <span style={styles.instanceTitle}>
              ID: {credentials?.idInstance || 'Не подключен'}
            </span>
          </div>
        </div>

        <div style={styles.topActions}>
          <button
            onClick={onOpenNewChat}
            style={styles.iconBtn}
            title="Начать новый диалог"
          >
            <Plus size={20} color="var(--accent-color)" />
          </button>
          <button
            onClick={onOpenSettings}
            style={styles.iconBtn}
            title="Параметры подключения"
          >
            <Settings size={18} color="var(--text-secondary)" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <div style={styles.searchWrap}>
          <Search size={16} color="var(--text-tertiary)" style={{ marginLeft: 10 }} />
          <input
            type="text"
            placeholder="Поиск по чатам и номерам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Chat List */}
      <div style={styles.chatList}>
        {filteredChats.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyTitle}>Чатов пока нет</p>
            <p style={styles.emptySubtitle}>
              Нажмите кнопку «+» выше, чтобы указать номер и создать первый диалог.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.chatId === activeChatId;
            const lastMsg = chat.lastMessage;

            return (
              <div
                key={chat.chatId}
                onClick={() => selectChat(chat.chatId)}
                style={{
                  ...styles.chatItem,
                  backgroundColor: isActive
                    ? 'rgba(0, 113, 227, 0.12)'
                    : 'transparent',
                }}
              >
                <div style={styles.avatarCircle}>
                  <User size={18} color="#ffffff" />
                </div>

                <div style={styles.chatDetails}>
                  <div style={styles.chatHeaderRow}>
                    <span
                      style={{
                        ...styles.chatName,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
                      }}
                    >
                      {GreenApiClient.formatChatDisplay(chat.chatId)}
                    </span>
                    <span style={styles.chatTime}>
                      {formatTime(lastMsg?.timestamp || chat.updatedAt)}
                    </span>
                  </div>

                  <div style={styles.chatPreviewRow}>
                    <div style={styles.messagePreview}>
                      {lastMsg?.direction === 'outgoing' && (
                        <span style={styles.statusIcon}>
                          {lastMsg.status === 'sending' ? (
                            <Clock size={12} color="var(--text-tertiary)" />
                          ) : lastMsg.status === 'sent' ? (
                            <Check size={13} color="var(--text-secondary)" />
                          ) : (
                            <CheckCheck size={13} color="var(--accent-color)" />
                          )}
                        </span>
                      )}
                      <span style={styles.previewText}>
                        {lastMsg
                          ? (lastMsg.direction === 'outgoing' ? 'Вы: ' : '') + lastMsg.text
                          : 'Нет сообщений'}
                      </span>
                    </div>

                    {chat.unreadCount > 0 && (
                      <span style={styles.unreadBadge}>{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer & Status Engine */}
      <div style={styles.footer}>
        <div style={styles.queueStatus}>
          <Radio
            size={14}
            color={
              pollingError
                ? 'var(--accent-amber)'
                : isPolling
                ? 'var(--accent-green)'
                : 'var(--text-tertiary)'
            }
          />
          <span style={styles.queueText}>
            {pollingError ? (
              <span title={pollingError}>Ожидание сети...</span>
            ) : isPolling ? (
              'HTTP Queue: опрос активен'
            ) : (
              'Очередь приостановлена'
            )}
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
    width: '320px',
    height: '100%',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    zIndex: 10,
  },
  topBar: {
    height: '60px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-subtle)',
  },
  instanceInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  instanceTitle: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'var(--text-primary)',
  },
  topActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  iconBtn: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  searchContainer: {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-input)',
    borderRadius: 'var(--radius-sm)',
    height: '34px',
  },
  searchInput: {
    flex: 1,
    padding: '0 10px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  chatList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  emptyContainer: {
    padding: '40px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  emptySubtitle: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.4',
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    gap: '12px',
    transition: 'background-color 0.15s ease',
  },
  avatarCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0071e3 0%, #42a5f5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatDetails: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  chatHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chatTime: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  chatPreviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
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
    fontSize: '12px',
    color: 'var(--text-secondary)',
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
    height: '48px',
    padding: '0 14px',
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
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  logoutBtn: {
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
