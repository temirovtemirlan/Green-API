'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { ChatSquareAddLinearIcon, CloseLinearIcon, PhoneLinearIcon } from '@solar-icons/react';

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
      setError('Номер не должен начинаться с 0. Укажите номер с кодом страны (например, 7... или 996...)');
      return;
    }
    if (digitsOnly.length < 10) {
      setError('Номер слишком короткий (минимум 10 цифр с кодом страны)');
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
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-[9998] p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1c1c1e] border border-[#ebebed] dark:border-[#2c2c2e] rounded-2xl w-full max-w-[390px] p-6 flex flex-col gap-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#007aff]/10 flex items-center justify-center flex-shrink-0">
              <ChatSquareAddLinearIcon size={20} color="#007aff" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-black dark:text-white">Новый диалог</h3>
              <p className="text-xs text-[#8e8e93] mt-0.5">Введите номер телефона получателя</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CloseLinearIcon size={18} />
          </button>
        </div>

        {error && (
          <div className="text-[#ff3b30] text-xs bg-[#ff3b30]/10 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded-xl overflow-hidden px-3.5 focus-within:ring-2 focus-within:ring-[#007aff]/30 transition-all">
            <PhoneLinearIcon size={18} color="#8e8e93" className="flex-shrink-0" />
            <input
              type="tel"
              placeholder="+7 (999) 123-45-67"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              className="flex-1 py-3 px-2.5 text-[15px] text-black dark:text-white bg-transparent outline-none placeholder:text-[#8e8e93]"
              autoFocus
            />
          </div>

          <div className="flex justify-end items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-[#8e8e93] hover:text-black dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-[#007aff] hover:bg-[#0062cc] active:scale-[0.98] text-white px-5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Создать чат
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
