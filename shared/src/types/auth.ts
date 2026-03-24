import { z } from 'zod';
import { phoneSchema } from './user';

export const requestCodeSchema = z.object({
  phone: phoneSchema,
});

export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(4, 'Code must be 4 digits'),
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

// New auth flow schemas
const strongPassword = z.string()
  .min(6, 'Пароль минимум 6 символов')
  .regex(/[A-ZА-ЯЁ]/, 'Пароль должен содержать заглавную букву')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, 'Пароль должен содержать спецсимвол');

export const registerSchema = z.object({
  phone: phoneSchema,
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
  password: strongPassword,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Введите пароль'),
});

export const setPasswordSchema = z.object({
  password: strongPassword,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export type RequestCode = z.infer<typeof requestCodeSchema>;
export type VerifyCode = z.infer<typeof verifyCodeSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type Register = z.infer<typeof registerSchema>;
export type Login = z.infer<typeof loginSchema>;
export type SetPassword = z.infer<typeof setPasswordSchema>;
