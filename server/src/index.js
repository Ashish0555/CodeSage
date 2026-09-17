import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { generalLimiter } from './middleware/rateLimit.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (config.env !== 'test') app.use(morgan('dev'));

  app.use('/api', generalLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

// Start the server only when run directly (not when imported by tests).
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  (async () => {
    try {
      await connectDB();
      const app = createApp();
      app.listen(config.port, () => {
        console.log(`[server] CodeSage API on http://localhost:${config.port}  (AI: ${config.aiEnabled ? 'on' : 'off'})`);
      });
    } catch (err) {
      console.error('[server] failed to start:', err);
      process.exit(1);
    }
  })();
}
