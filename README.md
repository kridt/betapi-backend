# EV Betting Backend API

Node.js + Express backend for the EV Betting Dashboard, integrating with BetsAPI.

## Features

- 🔌 BetsAPI integration with smart caching
- 📊 EV (Expected Value) calculation engine
- 🚀 Fast response times with NodeCache
- 🔒 Secure with Helmet and CORS
- ⚡ Rate limiting and request optimization

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your BetsAPI key:

```bash
cp .env.example .env
```

Edit `.env`:
```
BETSAPI_KEY=your_actual_api_key_here
```

Get your API key from: https://betsapi.com

### 3. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Leagues
- `GET /api/leagues/top20` - Top 20 football leagues

### Matches
- `GET /api/matches/upcoming?league_id=8&limit=10` - Upcoming matches for a league

### Match Details
- `GET /api/match/:id/summary` - Match summary
- `GET /api/match/:id/details` - Full details with lineups and stats
- `GET /api/match/:id/odds` - All bookmaker odds
- `GET /api/match/:id/model` - Fair odds, probabilities, and EV calculations
- `GET /api/match/:id/h2h` - Head-to-head history

### System
- `GET /api/health` - API health check

## EV Calculation

The backend calculates Expected Value (EV%) using:

```
EV% = ((Bookmaker Odds × True Probability) - 1) × 100
```

**Process:**
1. Collect odds from all bookmakers
2. Calculate average odds per outcome
3. Remove bookmaker margin to get fair probabilities
4. Calculate EV for each bookmaker
5. Filter for opportunities with EV ≥ 4%

## Caching Strategy

- **Leagues**: 1 hour (rarely change)
- **Upcoming Matches**: 5 minutes (update regularly)
- **Match Odds**: 1 minute (live updates)
- **Match Details**: 5 minutes

## Configuration

Edit `.env` to customize:

```bash
# Cache durations (seconds)
CACHE_LEAGUES_TTL=3600
CACHE_MATCHES_TTL=300
CACHE_ODDS_TTL=60
CACHE_DETAILS_TTL=300

# Minimum EV threshold for opportunities
MIN_EV_THRESHOLD=4.0
```

## Production

```bash
npm start
```

## Deployment

### Deploy to Render

See detailed instructions in [DEPLOYMENT.md](../DEPLOYMENT.md) in the root directory.

**Quick steps:**
1. Push code to GitHub
2. Connect to Render
3. Add environment variables
4. Deploy!

Your backend will be live at: `https://your-app.onrender.com`

## Architecture

```
backend/
├── src/
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   │   ├── betsapi.service.js      # BetsAPI integration
│   │   └── ev-calculator.service.js # EV calculation
│   └── server.js        # Express app
└── package.json
```
