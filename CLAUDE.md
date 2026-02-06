# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FindaFourth is a mobile-first Progressive Web App (PWA) for platform tennis players to find additional players for matches. Players can create game requests specifying date, time, club, skill level (PTI rating), and fill mode. The app supports Crews (player groups) and Favorites for targeted requests.

## Tech Stack

- **Frontend**: React 19 with CRACO, React Router, Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI (single-file: `backend/server.py`) with Pydantic models
- **Database**: MongoDB (via Motor async driver)
- **Auth**: Custom JWT authentication (email/password)
- **Hosting**: DigitalOcean Droplet (backend + MongoDB), Cloudflare Pages (frontend)

## Development Commands

### Docker (Recommended)
```bash
docker-compose up --build       # Start all services (MongoDB, backend, frontend)
docker-compose down             # Stop all services
docker-compose down -v          # Stop and remove volumes (wipes database)
docker-compose logs -f backend  # Tail backend logs
```

Services: Frontend http://localhost:3000, Backend http://localhost:8000, MongoDB localhost:27017

### Frontend (from `/frontend` directory)
```bash
yarn install                    # Install dependencies
yarn start                      # Dev server (uses craco)
yarn build                      # Production build (uses craco)
yarn test                       # Jest tests (watch mode)
yarn test:ci                    # Jest with coverage, no watch
yarn test:e2e                   # Playwright E2E tests
yarn test:e2e:headed            # E2E with visible browser
```

### Backend (from `/backend` directory)
```bash
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Production Access
```bash
doctl compute droplet list                                    # Find droplet IP
ssh -i ~/.ssh/id_ed25519_do root@<IP> "docker exec findafourth-mongo mongosh --quiet findafourth --eval '<query>'"
```

## Architecture

### Backend (`backend/server.py`)
Single-file FastAPI application (~3300 lines) containing all Pydantic models, JWT auth, API routes, notification logic, and PTI scraping.

API route groups: `/api/auth/*`, `/api/players/*`, `/api/crews/*`, `/api/requests/*`, `/api/favorites/*`, `/api/availability/*`, `/api/pti/*`, `/api/clubs/*`, `/api/admin/*`

### Frontend Structure
- `src/contexts/AuthContext.js` - Auth state management with localStorage persistence
- `src/lib/api.js` - Axios-based API client with auth interceptors. Exports: `authAPI`, `playerAPI`, `requestAPI`, `crewAPI`, `favoriteAPI`, `availabilityAPI`, `clubAPI`, `ptiAPI`, `inviteAPI`, `tenniscoresAPI`. (`utilityAPI` is deprecated, use `clubAPI`)
- `src/pages/` - Route components
- `src/components/` - Shared components including shadcn/ui in `components/ui/`
- `src/App.js` - Route definitions with ProtectedRoute/PublicRoute wrappers
- Path alias: `@/` resolves to `src/` (configured in `craco.config.js`)

### Database Collections
- `players` - User accounts with profile, notification preferences, club affiliations
- `requests` - Game requests with audience targeting
- `crews` / `crew_members` - Player groups and membership
- `favorites` - Player favorite relationships
- `availability_posts` - Player availability announcements
- `responses` - Game request responses
- `pti_roster` - Deduplicated PTI roster (canonical club names in `clubs` array field)
- `pti_roster_raw` - Raw scraped roster data
- `pti_history` - Historical PTI snapshots for trend tracking
- `clubs` - Club metadata from GBPTA scraping
- `invites` - Player invite records

## Club Name Normalization

User-entered club names are normalized against canonical PTI roster names at save time.

- `normalize_club_name()` (~line 60) - Extracts base club name from GBPTA team names (e.g., "Cape Ann Cage Fighters" → "Cape Ann", "TCC" → "The Country Club")
- `normalize_user_club_input()` (~line 106) - Async function that normalizes free-text user input against `pti_roster.distinct("clubs")`. Tries exact match, then `normalize_club_name()`, then strips common suffixes ("Platform Tennis Club", "Paddle Club", "PTC", etc.), then case-insensitive match. Returns original input for non-GBPTA clubs.
- Applied in `complete_profile` and `update_player` endpoints
- `POST /api/admin/normalize-clubs` - One-time migration endpoint for existing data

### Club Combobox Pattern
Club selection uses Popover + Command (shadcn/ui) with `shouldFilter={true}` and an "Other (enter manually)" option. See `CreateAvailability.js` for the canonical pattern. Also used in `CompleteProfile.js` and `Profile.js`.

## PTI Scraping System

Automated weekly sync from GBPTA (Greater Boston PTA) standings:
- Runs every Tuesday at 6:00 AM EST via APScheduler
- Pipeline: scrape clubs → scrape rosters → deduplicate → record history → sync to players
- Admin endpoints under `/api/admin/gbpta/*` for manual triggering of individual steps

## Deployment

Push to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`):
- **Backend**: SSH to DigitalOcean droplet → `git pull` → `docker compose -f docker-compose.prod.yml up -d --build`
- **Frontend**: Build with `yarn build` → deploy to Cloudflare Pages via wrangler

## Notification System

Pingram.io (formerly NotificationAPI) for email, SMS, and web push notifications. Templates configured in the Pingram.io dashboard: `new_game_request`, `player_interested`, `player_confirmed`, `you_confirmed`, `game_cancelled`, `added_to_crew`, `player_invite`.

## Testing

- **Unit tests**: Jest via `yarn test` or `yarn test:ci`. Tests in `src/__tests__/`.
- **E2E tests**: Playwright. Tests in `frontend/e2e/`. Config shards across chromium desktop and iPhone 13.
- **CI**: `.github/workflows/test.yml` runs on push/PR. Includes an intelligent test agent (`scripts/intelligent_test_agent.py`) that selects tests based on git diff.

## Known Issues & Patterns

### MongoDB ObjectId Serialization
Always remove `_id` before returning documents. Use `doc.pop('_id', None)` after insert, or projection `{"_id": 0}` in queries.

### Global CSS Styling
The global `input` selector in `index.css` uses a specific selector to avoid conflicts with checkboxes/toggles. Be mindful when adding new form controls.

### Custom Components
`CreateRequest.js` contains custom calendar and time picker implementations built directly in the page file, plus modified shadcn slider/switch/checkbox components.
