/**
 * TN-021 — Admin Content Moderation Module
 */
export * from './moderation.schema';
export * from './moderation.service';
export * from './moderation.controller';
export { default as moderationRoutes } from './moderation.routes';
export const moderationModule = { name: 'moderation' };
