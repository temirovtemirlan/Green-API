'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { AuthModal } from '@/components/AuthModal';
import { NewChatModal } from '@/components/NewChatModal';

export default function Home() {
  const { credentials, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAuthRequired = isMounted && !isLoading && (!credentials?.idInstance || !credentials?.apiTokenInstance);

  return (
    <div style={styles.appContainer}>
      {/* Two-pane layout: Sidebar + ChatWindow */}
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewChat={() => setIsNewChatOpen(true)}
      />
      <ChatWindow onOpenNewChat={() => setIsNewChatOpen(true)} />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthRequired || isSettingsOpen}
        onClose={!isAuthRequired ? () => setIsSettingsOpen(false) : undefined}
      />

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)',
  },
};
