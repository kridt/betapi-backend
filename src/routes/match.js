import express from 'express';
import betsAPIService from '../services/betsapi.service.js';
import evCalculatorService from '../services/ev-calculator.service.js';

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
 * Returns fair odds, probabilities, and EV calculations
 */
router.get('/:id/model', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get odds data
    const oddsData = await betsAPIService.getMatchOdds(id);

    // Calculate EV for all markets
    const evData = evCalculatorService.calculateMatchEV(oddsData);

    res.json({
      match_id: id,
      timestamp: new Date().toISOString(),
      min_ev_threshold: evCalculatorService.minEVThreshold,
      markets: evData
    });
  } catch (error) {
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
