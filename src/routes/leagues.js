import express from 'express';
import betsAPIService from '../services/betsapi.service.js';

const router = express.Router();

/**
 * GET /api/leagues/top20
 * Returns top 20 football leagues
 */
router.get('/top20', async (req, res, next) => {
  console.log('\n🌍 ===== ROUTE: GET /api/leagues/top20 =====');
  console.log(`📥 Request received at: ${new Date().toISOString()}`);

  try {
    const leagues = await betsAPIService.getTopLeagues();

    console.log(`📤 Sending response with ${leagues.length} leagues`);
    console.log('🌍 =========================================\n');

    res.json({ leagues, count: leagues.length });
  } catch (error) {
    console.error('❌ Error in /api/leagues/top20:', error);
    console.log('🌍 =========================================\n');
    next(error);
  }
});

export default router;
