'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { GreenApiClient } from '@/services/greenApiClient';
import { ChatMessage } from '@/types/greenApi';
import { VoiceNote, VoiceNoteGroup } from '@/components/VoiceNote';
import { motion, useReducedMotion } from 'motion/react';
import {
  AltArrowLeftLinearIcon,
  AddCircleLinearIcon,
  ArrowUpLinearIcon,
  CheckLinearIcon,
  CheckReadLinearIcon,
  ClockCircleLinearIcon,
  DangerCircleLinearIcon,
} from '@solar-icons/react';

interface ChatWindowProps {
  onBack?: () => void;
  onOpenNewChat?: () => void;
}

const OutgoingTail: React.FC = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute -bottom-[0.5px] -right-[5.5px] pointer-events-none text-[#007aff] z-0"
  >
    <path
      d="M11.5 10.5C12.0014 13.5086 14.8333 16.3333 16.5 17C10.1 17 6 14.8333 5 13.5L0 15L0.5 0H11V2V4V4.5C11 5.5 11 7.5 11.5 10.5Z"
      fill="currentColor"
    />
  </svg>
);

const IncomingTail: React.FC = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute -bottom-[0.5px] -left-[5.5px] pointer-events-none text-[#e9e9eb] dark:text-[#2c2c2e] z-0"
  >
    <path
      d="M5 10.5C4.49857 13.5086 1.66667 16.3333 0 17C6.4 17 10.5 14.8333 11.5 13.5L16.5 15L16 0H5.5V2V4V4.5C5.5 5.5 5.5 7.5 5 10.5Z"
      fill="currentColor"
    />
  </svg>
);

const MESSAGE_SPRING = {
  type: 'spring' as const,
  stiffness: 440,
  damping: 28,
  mass: 0.7,
};

const ChatMessageVoiceNote: React.FC<{
  message: ChatMessage;
  isOutgoing: boolean;
  isLastInGroup: boolean;
}> = ({ message, isOutgoing, isLastInGroup }) => {
  const { client } = useAuth();
  const [audioUrl, setAudioUrl] = useState<string | undefined>(message.downloadUrl);
  const [loading, setLoading] = useState(false);

  // Unique deterministic seed based on message ID so each waveform has consistent natural peaks
  const seed = useMemo(() => {
    let hash = 0;
    const str = message.id || 'voice-msg-default';
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [message.id]);

  const handlePlayRequest = async (): Promise<string | void> => {
    if (audioUrl) return audioUrl;
    if (!client) return;
    setLoading(true);
    try {
      const res = await client.downloadFile(message.chatId, message.id);
      if (res?.downloadUrl) {
        setAudioUrl(res.downloadUrl);
        return res.downloadUrl;
      }
    } catch (err) {
      console.warn('Failed to load audio:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statusIcon = isOutgoing ? (
    <span className="flex items-center">
      {message.status === 'sending' ? (
        <ClockCircleLinearIcon size={11} color="rgba(255, 255, 255, 0.75)" />
      ) : message.status === 'sent' ? (
        <CheckLinearIcon size={12} color="rgba(255, 255, 255, 0.85)" />
      ) : message.status === 'delivered' ? (
        <CheckReadLinearIcon size={12} color="rgba(255, 255, 255, 0.95)" />
      ) : message.status === 'read' ? (
        <CheckReadLinearIcon size={12} color="#64d2ff" />
      ) : (
        <DangerCircleLinearIcon size={12} color="#ff9500" />
      )}
    </span>
  ) : undefined;

  return (
    <VoiceNote
      src={audioUrl}
      seed={seed}
      variant={isOutgoing ? 'outgoing' : 'incoming'}
      isLoading={loading}
      onPlayRequest={handlePlayRequest}
      messageTime={formatMessageTime(message.timestamp)}
      statusIcon={statusIcon}
      isLastInGroup={isLastInGroup}
      layout="stacked"
    />
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ onOpenNewChat, onBack }) => {
  const {
    activeChat,
    activeMessages,
    sendMessage,
    isSending,
    lastSendError,
    clearSendError,
    closeChat,
    markChatAsRead,
  } = useChat();

  // Exit current chat when user presses Escape (Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeChat]);

  // Track unread messages for the active chat viewing session
  const [sessionUnreadInfo, setSessionUnreadInfo] = useState<{
    chatId: string;
    firstUnreadId: string | null;
    unreadIds: Set<string>;
  }>({
    chatId: '',
    firstUnreadId: null,
    unreadIds: new Set(),
  });

  const lastObservedChatIdRef = useRef<string | null>(null);

  // When switching to a chat with unread messages, capture unread message IDs before resetting
  useEffect(() => {
    if (!activeChat) return;

    if (lastObservedChatIdRef.current !== activeChat.chatId) {
      lastObservedChatIdRef.current = activeChat.chatId;

      const unreadMsgs = activeMessages.filter((m) => m.direction === 'incoming' && m.isUnread);
      if (unreadMsgs.length > 0) {
        setSessionUnreadInfo({
          chatId: activeChat.chatId,
          firstUnreadId: unreadMsgs[0].clientId || unreadMsgs[0].id,
          unreadIds: new Set(unreadMsgs.map((m) => m.clientId || m.id)),
        });
      } else {
        setSessionUnreadInfo({
          chatId: activeChat.chatId,
          firstUnreadId: null,
          unreadIds: new Set(),
        });
      }

      // Mark as read in storage so F5 or next visit won't repeat it
      markChatAsRead(activeChat.chatId);
    } else {
      // While staying in the active chat: capture newly arriving incoming unread messages
      const unreadMsgs = activeMessages.filter((m) => m.direction === 'incoming' && m.isUnread);
      if (unreadMsgs.length > 0) {
        setSessionUnreadInfo((prev) => {
          if (prev.chatId === activeChat.chatId && prev.firstUnreadId) {
            const nextSet = new Set(prev.unreadIds);
            let hasNew = false;
            unreadMsgs.forEach((m) => {
              const k = m.clientId || m.id;
              if (!nextSet.has(k)) {
                nextSet.add(k);
                hasNew = true;
              }
            });
            return hasNew ? { ...prev, unreadIds: nextSet } : prev;
          } else {
            return {
              chatId: activeChat.chatId,
              firstUnreadId: unreadMsgs[0].clientId || unreadMsgs[0].id,
              unreadIds: new Set(unreadMsgs.map((m) => m.clientId || m.id)),
            };
          }
        });
      }
    }
  }, [activeChat?.chatId, activeChat?.unreadCount, activeMessages, markChatAsRead]);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const shouldReduceMotion = useReducedMotion();
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const lastChatIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);

  // Sync known message IDs so only new/recent messages animate and history doesn't lag Chrome
  if (activeChat && lastChatIdRef.current !== activeChat.chatId) {
    lastChatIdRef.current = activeChat.chatId;
    // On chat switch, pre-mark older messages as known, leaving at most the latest message for entrance
    const older = activeMessages.slice(0, Math.max(0, activeMessages.length - 1));
    knownMessageIdsRef.current = new Set(older.map((m) => m.clientId || m.id));
    prevMessagesLengthRef.current = activeMessages.length;
  } else if (activeMessages.length - prevMessagesLengthRef.current > 2) {
    // History loaded asynchronously from GREEN-API: pre-mark older messages so Chrome doesn't animate 50 items at once
    const older = activeMessages.slice(0, Math.max(0, activeMessages.length - 1));
    older.forEach((m) => knownMessageIdsRef.current.add(m.clientId || m.id));
    prevMessagesLengthRef.current = activeMessages.length;
  } else {
    prevMessagesLengthRef.current = activeMessages.length;
  }

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
    setSessionUnreadInfo({ chatId: '', firstUnreadId: null, unreadIds: new Set() });
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

  if (!activeChat) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white dark:bg-[#1c1c1e] p-6 select-none">
        <p className="text-base text-[#000000] dark:text-white font-normal text-center">
          Выберите, с кем хотите общаться
        </p>
      </main>
    );
  }

  const displayName =
    activeChat.name && activeChat.name !== activeChat.chatId
      ? activeChat.name
      : GreenApiClient.formatChatDisplay(activeChat.chatId);

  const formatLastSeen = (raw?: string | null): string => {
    if (!raw) return '';
    try {
      const date = new Date(raw);
      if (isNaN(date.getTime())) {
        return typeof raw === 'string' ? raw : '';
      }
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 3) {
        return 'в сети';
      }
      if (date.toDateString() === now.toDateString()) {
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `был(а) сегодня в ${time}`;
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `был(а) вчера в ${time}`;
      }
      return `был(а) ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    } catch {
      return '';
    }
  };

  const statusSubtitle = formatLastSeen(activeChat.lastSeen);

  return (
    <main className="flex-1 h-full flex flex-col bg-white dark:bg-[#1c1c1e] relative overflow-hidden">
      {/* Header matching screenshot */}
      <header className="h-[60px] px-5 flex items-center justify-between border-b border-[#ebebed] dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e] z-10">
        <div className="flex items-center w-10">
          <button
            onClick={onBack || closeChat}
            className="w-8 h-8 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
            title="Назад к списку чатов (Esc)"
          >
            <AltArrowLeftLinearIcon size={20} color="#3c3c43" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className="text-[15px] font-semibold tracking-tight text-black dark:text-white leading-tight">
            {displayName}
          </h2>
          {statusSubtitle ? (
            <span className="text-[11px] text-[#8e8e93] mt-0.5 leading-tight">
              {statusSubtitle}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 relative">
          <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
            <img
              src="/default-avatar.svg"
              alt=""
              className="w-full h-full object-cover rounded-full block select-none"
              draggable={false}
            />
          </div>
        </div>
      </header>

      {/* Floating error banner if sending fails */}
      {lastSendError && (
        <div className="bg-[#ff3b30]/[0.08] border-b border-[#ff3b30]/20 px-5 py-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5 flex-1">
            <DangerCircleLinearIcon size={16} color="#ff3b30" className="flex-shrink-0" />
            <span className="text-[12.5px] text-[#ff3b30] leading-snug">{lastSendError}</span>
          </div>
          <button
            onClick={clearSendError}
            className="p-1 text-[#8e8e93] hover:text-black dark:hover:text-white text-sm cursor-pointer"
            title="Закрыть"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-8 pb-4 pt-2 flex flex-col gap-[2px] bg-white dark:bg-[#1c1c1e]">
        {/* Date pill divider */}
        <div className="flex justify-center mt-2 mb-4">
          <span className="text-[11.5px] text-[#8e8e93] font-medium bg-[#f2f2f7] dark:bg-[#2c2c2e] px-3 py-1 rounded-full">
            Сегодня
          </span>
        </div>

        {activeMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <p className="text-[13.5px] text-[#8e8e93]">
              История пуста. Отправьте текстовое сообщение получателю в MAX.
            </p>
          </div>
        ) : (
          <VoiceNoteGroup>
            {activeMessages.map((msg, index) => {
              const isOutgoing = msg.direction === 'outgoing';
              const nextMsg = activeMessages[index + 1];
              const isLastInGroup = !nextMsg || nextMsg.direction !== msg.direction;

              const messageKey = msg.clientId || msg.id;
              const isNew = !knownMessageIdsRef.current.has(messageKey);
              if (isNew) {
                knownMessageIdsRef.current.add(messageKey);
              }
              const shouldAnimate = !shouldReduceMotion && isNew;

              const isUnread =
                !isOutgoing &&
                (Boolean(msg.isUnread) ||
                  (sessionUnreadInfo.chatId === activeChat.chatId &&
                    sessionUnreadInfo.unreadIds.has(messageKey)));

              const isFirstUnread =
                !isOutgoing &&
                sessionUnreadInfo.chatId === activeChat.chatId &&
                sessionUnreadInfo.firstUnreadId === messageKey;

              const isAudio =
                msg.type === 'audio' ||
                msg.text === '[audioMessage]' ||
                msg.text.toLowerCase().includes('audiomessage');

              return (
                <React.Fragment key={messageKey}>
                  {isFirstUnread && (
                    <div className="w-full bg-[#f2f2f7] dark:bg-[#F4F4F4] py-1.5 text-center my-3 rounded-[4px] select-none">
                      <span className="text-[11px] text-[#8e8e93] font-medium tracking-wide">
                        Непрочитанные сообщения
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex w-full items-center ${isOutgoing ? 'justify-end' : 'justify-start'
                      } ${isLastInGroup ? 'mb-2.5' : ''}`}
                  >
                    {isAudio ? (
                      <motion.div
                        initial={shouldAnimate ? { opacity: 0, y: 12, scale: 0.94 } : false}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={MESSAGE_SPRING}
                        style={{
                          transformOrigin: isOutgoing ? 'bottom right' : 'bottom left',
                          willChange: shouldAnimate ? 'transform, opacity' : 'auto',
                        }}
                        className="relative"
                      >
                        <ChatMessageVoiceNote
                          message={msg}
                          isOutgoing={isOutgoing}
                          isLastInGroup={isLastInGroup}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={shouldAnimate ? { opacity: 0, y: 12, scale: 0.94 } : false}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={MESSAGE_SPRING}
                        style={{
                          transformOrigin: isOutgoing ? 'bottom right' : 'bottom left',
                          willChange: shouldAnimate ? 'transform, opacity' : 'auto',
                        }}
                        className={`max-w-[62%] px-3.5 py-2.5 relative break-words flex flex-col gap-1 ${isOutgoing
                          ? `bg-[#007aff] text-white ${isLastInGroup ? 'rounded-[18px_18px_4px_18px]' : 'rounded-[16px]'
                          }`
                          : `bg-[#e9e9eb] dark:bg-[#2c2c2e] text-black dark:text-white ${isLastInGroup ? 'rounded-[18px_18px_18px_4px]' : 'rounded-[18px]'
                          }`
                          }`}
                      >
                        <div className="text-sm leading-snug whitespace-pre-wrap">{msg.text}</div>

                        <div
                          className={`flex items-center justify-end gap-1 text-[10.5px] mt-0.5 ${isOutgoing ? 'text-white/75' : 'text-[#8e8e93]'
                            }`}
                        >
                          <span>{formatMessageTime(msg.timestamp)}</span>

                          {isOutgoing && (
                            <span className="flex items-center">
                              {msg.status === 'sending' ? (
                                <ClockCircleLinearIcon size={11} color="rgba(255, 255, 255, 0.75)" />
                              ) : msg.status === 'sent' ? (
                                <CheckLinearIcon size={12} color="rgba(255, 255, 255, 0.85)" />
                              ) : msg.status === 'delivered' ? (
                                <CheckReadLinearIcon size={12} color="rgba(255, 255, 255, 0.95)" />
                              ) : msg.status === 'read' ? (
                                <CheckReadLinearIcon size={12} color="#64d2ff" />
                              ) : (
                                <DangerCircleLinearIcon size={12} color="#ff9500" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Tail on the last message of group */}
                        {isLastInGroup && (isOutgoing ? <OutgoingTail /> : <IncomingTail />)}
                      </motion.div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </VoiceNoteGroup>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Dock matching screenshot */}
      <footer className="px-6 py-3 bg-white dark:bg-[#1c1c1e] flex items-center gap-3 border-t border-[#ebebed] dark:border-[#2c2c2e]">
        {/* Plus attachment icon on left - disabled & non-clickable */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-9 h-9 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center flex-shrink-0 cursor-default pointer-events-none select-none opacity-40"
          tabIndex={-1}
        >
          <AddCircleLinearIcon size={20} color="#8e8e93" />
        </button>

        {/* Input Pill */}
        <form onSubmit={handleSend} className="flex-1 flex items-center bg-white dark:bg-[#2c2c2e] border border-[#e5e5ea] dark:border-[#3a3a3c] rounded-3xl py-1 px-4 gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение"
            className="flex-1 max-h-[100px] resize-none text-[14.5px] leading-normal text-black dark:text-white bg-transparent outline-none py-1.5 placeholder:text-[#8e8e93]"
          />

          {inputText.trim() ? (
            <button
              type="submit"
              disabled={isSending}
              className="w-8 h-8 rounded-full bg-[#007aff] hover:bg-[#0062cc] flex items-center justify-center flex-shrink-0 shadow-md text-white transition-colors cursor-pointer"
              title="Отправить (Enter)"
            >
              <ArrowUpLinearIcon size={18} color="#ffffff" strokeWidth={2.5} />
            </button>
          ) : null}
        </form>
      </footer>
    </main>
  );
};
