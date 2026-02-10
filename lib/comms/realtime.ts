// ============================================
// COMMS REAL-TIME HELPERS
// Publish events to Ably channels from API routes.
// ============================================

import { type CommsRealtimePayload } from "./events";
import { getAblyRest } from "@/lib/ably";

/**
 * Publish "message_created" to the thread channel.
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

  const ably = getAblyRest();
  const channel = ably.channels.get(`thread:${threadId}`);
  await channel.publish("message_created", payload);
}

/**
 * Publish "message_updated" to the thread channel.
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

  const ably = getAblyRest();
  const channel = ably.channels.get(`thread:${threadId}`);
  await channel.publish("message_updated", payload);
}

/**
 * Publish "message_deleted" to the thread channel.
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

  const ably = getAblyRest();
  const channel = ably.channels.get(`thread:${threadId}`);
  await channel.publish("message_deleted", payload);
}

/**
 * Publish "thread_status_updated" to the thread channel.
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

  const ably = getAblyRest();
  const channel = ably.channels.get(`thread:${threadId}`);
  await channel.publish("thread_status_updated", payload);
}

/**
 * Notify typing to the thread channel.
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

  const ably = getAblyRest();
  const channel = ably.channels.get(`thread:${threadId}`);
  await channel.publish(payload.type, payload);
}

/**
 * Publish "message_reaction_added" to the thread channel.
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

  const ably = getAblyRest();
  const channel = ably.channels.get(`thread:${threadId}`);
  await channel.publish("message_reaction_added", payload);
}

/**
 * Publish "message_reaction_removed" to the thread channel.
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

  const ably = getAblyRest();
  const channel = ably.channels.get(`thread:${threadId}`);
  await channel.publish("message_reaction_removed", payload);
}
