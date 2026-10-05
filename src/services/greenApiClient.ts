import {
  GreenApiCredentials,
  InstanceState,
  SendMessagePayload,
  SendMessageResponse,
  ReceiveNotificationResponse,
  DeleteNotificationResponse,
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
        if (errorData?.message) {
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
   * Send a text message to chat/recipient
   * Method: sendMessage
   */
  async sendMessage(
    payload: SendMessagePayload,
    signal?: AbortSignal
  ): Promise<SendMessageResponse> {
    const formattedChatId = GreenApiClient.normalizeChatId(payload.chatId);
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
   * Helper to normalize user input (e.g. "+7 999 123-45-67") into valid chatId format
   * Supports:
   * 1. Already formatted chatIds like "79991234567@c.us" or "...@g.us"
   * 2. Phone numbers with + or symbols: "+7 (999) 123-45-67" -> "79991234567@c.us"
   * 3. MAX messenger IDs or formats
   */
  static normalizeChatId(rawInput: string): string {
    const trimmed = rawInput.trim();
    if (!trimmed) return '';

    // If already contains domain identifier (@c.us, @g.us, etc.)
    if (trimmed.includes('@')) {
      return trimmed;
    }

    // Clean digits
    const digitsOnly = trimmed.replace(/\D/g, '');

    // Common Russian 8-format normalization: 8999... -> 7999...
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
