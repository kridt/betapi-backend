/**
 * EV Calculator Service - STATISTICAL MODEL VERSION
 * Calculates Expected Value using statistical probabilities from historical data
 *
 * NEW METHOD:
 * 1. Calculate TRUE probabilities from H2H and team form statistics (NOT bookmaker odds)
 * 2. Use Poisson distribution based on expected goals
 * 3. Compare bookmaker odds against statistically-derived probabilities
 * 4. Show opportunities where bookmakers offer better odds than statistical model
 *
 * EV% = ((Bookmaker Odds × Statistical Probability) - 1) × 100
 */

class EVCalculatorService {
  constructor() {
    this.minEVThreshold = parseFloat(process.env.MIN_EV_THRESHOLD || 4.0);
  }

  /**
   * Calculate implied probability from decimal odds
   */
  calculateImpliedProbability(odds) {
    if (!odds || odds <= 1) return 0;
    return 1 / odds;
  }

  /**
   * Remove bookmaker margin (overround) to get fair probabilities
   */
  calculateFairProbabilities(impliedProbs) {
    const total = Object.values(impliedProbs).reduce((sum, prob) => sum + prob, 0);
    if (total <= 0) return impliedProbs;

    const fairProbs = {};
    Object.keys(impliedProbs).forEach(key => {
      fairProbs[key] = impliedProbs[key] / total;
    });

    return fairProbs;
  }

  /**
   * Calculate fair odds from probabilities
   */
  calculateFairOdds(probabilities) {
    const fairOdds = {};
    Object.keys(probabilities).forEach(key => {
      fairOdds[key] = probabilities[key] > 0 ? 1 / probabilities[key] : 0;
    });
    return fairOdds;
  }

  /**
   * Calculate EV percentage
   */
  calculateEV(bookmakerOdds, trueProbability) {
    if (!bookmakerOdds || !trueProbability || bookmakerOdds <= 1) return 0;
    return ((bookmakerOdds * trueProbability) - 1) * 100;
  }

  /**
   * Calculate average odds and variance across all bookmakers for each outcome
   */
  calculateMarketAverage(bookmakers, marketType, outcomes) {
    const avgOdds = {};
    const oddsRange = {};
    const bookmakerCount = {};

    outcomes.forEach(outcome => {
      const allOdds = bookmakers
        .filter(b => b.markets[marketType] && b.markets[marketType].odds[outcome])
        .map(b => parseFloat(b.markets[marketType].odds[outcome]))
        .filter(odd => odd && odd > 1);

      if (allOdds.length > 0) {
        avgOdds[outcome] = allOdds.reduce((sum, odd) => sum + odd, 0) / allOdds.length;
        oddsRange[outcome] = {
          min: Math.min(...allOdds),
          max: Math.max(...allOdds),
          spread: Math.max(...allOdds) - Math.min(...allOdds)
        };
        bookmakerCount[outcome] = allOdds.length;
      } else {
        avgOdds[outcome] = 0;
        oddsRange[outcome] = { min: 0, max: 0, spread: 0 };
        bookmakerCount[outcome] = 0;
      }
    });

    return { avgOdds, oddsRange, bookmakerCount };
  }

  /**
   * Generate explanation for probability calculation
   */
  generateExplanation(marketType, outcomes, avgOdds, oddsRange, bookmakerCount, fairProbs) {
    const totalBookmakers = Math.max(...Object.values(bookmakerCount));

    let explanation = `Fair odds calculated from ${totalBookmakers} bookmakers. `;

    // Calculate average margin
    const totalImpliedProb = outcomes.reduce((sum, outcome) =>
      sum + (1 / avgOdds[outcome]), 0);
    const margin = ((totalImpliedProb - 1) * 100).toFixed(1);

    explanation += `Average bookmaker margin: ${margin}%. `;

    // Add consensus strength
    const avgSpread = Object.values(oddsRange).reduce((sum, r) => sum + r.spread, 0) / outcomes.length;

    if (avgSpread < 0.2) {
      explanation += `Strong consensus among bookmakers (low variance). `;
    } else if (avgSpread < 0.5) {
      explanation += `Moderate agreement among bookmakers. `;
    } else {
      explanation += `Significant disagreement among bookmakers (high variance - opportunity for value). `;
    }

    return explanation;
  }

  /**
   * Generate explanation for individual EV opportunity
   */
  generateOpportunityExplanation(opportunity, oddsRange, outcomeKey) {
    const fairOdds = opportunity.fair_odds;
    const bookmakerOdds = opportunity.bookmaker_odds;
    const evPct = opportunity.ev_pct;

    const range = oddsRange[outcomeKey];

    let explanation = '';

    // Explain the value
    if (evPct > 20) {
      explanation += `Exceptional value! `;
    } else if (evPct > 10) {
      explanation += `Strong value. `;
    } else if (evPct > 5) {
      explanation += `Good value. `;
    } else {
      explanation += `Marginal value. `;
    }

    explanation += `${opportunity.bookmaker} offers ${bookmakerOdds} vs fair odds of ${fairOdds.toFixed(2)}. `;

    // Compare to market
    const percentilePosition = ((bookmakerOdds - range.min) / (range.max - range.min)) * 100;

    if (bookmakerOdds >= range.max * 0.95) {
      explanation += `This is among the highest odds in the market. `;
    } else if (percentilePosition > 75) {
      explanation += `Above-average odds compared to other bookmakers. `;
    }

    // Risk level based on probability
    if (opportunity.probability > 0.6) {
      explanation += `Favorite - high probability but lower returns.`;
    } else if (opportunity.probability > 0.4) {
      explanation += `Balanced probability - moderate risk.`;
    } else if (opportunity.probability > 0.25) {
      explanation += `Underdog - lower probability but higher returns.`;
    } else {
      explanation += `Long shot - verify this isn't a mistake!`;
    }

    return explanation;
  }

  /**
   * Calculate EV for 1X2 Market using STATISTICAL probabilities
   */
  calculate1X2EV(bookmakers, statisticalProbs) {
    const marketType = '1X2';
    const outcomes = ['home', 'draw', 'away'];

    // Get bookmakers that have this market
    const relevantBookmakers = bookmakers.filter(b => b.markets[marketType]);

    if (relevantBookmakers.length === 0 || !statisticalProbs) {
      return null;
    }

    console.log(`\n🔢 Calculating 1X2 EV using statistical probabilities from ${relevantBookmakers.length} bookmakers...`);

    // Use statistical probabilities (from H2H and form analysis)
    const fairProbs = statisticalProbs.probabilities;
    const fairOdds = statisticalProbs.fair_odds;

    console.log(`✨ Statistical probabilities:`, fairProbs);
    console.log(`✨ Fair odds from stats:`, fairOdds);

    // Calculate odds range for explanation
    const { oddsRange } = this.calculateMarketAverage(bookmakers, marketType, outcomes);

    // Generate explanation
    const explanation = statisticalProbs.explanation || 'Based on statistical analysis of team form and H2H history.';

    // Calculate EV for each bookmaker against statistical probabilities
    const opportunities = [];

    relevantBookmakers.forEach(bookmaker => {
      outcomes.forEach(outcome => {
        const bookmakerOdds = parseFloat(bookmaker.markets[marketType].odds[outcome]);
        const ev = this.calculateEV(bookmakerOdds, fairProbs[outcome]);

        if (ev >= this.minEVThreshold) {
          const opportunity = {
            market: '1X2',
            outcome,
            bookmaker: bookmaker.name,
            bookmaker_odds: bookmakerOdds,
            fair_odds: fairOdds[outcome],
            probability: fairProbs[outcome],
            ev_pct: parseFloat(ev.toFixed(2))
          };

          // Add individual explanation
          opportunity.reason = this.generateOpportunityExplanation(opportunity, oddsRange, outcome);

          opportunities.push(opportunity);
        }
      });
    });

    opportunities.sort((a, b) => b.ev_pct - a.ev_pct);

    console.log(`✅ Found ${opportunities.length} 1X2 opportunities`);

    return {
      probabilities: fairProbs,
      fair_odds: fairOdds,
      odds_range: oddsRange,
      explanation,
      opportunities,
      data_quality: statisticalProbs.data_quality
    };
  }

  /**
   * Calculate EV for Over/Under 2.5 Market using STATISTICAL probabilities
   */
  calculateOUEV(bookmakers, statisticalProbs) {
    const marketType = 'O/U 2.5';
    const outcomes = ['over', 'under'];

    const relevantBookmakers = bookmakers.filter(b => b.markets[marketType]);

    if (relevantBookmakers.length === 0 || !statisticalProbs) {
      return null;
    }

    console.log(`\n🔢 Calculating O/U 2.5 EV using statistical probabilities from ${relevantBookmakers.length} bookmakers...`);

    // Use statistical probabilities
    const fairProbs = statisticalProbs.probabilities;
    const fairOdds = statisticalProbs.fair_odds;

    console.log(`✨ Statistical probabilities:`, fairProbs);

    const { oddsRange } = this.calculateMarketAverage(bookmakers, marketType, outcomes);

    const explanation = statisticalProbs.explanation || 'Based on expected goals from statistical analysis.';

    const opportunities = [];

    relevantBookmakers.forEach(bookmaker => {
      outcomes.forEach(outcome => {
        const bookmakerOdds = parseFloat(bookmaker.markets[marketType].odds[outcome]);
        const ev = this.calculateEV(bookmakerOdds, fairProbs[outcome]);

        if (ev >= this.minEVThreshold) {
          const opportunity = {
            market: 'O/U 2.5',
            outcome,
            bookmaker: bookmaker.name,
            bookmaker_odds: bookmakerOdds,
            fair_odds: fairOdds[outcome],
            probability: fairProbs[outcome],
            ev_pct: parseFloat(ev.toFixed(2))
          };

          opportunity.reason = this.generateOpportunityExplanation(opportunity, oddsRange, outcome);
          opportunities.push(opportunity);
        }
      });
    });

    opportunities.sort((a, b) => b.ev_pct - a.ev_pct);

    console.log(`✅ Found ${opportunities.length} O/U opportunities`);

    return {
      probabilities: fairProbs,
      fair_odds: fairOdds,
      odds_range: oddsRange,
      explanation,
      opportunities,
      expected_total_goals: statisticalProbs.expected_total_goals
    };
  }

  /**
   * Calculate EV for BTTS Market using STATISTICAL probabilities
   */
  calculateBTTSEV(bookmakers, statisticalProbs) {
    const marketType = 'BTTS';
    const outcomes = ['yes', 'no'];

    const relevantBookmakers = bookmakers.filter(b => b.markets[marketType]);

    if (relevantBookmakers.length === 0 || !statisticalProbs) {
      return null;
    }

    console.log(`\n🔢 Calculating BTTS EV using statistical probabilities from ${relevantBookmakers.length} bookmakers...`);

    // Use statistical probabilities
    const fairProbs = statisticalProbs.probabilities;
    const fairOdds = statisticalProbs.fair_odds;

    console.log(`✨ Statistical probabilities:`, fairProbs);

    const { oddsRange } = this.calculateMarketAverage(bookmakers, marketType, outcomes);

    const explanation = statisticalProbs.explanation || 'Based on team scoring rates from statistical analysis.';

    const opportunities = [];

    relevantBookmakers.forEach(bookmaker => {
      outcomes.forEach(outcome => {
        const bookmakerOdds = parseFloat(bookmaker.markets[marketType].odds[outcome]);
        const ev = this.calculateEV(bookmakerOdds, fairProbs[outcome]);

        if (ev >= this.minEVThreshold) {
          const opportunity = {
            market: 'BTTS',
            outcome,
            bookmaker: bookmaker.name,
            bookmaker_odds: bookmakerOdds,
            fair_odds: fairOdds[outcome],
            probability: fairProbs[outcome],
            ev_pct: parseFloat(ev.toFixed(2))
          };

          opportunity.reason = this.generateOpportunityExplanation(opportunity, oddsRange, outcome);
          opportunities.push(opportunity);
        }
      });
    });

    opportunities.sort((a, b) => b.ev_pct - a.ev_pct);

    console.log(`✅ Found ${opportunities.length} BTTS opportunities`);

    return {
      probabilities: fairProbs,
      fair_odds: fairOdds,
      odds_range: oddsRange,
      explanation,
      opportunities,
      team_scoring: statisticalProbs.team_scoring
    };
  }

  /**
   * Process all markets and calculate EV for a match using STATISTICAL probabilities
   */
  calculateMatchEV(oddsData, statisticalProbabilities) {
    if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
      return {
        '1X2': null,
        'O/U 2.5': null,
        'BTTS': null,
        all_opportunities: [],
        model: 'statistical'
      };
    }

    console.log(`\n💰 ===== STATISTICAL EV CALCULATION FOR ${oddsData.bookmakers.length} BOOKMAKERS =====`);

    if (!statisticalProbabilities) {
      console.log('⚠️ No statistical probabilities available - cannot calculate EV');
      return {
        '1X2': null,
        'O/U 2.5': null,
        'BTTS': null,
        all_opportunities: [],
        model: 'statistical',
        error: 'Statistical probabilities not available'
      };
    }

    const ev1X2 = this.calculate1X2EV(oddsData.bookmakers, statisticalProbabilities['1X2']);
    const evOU = this.calculateOUEV(oddsData.bookmakers, statisticalProbabilities['O/U 2.5']);
    const evBTTS = this.calculateBTTSEV(oddsData.bookmakers, statisticalProbabilities['BTTS']);

    const allOpportunities = [
      ...(ev1X2?.opportunities || []),
      ...(evOU?.opportunities || []),
      ...(evBTTS?.opportunities || [])
    ].sort((a, b) => b.ev_pct - a.ev_pct);

    console.log(`\n🎯 TOTAL OPPORTUNITIES FOUND: ${allOpportunities.length}`);
    if (allOpportunities.length > 0) {
      console.log(`🏆 Best opportunity: ${allOpportunities[0].market} ${allOpportunities[0].outcome} @ ${allOpportunities[0].bookmaker} (${allOpportunities[0].ev_pct}% EV)`);
    }
    console.log(`💰 ================================================\n`);

    return {
      '1X2': ev1X2,
      'O/U 2.5': evOU,
      'BTTS': evBTTS,
      all_opportunities: allOpportunities,
      model: 'statistical',
      metadata: statisticalProbabilities.metadata,
      stats_predictions: statisticalProbabilities.stats_predictions
    };
  }
}

export default new EVCalculatorService();
