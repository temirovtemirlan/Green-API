'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GreenApiCredentials, InstanceState } from '@/types/greenApi';
import { GreenApiClient } from '@/services/greenApiClient';

interface AuthContextType {
  credentials: GreenApiCredentials | null;
  client: GreenApiClient | null;
  instanceState: InstanceState | null;
  isLoading: boolean;
  error: string | null;
  login: (creds: GreenApiCredentials) => Promise<boolean>;
  logout: () => void;
  checkStatus: () => Promise<void>;
}

const STORAGE_KEY = 'green_api_creds_v1';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(null);
  const [instanceState, setInstanceState] = useState<InstanceState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const lastCheckTimeRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GreenApiCredentials;
        if (parsed.idInstance && parsed.apiTokenInstance) {
          setCredentials(parsed);
        }
      }
    } catch {
      // LocalStorage access error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize API client based on active credentials
  const client = useMemo(() => {
    if (!credentials?.idInstance || !credentials?.apiTokenInstance) {
      return null;
    }
    return new GreenApiClient(credentials);
  }, [credentials]);

  const checkStatus = useCallback(async () => {
    if (!client) return;

    // Rate-limiting guard: prevent calling getStateInstance more than once every 10 seconds
    const now = Date.now();
    if (isCheckingRef.current || now - lastCheckTimeRef.current < 10000) {
      return;
    }

    isCheckingRef.current = true;
    lastCheckTimeRef.current = now;

    try {
      const state = await client.getStateInstance();
      setInstanceState(state);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка проверки статуса инстанса';
      // If it's a 429 rate limit, do not display scary red error, just wait
      if (!message.includes('429')) {
        setError(message);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [client]);

  // Check status once when client changes, guarded against rapid repeat calls
  useEffect(() => {
    if (client) {
      const timer = setTimeout(() => {
        checkStatus();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setInstanceState(null);
    }
  }, [client, checkStatus]);

  const login = async (creds: GreenApiCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const testClient = new GreenApiClient(creds);
      lastCheckTimeRef.current = Date.now();
      
      try {
        const state = await testClient.getStateInstance();
        setInstanceState(state);
      } catch (err: unknown) {
        // If 429 rate-limited during login, still proceed if creds are populated
        const message = err instanceof Error ? err.message : '';
        if (message.includes('429')) {
          setInstanceState({ stateInstance: 'starting' });
        } else {
          throw err;
        }
      }
      
      setCredentials(creds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Не удалось подключиться к GREEN-API. Проверьте idInstance и apiTokenInstance.';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCredentials(null);
    setInstanceState(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        credentials,
        client,
        instanceState,
        isLoading,
        error,
        login,
        logout,
        checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
