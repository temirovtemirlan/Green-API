export interface GreenApiCredentials {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl?: string; // Default: https://api.green-api.com
}

export interface InstanceState {
  stateInstance: 'notAuthorized' | 'authorized' | 'blocked' | 'sleepMode' | 'starting' | 'unknown';
}

export type MessageDirection = 'incoming' | 'outgoing';

export interface ChatMessage {
  id: string;
  chatId: string;
  text: string;
  timestamp: number;
  direction: MessageDirection;
  senderName?: string;
  status: 'sending' | 'sent' | 'delivered' | 'error';
}

export interface ChatSummary {
  chatId: string;
  name: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: number;
}

export interface SendMessagePayload {
  chatId: string;
  message: string;
  quotedMessageId?: string;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface ReceiveNotificationResponse {
  receiptId: number;
  body: NotificationBody;
}

export interface NotificationBody {
  typeWebhook: string;
  instanceData?: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId: string;
    sender: string;
    senderName?: string;
    senderContactName?: string;
  };
  messageData?: {
    typeMessage: string;
    textMessageData?: {
      textMessage: string;
    };
    extendedTextMessageData?: {
      text: string;
      description?: string;
      title?: string;
    };
  };
}

export interface DeleteNotificationResponse {
  result: boolean;
}
