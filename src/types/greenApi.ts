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
  clientId?: string;
  chatId: string;
  text: string;
  timestamp: number;
  direction: MessageDirection;
  senderName?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  type?: 'text' | 'audio' | 'image' | 'document';
  downloadUrl?: string;
  isUnread?: boolean;
}

export interface ChatSummary {
  chatId: string;
  name: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: number;
  lastSeen?: string | null;
  avatarUrl?: string | null;
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
  chatId?: string;
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
    chatName?: string;
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
    fileMessageData?: {
      downloadUrl?: string;
      caption?: string;
      fileName?: string;
      mimeType?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DeleteNotificationResponse {
  result: boolean;
}

export interface GreenApiRawChat {
  id: string;
  name?: string;
  type: 'user' | 'group';
  unreadCount?: number;
  archive?: boolean;
}

export interface GreenApiRawContact {
  id: string;
  name?: string;
  contactName?: string;
  type?: 'user' | 'group';
}

export interface GreenApiRawHistoryMessage {
  type: 'incoming' | 'outgoing';
  idMessage: string;
  timestamp: number;
  typeMessage: string;
  chatId: string;
  textMessage?: string;
  extendedTextMessage?: {
    text: string;
    description?: string;
    title?: string;
  };
  senderId?: string;
  senderName?: string;
  senderContactName?: string;
  caption?: string;
  fileName?: string;
  statusMessage?: string;
  [key: string]: unknown;
}

