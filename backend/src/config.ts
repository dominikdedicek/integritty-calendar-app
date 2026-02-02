import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  CALENDAR_ID: z.string().min(1, 'CALENDAR_ID is required'),
  TIMEZONE: z.string().default('Europe/Prague'),
  ROOM_NAME: z.string().default('Zasedací místnost'),
  REFRESH_INTERVAL_SECONDS: z.coerce.number().default(30),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Configuration validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Invalid configuration');
  }

  const env = result.data;

  // Validate that at least one auth method is provided
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON && !env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    throw new Error(
      'Either GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_PATH must be provided'
    );
  }

  return {
    calendarId: env.CALENDAR_ID,
    timezone: env.TIMEZONE,
    roomName: env.ROOM_NAME,
    refreshIntervalSeconds: env.REFRESH_INTERVAL_SECONDS,
    googleServiceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
    googleServiceAccountPath: env.GOOGLE_SERVICE_ACCOUNT_PATH,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
  };
}

export const config = loadConfig();
export type AppConfig = ReturnType<typeof loadConfig>;
