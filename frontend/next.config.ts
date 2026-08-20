import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  // Source maps uploaded only when SENTRY_AUTH_TOKEN is set
  telemetry: false,
});
