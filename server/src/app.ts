import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { companyRoutes } from './modules/companies/companies.routes.js';
import { exhibitionRoutes } from './modules/exhibitions/exhibitions.routes.js';
import { floorPlanRoutes } from './modules/floor-plans/floor-plans.routes.js';
import { stallRoutes } from './modules/stalls/stalls.routes.js';
import { bookingRoutes } from './modules/bookings/bookings.routes.js';
import { paymentRoutes } from './modules/payments/payments.routes.js';
import { invoiceRoutes } from './modules/invoices/invoices.routes.js';
import { notificationRoutes } from './modules/notifications/notifications.routes.js';

export const createApp = (): Express => {
  const app = express();

  // Core Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health Check Endpoint
  app.get('/api/v1/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Buoyant Media B2B Platform API',
      version: '1.0.0',
    });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/companies', companyRoutes);
  app.use('/api/v1/exhibitions', exhibitionRoutes);
  app.use('/api/v1/floor-plans', floorPlanRoutes);
  app.use('/api/v1/stalls', stallRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/invoices', invoiceRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // 404 Fallback Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error Handler Middleware
  app.use(errorHandler);

  return app;
};
