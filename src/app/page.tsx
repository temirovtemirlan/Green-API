'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { AuthScreen } from '@/components/AuthScreen';
import { NewChatModal } from '@/components/NewChatModal';

export default function Home() {
  const { credentials, isLoading } = useAuth();
  const { closeChat } = useChat();
  const [isMounted, setIsMounted] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle Escape key globally: close open modals first, or exit active chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewChatOpen) {
          setIsNewChatOpen(false);
          return;
        }
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewChatOpen, closeChat]);

  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-[100dvh] bg-[#f5f5f7]">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#007aff]/20 border-t-[#007aff] animate-spin" />
      </div>
    );
  }

  if (!credentials?.idInstance || !credentials?.apiTokenInstance) {
    return <AuthScreen />;
  }

  return (
    <div className="flex w-full h-[100dvh] overflow-hidden bg-white dark:bg-[#1c1c1e]">
      <Sidebar
        onOpenNewChat={() => setIsNewChatOpen(true)}
      />
      <ChatWindow
        onBack={closeChat}
      />

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />
    </div>
  );
}
