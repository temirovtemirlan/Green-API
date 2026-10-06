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
  const [appHeight, setAppHeight] = useState<string>('100%');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track visualViewport on mobile to perfectly adapt to virtual keyboard in PWA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      if (window.visualViewport) {
        setAppHeight(`${window.visualViewport.height}px`);
      }
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    updateHeight();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateHeight);
      vv.addEventListener('scroll', updateHeight);
    }
    window.addEventListener('scroll', updateHeight);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateHeight);
        vv.removeEventListener('scroll', updateHeight);
      }
      window.removeEventListener('scroll', updateHeight);
    };
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
      <div className="flex items-center justify-center fixed inset-0 w-full h-full bg-[#f5f5f7]">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#007aff]/20 border-t-[#007aff] animate-spin" />
      </div>
    );
  }

  if (!credentials?.idInstance || !credentials?.apiTokenInstance) {
    return <AuthScreen />;
  }

  return (
    <div
      style={{ height: appHeight }}
      className="fixed inset-0 w-full overflow-hidden bg-white dark:bg-[#1c1c1e] flex"
    >
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
