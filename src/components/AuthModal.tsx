'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, ShieldCheck, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { credentials, login, isLoading, error } = useAuth();

  const [idInstance, setIdInstance] = useState(credentials?.idInstance || '');
  const [apiTokenInstance, setApiTokenInstance] = useState(credentials?.apiTokenInstance || '');
  const [apiUrl, setApiUrl] = useState(credentials?.apiUrl || 'https://api.green-api.com');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanId = idInstance.trim();
    const cleanToken = apiTokenInstance.trim();

    if (!cleanId) {
      setLocalError('Введите idInstance');
      return;
    }
    if (!cleanToken) {
      setLocalError('Введите apiTokenInstance');
      return;
    }

    const success = await login({
      idInstance: cleanId,
      apiTokenInstance: cleanToken,
      apiUrl: apiUrl.trim() || 'https://api.green-api.com',
    });

    if (success && onClose) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard} className="glass-effect">
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <KeyRound size={26} color="var(--accent-color)" />
          </div>
          <h2 style={styles.title}>Подключение GREEN-API</h2>
          <p style={styles.subtitle}>
            Введите параметры инстанса из вашего личного кабинета GREEN-API для доступа к чату.
          </p>
        </div>

        {(error || localError) && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} color="var(--accent-red)" style={{ flexShrink: 0 }} />
            <span style={styles.errorText}>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>idInstance</label>
            <input
              type="text"
              placeholder="Например: 110182..."
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              style={styles.input}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>apiTokenInstance</label>
            <input
              type="password"
              placeholder="Токен инстанса"
              value={apiTokenInstance}
              onChange={(e) => setApiTokenInstance(e.target.value)}
              style={styles.input}
              disabled={isLoading}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={styles.advancedToggle}
            >
              {showAdvanced ? '− Скрыть доп. настройки' : '+ Дополнительные настройки (API URL)'}
            </button>

            {showAdvanced && (
              <div style={{ ...styles.inputGroup, marginTop: '8px' }}>
                <label style={styles.label}>Базовый URL API</label>
                <input
                  type="text"
                  placeholder="https://api.green-api.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  style={styles.input}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.submitButton,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin-animation" style={{ marginRight: 8 }} />
                  Авторизация...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} style={{ marginRight: 8 }} />
                  Войти в чат
                </>
              )}
            </button>

            {credentials && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={styles.cancelButton}
              >
                Отмена
              </button>
            )}
          </div>
        </form>

        <div style={styles.footer}>
          <a
            href="https://console.green-api.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.cabinetLink}
          >
            Личный кабинет GREEN-API <ExternalLink size={13} style={{ marginLeft: 4 }} />
          </a>
        </div>
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
    zIndex: 9999,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '440px',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 113, 227, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    border: '1px solid rgba(255, 59, 48, 0.2)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  errorText: {
    color: 'var(--accent-red)',
    fontSize: '13px',
    lineHeight: '1.3',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    fontSize: '14px',
    transition: 'all var(--transition-fast)',
    border: '1px solid transparent',
  },
  advancedToggle: {
    fontSize: '12px',
    color: 'var(--accent-color)',
    textAlign: 'left',
    padding: '4px 0',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px',
  },
  submitButton: {
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    padding: '13px',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  cancelButton: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    padding: '8px',
    textAlign: 'center',
  },
  footer: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  cabinetLink: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
  },
};
