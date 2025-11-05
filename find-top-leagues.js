import fs from 'fs';

// Read the league.json file
const data = JSON.parse(fs.readFileSync('./league.json', 'utf8'));

// Define top league names - EXACT names from BetsAPI
const topLeagueKeywords = [
  // ═══════════════════════════════════════════════════════════
  // TIER 1: Elite European Leagues + Top Competitions
  // ═══════════════════════════════════════════════════════════
  { exact: 'england premier league', region: 'England', tier: 1 },
  { exact: 'spain la liga', region: 'Spain', tier: 1 },
  { exact: 'germany bundesliga i', region: 'Germany', tier: 1 },
  { exact: 'italy serie a', region: 'Italy', tier: 1 },
  { exact: 'france ligue 1', region: 'France', tier: 1 },
  { exact: 'uefa champions league', region: 'Europe', tier: 1 },
  { exact: 'uefa europa league', region: 'Europe', tier: 1 },

  // ═══════════════════════════════════════════════════════════
  // TIER 2: Major European Leagues
  // ═══════════════════════════════════════════════════════════
  { exact: 'holland eredivisie', region: 'Netherlands', tier: 2 },
  { exact: 'portugal primeira liga', region: 'Portugal', tier: 2 },
  { exact: 'scotland premiership', region: 'Scotland', tier: 2 },
  { exact: 'belgium pro league', region: 'Belgium', tier: 2 },
  { exact: 'türkiye super lig', region: 'Turkey', tier: 2 },
  { exact: 'england championship', region: 'England', tier: 2 },
  { exact: 'uefa conference league', region: 'Europe', tier: 2 },

  // ═══════════════════════════════════════════════════════════
  // TIER 3: Competitive European + Top South America
  // ═══════════════════════════════════════════════════════════
  { exact: 'greece super league', region: 'Greece', tier: 3 },
  { exact: 'russia premier league', region: 'Russia', tier: 3 },
  { exact: 'denmark superligaen', region: 'Denmark', tier: 3 },
  { exact: 'norway eliteserien', region: 'Norway', tier: 3 },
  { exact: 'sweden allsvenskan', region: 'Sweden', tier: 3 },
  { exact: 'austria bundesliga', region: 'Austria', tier: 3 },
  { exact: 'switzerland super league', region: 'Switzerland', tier: 3 },
  { exact: 'poland ekstraklasa', region: 'Poland', tier: 3 },
  { exact: 'czech liga', region: 'Czech Republic', tier: 3 },
  { exact: 'brazil serie a', region: 'Brazil', tier: 3 },
  { exact: 'argentina liga profesional', region: 'Argentina', tier: 3 },
  { exact: 'copa libertadores', region: 'South America', tier: 3 },

  // ═══════════════════════════════════════════════════════════
  // TIER 4: Second Divisions + Other Americas
  // ═══════════════════════════════════════════════════════════
  { exact: 'spain segunda', region: 'Spain', tier: 4 },
  { exact: 'germany bundesliga ii', region: 'Germany', tier: 4 },
  { exact: 'italy serie b', region: 'Italy', tier: 4 },
  { exact: 'france ligue 2', region: 'France', tier: 4 },
  { exact: 'usa mls', region: 'USA', tier: 4 },
  { exact: 'mexico liga mx', region: 'Mexico', tier: 4 },

  // ═══════════════════════════════════════════════════════════
  // TIER 5: Middle East, Asia, Others
  // ═══════════════════════════════════════════════════════════
  { exact: 'saudi pro league', region: 'Saudi Arabia', tier: 5 },
  { exact: 'japan j-league', region: 'Japan', tier: 5 },
  { exact: 'china super league', region: 'China', tier: 5 },
  { exact: 'south korea k-league', region: 'South Korea', tier: 5 },
];

// Find matching leagues
const matchedLeagues = [];

data.leagues.forEach(league => {
  const leagueName = league.name.toLowerCase();

  for (const topLeague of topLeagueKeywords) {
    let match = false;

    // Check for exact match
    if (topLeague.exact) {
      match = leagueName === topLeague.exact.toLowerCase();
    }
    // Check for contains match
    else if (topLeague.contains) {
      match = leagueName.includes(topLeague.contains.toLowerCase());

      // Apply excludes
      if (match && topLeague.excludes) {
        for (const exclude of topLeague.excludes) {
          if (leagueName.includes(exclude.toLowerCase())) {
            match = false;
            break;
          }
        }
      }
    }

    if (match && !matchedLeagues.find(l => l.id === league.id)) {
      matchedLeagues.push({
        ...league,
        region: topLeague.region,
        tier: topLeague.tier
      });
      break;
    }
  }
});

// Sort by tier
matchedLeagues.sort((a, b) => a.tier - b.tier);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              TOP 20 FOOTBALL LEAGUES FOUND                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

matchedLeagues.slice(0, 20).forEach((league, i) => {
  const stars = league.tier === 1 ? '⭐⭐⭐' : league.tier === 2 ? '⭐⭐' : '⭐';
  console.log(`${(i + 1).toString().padStart(2)}. ${league.name.padEnd(40)} ${stars} [${league.region}] ID: ${league.id}`);
});

console.log(`\n📊 Total matched: ${matchedLeagues.length} leagues`);
console.log(`📤 Returning top: ${Math.min(20, matchedLeagues.length)} leagues\n`);

// Write IDs to a file for easy use
const top20IDs = matchedLeagues.slice(0, 20).map(l => l.id);
console.log('League IDs:', JSON.stringify(top20IDs));
