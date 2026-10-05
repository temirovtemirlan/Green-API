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
  pollingError: string | null;
  selectChat: (chatId: string) => void;
  createChat: (rawContact: string) => string;
  sendMessage: (text: string) => Promise<boolean>;
  deleteChat: (chatId: string) => void;
  clearMessages: (chatId: string) => void;
}

const CHATS_STORAGE_KEY = 'green_api_chats_v1';
const MESSAGES_STORAGE_KEY = 'green_api_messages_v1';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { client, credentials } = useAuth();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chats & messages from localStorage when credentials are ready
  useEffect(() => {
    if (!credentials?.idInstance) {
      setChats([]);
      setMessages({});
      setActiveChatId(null);
      return;
    }

    try {
      const savedChats = localStorage.getItem(`${CHATS_STORAGE_KEY}_${credentials.idInstance}`);
      const savedMessages = localStorage.getItem(`${MESSAGES_STORAGE_KEY}_${credentials.idInstance}`);
      if (savedChats) {
        setChats(JSON.parse(savedChats));
      }
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch {
      // LocalStorage read error
    }
  }, [credentials?.idInstance]);

  // Persist chats & messages to localStorage
  useEffect(() => {
    if (!credentials?.idInstance) return;
    try {
      localStorage.setItem(`${CHATS_STORAGE_KEY}_${credentials.idInstance}`, JSON.stringify(chats));
    } catch {
      // Quota or storage error
    }
  }, [chats, credentials?.idInstance]);

  useEffect(() => {
    if (!credentials?.idInstance) return;
    try {
      localStorage.setItem(`${MESSAGES_STORAGE_KEY}_${credentials.idInstance}`, JSON.stringify(messages));
    } catch {
      // Storage quota error
    }
  }, [messages, credentials?.idInstance]);

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

        if (index >= 0) {
          const updated = [...prev];
          const current = updated[index];
          updated[index] = {
            ...current,
            name: current.name || displayName,
            lastMessage: message,
            unreadCount:
              activeChatId === chatId
                ? 0
                : message.direction === 'incoming'
                ? current.unreadCount + 1
                : current.unreadCount,
            updatedAt: message.timestamp,
          };
          // Move updated chat to the top
          return [updated[index], ...updated.filter((_, i) => i !== index)];
        } else {
          const newChat: ChatSummary = {
            chatId,
            name: displayName,
            lastMessage: message,
            unreadCount: activeChatId === chatId || message.direction === 'outgoing' ? 0 : 1,
            updatedAt: message.timestamp,
          };
          return [newChat, ...prev];
        }
      });
    },
    [activeChatId]
  );

  // Process incoming notification payload
  const handleIncomingNotification = useCallback(
    (notification: ReceiveNotificationResponse) => {
      const { body } = notification;
      if (!body) return;

      const type = body.typeWebhook;

      // Check if it is an incoming message
      if (type === 'incomingMessageReceived') {
        const chatId = body.senderData?.chatId;
        const idMessage = body.idMessage || `inc_${Date.now()}`;
        const senderName = body.senderData?.senderName || body.senderData?.senderContactName;
        
        let text = '';
        if (body.messageData?.typeMessage === 'textMessage') {
          text = body.messageData.textMessageData?.textMessage || '';
        } else if (body.messageData?.typeMessage === 'extendedTextMessage') {
          text = body.messageData.extendedTextMessageData?.text || '';
        } else {
          // For other message formats, render a clean fallback note
          text = `[${body.messageData?.typeMessage || 'Сообщение'}]`;
        }

        if (chatId && text) {
          const incomingMessage: ChatMessage = {
            id: idMessage,
            chatId,
            text,
            timestamp: (body.timestamp || Math.floor(Date.now() / 1000)) * 1000,
            direction: 'incoming',
            senderName,
            status: 'delivered',
          };
          appendMessage(chatId, incomingMessage, senderName);
        }
      }
    },
    [appendMessage]
  );

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

      while (isRunning && isMountedRef.current && !controller.signal.aborted) {
        try {
          // 1. Receive notification from queue (timeout: 5 seconds)
          const notification = await client.receiveNotification(5, controller.signal);

          if (notification && notification.receiptId) {
            // 2. Handle the notification payload
            handleIncomingNotification(notification);

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
  }, [client, handleIncomingNotification]);

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
      return normalizedId;
    },
    []
  );

  // Select chat & reset unread counter
  const selectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setChats((prev) =>
      prev.map((c) => (c.chatId === chatId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

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
        chatId: activeChatId,
        text: trimmedText,
        timestamp: now,
        direction: 'outgoing',
        status: 'sending',
      };

      // Optimistically show message immediately
      appendMessage(activeChatId, optimisticMessage);
      setIsSending(true);

      try {
        const response = await client.sendMessage({
          chatId: activeChatId,
          message: trimmedText,
        });

        // Update status to sent with real idMessage
        setMessages((prev) => {
          const chatMsgs = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: chatMsgs.map((m) =>
              m.id === tempId
                ? { ...m, id: response.idMessage || tempId, status: 'sent' }
                : m
            ),
          };
        });

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
        const msg = err instanceof Error ? err.message : 'Не удалось отправить сообщение';
        setPollingError(msg);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [client, activeChatId, appendMessage]
  );

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
        pollingError,
        selectChat,
        createChat,
        sendMessage,
        deleteChat,
        clearMessages,
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
