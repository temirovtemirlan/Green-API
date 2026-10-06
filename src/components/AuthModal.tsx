'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  KeyMinimalisticLinearIcon,
  ShieldCheckLinearIcon,
  ArrowRightUpLinearIcon,
  DangerCircleLinearIcon,
  RefreshCircleLinearIcon,
  TrashBinTrashLinearIcon,
} from '@solar-icons/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { credentials, login, isLoading, error } = useAuth();
  const { clearAllChats } = useChat();

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
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-[#1c1c1e] border border-[#ebebed] dark:border-[#2c2c2e] rounded-2xl w-full max-w-[440px] p-8 flex flex-col gap-5 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-full bg-[#007aff]/10 flex items-center justify-center mb-1 text-[#007aff]">
            <KeyMinimalisticLinearIcon size={26} color="#007aff" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-white">Подключение GREEN-API</h2>
          <p className="text-[13px] text-[#3c3c43] dark:text-[#ebebf5] leading-snug">
            Введите параметры инстанса из вашего личного кабинета GREEN-API для доступа к чату.
          </p>
        </div>

        {(error || localError) && (
          <div className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-lg p-2.5 flex items-center gap-2.5">
            <DangerCircleLinearIcon size={18} color="#ff3b30" className="flex-shrink-0" />
            <span className="text-[#ff3b30] text-[13px] leading-tight">{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#3c3c43] dark:text-[#ebebf5] uppercase tracking-wider">idInstance</label>
            <input
              type="text"
              placeholder="Например: 110182..."
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              className="bg-[#f0f0f2] dark:bg-[#2c2c2e] text-black dark:text-white rounded-xl px-3.5 py-3 text-sm outline-none border border-transparent focus:border-[#007aff] transition-colors"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#3c3c43] dark:text-[#ebebf5] uppercase tracking-wider">apiTokenInstance</label>
            <input
              type="password"
              placeholder="Токен инстанса"
              value={apiTokenInstance}
              onChange={(e) => setApiTokenInstance(e.target.value)}
              className="bg-[#f0f0f2] dark:bg-[#2c2c2e] text-black dark:text-white rounded-xl px-3.5 py-3 text-sm outline-none border border-transparent focus:border-[#007aff] transition-colors"
              disabled={isLoading}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#007aff] hover:underline text-left py-1 cursor-pointer"
            >
              {showAdvanced ? '− Скрыть доп. настройки' : '+ Дополнительные настройки (API URL)'}
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-medium text-[#3c3c43] dark:text-[#ebebf5] uppercase tracking-wider">Базовый URL API</label>
                <input
                  type="text"
                  placeholder="https://api.green-api.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="bg-[#f0f0f2] dark:bg-[#2c2c2e] text-black dark:text-white rounded-xl px-3.5 py-3 text-sm outline-none border border-transparent focus:border-[#007aff] transition-colors"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 mt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#007aff] hover:bg-[#0062cc] text-white p-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center transition-all disabled:opacity-70 shadow-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCircleLinearIcon size={18} className="animate-spin mr-2" />
                  Авторизация...
                </>
              ) : (
                <>
                  <ShieldCheckLinearIcon size={18} className="mr-2" />
                  Войти в чат
                </>
              )}
            </button>

            {credentials && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="text-[#3c3c43] dark:text-[#ebebf5] text-sm p-2 text-center hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>
            )}

            {credentials && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Очистить локальный кэш чатов для этого инстанса?')) {
                    clearAllChats();
                    if (onClose) onClose();
                  }
                }}
                disabled={isLoading}
                className="text-[#ff3b30] bg-[#ff3b30]/[0.08] hover:bg-[#ff3b30]/15 border border-[#ff3b30]/20 rounded-xl text-[13px] font-medium p-2.5 flex items-center justify-center cursor-pointer mt-1 transition-colors"
              >
                <TrashBinTrashLinearIcon size={14} className="mr-1.5" />
                Сбросить кэш чатов
              </button>
            )}
          </div>
        </form>

        <div className="border-t border-[#ebebed] dark:border-[#2c2c2e] pt-4 flex justify-center">
          <a
            href="https://console.green-api.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-[#3c3c43] dark:text-[#ebebf5] hover:text-black dark:hover:text-white transition-colors"
          >
            Личный кабинет GREEN-API <ArrowRightUpLinearIcon size={13} className="ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};
