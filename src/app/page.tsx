'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { AuthScreen } from '@/components/AuthScreen';
import { AuthModal } from '@/components/AuthModal';
import { NewChatModal } from '@/components/NewChatModal';

export default function Home() {
  const { credentials, isLoading } = useAuth();
  const { closeChat } = useChat();
  const [isMounted, setIsMounted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle Escape key globally: close open modals first, or exit active chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (isNewChatOpen) {
          setIsNewChatOpen(false);
          return;
        }
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isNewChatOpen, closeChat]);

  // During initial mount or session reading, render clean loading splash
  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-[#f5f5f7]">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#007aff]/20 border-t-[#007aff] animate-spin" />
      </div>
    );
  }

  // If credentials are not present, render dedicated separate Auth Screen
  if (!credentials?.idInstance || !credentials?.apiTokenInstance) {
    return <AuthScreen />;
  }

  // When logged in, render main two-pane messenger layout
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-white dark:bg-[#1c1c1e]">
      {/* Two-pane layout: Sidebar + ChatWindow */}
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewChat={() => setIsNewChatOpen(true)}
      />
      <ChatWindow
        onOpenNewChat={() => setIsNewChatOpen(true)}
        onBack={closeChat}
      />

      {/* Settings modal for modifying instance or clearing cache */}
      <AuthModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />
    </div>
  );
}
