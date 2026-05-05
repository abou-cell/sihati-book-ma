import { publicEnv, serverEnv } from '../env';

export const appConfig = {
  app: {
    url: publicEnv.NEXT_PUBLIC_APP_URL,
    nodeEnv: serverEnv.NODE_ENV,
    isProduction: serverEnv.NODE_ENV === 'production',
  },
  integrations: {
    databaseConfigured: Boolean(serverEnv.DATABASE_URL),
    authConfigured: Boolean(serverEnv.AUTH_SECRET),
    stripeConfigured:
      Boolean(serverEnv.STRIPE_SECRET_KEY) &&
      Boolean(serverEnv.STRIPE_WEBHOOK_SECRET),
    emailConfigured: Boolean(serverEnv.EMAIL_FROM) && Boolean(serverEnv.RESEND_API_KEY),
  },
} as const;

export type AppConfig = typeof appConfig;
