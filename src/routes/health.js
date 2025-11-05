import express from 'express';

const router = express.Router();

/**
 * GET /api/health
 * Returns API health status
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  // Simple health check
  const health = {
    ok: true,
    timestamp: new Date().toISOString(),
    latency_ms: Date.now() - startTime,
    environment: process.env.NODE_ENV || 'development',
    betsapi_configured: !!process.env.BETSAPI_KEY
  };

  res.json(health);
});

export default router;
