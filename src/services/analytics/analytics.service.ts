import { PostHog } from 'posthog-node';
import { logger } from '../logger/logger';

export class AnalyticsService {
  private client: PostHog | null = null;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (apiKey) {
      this.client = new PostHog(apiKey, { host });
      logger.info('PostHog Analytics initialized securely.');
    } else {
      logger.warn('NEXT_PUBLIC_POSTHOG_KEY is missing. Analytics tracking is disabled in this environment.');
    }
  }

  /**
   * Identify a user to link their session history across devices
   */
  identifyUser(userId: string, traits?: Record<string, unknown>) {
    if (!this.client) return;
    
    try {
      this.client.identify({
        distinctId: userId,
        properties: traits,
      });
    } catch (error) {
      logger.error('PostHog Identify Error', { error });
    }
  }

  /**
   * Track a specific custom event
   */
  trackEvent(userId: string, eventName: string, properties?: Record<string, unknown>) {
    if (!this.client) return;

    try {
      this.client.capture({
        distinctId: userId,
        event: eventName,
        properties,
      });
    } catch (error) {
      logger.error(`PostHog Capture Error [${eventName}]`, { error });
    }
  }

  /**
   * Gracefully flush all pending events (Useful during server shutdown)
   */
  async flush() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}

export const analytics = new AnalyticsService();
