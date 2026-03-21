import { z } from 'zod';
import { phoneSchema } from './user';

export const requestCodeSchema = z.object({
  phone: phoneSchema,
});

export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    phone: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    isNewUser: z.boolean(),
  }),
});

export type RequestCode = z.infer<typeof requestCodeSchema>;
export type VerifyCode = z.infer<typeof verifyCodeSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
