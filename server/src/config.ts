import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/ek26'),
  JWT_SECRET: z.string().min(32).default('dev-secret-change-me-in-production-32chars!!'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),
  UCALLER_SERVICE_ID: z.string().default(''),
  UCALLER_SECRET_KEY: z.string().default(''),
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  OTP_DEV_MODE: z.string().default('true').transform((v) => v === 'true'),
  CORS_ORIGIN: z.string().default('*'),
});

export const config = envSchema.parse(process.env);
export type Config = typeof config;
