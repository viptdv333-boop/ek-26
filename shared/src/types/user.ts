import { z } from 'zod';

export const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid E.164 phone number');

export const userSchema = z.object({
  id: z.string(),
  phone: phoneSchema,
  displayName: z.string().min(1).max(64),
  avatarUrl: z.string().url().nullable().default(null),
  status: z.string().max(140).default(''),
  lastSeen: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export const userProfileSchema = userSchema.pick({
  id: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  lastSeen: true,
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  status: z.string().max(140).optional(),
});

export type User = z.infer<typeof userSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
