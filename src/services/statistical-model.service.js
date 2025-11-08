/**
 * Statistical Model Service
 * Calculates match probabilities based on historical data, team form, and H2H records
 *
 * METHODOLOGY:
 * 1. Analyze H2H history (head-to-head matches)
 * 2. Calculate team attack/defense strength from recent form
 * 3. Use Poisson distribution for goal probabilities
 * 4. Apply home advantage factor
 * 5. Generate probabilities for 1X2, O/U 2.5, BTTS markets
 */

class StatisticalModelService {
  constructor() {
    this.HOME_ADVANTAGE = 1.15; // 15% boost for home team
    this.FORM_WEIGHT = 0.7; // 70% weight on recent form vs H2H
    this.H2H_WEIGHT = 0.3; // 30% weight on H2H history
    this.RECENT_MATCHES_COUNT = 10; // Analyze last 10 matches
  }

  /**
   * Calculate factorial for Poisson distribution
   */
  factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Poisson probability mass function
   * P(X = k) = (λ^k * e^(-λ)) / k!
   */
  poissonProbability(lambda, k) {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / this.factorial(k);
  }

  /**
   * Extract goals from score string (e.g., "2-1" -> {home: 2, away: 1})
   */
  parseScore(scoreString) {
    if (!scoreString || typeof scoreString !== 'string') {
      return null;
    }
    const parts = scoreString.split('-');
    if (parts.length !== 2) return null;

    return {
      home: parseInt(parts[0]) || 0,
      away: parseInt(parts[1]) || 0
    };
  }

  /**
   * Analyze team's recent form to calculate attack and defense strength
   */
  analyzeTeamForm(matches, isHomeTeam, teamId) {
    if (!matches || matches.length === 0) {
      return {
        goalsScored: 1.5, // Default average
        goalsConceded: 1.5,
        wins: 0,
        draws: 0,
        losses: 0,
        matchCount: 0
      };
    }

    let goalsScored = 0;
    let goalsConceded = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let validMatches = 0;

    matches.slice(0, this.RECENT_MATCHES_COUNT).forEach(match => {
      const score = this.parseScore(match.ss);
      if (!score) return;

      validMatches++;

      // Determine if team was home or away in this match
      const wasHome = match.home.id === teamId;
      const teamGoals = wasHome ? score.home : score.away;
      const oppGoals = wasHome ? score.away : score.home;

      goalsScored += teamGoals;
      goalsConceded += oppGoals;

      if (teamGoals > oppGoals) wins++;
      else if (teamGoals === oppGoals) draws++;
      else losses++;
    });

    return {
      goalsScored: validMatches > 0 ? goalsScored / validMatches : 1.5,
      goalsConceded: validMatches > 0 ? goalsConceded / validMatches : 1.5,
      wins,
      draws,
      losses,
      matchCount: validMatches
    };
  }

  /**
   * Analyze H2H history between two teams
   */
  analyzeH2H(h2hMatches, homeTeamId, awayTeamId) {
    if (!h2hMatches || h2hMatches.length === 0) {
      return {
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        avgHomeGoals: 1.5,
        avgAwayGoals: 1.5,
        matchCount: 0
      };
    }

    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    let totalHomeGoals = 0;
    let totalAwayGoals = 0;
    let validMatches = 0;

    h2hMatches.forEach(match => {
      const score = this.parseScore(match.ss);
      if (!score) return;

      validMatches++;

      // Determine which team was home in the H2H match
      const homeInMatch = match.home.id;
      const awayInMatch = match.away.id;

      let homeGoals, awayGoals;

      // Map to current fixture's home/away
      if (homeInMatch === homeTeamId) {
        homeGoals = score.home;
        awayGoals = score.away;
      } else {
        homeGoals = score.away;
        awayGoals = score.home;
      }

      totalHomeGoals += homeGoals;
      totalAwayGoals += awayGoals;

      if (homeGoals > awayGoals) homeWins++;
      else if (homeGoals === awayGoals) draws++;
      else awayWins++;
    });

    return {
      homeWins,
      draws,
      awayWins,
      avgHomeGoals: validMatches > 0 ? totalHomeGoals / validMatches : 1.5,
      avgAwayGoals: validMatches > 0 ? totalAwayGoals / validMatches : 1.5,
      matchCount: validMatches
    };
  }

  /**
   * Calculate expected goals using team strengths and home advantage
   */
  calculateExpectedGoals(homeForm, awayForm, h2hData) {
    // Home team expected goals
    let homeExpectedGoals = homeForm.goalsScored * this.HOME_ADVANTAGE;

    // Away team expected goals
    let awayExpectedGoals = awayForm.goalsScored;

    // Blend with H2H data if available
    if (h2hData.matchCount >= 3) {
      homeExpectedGoals = (homeExpectedGoals * this.FORM_WEIGHT) +
                          (h2hData.avgHomeGoals * this.H2H_WEIGHT);
      awayExpectedGoals = (awayExpectedGoals * this.FORM_WEIGHT) +
                          (h2hData.avgAwayGoals * this.H2H_WEIGHT);
    }

    // Adjust for opponent's defensive strength
    homeExpectedGoals = (homeExpectedGoals + awayForm.goalsConceded) / 2;
    awayExpectedGoals = (awayExpectedGoals + homeForm.goalsConceded) / 2;

    return {
      home: Math.max(0.3, homeExpectedGoals), // Minimum 0.3 goals
      away: Math.max(0.3, awayExpectedGoals)
    };
  }

  /**
   * Calculate 1X2 probabilities using Poisson distribution
   */
  calculate1X2Probabilities(homeGoals, awayGoals) {
    let homeProbability = 0;
    let drawProbability = 0;
    let awayProbability = 0;

    // Calculate probabilities for score combinations up to 6 goals each
    for (let i = 0; i <= 6; i++) {
      for (let j = 0; j <= 6; j++) {
        const probHomeGoals = this.poissonProbability(homeGoals, i);
        const probAwayGoals = this.poissonProbability(awayGoals, j);
        const probScore = probHomeGoals * probAwayGoals;

        if (i > j) homeProbability += probScore;
        else if (i === j) drawProbability += probScore;
        else awayProbability += probScore;
      }
    }

    // Normalize to ensure they sum to 1
    const total = homeProbability + drawProbability + awayProbability;

    return {
      home: homeProbability / total,
      draw: drawProbability / total,
      away: awayProbability / total
    };
  }

  /**
   * Calculate Over/Under 2.5 probabilities
   */
  calculateOverUnderProbabilities(homeGoals, awayGoals) {
    let under25 = 0;

    // Calculate probability of total goals being 0, 1, or 2
    for (let i = 0; i <= 6; i++) {
      for (let j = 0; j <= 6; j++) {
        if (i + j <= 2) {
          const probHomeGoals = this.poissonProbability(homeGoals, i);
          const probAwayGoals = this.poissonProbability(awayGoals, j);
          under25 += probHomeGoals * probAwayGoals;
        }
      }
    }

    return {
      over: 1 - under25,
      under: under25
    };
  }

  /**
   * Calculate BTTS (Both Teams To Score) probabilities
   */
  calculateBTTSProbabilities(homeGoals, awayGoals) {
    // Probability home team scores 0
    const homeNoGoals = this.poissonProbability(homeGoals, 0);

    // Probability away team scores 0
    const awayNoGoals = this.poissonProbability(awayGoals, 0);

    // Probability both score = 1 - P(home 0 or away 0)
    const bothScore = 1 - (homeNoGoals + awayNoGoals - (homeNoGoals * awayNoGoals));

    return {
      yes: bothScore,
      no: 1 - bothScore
    };
  }

  /**
   * Main method: Calculate all probabilities from historical data
   */
  async calculateProbabilities(historyData, homeTeamId, awayTeamId) {
    console.log('\n📊 ===== STATISTICAL MODEL CALCULATION =====');

    if (!historyData || !historyData.results) {
      console.log('⚠️ No history data available');
      return null;
    }

    const { h2h, home: homeMatches, away: awayMatches } = historyData.results;

    console.log(`\n📈 Data Summary:`);
    console.log(`   H2H matches: ${h2h?.length || 0}`);
    console.log(`   Home team recent matches: ${homeMatches?.length || 0}`);
    console.log(`   Away team recent matches: ${awayMatches?.length || 0}`);

    // Analyze H2H
    const h2hData = this.analyzeH2H(h2h, homeTeamId, awayTeamId);
    console.log(`\n⚔️ Head-to-Head Analysis:`);
    console.log(`   Home wins: ${h2hData.homeWins}, Draws: ${h2hData.draws}, Away wins: ${h2hData.awayWins}`);
    console.log(`   Avg goals - Home: ${h2hData.avgHomeGoals.toFixed(2)}, Away: ${h2hData.avgAwayGoals.toFixed(2)}`);

    // Analyze team forms
    const homeForm = this.analyzeTeamForm(homeMatches, true, homeTeamId);
    const awayForm = this.analyzeTeamForm(awayMatches, false, awayTeamId);

    console.log(`\n🏠 Home Team Form (last ${homeForm.matchCount} matches):`);
    console.log(`   Record: ${homeForm.wins}W-${homeForm.draws}D-${homeForm.losses}L`);
    console.log(`   Goals: ${homeForm.goalsScored.toFixed(2)} scored, ${homeForm.goalsConceded.toFixed(2)} conceded`);

    console.log(`\n✈️ Away Team Form (last ${awayForm.matchCount} matches):`);
    console.log(`   Record: ${awayForm.wins}W-${awayForm.draws}D-${awayForm.losses}L`);
    console.log(`   Goals: ${awayForm.goalsScored.toFixed(2)} scored, ${awayForm.goalsConceded.toFixed(2)} conceded`);

    // Calculate expected goals
    const expectedGoals = this.calculateExpectedGoals(homeForm, awayForm, h2hData);
    console.log(`\n🎯 Expected Goals (Poisson λ):`);
    console.log(`   Home: ${expectedGoals.home.toFixed(2)}`);
    console.log(`   Away: ${expectedGoals.away.toFixed(2)}`);

    // Calculate probabilities for each market
    const prob1X2 = this.calculate1X2Probabilities(expectedGoals.home, expectedGoals.away);
    const probOU = this.calculateOverUnderProbabilities(expectedGoals.home, expectedGoals.away);
    const probBTTS = this.calculateBTTSProbabilities(expectedGoals.home, expectedGoals.away);

    console.log(`\n🎲 Calculated Probabilities:`);
    console.log(`   1X2: Home ${(prob1X2.home * 100).toFixed(1)}%, Draw ${(prob1X2.draw * 100).toFixed(1)}%, Away ${(prob1X2.away * 100).toFixed(1)}%`);
    console.log(`   O/U 2.5: Over ${(probOU.over * 100).toFixed(1)}%, Under ${(probOU.under * 100).toFixed(1)}%`);
    console.log(`   BTTS: Yes ${(probBTTS.yes * 100).toFixed(1)}%, No ${(probBTTS.no * 100).toFixed(1)}%`);

    // Calculate match statistics predictions (pass historyData for historical context)
    const statsPredictions = this.calculateMatchStatsPredictions(homeForm, awayForm, expectedGoals, historyData);

    console.log('📊 ==========================================\n');

    return {
      '1X2': {
        probabilities: prob1X2,
        fair_odds: {
          home: 1 / prob1X2.home,
          draw: 1 / prob1X2.draw,
          away: 1 / prob1X2.away
        },
        explanation: `Calculated from ${h2hData.matchCount} H2H matches, ${homeForm.matchCount} home team matches, ${awayForm.matchCount} away team matches. Expected goals: ${expectedGoals.home.toFixed(2)} - ${expectedGoals.away.toFixed(2)}.`,
        data_quality: {
          h2h_matches: h2hData.matchCount,
          home_form_matches: homeForm.matchCount,
          away_form_matches: awayForm.matchCount,
          reliability: this.calculateReliability(h2hData.matchCount, homeForm.matchCount, awayForm.matchCount)
        }
      },
      'O/U 2.5': {
        probabilities: probOU,
        fair_odds: {
          over: 1 / probOU.over,
          under: 1 / probOU.under
        },
        explanation: `Based on expected total goals of ${(expectedGoals.home + expectedGoals.away).toFixed(2)} from statistical analysis.`,
        expected_total_goals: expectedGoals.home + expectedGoals.away
      },
      'BTTS': {
        probabilities: probBTTS,
        fair_odds: {
          yes: 1 / probBTTS.yes,
          no: 1 / probBTTS.no
        },
        explanation: `Based on team scoring rates. Home averages ${homeForm.goalsScored.toFixed(2)} goals, away averages ${awayForm.goalsScored.toFixed(2)} goals.`,
        team_scoring: {
          home_avg: homeForm.goalsScored,
          away_avg: awayForm.goalsScored
        }
      },
      metadata: {
        model: 'Statistical Poisson',
        home_expected_goals: expectedGoals.home,
        away_expected_goals: expectedGoals.away,
        h2h_summary: h2hData,
        home_form: homeForm,
        away_form: awayForm
      },
      stats_predictions: statsPredictions
    };
  }

  /**
   * Calculate reliability score based on available data
   */
  calculateReliability(h2hCount, homeFormCount, awayFormCount) {
    let score = 0;

    // H2H contribution (max 30 points)
    score += Math.min(h2hCount * 5, 30);

    // Form data contribution (max 70 points)
    score += Math.min(homeFormCount * 3.5, 35);
    score += Math.min(awayFormCount * 3.5, 35);

    return Math.min(score, 100);
  }

  /**
   * Analyze historical match statistics from past matches
   */
  analyzeHistoricalStats(matches) {
    // Note: BetsAPI doesn't provide detailed stats for all matches
    // This is a placeholder for when stats become available
    // For now, we'll return null and rely on league averages
    return {
      corners: { min: null, max: null, avg: null, data: [] },
      shots: { min: null, max: null, avg: null, data: [] },
      cards: { min: null, max: null, avg: null, data: [] }
    };
  }

  /**
   * Calculate match statistics predictions (corners, shots, cards, etc.)
   * These predictions are based on league averages and team form when available
   */
  calculateMatchStatsPredictions(homeForm, awayForm, expectedGoals, historyData = null) {
    console.log('\n📊 ===== CALCULATING MATCH STATISTICS PREDICTIONS =====');

    // League average multipliers (based on typical football statistics)
    const CORNERS_PER_GOAL = 4.5; // Average corners per goal scored
    const SHOTS_PER_GOAL = 7; // Average shots per goal
    const SHOTS_ON_TARGET_RATIO = 0.35; // 35% of shots on target
    const OFFSIDES_PER_GOAL = 2; // Average offsides per goal attempt
    const FOULS_BASE = 12; // Base fouls per team per match
    const CARDS_RATIO = 0.25; // 25% of fouls result in cards

    // Calculate team attacking intent (more goals = more attacking stats)
    const homeAttackingIntent = expectedGoals.home;
    const awayAttackingIntent = expectedGoals.away;
    const totalAttackingIntent = homeAttackingIntent + awayAttackingIntent;

    // Corners prediction
    const homeCorners = Math.round(homeAttackingIntent * CORNERS_PER_GOAL);
    const awayCorners = Math.round(awayAttackingIntent * CORNERS_PER_GOAL);
    const totalCorners = homeCorners + awayCorners;

    // Shots prediction
    const homeShots = Math.round(homeAttackingIntent * SHOTS_PER_GOAL);
    const awayShots = Math.round(awayAttackingIntent * SHOTS_PER_GOAL);
    const totalShots = homeShots + awayShots;

    // Shots on target
    const homeShotsOnTarget = Math.round(homeShots * SHOTS_ON_TARGET_RATIO);
    const awayShotsOnTarget = Math.round(awayShots * SHOTS_ON_TARGET_RATIO);

    // Offsides
    const homeOffsides = Math.round(homeAttackingIntent * OFFSIDES_PER_GOAL);
    const awayOffsides = Math.round(awayAttackingIntent * OFFSIDES_PER_GOAL);

    // Fouls (higher in competitive matches)
    const competitiveFactor = 1 + (Math.abs(homeAttackingIntent - awayAttackingIntent) * 0.2);
    const homeFouls = Math.round(FOULS_BASE * competitiveFactor);
    const awayFouls = Math.round(FOULS_BASE * competitiveFactor);

    // Cards
    const homeCards = Math.round(homeFouls * CARDS_RATIO);
    const awayCards = Math.round(awayFouls * CARDS_RATIO);

    console.log(`\n🎯 Match Statistics Predictions:`);
    console.log(`   Total Corners: ${totalCorners} (Home: ${homeCorners}, Away: ${awayCorners})`);
    console.log(`   Total Shots: ${totalShots} (Home: ${homeShots}, Away: ${awayShots})`);
    console.log(`   Shots on Target: Home ${homeShotsOnTarget}, Away ${awayShotsOnTarget}`);
    console.log(`   Offsides: Home ${homeOffsides}, Away ${awayOffsides}`);
    console.log(`   Fouls: Home ${homeFouls}, Away ${awayFouls}`);
    console.log(`   Cards: Home ${homeCards}, Away ${awayCards}`);

    // Analyze historical stats if available
    let historicalStats = null;
    if (historyData && historyData.results) {
      const allMatches = [
        ...(historyData.results.h2h || []),
        ...(historyData.results.home || []),
        ...(historyData.results.away || [])
      ];
      historicalStats = this.analyzeHistoricalStats(allMatches);
    }

    // Calculate estimated corners from recent matches
    const calculateEstimatedCorners = (matches) => {
      if (!matches || matches.length === 0) return null;

      const cornerEstimates = matches
        .filter(m => m.ss) // Only matches with scores
        .slice(0, 10) // Last 10 matches
        .map(m => {
          const [home, away] = m.ss.split('-').map(Number);
          return (home + away) * 4.5; // Estimate corners from total goals
        });

      if (cornerEstimates.length === 0) return null;

      return {
        min: Math.round(Math.min(...cornerEstimates)),
        max: Math.round(Math.max(...cornerEstimates)),
        avg: Math.round(cornerEstimates.reduce((a, b) => a + b, 0) / cornerEstimates.length),
        matches: cornerEstimates.length
      };
    };

    const recentCornerData = historyData?.results ?
      calculateEstimatedCorners([
        ...(historyData.results.home || []).slice(0, 5),
        ...(historyData.results.away || []).slice(0, 5),
        ...(historyData.results.h2h || []).slice(0, 5)
      ]) : null;

    // Generate predictions with confidence levels
    const predictions = {
      corners: {
        total: {
          prediction: totalCorners,
          range: { min: Math.max(totalCorners - 3, 0), max: totalCorners + 3 },
          confidence: this.calculateConfidence(totalCorners, 'corners'),
          markets: this.generateCornerMarkets(totalCorners),
          historical: recentCornerData ? {
            note: 'Historical corner estimates from recent matches:',
            recent_matches: `In last ${recentCornerData.matches} matches: Min ${recentCornerData.min} corners, Max ${recentCornerData.max} corners, Avg ${recentCornerData.avg} corners`,
            h2h_note: `Home team averages ${(homeForm.goalsScored * 4.5).toFixed(1)} corners, Away team averages ${(awayForm.goalsScored * 4.5).toFixed(1)} corners`
          } : {
            note: 'Corner estimates based on attacking patterns:',
            recent_matches: `Home team averages ${(homeForm.goalsScored * 4.5).toFixed(1)} corners per match, away team averages ${(awayForm.goalsScored * 4.5).toFixed(1)} corners per match.`,
            h2h_note: 'Based on goal expectations'
          }
        },
        home: homeCorners,
        away: awayCorners
      },
      shots: {
        total: {
          prediction: totalShots,
          range: { min: Math.max(totalShots - 5, 0), max: totalShots + 5 },
          confidence: this.calculateConfidence(totalShots, 'shots')
        },
        home: homeShots,
        away: awayShots
      },
      shots_on_target: {
        total: {
          prediction: homeShotsOnTarget + awayShotsOnTarget,
          range: { min: Math.max((homeShotsOnTarget + awayShotsOnTarget) - 3, 0), max: (homeShotsOnTarget + awayShotsOnTarget) + 3 },
          confidence: this.calculateConfidence(homeShotsOnTarget + awayShotsOnTarget, 'shots_on_target')
        },
        home: homeShotsOnTarget,
        away: awayShotsOnTarget
      },
      offsides: {
        total: homeOffsides + awayOffsides,
        home: homeOffsides,
        away: awayOffsides,
        confidence: this.calculateConfidence(homeOffsides + awayOffsides, 'offsides')
      },
      fouls: {
        total: homeFouls + awayFouls,
        home: homeFouls,
        away: awayFouls,
        confidence: 70 // Fouls are moderately predictable
      },
      cards: {
        total: homeCards + awayCards,
        home: homeCards,
        away: awayCards,
        confidence: 60 // Cards have lower predictability
      }
    };

    console.log('📊 ===================================================\n');

    return predictions;
  }

  /**
   * Calculate Poisson cumulative probability for Over/Under
   */
  calculatePoissonOverUnder(lambda, line) {
    // Calculate P(X > line) using cumulative distribution
    let underProb = 0;

    // Sum P(X = k) for k from 0 to floor(line)
    for (let k = 0; k <= Math.floor(line); k++) {
      underProb += this.poissonProbability(lambda, k);
    }

    const overProb = 1 - underProb;

    return { overProb, underProb };
  }

  /**
   * Generate corner betting markets using Poisson distribution
   */
  generateCornerMarkets(totalCorners) {
    const markets = [];

    // Over/Under markets with proper Poisson probabilities
    const cornerLines = [8.5, 9.5, 10.5, 11.5, 12.5];

    cornerLines.forEach(line => {
      const { overProb, underProb } = this.calculatePoissonOverUnder(totalCorners, line);

      // Only show markets where we have >60% confidence in one direction
      if (overProb >= 0.6 || underProb >= 0.6) {
        const prediction = overProb > underProb ? 'Over' : 'Under';
        const probability = Math.max(overProb, underProb);

        markets.push({
          market: `Corners O/U ${line}`,
          prediction: prediction,
          probability: probability,
          reasoning: `Based on ${totalCorners} predicted corners. ${prediction} has ${(probability * 100).toFixed(0)}% probability.`
        });
      }
    });

    return markets;
  }

  /**
   * Calculate confidence level for a prediction
   */
  calculateConfidence(value, type) {
    // Higher variance stats have lower confidence
    const confidenceMap = {
      corners: 75, // Corners are fairly predictable
      shots: 70,
      shots_on_target: 68,
      offsides: 60,
      fouls: 65,
      cards: 55
    };

    return confidenceMap[type] || 60;
  }
}

export default new StatisticalModelService();
