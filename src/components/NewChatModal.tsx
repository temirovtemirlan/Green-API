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
      setError('Введите номер телефона получателя');
      return;
    }

    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.startsWith('0')) {
      setError('Номер не должен начинаться с 0. Укажите номер в международном формате с кодом страны (например, 7... или 996...)');
      return;
    }
    if (digitsOnly.length < 10) {
      setError('Номер слишком короткий (минимум 10 цифр с кодом страны)');
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
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[9998] p-4">
      <div className="bg-white dark:bg-[#1c1c1e] border border-[#ebebed] dark:border-[#2c2c2e] rounded-2xl w-full max-w-[420px] p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#007aff]/10 flex items-center justify-center flex-shrink-0">
              <ChatSquareAddLinearIcon size={20} color="#007aff" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-black dark:text-white">Новый диалог</h3>
              <p className="text-xs text-[#3c3c43] dark:text-[#ebebf5] mt-0.5">Введите номер получателя в MAX или WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8e8e93] hover:text-black dark:hover:text-white transition-colors"
          >
            <CloseLinearIcon size={18} color="#8e8e93" />
          </button>
        </div>

        {error && <div className="text-[#ff3b30] text-xs bg-[#ff3b30]/10 px-3 py-2 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex items-center bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded-xl overflow-hidden px-3">
            <PhoneLinearIcon size={18} color="#8e8e93" className="flex-shrink-0" />
            <input
              type="text"
              placeholder="79991234567 или +7 (999) 123-45-67"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              className="flex-1 py-3 px-2.5 text-[15px] text-black dark:text-white bg-transparent outline-none placeholder:text-[#8e8e93]"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#3c3c43] dark:text-[#ebebf5] font-medium">Разрешенный тестовый номер инстанса:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setPhone('79991234567')}
                className="bg-[#f2f2f7] dark:bg-[#2c2c2e] text-[#007aff] px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border border-[#007aff]/20 hover:bg-[#007aff]/10 transition-colors"
              >
                +7 (999) 123-45-67 (проверено)
              </button>
            </div>
          </div>

          <p className="text-xs text-[#8e8e93] leading-relaxed">
            Формат: международный номер с кодом страны (например, <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[11px]">79991234567</code> или <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[11px]">77011234567</code>).
          </p>

          <div className="flex justify-end gap-2.5 mt-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-[#3c3c43] dark:text-[#ebebf5] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-[#007aff] hover:bg-[#0062cc] text-white px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Создать чат
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
