'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  DangerCircleLinearIcon,
  RefreshCircleLinearIcon,
  EyeLinearIcon,
  EyeClosedLinearIcon,
  InfoCircleLinearIcon,
  CloseLinearIcon,
  ArrowRightUpLinearIcon,
} from '@solar-icons/react';

export const AuthScreen: React.FC = () => {
  const { login, isLoading, error } = useAuth();

  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.green-api.com');
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

    await login({
      idInstance: cleanId,
      apiTokenInstance: cleanToken,
      apiUrl: apiUrl.trim() || 'https://api.green-api.com',
    });
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#f5f5f5] p-5">
      <main className="w-full max-w-[400px] bg-white border border-[#d0d7de] rounded-[10px] p-7 flex flex-col gap-5 shadow-none">
        {/* Top bar: Official GREEN-API logo + Info button */}
        <div className="flex items-center justify-between pb-1">
          <img
            src="/green-api-logo.svg"
            alt="GREEN-API"
            className="h-[38px] w-auto block"
          />
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-[6px] border border-[#d0d7de] flex items-center justify-center cursor-pointer hover:bg-black/5 transition-colors shadow-none"
            title="Инструкция по подключению"
          >
            <InfoCircleLinearIcon size={19} color="#57606a" />
          </button>
        </div>

        {/* Error notification */}
        {(error || localError) && (
          <div className="bg-[#ffebe9] border border-[#ff8182]/40 rounded-[6px] p-3 flex items-center gap-2 shadow-none">
            <DangerCircleLinearIcon size={16} color="#cf222e" className="flex-shrink-0" />
            <span className="text-[#cf222e] text-[13px] leading-snug">{localError || error}</span>
          </div>
        )}

        {/* Main Inputs Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#24292f] dark:text-white">idInstance</label>
            <input
              type="text"
              placeholder="idInstance"
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              className="w-full bg-[#f0f0f2] dark:bg-[#2c2c2e] text-black dark:text-white placeholder:text-[#8e8e93] border border-[#e5e5ea] dark:border-[#3a3a3c] rounded-[8px] px-3.5 py-2.5 text-[16px] md:text-sm outline-none focus:border-[#3B9702] focus:ring-1 focus:ring-[#3B9702] transition-colors"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#24292f] dark:text-white">apiTokenInstance</label>
            <div className="relative flex items-center w-full">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="apiTokenInstance"
                value={apiTokenInstance}
                onChange={(e) => setApiTokenInstance(e.target.value)}
                className="w-full bg-[#f0f0f2] dark:bg-[#2c2c2e] text-black dark:text-white placeholder:text-[#8e8e93] border border-[#e5e5ea] dark:border-[#3a3a3c] rounded-[8px] pl-3.5 pr-10 py-2.5 text-[16px] md:text-sm outline-none focus:border-[#3B9702] focus:ring-1 focus:ring-[#3B9702] transition-colors"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 p-1.5 flex items-center justify-center text-[#57606a] hover:text-[#24292f] transition-colors cursor-pointer"
                title={showToken ? 'Скрыть' : 'Показать'}
              >
                {showToken ? <EyeClosedLinearIcon size={16} color="#57606a" /> : <EyeLinearIcon size={16} color="#57606a" />}
              </button>
            </div>
          </div>

          {/* Optional API URL toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#3B9702] hover:underline cursor-pointer font-medium text-left p-0"
            >
              {showAdvanced ? '− Базовый URL API' : '+ Настройки URL API'}
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-1.5 mt-2">
                <input
                  type="text"
                  placeholder="https://api.green-api.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full bg-[#f0f0f2] dark:bg-[#2c2c2e] text-black dark:text-white placeholder:text-[#8e8e93] border border-[#e5e5ea] dark:border-[#3a3a3c] rounded-[8px] px-3.5 py-2.5 text-[16px] md:text-sm outline-none focus:border-[#3B9702] focus:ring-1 focus:ring-[#3B9702] transition-colors"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#3B9702] hover:bg-[#328202] text-white font-semibold text-sm rounded-[6px] py-2.5 flex items-center justify-center transition-all disabled:opacity-70 mt-1 shadow-none"
          >
            {isLoading ? (
              <>
                <RefreshCircleLinearIcon size={16} className="animate-spin mr-2" />
                Подключение...
              </>
            ) : (
              'Войти'
            )}
          </button>
        </form>
      </main>

      {/* Info Modal Dialog */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-[420px] bg-white border border-[#d0d7de] rounded-[10px] p-6 flex flex-col gap-4 shadow-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#24292f] m-0">Как получить доступ</h2>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="p-1 text-[#57606a] hover:text-[#24292f] transition-colors"
                title="Закрыть"
              >
                <CloseLinearIcon size={18} color="#57606a" />
              </button>
            </div>

            <ol className="pl-5 text-[13.5px] text-[#57606a] leading-relaxed flex flex-col gap-1.5 list-decimal m-0">
              <li>
                Зарегистрируйтесь в личном кабинете{' '}
                <a
                  href="https://console.green-api.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3B9702] hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  console.green-api.com <ArrowRightUpLinearIcon size={12} className="inline-block" />
                </a>
              </li>
              <li>Создайте инстанс на бесплатном тарифе «Разработчик»</li>
              <li>Отсканируйте QR-код приложением WhatsApp для авторизации</li>
              <li>Скопируйте <code>idInstance</code> и <code>apiTokenInstance</code> в поля формы</li>
            </ol>

            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="self-end bg-[#3B9702] hover:bg-[#328202] text-white text-[13px] font-semibold rounded-[6px] px-4 py-2 transition-colors shadow-none cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
