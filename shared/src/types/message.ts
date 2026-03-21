import { z } from 'zod';

export const messageTypeSchema = z.enum(['text', 'image', 'file', 'voice', 'system']);
export const deliveryStatusSchema = z.enum(['sent', 'delivered', 'read']);
export const transportTypeSchema = z.enum(['ws', 'push', 'rss', 'mesh']);

export const attachmentSchema = z.object({
  fileId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
  encryptedUrl: z.string(),
});

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  type: messageTypeSchema,
  // For MVP: plaintext. After E2EE phase: encrypted payload only
  text: z.string().max(4096).optional(),
  encryptedPayload: z.string().optional(),
  attachments: z.array(attachmentSchema).default([]),
  replyToId: z.string().nullable().default(null),
  status: deliveryStatusSchema.default('sent'),
  deliveredVia: transportTypeSchema.default('ws'),
  createdAt: z.string().datetime(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string(),
  type: messageTypeSchema.default('text'),
  text: z.string().max(4096).optional(),
  replyToId: z.string().nullable().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

export type MessageType = z.infer<typeof messageTypeSchema>;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type TransportType = z.infer<typeof transportTypeSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Message = z.infer<typeof messageSchema>;
export type SendMessage = z.infer<typeof sendMessageSchema>;
