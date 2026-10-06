'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  ChatMessage,
  ChatSummary,
  ReceiveNotificationResponse,
} from '@/types/greenApi';
import { useAuth } from './AuthContext';
import { GreenApiClient } from '@/services/greenApiClient';

interface ChatContextType {
  chats: ChatSummary[];
  activeChatId: string | null;
  activeChat: ChatSummary | null;
  activeMessages: ChatMessage[];
  isSending: boolean;
  isPolling: boolean;
  isSyncingChats: boolean;
  pollingError: string | null;
  lastSendError: string | null;
  clearSendError: () => void;
  syncChats: () => Promise<void>;
  clearAllChats: () => void;
  selectChat: (chatId: string) => void;
  closeChat: () => void;
  toggleChatUnread: (chatId: string) => void;
  markChatAsRead: (chatId: string) => void;
  createChat: (rawContact: string) => string;
  sendMessage: (text: string) => Promise<boolean>;
  deleteChat: (chatId: string) => void;
  clearMessages: (chatId: string) => void;
  loadChatHistory: (chatId: string) => Promise<void>;
}

const CHATS_STORAGE_KEY = 'green_api_chats_v1';
const MESSAGES_STORAGE_KEY = 'green_api_messages_v1';
const ACTIVE_CHAT_STORAGE_KEY = 'green_api_active_chat_v1';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { client, credentials } = useAuth();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSyncingChats, setIsSyncingChats] = useState<boolean>(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [lastSendError, setLastSendError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadedFromStorageRef = useRef<boolean>(false);
  const currentLoadedInstanceRef = useRef<string | null>(null);

  // Load chats, messages & activeChatId from localStorage when credentials change
  useEffect(() => {
    const nextId = credentials?.idInstance || null;
    if (!nextId) {
      isLoadedFromStorageRef.current = false;
      currentLoadedInstanceRef.current = null;
      setActiveChatId(null);
      setChats([]);
      setMessages({});
      return;
    }

    if (currentLoadedInstanceRef.current === nextId) {
      return;
    }

    try {
      const savedChats = localStorage.getItem(`${CHATS_STORAGE_KEY}_${nextId}`);
      const savedMessages = localStorage.getItem(`${MESSAGES_STORAGE_KEY}_${nextId}`);
      const savedActiveChat = localStorage.getItem(`${ACTIVE_CHAT_STORAGE_KEY}_${nextId}`);

      const parsedChats: ChatSummary[] = savedChats ? JSON.parse(savedChats) : [];
      const parsedMessages: Record<string, ChatMessage[]> = savedMessages ? JSON.parse(savedMessages) : {};

      // On session restore (F5), clear isUnread from restored history so reload doesn't trigger banner on old messages
      const cleanedMessages: Record<string, ChatMessage[]> = {};
      for (const [cId, msgList] of Object.entries(parsedMessages)) {
        cleanedMessages[cId] = msgList.map((m) => (m.isUnread ? { ...m, isUnread: false } : m));
      }
      setMessages(cleanedMessages);

      const cleanedChats = parsedChats.map((c) => {
        if (c.chatId === savedActiveChat) {
          return { ...c, unreadCount: 0 };
        }
        return c;
      });

      setChats(cleanedChats);
      if (savedActiveChat) {
        setActiveChatId(savedActiveChat);
      }
    } catch {
      setChats([]);
      setMessages({});
      setActiveChatId(null);
    }

    isLoadedFromStorageRef.current = true;
    currentLoadedInstanceRef.current = nextId;
  }, [credentials?.idInstance]);

  // Persist activeChatId to localStorage whenever it changes (only after storage is loaded)
  useEffect(() => {
    if (!isLoadedFromStorageRef.current || !credentials?.idInstance) return;
    try {
      if (activeChatId) {
        localStorage.setItem(`${ACTIVE_CHAT_STORAGE_KEY}_${credentials.idInstance}`, activeChatId);
      } else {
        localStorage.removeItem(`${ACTIVE_CHAT_STORAGE_KEY}_${credentials.idInstance}`);
      }
    } catch {
      // Storage error
    }
  }, [activeChatId, credentials?.idInstance]);

  // Persist chats to localStorage whenever they change (only after storage is loaded)
  useEffect(() => {
    if (!isLoadedFromStorageRef.current || !credentials?.idInstance) return;
    try {
      localStorage.setItem(`${CHATS_STORAGE_KEY}_${credentials.idInstance}`, JSON.stringify(chats));
    } catch {
      // Storage error
    }
  }, [chats, credentials?.idInstance]);

  // Persist messages to localStorage whenever they change (only after storage is loaded)
  useEffect(() => {
    if (!isLoadedFromStorageRef.current || !credentials?.idInstance) return;
    try {
      localStorage.setItem(`${MESSAGES_STORAGE_KEY}_${credentials.idInstance}`, JSON.stringify(messages));
    } catch {
      // Storage quota error
    }
  }, [messages, credentials?.idInstance]);

  const activeChatIdRef = useRef<string | null>(activeChatId);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Helper to add or update an incoming or outgoing message
  const appendMessage = useCallback(
    (chatId: string, message: ChatMessage, senderDisplayName?: string) => {
      setMessages((prev) => {
        const existing = prev[chatId] || [];
        // Avoid duplicate idMessages
        if (existing.some((m) => m.id === message.id)) {
          return prev;
        }
        return {
          ...prev,
          [chatId]: [...existing, message],
        };
      });

      // Update or create chat in sidebar
      setChats((prev) => {
        const index = prev.findIndex((c) => c.chatId === chatId);
        const displayName = senderDisplayName || GreenApiClient.formatChatDisplay(chatId);

        const isIncoming = message.direction === 'incoming';

        if (index >= 0) {
          const updated = [...prev];
          const current = updated[index];
          const isActive = activeChatIdRef.current === chatId;
          updated[index] = {
            ...current,
            name: current.name || displayName,
            lastMessage: message,
            unreadCount:
              isIncoming && !isActive
                ? current.unreadCount + 1
                : current.unreadCount,
            updatedAt: message.timestamp,
          };
          // Move updated chat to the top
          return [updated[index], ...updated.filter((_, i) => i !== index)];
        } else {
          const isActive = activeChatIdRef.current === chatId;
          const newChat: ChatSummary = {
            chatId,
            name: displayName,
            lastMessage: message,
            unreadCount: isIncoming && !isActive ? 1 : 0,
            updatedAt: message.timestamp,
          };
          return [newChat, ...prev];
        }
      });
    },
    []
  );

  // Process incoming notification payload
  const handleIncomingNotification = useCallback(
    (notification: ReceiveNotificationResponse) => {
      const { body } = notification;
      if (!body) return;

      const type = body.typeWebhook;

      // Handle outgoing message status updates (sent -> delivered -> read)
      if (type === 'outgoingMessageStatus') {
        const idMsg = body.idMessage;
        const rawStatus = String(body.status || '').toLowerCase();
        const nextStatus: 'sent' | 'delivered' | 'read' =
          rawStatus === 'read' ? 'read' : rawStatus === 'delivered' ? 'delivered' : 'sent';

        if (idMsg) {
          setMessages((prev) => {
            let changed = false;
            const updated: Record<string, ChatMessage[]> = {};
            for (const [cId, msgList] of Object.entries(prev)) {
              if (msgList.some((m) => m.id === idMsg || m.clientId === idMsg)) {
                changed = true;
                updated[cId] = msgList.map((m) =>
                  m.id === idMsg || m.clientId === idMsg ? { ...m, status: nextStatus } : m
                );
              } else {
                updated[cId] = msgList;
              }
            }
            return changed ? updated : prev;
          });

          setChats((prev) =>
            prev.map((c) =>
              c.lastMessage && (c.lastMessage.id === idMsg || c.lastMessage.clientId === idMsg)
                ? {
                    ...c,
                    lastMessage: { ...c.lastMessage, status: nextStatus },
                  }
                : c
            )
          );
        }
        return;
      }

      // Check if it is an incoming or outgoing message notification
      if (
        type === 'incomingMessageReceived' ||
        type === 'outgoingMessageReceived' ||
        type === 'outgoingAPIMessageReceived'
      ) {
        const chatId =
          body.senderData?.chatId ||
          body.chatId ||
          body.senderData?.sender ||
          body.instanceData?.wid;

        const idMessage = body.idMessage || `${type}_${Date.now()}`;
        const senderName =
          body.senderData?.senderName ||
          body.senderData?.senderContactName ||
          body.senderData?.chatName;

        let text = '';
        const msgData = body.messageData;

        if (msgData?.typeMessage === 'textMessage') {
          text = msgData.textMessageData?.textMessage || '';
        } else if (msgData?.typeMessage === 'extendedTextMessage') {
          text =
            msgData.extendedTextMessageData?.text ||
            msgData.extendedTextMessageData?.description ||
            '';
        } else if (msgData?.typeMessage === 'imageMessage') {
          text = msgData.fileMessageData?.caption || '📷 [Фотография]';
        } else if (msgData?.typeMessage === 'videoMessage') {
          text = msgData.fileMessageData?.caption || '🎥 [Видео]';
        } else if (msgData?.typeMessage === 'audioMessage') {
          text = '🎵 [Голосовое сообщение]';
        } else if (msgData?.typeMessage === 'documentMessage') {
          text = `📄 ${msgData.fileMessageData?.fileName || '[Документ]'}`;
        } else if (msgData?.typeMessage === 'contactMessage') {
          text = '👤 [Контакт]';
        } else if (msgData?.typeMessage === 'locationMessage') {
          text = '📍 [Геолокация]';
        } else {
          text = `[${msgData?.typeMessage || 'Сообщение'}]`;
        }

        if (chatId) {
          const isIncoming = type === 'incomingMessageReceived';
          const isAudio = msgData?.typeMessage === 'audioMessage';
          const incomingMessage: ChatMessage = {
            id: idMessage,
            chatId,
            text: isAudio ? 'Голосовое сообщение' : text || '[Сообщение]',
            timestamp: (body.timestamp || Math.floor(Date.now() / 1000)) * 1000,
            direction: isIncoming ? 'incoming' : 'outgoing',
            senderName,
            status: 'delivered',
            type: isAudio ? 'audio' : 'text',
            downloadUrl: (msgData?.fileMessageData?.downloadUrl as string) || undefined,
            isUnread: isIncoming,
          };
          appendMessage(chatId, incomingMessage, senderName);
        }
      }
    },
    [appendMessage]
  );

  const handleNotificationRef = useRef(handleIncomingNotification);
  useEffect(() => {
    handleNotificationRef.current = handleIncomingNotification;
  }, [handleIncomingNotification]);

  // Polling loop for ReceiveNotification -> DeleteNotification
  useEffect(() => {
    if (!client) {
      setIsPolling(false);
      return;
    }

    isMountedRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let isRunning = true;

    const pollCycle = async () => {
      setIsPolling(true);

      // Auto-enable incomingWebhook on GREEN-API instance if needed
      try {
        await client.ensureIncomingWebhook(controller.signal);
      } catch (err) {
        console.warn('Webhook auto-configuration warning:', err);
      }

      while (isRunning && isMountedRef.current && !controller.signal.aborted) {
        try {
          // 1. Receive notification from queue (timeout: 5 seconds)
          const notification = await client.receiveNotification(5, controller.signal);

          if (notification && notification.receiptId) {
            // 2. Handle the notification payload
            handleNotificationRef.current(notification);

            // 3. Delete notification from queue to confirm receipt
            await client.deleteNotification(notification.receiptId, controller.signal);

            setPollingError(null);
          } else {
            // Queue is empty, short breathing pause to prevent aggressive spin
            await new Promise((res) => setTimeout(res, 800));
          }
        } catch (err: unknown) {
          if (controller.signal.aborted) {
            break;
          }
          const message = err instanceof Error ? err.message : 'Ошибка получения уведомления';
          setPollingError(message);
          // Wait 3 seconds on network/API error before retry
          await new Promise((res) => setTimeout(res, 3000));
        }
      }

      if (isMountedRef.current) {
        setIsPolling(false);
      }
    };

    pollCycle();

    return () => {
      isRunning = false;
      isMountedRef.current = false;
      controller.abort();
    };
  }, [client]);

  // Fetch available chats & contacts from GREEN-API instance
  const syncChats = useCallback(
    async () => {
      if (!client) return;
      setIsSyncingChats(true);
      try {
        const [remoteChats, remoteContacts] = await Promise.all([
          client.getChats().catch(() => []),
          client.getContacts().catch(() => []),
        ]);

        setChats((prev) => {
          const map = new Map<string, ChatSummary>();

          // Always preserve existing local chats and lastMessage
          prev.forEach((c) => map.set(c.chatId, c));

          // 1. Merge in address book contacts from getContacts
          if (Array.isArray(remoteContacts)) {
            remoteContacts.forEach((rc) => {
              if (!rc.id || rc.id.startsWith('0@')) return;
              const existing = map.get(rc.id);
              const displayName =
                (rc.contactName || rc.name || '').trim() || GreenApiClient.formatChatDisplay(rc.id);

              if (existing) {
                if (rc.contactName || rc.name) {
                  map.set(rc.id, {
                    ...existing,
                    name: displayName,
                  });
                }
              } else {
                map.set(rc.id, {
                  chatId: rc.id,
                  name: displayName,
                  unreadCount: 0,
                  updatedAt: Date.now() - 86400000,
                });
              }
            });
          }

          // 2. Merge in active conversations from getChats
          if (Array.isArray(remoteChats)) {
            remoteChats.forEach((rc) => {
              if (!rc.id || rc.id.startsWith('0@')) return;
              const existing = map.get(rc.id);
              const displayName =
                rc.name && rc.name.trim() ? rc.name.trim() : GreenApiClient.formatChatDisplay(rc.id);

              const isActive = activeChatIdRef.current === rc.id;

              if (existing) {
                if (rc.name && rc.name !== rc.id) {
                  map.set(rc.id, {
                    ...existing,
                    name: displayName,
                    unreadCount: isActive ? 0 : existing.unreadCount,
                  });
                } else if (isActive && existing.unreadCount > 0) {
                  map.set(rc.id, { ...existing, unreadCount: 0 });
                }
              } else {
                map.set(rc.id, {
                  chatId: rc.id,
                  name: displayName,
                  unreadCount: 0,
                  updatedAt: Date.now(),
                });
              }
            });
          }

          return Array.from(map.values());
        });
      } catch (err: unknown) {
        console.warn('Failed to load remote chats/contacts:', err);
      } finally {
        setIsSyncingChats(false);
      }
    },
    [client]
  );

  // Automatically pull chats when connected
  useEffect(() => {
    if (client) {
      syncChats();
    }
  }, [client, syncChats]);

  // Load message history from GREEN-API for active chat
  const loadChatHistory = useCallback(
    async (chatId: string) => {
      if (!client || !chatId) return;
      try {
        const rawHistory = await client.getChatHistory(chatId, 50);
        if (Array.isArray(rawHistory) && rawHistory.length > 0) {
          const mapped: ChatMessage[] = rawHistory.map((m) => {
            const isIncoming = m.type === 'incoming';
            const isAudio = m.typeMessage === 'audioMessage';
            const text =
              m.textMessage ||
              m.extendedTextMessage?.text ||
              m.caption ||
              (isAudio ? 'Голосовое сообщение' : `[${m.typeMessage || 'Сообщение'}]`);

            const ts = m.timestamp > 10000000000 ? m.timestamp : m.timestamp * 1000;

            return {
              id: m.idMessage || `hist_${m.timestamp}`,
              chatId,
              text,
              timestamp: ts,
              direction: isIncoming ? 'incoming' : 'outgoing',
              senderName: m.senderName || m.senderContactName,
              status: 'delivered' as const,
              type: isAudio ? ('audio' as const) : ('text' as const),
              downloadUrl: (m.downloadUrl as string) || undefined,
            };
          });

          // Sort ascending (oldest first, newest last)
          mapped.sort((a, b) => a.timestamp - b.timestamp);

          setMessages((prev) => {
            const existing = prev[chatId] || [];
            const existingIds = new Set(existing.map((m) => m.id));
            const merged = [...existing];

            mapped.forEach((m) => {
              if (!existingIds.has(m.id)) {
                merged.push(m);
              }
            });

            merged.sort((a, b) => a.timestamp - b.timestamp);
            return {
              ...prev,
              [chatId]: merged,
            };
          });

          const latest = mapped[mapped.length - 1];
          if (latest) {
            setChats((prev) =>
              prev.map((c) =>
                c.chatId === chatId
                  ? {
                      ...c,
                      lastMessage: latest,
                      updatedAt: Math.max(c.updatedAt, latest.timestamp),
                    }
                  : c
              )
            );
          }
        }
      } catch (err) {
        console.warn(`Failed to load chat history for ${chatId}:`, err);
      }
    },
    [client]
  );

  // Fetch contact information (name, avatar) from GREEN-API
  const fetchContactName = useCallback(
    async (chatId: string) => {
      if (!client || !chatId) return;
      try {
        const info = await client.getContactInfo(chatId);
        const resolvedName = (info?.contactName || info?.name || '').trim();
        const lastSeen = info?.lastSeen !== undefined ? info.lastSeen : null;
        const avatar = info?.avatar || null;

        setChats((prev) =>
          prev.map((c) => {
            if (c.chatId === chatId) {
              return {
                ...c,
                name: resolvedName && resolvedName !== chatId ? resolvedName : c.name,
                lastSeen: lastSeen !== undefined ? lastSeen : c.lastSeen,
                avatarUrl: avatar || c.avatarUrl,
              };
            }
            return c;
          })
        );
      } catch {
        // Ignore network errors
      }
    },
    [client]
  );

  // Automatically load history & contact name when active chat changes
  useEffect(() => {
    if (activeChatId && client) {
      loadChatHistory(activeChatId);
      fetchContactName(activeChatId);
    }
  }, [activeChatId, client, loadChatHistory, fetchContactName]);

  // Create or select chat
  const createChat = useCallback(
    (rawContact: string): string => {
      const normalizedId = GreenApiClient.normalizeChatId(rawContact);
      if (!normalizedId) return '';

      setChats((prev) => {
        const exists = prev.find((c) => c.chatId === normalizedId);
        if (exists) return prev;

        const newChat: ChatSummary = {
          chatId: normalizedId,
          name: GreenApiClient.formatChatDisplay(normalizedId),
          unreadCount: 0,
          updatedAt: Date.now(),
        };
        return [newChat, ...prev];
      });

      setActiveChatId(normalizedId);
      loadChatHistory(normalizedId);
      fetchContactName(normalizedId);
      return normalizedId;
    },
    [loadChatHistory, fetchContactName]
  );

  // Select chat & reset unread counter
  // Select chat & reset unread counter
  const selectChat = useCallback(
    (chatId: string) => {
      const prevActiveId = activeChatIdRef.current;
      if (prevActiveId && prevActiveId !== chatId) {
        setMessages((mPrev) => {
          const list = mPrev[prevActiveId] || [];
          if (!list.some((m) => m.isUnread)) return mPrev;
          return {
            ...mPrev,
            [prevActiveId]: list.map((m) => (m.isUnread ? { ...m, isUnread: false } : m)),
          };
        });
      }

      setActiveChatId(chatId);

      setChats((prev) =>
        prev.map((c) => (c.chatId === chatId ? { ...c, unreadCount: 0 } : c))
      );

      // Call GREEN-API readChat to mark messages as read on WhatsApp server
      if (client) {
        client.readChat(chatId).catch(() => {});
      }

      loadChatHistory(chatId);
      fetchContactName(chatId);
    },
    [client, loadChatHistory, fetchContactName]
  );

  // Send message
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!client || !activeChatId || !text.trim()) {
        return false;
      }

      const trimmedText = text.trim();
      const tempId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = Date.now();

      const optimisticMessage: ChatMessage = {
        id: tempId,
        clientId: tempId,
        chatId: activeChatId,
        text: trimmedText,
        timestamp: now,
        direction: 'outgoing',
        status: 'sending',
      };

      // Optimistically show message immediately
      appendMessage(activeChatId, optimisticMessage);
      setIsSending(true);
      setLastSendError(null);

      // Mark all incoming messages in activeChat as read upon sending reply
      setMessages((prev) => {
        const chatMsgs = prev[activeChatId] || [];
        const hasUnread = chatMsgs.some((m) => m.isUnread);
        if (!hasUnread) return prev;
        return {
          ...prev,
          [activeChatId]: chatMsgs.map((m) => (m.isUnread ? { ...m, isUnread: false } : m)),
        };
      });

      setChats((prev) =>
        prev.map((c) =>
          c.chatId === activeChatId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c
        )
      );

      try {
        const response = await client.sendMessage({
          chatId: activeChatId,
          message: trimmedText,
        });

        // Update status to sent with real idMessage while keeping clientId stable
        setMessages((prev) => {
          const chatMsgs = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: chatMsgs.map((m) =>
              m.id === tempId
                ? { ...m, id: response.idMessage || tempId, clientId: m.clientId || tempId, status: 'sent' }
                : m
            ),
          };
        });

        // Immediately update status in sidebar chats so clock changes to single checkmark
        setChats((prev) =>
          prev.map((c) =>
            c.chatId === activeChatId && c.lastMessage && (c.lastMessage.id === tempId || c.lastMessage.clientId === tempId)
              ? {
                  ...c,
                  lastMessage: {
                    ...c.lastMessage,
                    id: response.idMessage || tempId,
                    status: 'sent',
                  },
                }
              : c
          )
        );

        return true;
      } catch (err: unknown) {
        // Mark message as error
        setMessages((prev) => {
          const chatMsgs = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: chatMsgs.map((m) =>
              m.id === tempId ? { ...m, status: 'error' } : m
            ),
          };
        });
        setChats((prev) =>
          prev.map((c) =>
            c.chatId === activeChatId && c.lastMessage && (c.lastMessage.id === tempId || c.lastMessage.clientId === tempId)
              ? {
                  ...c,
                  lastMessage: {
                    ...c.lastMessage,
                    status: 'error',
                  },
                }
              : c
          )
        );
        const msg = err instanceof Error ? err.message : 'Не удалось отправить сообщение';
        setLastSendError(msg);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [client, activeChatId, appendMessage]
  );

  const closeChat = useCallback(() => {
    if (activeChatIdRef.current) {
      const cId = activeChatIdRef.current;
      setMessages((prev) => {
        const list = prev[cId] || [];
        if (!list.some((m) => m.isUnread)) return prev;
        return {
          ...prev,
          [cId]: list.map((m) => (m.isUnread ? { ...m, isUnread: false } : m)),
        };
      });
    }
    setActiveChatId(null);
  }, []);

  const toggleChatUnread = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.chatId === chatId) {
          const nextCount = c.unreadCount > 0 ? 0 : 1;
          setMessages((mPrev) => {
            const list = mPrev[chatId] || [];
            if (nextCount > 0) {
              const incoming = list.filter((m) => m.direction === 'incoming');
              const lastIncoming = incoming[incoming.length - 1];
              if (!lastIncoming) return mPrev;
              return {
                ...mPrev,
                [chatId]: list.map((m) =>
                  m.id === lastIncoming.id ? { ...m, isUnread: true } : m
                ),
              };
            } else {
              return {
                ...mPrev,
                [chatId]: list.map((m) => (m.isUnread ? { ...m, isUnread: false } : m)),
              };
            }
          });
          return { ...c, unreadCount: nextCount };
        }
        return c;
      })
    );
  }, []);

  const markChatAsRead = useCallback(
    (chatId: string) => {
      setChats((prev) =>
        prev.map((c) => (c.chatId === chatId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c))
      );
      setMessages((prev) => {
        const list = prev[chatId] || [];
        if (!list.some((m) => m.isUnread)) return prev;
        return {
          ...prev,
          [chatId]: list.map((m) => (m.isUnread ? { ...m, isUnread: false } : m)),
        };
      });
      if (client) {
        client.readChat(chatId).catch(() => {});
      }
    },
    [client]
  );

  const clearSendError = useCallback(() => {
    setLastSendError(null);
  }, []);

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => prev.filter((c) => c.chatId !== chatId));
      setMessages((prev) => {
        const copy = { ...prev };
        delete copy[chatId];
        return copy;
      });
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    },
    [activeChatId]
  );

  const clearMessages = useCallback((chatId: string) => {
    setMessages((prev) => ({
      ...prev,
      [chatId]: [],
    }));
  }, []);

  const clearAllChats = useCallback(() => {
    isLoadedFromStorageRef.current = false;
    currentLoadedInstanceRef.current = null;
    setChats([]);
    setMessages({});
    setActiveChatId(null);
    if (credentials?.idInstance) {
      try {
        localStorage.removeItem(`${CHATS_STORAGE_KEY}_${credentials.idInstance}`);
        localStorage.removeItem(`${MESSAGES_STORAGE_KEY}_${credentials.idInstance}`);
        localStorage.removeItem(`${ACTIVE_CHAT_STORAGE_KEY}_${credentials.idInstance}`);
        localStorage.removeItem(CHATS_STORAGE_KEY);
        localStorage.removeItem(MESSAGES_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
      } catch {
        // Storage error
      }
    }
  }, [credentials?.idInstance]);

  const activeChat = chats.find((c) => c.chatId === activeChatId) || null;
  const activeMessages = activeChatId ? messages[activeChatId] || [] : [];

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        activeChat,
        activeMessages,
        isSending,
        isPolling,
        isSyncingChats,
        pollingError,
        lastSendError,
        clearSendError,
        syncChats,
        clearAllChats,
        selectChat,
        closeChat,
        toggleChatUnread,
        markChatAsRead,
        createChat,
        sendMessage,
        deleteChat,
        clearMessages,
        loadChatHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
