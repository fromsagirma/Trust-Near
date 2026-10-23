import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import businessRoutes from './modules/businesses/business.routes';
import adminRoutes from './modules/admin/admin.routes';
import moderationRoutes from './modules/moderation/moderation.routes';
import uploadRoutes from './modules/upload/upload.routes';
import ownerRoutes from './modules/owner/owner.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import claimRoutes from './modules/claims/claim.routes';
import favoriteRoutes from './modules/favorites/favorites.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import promotionsRoutes from './modules/promotions/promotions.routes';
import discoveryRoutes from './modules/discovery/discovery.routes';
import photoRoutes from './modules/photos/photos.routes';
import activityRoutes from './modules/activity/activity.routes';
import supportRoutes from './modules/support/support.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'online',
    service: 'TrustNear Core & Platform Backend API',
    timestamp: new Date().toISOString(),
  }, 'TrustNear Backend is running healthy');
});

// Authentication Routes — TN-001 & TN-TECH-005
app.use('/api/auth', authRoutes);

// User Profile Routes
app.use('/api/users', usersRoutes);

// Business Listing & Category Routes — TN-006, TN-007
app.use('/api', businessRoutes);

// Business Owner Dashboard Routes — TN-009
app.use('/api', ownerRoutes);

// Admin Business Approval Routes — TN-022
app.use('/api', adminRoutes);

// Admin Content Moderation Routes — TN-021
app.use('/api', moderationRoutes);

// Business Claiming Routes — TN-016
app.use('/api', claimRoutes);

// Cloudinary Image Upload Routes — TN-011
app.use('/api/upload', uploadRoutes);

// Reviews Routes — Sprint 1
app.use('/api', reviewRoutes);

// Favorites Routes
app.use('/api', favoriteRoutes);

// Notifications Routes — TN-020
app.use('/api/notifications', notificationsRoutes);

// Admin Analytics Routes — TN-023
app.use('/api/admin/analytics', analyticsRoutes);

// Promoted Placement Routes — TN-017
app.use('/api', promotionsRoutes);

// Personalized Recommendation Routes — TN-025
app.use('/api/recommendations', discoveryRoutes);

// Business Photos Routes — TN-011
app.use('/api', photoRoutes);

// User Activity Feed & Log Routes
app.use('/api', activityRoutes);

// Customer Support Ticket & Feedback Routes
app.use('/api', supportRoutes);



// Global Error Handler
app.use(errorHandler);

export default app;
