# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FindaFourth is a mobile-first Progressive Web App (PWA) for platform tennis players to find additional players for matches. Players can create game requests specifying date, time, club, skill level (PTI rating), and fill mode. The app supports Crews (player groups) and Favorites for targeted requests.

## Tech Stack

- **Frontend**: React 19 with CRACO, React Router, Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI with Pydantic models
- **Database**: MongoDB (via Motor async driver)
- **Auth**: Custom JWT authentication (email/password)

## Development Commands

### Docker (Recommended)
```bash
docker-compose up --build    # Start all services (MongoDB, backend, frontend)
docker-compose down          # Stop all services
docker-compose down -v       # Stop and remove volumes (wipes database)
docker-compose logs -f       # View logs from all services
docker-compose logs backend  # View logs from specific service
```

Services run at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- MongoDB: localhost:27017

### Manual Setup (without Docker)

#### Frontend (from `/frontend` directory)
```bash
yarn install        # Install dependencies
yarn start          # Run dev server
yarn build          # Production build
yarn test           # Run tests
```

#### Backend (from `/backend` directory)
```bash
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `JWT_SECRET` - Secret key for JWT tokens (change in production)
- `FIRECRAWL_API_KEY` - Optional, for PTI scraping feature

Docker-compose sets these automatically:
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name (default: findafourth)
- `REACT_APP_BACKEND_URL` - Backend API URL

## Architecture

### Backend (`backend/server.py`)
Single-file FastAPI application containing:
- Pydantic models for all entities (Player, Crew, GameRequest, etc.)
- JWT auth helpers and middleware
- All API routes under `/api` prefix
- Notification placeholder functions (push, email, SMS)

API route groups: `/api/auth/*`, `/api/players/*`, `/api/crews/*`, `/api/requests/*`, `/api/favorites/*`, `/api/availability/*`, `/api/pti/*`

### Frontend Structure
- `src/contexts/AuthContext.js` - Auth state management with localStorage persistence
- `src/lib/api.js` - Axios-based API client with auth interceptors
- `src/pages/` - Route components (Home, CreateRequest, Crews, etc.)
- `src/components/` - Shared components including shadcn/ui in `components/ui/`
- `src/App.js` - Route definitions with ProtectedRoute/PublicRoute wrappers

### Database Collections
- `players` - User accounts with profile and notification preferences
- `requests` - Game requests with audience targeting
- `crews` - Player groups
- `crew_members` - Crew membership join table
- `favorites` - Player favorite relationships
- `availability_posts` - Player availability announcements
- `responses` - Game request responses

## Known Issues & Patterns

### MongoDB ObjectId Serialization
When creating documents and returning them in API responses, always remove the `_id` field:
```python
await db.collection.insert_one(doc)
doc.pop('_id', None)  # Remove before returning
```
For queries, use projection: `{"_id": 0}`

### Global CSS Styling
The global `input` selector in `index.css` was modified to use a more specific selector to avoid conflicts with checkboxes and toggles. Be mindful when adding new form controls.

### Custom Components
`CreateRequest.js` contains custom calendar and time picker implementations built directly in the page file, plus modified shadcn slider/switch/checkbox components.

## Testing Protocol

This project uses a testing agent workflow. The `test_result.md` file tracks testing state and is used for communication between main and testing agents. Update this file before calling the testing agent.
