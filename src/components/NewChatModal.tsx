'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { MessageSquarePlus, X, Phone } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { createChat } = useChat();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError('Введите номер телефона получателя');
      return;
    }

    const chatId = createChat(cleanPhone);
    if (!chatId) {
      setError('Некорректный номер или идентификатор');
      return;
    }

    setPhone('');
    setError(null);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard} className="glass-effect">
        <div style={styles.header}>
          <div style={styles.titleWrap}>
            <div style={styles.iconCircle}>
              <MessageSquarePlus size={20} color="var(--accent-color)" />
            </div>
            <div>
              <h3 style={styles.title}>Новый диалог</h3>
              <p style={styles.subtitle}>Введите номер получателя в MAX или WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {error && <div style={styles.errorText}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrap}>
            <Phone size={18} color="var(--text-tertiary)" style={{ marginLeft: '12px' }} />
            <input
              type="text"
              placeholder="79991234567 или +7 (999) 123-45-67"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              style={styles.input}
              autoFocus
            />
          </div>

          <p style={styles.hint}>
            Формат: международный номер с кодом страны (например, <code>79991234567</code> или <code>77011234567</code>).
          </p>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Отмена
            </button>
            <button type="submit" style={styles.submitBtn}>
              Создать чат
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '420px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 113, 227, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  closeButton: {
    padding: '4px',
    borderRadius: '50%',
  },
  errorText: {
    color: 'var(--accent-red)',
    fontSize: '12px',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-input)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    padding: '12px 14px',
    fontSize: '15px',
    color: 'var(--text-primary)',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.4',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '6px',
  },
  cancelBtn: {
    padding: '10px 16px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
  },
  submitBtn: {
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
  },
};
