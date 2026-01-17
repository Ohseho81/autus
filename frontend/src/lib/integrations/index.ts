/**
 * AUTUS Integrations
 */
export { GmailClient, createGmailClient } from './gmail';
export { CalendarClient, createCalendarClient } from './calendar';
export { SlackClient, createSlackClient } from './slack';
export { N8NClient, createN8NClient, WEBHOOK_EVENTS, PRESET_WEBHOOKS } from './n8n';

export type { EmailDecision, EmailMeta, GmailTokens } from './gmail';
export type { CalendarDecision, CalendarEvent, CalendarTokens } from './calendar';
export type { SlackDecision, SlackMessage, SlackTokens } from './slack';
export type { WebhookTrigger, WebhookPayload, WebhookResult } from './n8n';
