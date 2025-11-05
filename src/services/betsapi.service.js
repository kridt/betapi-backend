import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const cache = new NodeCache({
  stdTTL: 300, // Default 5 minutes
  checkperiod: 60
});

class BetsAPIService {
  constructor() {
    this.baseURL = process.env.BETSAPI_BASE_URL || 'https://api.betsapi.com';
    this.apiKey = process.env.BETSAPI_KEY;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });
  }

  /**
   * Make a request to BetsAPI with caching
   */
  async makeRequest(endpoint, params = {}, cacheTTL = 300) {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;

    console.log('\n════════════════════════════════════════');
    console.log(`🔍 Making request to: ${endpoint}`);
    console.log(`📦 Parameters:`, JSON.stringify(params, null, 2));
    console.log(`🔑 API Key present:`, !!this.apiKey);
    console.log(`🔑 API Key (first 10 chars):`, this.apiKey?.substring(0, 10));

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit: ${endpoint}`);
      console.log(`📊 Cached data keys:`, Object.keys(cached));
      console.log('════════════════════════════════════════\n');
      return cached;
    }

    try {
      const fullParams = {
        token: this.apiKey,
        ...params
      };

      console.log(`🌐 Full URL: ${this.baseURL}${endpoint}`);
      console.log(`🌐 Full params:`, JSON.stringify(fullParams, null, 2));

      const response = await this.client.get(endpoint, {
        params: fullParams
      });

      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response data keys:`, Object.keys(response.data || {}));
      console.log(`📡 Response data:`, JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success !== false) {
        cache.set(cacheKey, response.data, cacheTTL);
        console.log(`✅ API call successful: ${endpoint}`);
        console.log('════════════════════════════════════════\n');
        return response.data;
      } else {
        console.log(`❌ API returned success=false`);
        console.log(`❌ Error message:`, response.data?.error);
        console.log('════════════════════════════════════════\n');
        throw new Error(response.data?.error || 'API request failed');
      }
    } catch (error) {
      console.error(`❌ BetsAPI Error (${endpoint}):`, error.message);
      console.error(`❌ Error stack:`, error.stack);
      if (error.response) {
        console.error(`❌ Response status:`, error.response.status);
        console.error(`❌ Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      console.log('════════════════════════════════════════\n');
      throw error;
    }
  }

  /**
   * Get top leagues for football/soccer (sport_id = 1)
   * Returns a hardcoded list of top 20 leagues to avoid API pagination issues
   */
  async getTopLeagues() {
    console.log('\n🏆 ========== GET TOP LEAGUES ==========');

    // Hardcoded top 20 leagues (BetsAPI has 2800+ leagues across 28+ pages)
    // These are the most popular leagues with reliable odds coverage
    const top20Leagues = [
      { league_id: '94', name: 'England Premier League', country: 'England', cc: 'gb-eng' },
      { league_id: '38223', name: 'Spain La Liga', country: 'Spain', cc: 'es' },
      { league_id: '123', name: 'Germany Bundesliga I', country: 'Germany', cc: 'de' },
      { league_id: '199', name: 'Italy Serie A', country: 'Italy', cc: 'it' },
      { league_id: '99', name: 'France Ligue 1', country: 'France', cc: 'fr' },
      { league_id: '1040', name: 'UEFA Champions League', country: 'International', cc: 'int' },
      { league_id: '1067', name: 'UEFA Europa League', country: 'International', cc: 'int' },
      { league_id: '880', name: 'England Championship', country: 'England', cc: 'gb-eng' },
      { league_id: '172', name: 'Portugal Primeira Liga', country: 'Portugal', cc: 'pt' },
      { league_id: '24792', name: 'Holland Eredivisie', country: 'Netherlands', cc: 'nl' },
      { league_id: '39111', name: 'Turkey Super Lig', country: 'Turkey', cc: 'tr' },
      { league_id: '901', name: 'Scotland Premiership', country: 'Scotland', cc: 'gb-sct' },
      { league_id: '34541', name: 'UEFA Conference League', country: 'International', cc: 'int' },
      { league_id: '155', name: 'Brazil Serie A', country: 'Brazil', cc: 'br' },
      { league_id: '166', name: 'Austria Bundesliga', country: 'Austria', cc: 'at' },
      { league_id: '26549', name: 'Argentina Liga Profesional', country: 'Argentina', cc: 'ar' },
      { league_id: '3514', name: 'Copa Libertadores', country: 'International', cc: 'int' },
      { league_id: '125', name: 'Poland Ekstraklasa', country: 'Poland', cc: 'pl' },
      { league_id: '126', name: 'Norway Eliteserien', country: 'Norway', cc: 'no' },
      { league_id: '153', name: 'Russia Premier League', country: 'Russia', cc: 'ru' }
    ];

    console.log(`✅ Returning ${top20Leagues.length} hardcoded top leagues`);

    const leagues = top20Leagues.map(league => ({
      league_id: league.league_id,
      name: league.name,
      country: league.country,
      logo: `https://assets.betsapi.com/v2/images/flags/${league.cc}.svg`,
      season_id: null
    }));

    console.log(`\n📋 TOP 20 LEAGUES:`);
    console.log(`════════════════════════════════════════════════════════════`);
    leagues.forEach((league, i) => {
      const tier = i < 7 ? '⭐⭐⭐' : i < 13 ? '⭐⭐' : '⭐';
      console.log(`${(i + 1).toString().padStart(2)}. ${league.name.padEnd(35)} ${tier} [${league.country}]`);
    });
    console.log(`════════════════════════════════════════════════════════════\n`);

    console.log('🏆 ====================================\n');
    return leagues;
  }

  /**
   * Get upcoming matches for a league
   */
  async getUpcomingMatches(leagueId, limit = 10) {
    console.log('\n⚽ ========== GET UPCOMING MATCHES ==========');
    console.log(`🔍 League ID: ${leagueId}`);
    console.log(`🔍 Limit: ${limit}`);

    const response = await this.makeRequest('/v3/events/upcoming', {
      sport_id: 1,
      league_id: leagueId
    }, 300); // Cache for 5 minutes

    console.log(`📊 Response has results:`, !!response.results);
    console.log(`📊 Total results count:`, response.results?.length || 0);

    if (!response.results || response.results.length === 0) {
      console.log('⚠️ No results in response, returning empty array');
      console.log('⚽ ==========================================\n');
      return [];
    }

    // Log first match to see structure
    if (response.results[0]) {
      console.log(`📋 Sample match (first one):`, JSON.stringify(response.results[0], null, 2));
    }

    const matches = response.results
      .slice(0, limit)
      .map(match => ({
        match_id: match.id,
        home_team: match.home?.name || 'Home Team',
        away_team: match.away?.name || 'Away Team',
        start_time: match.time,
        start_time_formatted: new Date(match.time * 1000).toISOString(),
        status: match.time_status === '0' ? 'scheduled' : (match.time_status === '1' ? 'live' : 'finished'),
        home_logo: match.home?.image_id
          ? `https://assets.betsapi.com/v2/images/teams/${match.home.image_id}.png`
          : null,
        away_logo: match.away?.image_id
          ? `https://assets.betsapi.com/v2/images/teams/${match.away.image_id}.png`
          : null,
        league_name: match.league?.name || ''
      }));

    console.log(`📤 Returning ${matches.length} matches`);
    console.log('⚽ ==========================================\n');

    return matches;
  }

  /**
   * Get match summary
   */
  async getMatchSummary(matchId) {
    const response = await this.makeRequest('/v1/event/view', {
      event_id: matchId
    }, 180);

    if (!response.results || response.results.length === 0) {
      throw new Error('Match not found');
    }

    const match = response.results[0];
    return {
      match_id: match.id,
      home_team: match.home?.name || 'Home Team',
      away_team: match.away?.name || 'Away Team',
      start_time: match.time,
      status: match.timer?.tm ? 'live' : (match.time_status === '3' ? 'finished' : 'scheduled'),
      score: match.ss || '0-0',
      home_logo: match.home?.image_id
        ? `https://assets.betsapi.com/v2/images/teams/${match.home.image_id}.png`
        : null,
      away_logo: match.away?.image_id
        ? `https://assets.betsapi.com/v2/images/teams/${match.away.image_id}.png`
        : null,
      league: {
        league_id: match.league?.id,
        name: match.league?.name
      }
    };
  }

  /**
   * Get match details with lineups and stats
   */
  async getMatchDetails(matchId) {
    const response = await this.makeRequest('/v2/event/view', {
      event_id: matchId
    }, 300);

    if (!response.results || response.results.length === 0) {
      return {
        lineups: null,
        stats: null,
        form: { home: [], away: [] }
      };
    }

    const match = response.results[0];

    return {
      lineups: match.lineups || null,
      stats: match.stats || null,
      form: {
        home: match.home?.last_form || [],
        away: match.away?.last_form || []
      }
    };
  }

  /**
   * Get odds for a match from multiple bookmakers
   */
  async getMatchOdds(matchId) {
    console.log('\n💰 ========== GET MATCH ODDS (MULTI-BOOKMAKER) ==========');
    console.log(`🔍 Match ID: ${matchId}`);

    const response = await this.makeRequest('/v2/event/odds/summary', {
      event_id: matchId
    }, 60); // Cache for 1 minute (live odds)

    console.log(`📊 Response has results:`, !!response.results);

    if (!response.results) {
      console.log('⚠️ No results in response');
      console.log('💰 ========================================================\n');
      return { bookmakers: [] };
    }

    const bookmakers = [];
    const bookmakerNames = Object.keys(response.results);

    console.log(`📊 Found ${bookmakerNames.length} bookmakers:`, bookmakerNames.join(', '));

    // Parse odds from each bookmaker
    bookmakerNames.forEach(bookmakerName => {
      const bookmakerData = response.results[bookmakerName];

      if (!bookmakerData.odds || !bookmakerData.odds.end) return;

      const odds = bookmakerData.odds.end;
      const bookmaker = {
        name: bookmakerName,
        markets: {}
      };

      // 1X2 Market (Match Result)
      if (odds['1_1']) {
        bookmaker.markets['1X2'] = {
          market: '1X2',
          market_name: 'Match Result',
          odds: {
            home: parseFloat(odds['1_1'].home_od || 0),
            draw: parseFloat(odds['1_1'].draw_od || 0),
            away: parseFloat(odds['1_1'].away_od || 0)
          },
          timestamp: odds['1_1'].add_time,
          updated_at: new Date(parseInt(odds['1_1'].add_time) * 1000).toISOString()
        };
      }

      // Over/Under 2.5 Goals
      if (odds['1_3']) {
        // Parse handicap - it might be "2.5" or "2.5,3.0"
        const handicap = odds['1_3'].handicap?.split(',')[0] || odds['1_3'].handicap;

        bookmaker.markets['O/U 2.5'] = {
          market: 'O/U 2.5',
          market_name: 'Over/Under 2.5 Goals',
          handicap: handicap,
          odds: {
            over: parseFloat(odds['1_3'].over_od || 0),
            under: parseFloat(odds['1_3'].under_od || 0)
          },
          timestamp: odds['1_3'].add_time,
          updated_at: new Date(parseInt(odds['1_3'].add_time) * 1000).toISOString()
        };
      }

      // Both Teams to Score (BTTS)
      if (odds['1_8']) {
        bookmaker.markets['BTTS'] = {
          market: 'BTTS',
          market_name: 'Both Teams To Score',
          odds: {
            yes: parseFloat(odds['1_8'].home_od || 0),
            no: parseFloat(odds['1_8'].draw_od || 0)
          },
          timestamp: odds['1_8'].add_time,
          updated_at: new Date(parseInt(odds['1_8'].add_time) * 1000).toISOString()
        };
      }

      // Only add bookmaker if they have at least one market
      if (Object.keys(bookmaker.markets).length > 0) {
        bookmakers.push(bookmaker);
      }
    });

    console.log(`📤 Returning ${bookmakers.length} bookmakers with odds`);
    console.log('💰 ========================================================\n');

    return { bookmakers };
  }

  /**
   * Get comprehensive match statistics
   * Includes: live stats, team form, historical performance
   */
  async getMatchStatistics(matchId) {
    console.log('\n📊 ========== GET MATCH STATISTICS ==========');
    console.log(`🔍 Match ID: ${matchId}`);

    try {
      const response = await this.makeRequest('/v2/event/view', {
        event_id: matchId
      }, 300);

      if (!response.results || response.results.length === 0) {
        return null;
      }

      const match = response.results[0];

      const statistics = {
        match_id: matchId,
        status: match.time_status,
        score: match.ss || '0-0',

        // Live match statistics (only available during/after match)
        match_stats: match.stats ? {
          shots: {
            home: parseInt(match.stats.goalattempts?.[0] || 0),
            away: parseInt(match.stats.goalattempts?.[1] || 0)
          },
          shots_on_target: {
            home: parseInt(match.stats.on_target?.[0] || 0),
            away: parseInt(match.stats.on_target?.[1] || 0)
          },
          shots_off_target: {
            home: parseInt(match.stats.off_target?.[0] || 0),
            away: parseInt(match.stats.off_target?.[1] || 0)
          },
          corners: {
            home: parseInt(match.stats.corners?.[0] || 0),
            away: parseInt(match.stats.corners?.[1] || 0)
          },
          possession: {
            home: parseInt(match.stats.possession_rt?.[0] || 0),
            away: parseInt(match.stats.possession_rt?.[1] || 0)
          },
          attacks: {
            home: parseInt(match.stats.attacks?.[0] || 0),
            away: parseInt(match.stats.attacks?.[1] || 0)
          },
          dangerous_attacks: {
            home: parseInt(match.stats.dangerous_attacks?.[0] || 0),
            away: parseInt(match.stats.dangerous_attacks?.[1] || 0)
          },
          fouls: {
            home: parseInt(match.stats.fouls?.[0] || 0),
            away: parseInt(match.stats.fouls?.[1] || 0)
          },
          yellow_cards: {
            home: parseInt(match.stats.yellowcards?.[0] || 0),
            away: parseInt(match.stats.yellowcards?.[1] || 0)
          },
          red_cards: {
            home: parseInt(match.stats.redcards?.[0] || 0),
            away: parseInt(match.stats.redcards?.[1] || 0)
          },
          offsides: {
            home: parseInt(match.stats.offsides?.[0] || 0),
            away: parseInt(match.stats.offsides?.[1] || 0)
          },
          saves: {
            home: parseInt(match.stats.saves?.[0] || 0),
            away: parseInt(match.stats.saves?.[1] || 0)
          },
          xg: {
            home: parseFloat(match.stats.xg?.[0] || 0),
            away: parseFloat(match.stats.xg?.[1] || 0)
          }
        } : null,

        // Match extra info
        extra: match.extra ? {
          stadium: match.extra.stadium_data?.name || null,
          referee: match.extra.referee?.name || null,
          round: match.extra.round || null
        } : null
      };

      console.log(`📤 Statistics compiled`);
      console.log('📊 ==========================================\n');

      return statistics;

    } catch (error) {
      console.error('❌ Error fetching statistics:', error.message);
      return null;
    }
  }

  /**
   * Get head-to-head data
   */
  async getH2H(matchId) {
    try {
      const response = await this.makeRequest('/v1/event/view', {
        event_id: matchId
      }, 600);

      // H2H data might be in a different endpoint or require parsing
      // For now, return placeholder structure
      return {
        matches: [],
        stats: {
          home_wins: 0,
          draws: 0,
          away_wins: 0
        }
      };
    } catch (error) {
      console.error('H2H fetch error:', error.message);
      return {
        matches: [],
        stats: { home_wins: 0, draws: 0, away_wins: 0 }
      };
    }
  }

  /**
   * Clear cache for specific key or all
   */
  clearCache(key = null) {
    if (key) {
      cache.del(key);
    } else {
      cache.flushAll();
    }
  }
}

export default new BetsAPIService();
