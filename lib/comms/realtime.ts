// ============================================
// COMMS REAL-TIME HELPERS
// Publish events to Socket.io VPS server.
// ============================================

import { type CommsRealtimePayload } from "./events";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://173.212.231.174:4000";

async function broadcast(event: string, payload: CommsRealtimePayload) {
  try {
    const res = await fetch(`${SOCKET_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
    });
    if (!res.ok) {
      console.error(`[REALTIME] Failed to broadcast ${event}:`, res.statusText);
    }
  } catch (err) {
    console.error(`[REALTIME] Error broadcasting ${event}:`, err);
  }
}

/**
 * Publish "message_created" to all users.
 */
export async function publishMessageCreated(
  threadId: string,
  messageId: string,
  authorId: string,
  authorName: string,
  content: string,
  createdAt: string,
): Promise<void> {
  const payload: CommsRealtimePayload = {
    type: "message_created",
    threadId,
    messageId,
    userId: authorId,
    userName: authorName,
    content,
    createdAt,
  };

  await broadcast("message_created", payload);
}

/**
 * Publish "message_updated" to the thread room.
 */
export async function publishMessageUpdated(
  threadId: string,
  messageId: string,
  content: string,
): Promise<void> {
  const payload: CommsRealtimePayload = {
    type: "message_updated",
    threadId,
    messageId,
    content,
  };

  await broadcast("message_updated", payload);
}

/**
 * Publish "message_deleted" to the thread room.
 */
export async function publishMessageDeleted(
  threadId: string,
  messageId: string,
): Promise<void> {
  const payload: CommsRealtimePayload = {
    type: "message_deleted",
    threadId,
    messageId,
  };

  await broadcast("message_deleted", payload);
}

/**
 * Publish "thread_status_updated" to all users.
 */
export async function publishThreadStatusUpdated(
  threadId: string,
  status: string,
): Promise<void> {
  const payload: CommsRealtimePayload = {
    type: "thread_status_updated",
    threadId,
    status,
  };

  await broadcast("thread_status_updated", payload);
}

/**
 * Notify typing (usually done via client directly for speed, but here for completeness).
 */
export async function publishTyping(
  threadId: string,
  typistUserId: string,
  typistUserName: string,
  isTyping: boolean,
): Promise<void> {
  const payload: CommsRealtimePayload = {
    type: isTyping ? "typing_start" : "typing_stop",
    threadId,
    userId: typistUserId,
    userName: typistUserName,
  };

  await broadcast(payload.type as string, payload);
}

/**
 * Publish "message_reaction_added".
 */
export async function publishMessageReactionAdded(
  threadId: string,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const payload: CommsRealtimePayload = {
    type: "message_reaction_added",
    threadId,
    messageId,
    userId,
    emoji,
  };

  await broadcast("message_reaction_added", payload);
}

/**
 * Publish "message_reaction_removed".
 */
export async function publishMessageReactionRemoved(
  threadId: string,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const payload: CommsRealtimePayload = {
    type: "message_reaction_removed",
    threadId,
    messageId,
    userId,
    emoji,
  };

  await broadcast("message_reaction_removed", payload);
}
