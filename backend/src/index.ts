import express from 'express';
import cors from 'cors';
import { config } from './config';
import eventsRouter from './routes/events';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/events', eventsRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`Room Display Backend running on port ${config.port}`);
  console.log(`Room: ${config.roomName}`);
  console.log(`Timezone: ${config.timezone}`);
  console.log(`Calendar ID: ${config.calendarId}`);
});

export default app;
