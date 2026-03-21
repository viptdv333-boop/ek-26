import { z } from 'zod';

export const conversationTypeSchema = z.enum(['direct', 'group']);

export const groupMetaSchema = z.object({
  name: z.string().min(1).max(128),
  avatarUrl: z.string().url().nullable().default(null),
  admins: z.array(z.string()),
  createdBy: z.string(),
});

export const conversationSchema = z.object({
  id: z.string(),
  type: conversationTypeSchema,
  participants: z.array(z.string()),
  groupMeta: groupMetaSchema.nullable().default(null),
  lastMessage: z.object({
    text: z.string(),
    senderName: z.string(),
    timestamp: z.string().datetime(),
  }).nullable().default(null),
  unreadCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createDirectConversationSchema = z.object({
  participantId: z.string(),
});

export const createGroupConversationSchema = z.object({
  name: z.string().min(1).max(128),
  participantIds: z.array(z.string()).min(1).max(256),
});

export type ConversationType = z.infer<typeof conversationTypeSchema>;
export type GroupMeta = z.infer<typeof groupMetaSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type CreateDirectConversation = z.infer<typeof createDirectConversationSchema>;
export type CreateGroupConversation = z.infer<typeof createGroupConversationSchema>;
