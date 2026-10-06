'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  MagnifierLinearIcon,
  Logout2LinearIcon,
  CheckLinearIcon,
  CheckReadLinearIcon,
  ClockCircleLinearIcon,
  DangerTriangleLinearIcon,
} from '@solar-icons/react';
import { GreenApiClient } from '@/services/greenApiClient';

interface SidebarProps {
  onOpenSettings?: () => void;
  onOpenNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { instanceState, logout } = useAuth();
  const { chats, activeChatId, selectChat, toggleChatUnread, clearAllChats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    try {
      localStorage.clear();
    } catch {
      // Storage error
    }
    clearAllChats();
    logout();
  };

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

  return (
    <aside className="w-[340px] h-full bg-white dark:bg-[#1c1c1e] border-r border-[#ebebed] dark:border-[#2c2c2e] flex flex-col flex-shrink-0 z-10 select-none">
      {/* Top Bar with 'Чаты' and Exit Icon */}
      <div className="h-16 px-5 flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight text-black dark:text-white">Чаты</h1>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLogout}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-[#f2f2f7] dark:bg-[#2c2c2e] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] text-[#8e8e93] transition-colors cursor-pointer"
            title="Выйти из аккаунта и очистить данные"
          >
            <Logout2LinearIcon size={19} />
          </button>
        </div>
      </div>

      {/* QR Pairing Warning if notAuthorized */}
      {instanceState?.stateInstance === 'notAuthorized' && (
        <div className="bg-[#ff9500]/12 border-y border-[#ff9500]/20 px-4 py-2 flex items-center gap-2">
          <DangerTriangleLinearIcon size={14} color="#ff9500" className="flex-shrink-0" />
          <span className="text-xs text-[#ff9500] leading-snug">
            Инстанс не авторизован.{' '}
            <a
              href="https://console.green-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff9500] font-semibold underline"
            >
              Отсканируйте QR ↗
            </a>
          </span>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="px-4 pb-2.5">
        <div className="flex items-center bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded-[10px] h-9 px-2.5">
          <MagnifierLinearIcon size={15} color="#8e8e93" className="ml-1" />
          <input
            type="text"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2 text-sm text-black dark:text-white bg-transparent outline-none placeholder:text-[#8e8e93]"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {filteredChats.length === 0 ? (
          <div className="py-12 px-6 text-center flex flex-col items-center gap-2">
            <p className="text-base font-semibold text-[#3c3c43] dark:text-[#ebebf5]">Нет диалогов</p>
            <p className="text-[13px] text-[#8e8e93] leading-relaxed">
              Нажмите значок <strong>новый чат</strong>, чтобы ввести номер собеседника в MAX или WhatsApp.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.chatId === activeChatId;
            const lastMsg = chat.lastMessage;
            const hasUnread = chat.unreadCount > 0;
            const chatDisplayName =
              chat.name && chat.name !== chat.chatId
                ? chat.name
                : GreenApiClient.formatChatDisplay(chat.chatId);

            return (
              <div
                key={chat.chatId}
                onClick={() => selectChat(chat.chatId)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleChatUnread(chat.chatId);
                }}
                title={
                  hasUnread
                    ? 'Нажмите правой кнопкой мыши, чтобы пометить как прочитанное'
                    : 'Нажмите правой кнопкой мыши, чтобы пометить как непрочитанное'
                }
                className={`flex items-center px-4 py-2.5 cursor-pointer relative transition-colors border-b border-black/[0.03] dark:border-white/[0.03] ${
                  isActive
                    ? 'bg-[#007aff]/[0.08]'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* 11x11 Blue indicator to the left of profile picture (matching Photo 4) */}
                <div className="flex items-center justify-center flex-shrink-0 mr-2.5 w-[11px]">
                  {hasUnread ? (
                    <div className="w-[11px] h-[11px] rounded-full bg-[#007aff] flex-shrink-0 animate-in fade-in duration-200" />
                  ) : (
                    <div className="w-[11px] h-[11px] opacity-0 pointer-events-none flex-shrink-0" />
                  )}
                </div>

                {/* User Avatar */}
                <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center flex-shrink-0 mr-3 overflow-hidden bg-white">
                  <img
                    src="/default-avatar.svg"
                    alt=""
                    className="w-full h-full object-cover rounded-full block select-none"
                    draggable={false}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[14.5px] truncate ${
                        isActive
                          ? 'font-bold text-[#007aff]'
                          : hasUnread
                          ? 'font-bold text-black dark:text-white'
                          : 'font-semibold text-black dark:text-white'
                      }`}
                    >
                      {chatDisplayName}
                    </span>
                    <span
                      className={`text-[11.5px] flex-shrink-0 ${
                        hasUnread ? 'text-[#007aff] font-semibold' : 'text-[#8e8e93]'
                      }`}
                    >
                      {formatTime(lastMsg?.timestamp || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {lastMsg?.direction === 'outgoing' && (
                        <span className="flex items-center flex-shrink-0">
                          {lastMsg.status === 'sending' ? (
                            <ClockCircleLinearIcon size={11} color="#8e8e93" />
                          ) : lastMsg.status === 'sent' ? (
                            <CheckLinearIcon size={12} color="#8e8e93" />
                          ) : lastMsg.status === 'delivered' ? (
                            <CheckReadLinearIcon size={12} color="#8e8e93" />
                          ) : lastMsg.status === 'read' ? (
                            <CheckReadLinearIcon size={12} color="#007aff" />
                          ) : (
                            <CheckLinearIcon size={12} color="#8e8e93" />
                          )}
                        </span>
                      )}
                      <span className={`text-[13px] truncate ${hasUnread ? 'text-black dark:text-white font-medium' : 'text-[#8e8e93]'}`}>
                        {lastMsg
                          ? (lastMsg.direction === 'outgoing' ? 'Вы: ' : '') + lastMsg.text
                          : 'Нет сообщений'}
                      </span>
                    </div>

                    {hasUnread && (
                      <span className="bg-[#007aff] text-white text-[11px] font-semibold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
