// ============================================
// COMMS REAL-TIME EVENT TYPES
// ============================================

export type CommsRealtimeEventType =
  | "message_created"
  | "message_updated"
  | "message_deleted"
  | "thread_status_updated"
  | "thread_updated"
  | "typing_start"
  | "typing_stop"
  | "presence_online"
  | "presence_offline"
  | "message_reaction_added"
  | "message_reaction_removed"
  | "message_read"
  | "message_seen";

export interface CommsRealtimePayload {
  type: CommsRealtimeEventType;
  threadId: string;
  userId?: string;
  userName?: string;
  messageId?: string;
  content?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}
