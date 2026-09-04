import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Featherless AI
  FEATHERLESS_API_KEY: z.string().min(1, 'FEATHERLESS_API_KEY is required'),
  FEATHERLESS_MODEL: z
    .string()
    .min(1, 'FEATHERLESS_MODEL is required')
    .default('meta-llama/Meta-Llama-3.1-8B-Instruct'),

  // YouTube
  YOUTUBE_API_KEY: z.string().min(1, 'YOUTUBE_API_KEY is required'),

  // Server
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // CORS
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Demo Mode
  DEMO_MODE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const isDemoMode =
    process.env['DEMO_MODE'] === 'true' ||
    process.env['NODE_ENV'] === 'test';

  if (isDemoMode) {
    // In demo/test mode relax required credentials
    const demoSchema = envSchema.extend({
      FEATHERLESS_API_KEY: z.string().default('demo_key'),
      YOUTUBE_API_KEY: z.string().default('demo_key'),
    });

    const result = demoSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Environment configuration error:', result.error.format());
      process.exit(1);
    }
    return result.data;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment configuration error:', result.error.format());
    console.error(
      'ℹ️  Set DEMO_MODE=true to run without real credentials (for development/testing).'
    );
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();

export const isDemoMode = env.DEMO_MODE;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
