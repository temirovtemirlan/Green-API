'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { motion } from 'motion/react';
import { CloseLinearIcon, PhoneLinearIcon } from '@solar-icons/react';

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
      setError('Введите номер телефона');
      return;
    }

    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.startsWith('0')) {
      setError('Номер с кодом страны (например, 7... или 996...)');
      return;
    }
    if (digitsOnly.length < 10) {
      setError('Номер слишком короткий (минимум 10 цифр)');
      return;
    }

    const chatId = createChat(cleanPhone);
    if (!chatId) {
      setError('Некорректный номер телефона');
      return;
    }

    setPhone('');
    setError(null);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/25 backdrop-blur-[6px] animate-in fade-in duration-150"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        className="w-full max-w-[380px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-black/[0.06] dark:border-white/[0.08] p-5 flex flex-col gap-4 select-none"
      >
        {/* Header matching macOS / Telegram Desktop */}
        <div className="flex items-center justify-between pb-0.5">
          <h3 className="text-[18px] font-bold tracking-tight text-black dark:text-white">
            Новый чат
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#8e8e93] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Закрыть"
          >
            <CloseLinearIcon size={15} />
          </button>
        </div>

        {error && (
          <div className="text-[#ff3b30] text-[12.5px] bg-[#ff3b30]/10 px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1c1c1e] dark:text-[#ebebf5]">
              Номер телефона собеседника
            </label>
            <div className="flex items-center bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded-xl overflow-hidden px-3.5 focus-within:ring-2 focus-within:ring-[#007aff]/30 focus-within:bg-white dark:focus-within:bg-[#242426] focus-within:border-[#007aff] border border-transparent transition-all">
              <PhoneLinearIcon size={18} color="#8e8e93" className="flex-shrink-0" />
              <input
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError(null);
                }}
                className="flex-1 py-3 px-2.5 text-[16px] text-black dark:text-white bg-transparent outline-none placeholder:text-[#8e8e93]"
                autoFocus
              />
              {phone && (
                <button
                  type="button"
                  onClick={() => setPhone('')}
                  className="p-1 text-[#8e8e93] hover:text-black dark:hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-[13px] text-[#8e8e93] px-0.5">
              Укажите с кодом страны (например, 7... или 996...)
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-[14px] font-medium text-[#8e8e93] hover:text-black dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 text-[14px] font-semibold bg-[#007aff] hover:bg-[#0062cc] active:scale-[0.98] text-white rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Перейти в чат
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
