import express from 'express';
import betsAPIService from '../services/betsapi.service.js';
import evCalculatorService from '../services/ev-calculator.service.js';
import statisticalModelService from '../services/statistical-model.service.js';

const router = express.Router();

/**
 * GET /api/match/:id/summary
 * Returns compact match information
 */
router.get('/:id/summary', async (req, res, next) => {
  try {
    const { id } = req.params;
    const summary = await betsAPIService.getMatchSummary(id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/match/:id/details
 * Returns detailed match info including lineups, stats, form
 */
router.get('/:id/details', async (req, res, next) => {
  try {
    const { id } = req.params;
    const details = await betsAPIService.getMatchDetails(id);
    res.json(details);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/match/:id/odds
 * Returns all bookmaker odds for the match
 */
router.get('/:id/odds', async (req, res, next) => {
  try {
    const { id } = req.params;
    const odds = await betsAPIService.getMatchOdds(id);
    res.json(odds);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/match/:id/model
 * Returns fair odds, probabilities, and EV calculations using STATISTICAL MODEL
 */
router.get('/:id/model', async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log(`\n🎯 ===== STATISTICAL MODEL REQUEST FOR MATCH ${id} =====`);

    // Step 1: Get match summary to extract team IDs
    const summary = await betsAPIService.getMatchSummary(id);
    const homeTeamId = summary.home?.id || summary.match_id; // Fallback
    const awayTeamId = summary.away?.id || summary.match_id; // Fallback

    console.log(`🏠 Home Team: ${summary.home_team} (ID: ${homeTeamId})`);
    console.log(`✈️  Away Team: ${summary.away_team} (ID: ${awayTeamId})`);

    // Step 2: Get historical data (H2H + team form)
    const historyData = await betsAPIService.getEventHistory(id);

    // Step 3: Calculate statistical probabilities
    const statisticalProbabilities = await statisticalModelService.calculateProbabilities(
      historyData,
      homeTeamId,
      awayTeamId
    );

    // Step 4: Get odds data
    const oddsData = await betsAPIService.getMatchOdds(id);

    // Step 5: Calculate EV using statistical probabilities
    const evData = evCalculatorService.calculateMatchEV(oddsData, statisticalProbabilities);

    console.log(`🎯 ===================================================\n`);

    res.json({
      match_id: id,
      timestamp: new Date().toISOString(),
      min_ev_threshold: evCalculatorService.minEVThreshold,
      model_type: 'statistical',
      markets: evData,
      match_info: {
        home_team: summary.home_team,
        away_team: summary.away_team
      }
    });
  } catch (error) {
    console.error('❌ Error in statistical model calculation:', error);
    next(error);
  }
});

/**
 * GET /api/match/:id/h2h
 * Returns head-to-head history
 */
router.get('/:id/h2h', async (req, res, next) => {
  try {
    const { id } = req.params;
    const h2h = await betsAPIService.getH2H(id);
    res.json(h2h);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/match/:id/statistics
 * Returns comprehensive match statistics
 * Includes: live stats, shots, corners, possession, xG, fouls, cards, etc.
 */
router.get('/:id/statistics', async (req, res, next) => {
  try {
    const { id } = req.params;
    const statistics = await betsAPIService.getMatchStatistics(id);
    res.json(statistics);
  } catch (error) {
    next(error);
  }
});

export default router;
