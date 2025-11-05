import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import leaguesRouter from './routes/leagues.js';
import matchesRouter from './routes/matches.js';
import matchRouter from './routes/match.js';
import healthRouter from './routes/health.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => {
        const allowedOrigins = [
          'https://betapi-ev.vercel.app',
          'https://betapi-frontend.vercel.app',
          process.env.FRONTEND_URL
        ].filter(Boolean);

        // Also allow any vercel.app subdomain
        const isVercelApp = origin && origin.match(/^https:\/\/.*\.vercel\.app$/);

        if (!origin || allowedOrigins.includes(origin) || isVercelApp) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/leagues', leaguesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/match', matchRouter);
app.use('/api/health', healthRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║     🚀 EV BETTING BACKEND SERVER STARTED 🚀       ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 BetsAPI Key present: ${!!process.env.BETSAPI_KEY}`);
  if (process.env.BETSAPI_KEY) {
    console.log(`🔑 BetsAPI Key (first 10): ${process.env.BETSAPI_KEY.substring(0, 10)}...`);
  }
  console.log(`🌐 BetsAPI Base URL: ${process.env.BETSAPI_BASE_URL || 'https://api.betsapi.com'}`);
  console.log(`⏱️  Cache TTL - Leagues: ${process.env.CACHE_LEAGUES_TTL || 3600}s`);
  console.log(`⏱️  Cache TTL - Matches: ${process.env.CACHE_MATCHES_TTL || 300}s`);
  console.log(`⏱️  Cache TTL - Odds: ${process.env.CACHE_ODDS_TTL || 60}s`);
  console.log(`📈 Min EV Threshold: ${process.env.MIN_EV_THRESHOLD || 4.0}%`);
  console.log('\n📍 Available endpoints:');
  console.log(`   GET http://localhost:${PORT}/api/health`);
  console.log(`   GET http://localhost:${PORT}/api/leagues/top20`);
  console.log(`   GET http://localhost:${PORT}/api/matches/upcoming?league_id=X`);
  console.log(`   GET http://localhost:${PORT}/api/match/:id/summary`);
  console.log(`   GET http://localhost:${PORT}/api/match/:id/odds (21+ bookmakers)`);
  console.log(`   GET http://localhost:${PORT}/api/match/:id/model (with explanations)`);
  console.log(`   GET http://localhost:${PORT}/api/match/:id/statistics (shots, xG, etc.)`);
  console.log('\n✅ Server ready to accept requests!\n');
  console.log('═══════════════════════════════════════════════════════\n');
});
