import { z } from 'zod';

export const transportStatusSchema = z.enum(['connected', 'degraded', 'offline']);

export const transportInfoSchema = z.object({
  activeTransport: z.enum(['ws', 'push', 'rss', 'mesh']),
  status: transportStatusSchema,
  latency: z.number().optional(),
});

// WebSocket event types
export const wsEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('message:send'),
    data: z.object({
      conversationId: z.string(),
      type: z.enum(['text', 'image', 'file', 'voice']).default('text'),
      text: z.string().max(4096).optional(),
      replyToId: z.string().nullable().optional(),
    }),
  }),
  z.object({
    event: z.literal('message:delivered'),
    data: z.object({ messageId: z.string() }),
  }),
  z.object({
    event: z.literal('message:read'),
    data: z.object({ messageId: z.string() }),
  }),
  z.object({
    event: z.literal('typing:start'),
    data: z.object({ conversationId: z.string() }),
  }),
  z.object({
    event: z.literal('typing:stop'),
    data: z.object({ conversationId: z.string() }),
  }),
  z.object({
    event: z.literal('presence:ping'),
    data: z.object({}),
  }),
]);

export type TransportStatus = z.infer<typeof transportStatusSchema>;
export type TransportInfo = z.infer<typeof transportInfoSchema>;
export type WsEvent = z.infer<typeof wsEventSchema>;
