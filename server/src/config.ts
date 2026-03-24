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
  FIREBASE_SERVICE_ACCOUNT: z.string().default(''),
  BASE_URL: z.string().default('http://localhost:3000'),
  SMTP_HOST: z.string().default('mail.fomo.broker'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().default('noreply@fomo.broker'),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('FOMO Chat <noreply@fomo.broker>'),
  CORS_ORIGIN: z.string().default('*'),
  UPLOADS_DIR: z.string().default('/app/uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(15_728_640), // 15MB
});

export const config = envSchema.parse(process.env);
export type Config = typeof config;
