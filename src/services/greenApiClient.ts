import {
  GreenApiCredentials,
  InstanceState,
  SendMessagePayload,
  SendMessageResponse,
  ReceiveNotificationResponse,
  DeleteNotificationResponse,
  GreenApiRawChat,
  GreenApiRawHistoryMessage,
} from '@/types/greenApi';

export class GreenApiClient {
  private idInstance: string;
  private apiTokenInstance: string;
  private baseUrl: string;

  constructor(credentials: GreenApiCredentials) {
    this.idInstance = credentials.idInstance.trim();
    this.apiTokenInstance = credentials.apiTokenInstance.trim();
    this.baseUrl = (credentials.apiUrl || 'https://api.green-api.com').replace(/\/$/, '');
  }

  private getUrl(method: string, extraPath: string = ''): string {
    const extra = extraPath ? `/${extraPath}` : '';
    return `${this.baseUrl}/waInstance${this.idInstance}/${method}/${this.apiTokenInstance}${extra}`;
  }

  /**
   * Helper to make HTTP requests with JSON error handling
   */
  private async request<T>(
    method: string,
    httpMethod: 'GET' | 'POST' | 'DELETE',
    body?: unknown,
    extraPath: string = '',
    params?: Record<string, string | number>,
    signal?: AbortSignal
  ): Promise<T> {
    let url = this.getUrl(method, extraPath);
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        searchParams.append(key, String(val));
      });
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await fetch(url, {
      method: httpMethod,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.correspondentsStatus?.description) {
          errorMessage = errorData.correspondentsStatus.description;
        } else if (errorData?.invokeStatus?.description) {
          errorMessage = errorData.invokeStatus.description;
        } else if (errorData?.description) {
          errorMessage = errorData.description;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Response wasn't json, use default statusText
      }
      throw new Error(errorMessage);
    }

    // Handles empty 204 or null responses (e.g. empty queue in receiveNotification)
    const text = await response.text();
    if (!text || text.trim() === '' || text.trim() === 'null') {
      return null as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Check connection and authorization status of the instance
   * Method: getStateInstance
   */
  async getStateInstance(signal?: AbortSignal): Promise<InstanceState> {
    return this.request<InstanceState>('getStateInstance', 'GET', undefined, '', undefined, signal);
  }

  /**
   * Get instance settings
   * Method: getSettings
   */
  async getSettings(signal?: AbortSignal): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('getSettings', 'GET', undefined, '', undefined, signal);
  }

  /**
   * Set instance settings (e.g. enable incomingWebhook)
   * Method: setSettings
   */
  async setSettings(
    settings: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<{ saveSettings: boolean }> {
    return this.request<{ saveSettings: boolean }>('setSettings', 'POST', settings, '', undefined, signal);
  }

  /**
   * Ensure incomingWebhook & outgoingMessageStatusWebhook are enabled
   */
  async ensureIncomingWebhook(signal?: AbortSignal): Promise<void> {
    try {
      const current = await this.getSettings(signal);
      const updates: Record<string, string> = {};
      if (current && current.incomingWebhook !== 'yes') {
        updates.incomingWebhook = 'yes';
      }
      if (current && current.outgoingMessageStatusWebhook !== 'yes') {
        updates.outgoingMessageStatusWebhook = 'yes';
      }
      if (current && current.outgoingAPIMessageWebhook !== 'yes') {
        updates.outgoingAPIMessageWebhook = 'yes';
      }
      if (Object.keys(updates).length > 0) {
        await this.setSettings(updates, signal);
      }
    } catch (err) {
      console.warn('Could not automatically verify webhook settings:', err);
    }
  }

  /**
   * Get all active chats from the connected WhatsApp account
   * Method: getChats
   */
  async getChats(signal?: AbortSignal): Promise<GreenApiRawChat[]> {
    const chats = await this.request<GreenApiRawChat[]>('getChats', 'GET', undefined, '', undefined, signal);
    return Array.isArray(chats) ? chats : [];
  }

  /**
   * Get contact information (name, contactName, avatar)
   * Method: getContactInfo
   */
  async getContactInfo(
    chatId: string,
    signal?: AbortSignal
  ): Promise<{
    name?: string;
    contactName?: string;
    avatar?: string;
    lastSeen?: string | null;
    isBusiness?: boolean;
    description?: string;
    category?: string;
  } | null> {
    const formattedChatId = GreenApiClient.normalizeChatId(chatId);
    if (!formattedChatId) return null;

    try {
      return await this.request<{
        name?: string;
        contactName?: string;
        avatar?: string;
        lastSeen?: string | null;
        isBusiness?: boolean;
        description?: string;
        category?: string;
      }>(
        'getContactInfo',
        'POST',
        { chatId: formattedChatId },
        '',
        undefined,
        signal
      );
    } catch {
      return null;
    }
  }

  /**
   * Get chat message history for a specific chat
   * Method: getChatHistory
   */
  async getChatHistory(
    chatId: string,
    count: number = 50,
    signal?: AbortSignal
  ): Promise<GreenApiRawHistoryMessage[]> {
    const formattedChatId = GreenApiClient.normalizeChatId(chatId);
    if (!formattedChatId) return [];

    const messages = await this.request<GreenApiRawHistoryMessage[]>(
      'getChatHistory',
      'POST',
      { chatId: formattedChatId, count },
      '',
      undefined,
      signal
    );
    return Array.isArray(messages) ? messages : [];
  }

  /**
   * Get direct download URL for media/audio files
   * Method: downloadFile
   */
  async downloadFile(
    chatId: string,
    idMessage: string,
    signal?: AbortSignal
  ): Promise<{ downloadUrl: string } | null> {
    const formattedChatId = GreenApiClient.normalizeChatId(chatId);
    if (!formattedChatId || !idMessage) return null;

    try {
      return await this.request<{ downloadUrl: string }>(
        'downloadFile',
        'POST',
        { chatId: formattedChatId, idMessage },
        '',
        undefined,
        signal
      );
    } catch {
      return null;
    }
  }

  /**
   * Mark all messages in a chat as read
   * Method: readChat
   */
  async readChat(
    chatId: string,
    idMessage?: string,
    signal?: AbortSignal
  ): Promise<boolean> {
    const formattedChatId = GreenApiClient.normalizeChatId(chatId);
    if (!formattedChatId) return false;

    try {
      const payload: { chatId: string; idMessage?: string } = { chatId: formattedChatId };
      if (idMessage) {
        payload.idMessage = idMessage;
      }
      await this.request<{ setRead: boolean }>(
        'readChat',
        'POST',
        payload,
        '',
        undefined,
        signal
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a text message to chat/recipient
   * Method: sendMessage
   */
  async sendMessage(
    payload: SendMessagePayload,
    signal?: AbortSignal
  ): Promise<SendMessageResponse> {
    const formattedChatId = GreenApiClient.normalizeChatId(payload.chatId);
    if (!formattedChatId) {
      throw new Error(`Некорректный номер получателя: "${payload.chatId}". Укажите номер с кодом страны (например, 79991234567).`);
    }

    return this.request<SendMessageResponse>(
      'sendMessage',
      'POST',
      {
        chatId: formattedChatId,
        message: payload.message,
        quotedMessageId: payload.quotedMessageId,
      },
      '',
      undefined,
      signal
    );
  }

  /**
   * Receive next pending notification from FIFO queue
   * Method: receiveNotification
   * @param receiveTimeout Wait timeout in seconds (default: 5)
   */
  async receiveNotification(
    receiveTimeout: number = 5,
    signal?: AbortSignal
  ): Promise<ReceiveNotificationResponse | null> {
    return this.request<ReceiveNotificationResponse | null>(
      'receiveNotification',
      'GET',
      undefined,
      '',
      { receiveTimeout },
      signal
    );
  }

  /**
   * Delete processed notification from queue
   * Method: deleteNotification
   * @param receiptId Receipt ID received from receiveNotification
   */
  async deleteNotification(
    receiptId: number,
    signal?: AbortSignal
  ): Promise<DeleteNotificationResponse> {
    return this.request<DeleteNotificationResponse>(
      'deleteNotification',
      'DELETE',
      undefined,
      String(receiptId),
      undefined,
      signal
    );
  }

  /**
   * Helper to normalize user input into valid chatId format
   * Supports:
   * 1. Already formatted chatIds like "79991234567@c.us", "...@g.us", "...@lid"
   * 2. Phone numbers with + or symbols: "+7 (999) 123-45-67" -> "79991234567@c.us"
   */
  static normalizeChatId(rawInput: string): string {
    const trimmed = rawInput.trim();
    if (!trimmed) return '';

    // If already contains domain identifier (@c.us, @g.us, @lid, etc.)
    if (trimmed.includes('@')) {
      const [user, domain] = trimmed.split('@');
      if (!user || !domain) return '';
      return trimmed;
    }

    // Clean all non-digit characters
    const digitsOnly = trimmed.replace(/\D/g, '');

    // Must have at least 10 digits for a valid telephone number
    if (digitsOnly.length < 10) {
      return '';
    }

    // International numbers cannot start with 0 (WhatsApp / GREEN-API requirement)
    if (digitsOnly.startsWith('0')) {
      return '';
    }

    // Common Russian/Kazakh 8-format normalization: 8999... -> 7999...
    let normalizedDigits = digitsOnly;
    if (digitsOnly.length === 11 && digitsOnly.startsWith('8')) {
      normalizedDigits = '7' + digitsOnly.slice(1);
    }

    return `${normalizedDigits}@c.us`;
  }

  /**
   * Extract human-readable phone number or identifier from chatId
   */
  static formatChatDisplay(chatId: string): string {
    if (!chatId) return '';
    const clean = chatId.replace(/@.*$/, '');
    if (clean.length === 11 && clean.startsWith('7')) {
      return `+7 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9)}`;
    }
    return clean || chatId;
  }
}
