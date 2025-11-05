import express from 'express';
import betsAPIService from '../services/betsapi.service.js';

const router = express.Router();

/**
 * GET /api/matches/upcoming?league_id=8&limit=10
 * Returns upcoming matches for a specific league
 */
router.get('/upcoming', async (req, res, next) => {
  console.log('\n🎯 ===== ROUTE: GET /api/matches/upcoming =====');
  console.log(`📥 Request received at: ${new Date().toISOString()}`);
  console.log(`📥 Query params:`, req.query);

  try {
    const { league_id, limit = 10 } = req.query;

    if (!league_id) {
      console.log('❌ Missing league_id parameter');
      console.log('🎯 ===========================================\n');
      return res.status(400).json({ error: 'league_id is required' });
    }

    const matches = await betsAPIService.getUpcomingMatches(
      league_id,
      parseInt(limit)
    );

    console.log(`📤 Sending response with ${matches.length} matches`);
    console.log('🎯 ===========================================\n');

    res.json({ matches, count: matches.length, league_id });
  } catch (error) {
    console.error('❌ Error in /api/matches/upcoming:', error);
    console.log('🎯 ===========================================\n');
    next(error);
  }
});

export default router;
