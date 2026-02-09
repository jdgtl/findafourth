# Find4th

A mobile-first Progressive Web App for platform tennis players to find additional players for matches.

## What It Does

Platform tennis (paddle) requires exactly 4 players. Find4th lets you post a game request, notify the right players, and fill your match — all in seconds. No more group texts, email chains, or phone calls.

## Features

- **Game Requests** — Post a match with date, time, club, and skill range. Quick Fill auto-confirms the first responders, or hand-pick your lineup.
- **PTI Integration** — Platform Tennis Index ratings sync automatically from APTA league standings.
- **Crews & Favorites** — Organize your regular groups and bookmark players for quick access.
- **Multi-Channel Notifications** — Push, email, and SMS — each player picks their preference.
- **Club Directory** — Browse 27 GBPTA clubs with player rosters and verified details.
- **Partner Chemistry** — See your win/loss record with every partner, powered by Tenniscores match data.
- **Installable PWA** — Add to your home screen; no app store needed.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, shadcn/ui, CRACO
- **Backend**: FastAPI (Python), MongoDB
- **Hosting**: DigitalOcean (backend), Cloudflare Pages (frontend)

## Getting Started

### Docker (recommended)

```bash
docker-compose up --build
```

Frontend: http://localhost:3000 | Backend: http://localhost:8000

### Manual

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend && yarn install && yarn start
```

## Deployment

Push to `main` triggers CI/CD via GitHub Actions:
- Backend deploys to DigitalOcean via Docker
- Frontend builds and deploys to Cloudflare Pages
