import express from 'express';

// Prevent XSS e.g., injecting <script> in email field, 
// clickjacking and 
// Sniffing.
import helmet from 'helmet';

// Allow frontend to call backend safely.
import cors from 'cors';

// Log everything to the console at dev or prod
import morgan from 'morgan';

// Read cookie info in the cookie e.g., JWT
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { notFoundErrorHandler, generalErrorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);

app.use(helmet());
app.use(cors({ origin: env.clientOrigins, credentials: true }));
if (env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(globalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(notFoundErrorHandler);
app.use(generalErrorHandler);

export default app;
