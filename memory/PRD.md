# NeedaFourth - Product Requirements Document

## Overview
NeedaFourth is a mobile-first Progressive Web App (PWA) for platform tennis players to find additional players for their matches.

## Tech Stack
- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Authentication:** JWT-based custom auth

## Core Features

### Implemented (MVP Complete)
- [x] User registration and login (JWT auth)
- [x] Player profile management (name, home club, PTI rating, notification preferences)
- [x] Create game requests (date/time, club, spots needed, skill range)
- [x] Audience targeting (Regional, Club, Crews)
- [x] Crews management (create, join, manage members)
- [x] Favorites system
- [x] Home dashboard with "My Requests", "My Games", "Open Games" sections
- [x] Availability posts
- [x] PWA setup (manifest.json, installable)
- [x] **PTI Scraping System (NEW - Jan 2026)**
  - Import PTI data from JSON with deduplication
  - Live scraping from paddlescores.com via Firecrawl API
  - Auto-sync PTI values to registered players by name matching

### Placeholder/Mocked
- [ ] Push notifications (placeholder functions)
- [ ] Email notifications (placeholder functions)
- [ ] SMS notifications via Twilio (placeholder functions)
- [ ] Real-time updates (currently polling-based)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/complete-profile` - Complete profile setup

### Players
- `GET /api/players` - List players
- `GET /api/players/{id}` - Get player details
- `PUT /api/players/{id}` - Update player

### Game Requests
- `POST /api/requests` - Create request
- `GET /api/requests` - List requests (with filters)
- `GET /api/requests/{id}` - Get request details
- `PUT /api/requests/{id}` - Update request
- `DELETE /api/requests/{id}` - Cancel request
- `POST /api/requests/{id}/respond` - Respond to request

### Crews
- `POST /api/crews` - Create crew
- `GET /api/crews` - List user's crews
- `PUT /api/crews/{id}` - Update crew
- `DELETE /api/crews/{id}` - Delete crew
- `POST /api/crews/{id}/members` - Add member
- `DELETE /api/crews/{id}/members/{player_id}` - Remove member

### PTI Roster (Admin)
- `GET /api/admin/pti-roster` - Get all PTI entries
- `POST /api/admin/pti-roster/import` - Import PTI data from JSON
- `POST /api/admin/pti-roster/scrape` - Scrape PTI from paddlescores.com
- `POST /api/admin/pti-roster/sync-players` - Sync PTI to registered players
- `DELETE /api/admin/pti-roster` - Clear PTI roster

## Database Collections
- `players` - User accounts and profiles
- `requests` - Game requests
- `responses` - Player responses to requests
- `crews` - Player groups
- `crew_members` - Crew membership
- `favorites` - Player favorites
- `availability_posts` - Availability announcements
- `pti_roster` - Scraped PTI data from paddlescores.com

## Third-Party Integrations
- **Firecrawl API** - Web scraping for PTI data from paddlescores.com

## Environment Variables
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGINS` - Allowed CORS origins
- `FIRECRAWL_API_KEY` - Firecrawl API key for PTI scraping

## Upcoming Tasks (Priority Order)
1. **P1:** Real-time updates (WebSockets)
2. **P1:** Push notifications integration
3. **P1:** Email/SMS notifications (Twilio/SendGrid)
4. **P2:** Favorites management UI
5. **P2:** Service worker for offline support
6. **P2:** Request expiration cron job
7. **P3:** Detailed "My Games" view page

## Known Issues
- Minor frontend linting errors (unescaped entities)

## Changelog
- **Jan 9, 2026:** Implemented PTI scraping system with Firecrawl integration
  - Added `/api/admin/pti-roster/*` endpoints
  - Supports JSON import with deduplication (by name + PTI)
  - Live scraping from paddlescores.com team roster pages
  - Auto-sync PTI values to registered players by name matching
  - Successfully imported 89 unique CAPT players with PTI ratings
