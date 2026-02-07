from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import shutil
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
from bs4 import BeautifulSoup
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from notificationapi_python_server_sdk import notificationapi

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'findafourth')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'findafourth-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Firecrawl Configuration
FIRECRAWL_API_KEY = os.environ.get('FIRECRAWL_API_KEY', '')

# NotificationAPI (Pingram.io) Configuration
NOTIFICATIONAPI_CLIENT_ID = os.environ.get('NOTIFICATIONAPI_CLIENT_ID', '')
NOTIFICATIONAPI_CLIENT_SECRET = os.environ.get('NOTIFICATIONAPI_CLIENT_SECRET', '')

# Initialize NotificationAPI if credentials are provided
if NOTIFICATIONAPI_CLIENT_ID and NOTIFICATIONAPI_CLIENT_SECRET:
    notificationapi.init(NOTIFICATIONAPI_CLIENT_ID, NOTIFICATIONAPI_CLIENT_SECRET)
    logger.info("NotificationAPI initialized successfully")

# Scheduler for automated tasks
scheduler = AsyncIOScheduler()

import re

# Official GBPTA club directory — single source of truth for club names.
# Aliases include old short names, abbreviations, and scraped team-name prefixes.
CLUB_DIRECTORY = [
    {"name": "Belmont Hill Club", "aliases": ["Belmont Hill"]},
    {"name": "Blackrock Golf Club", "aliases": ["Blackrock", "Black Rock"]},
    {"name": "Brae Burn Country Club", "aliases": ["Brae Burn", "Braeburn"]},
    {"name": "Brookline Paddle", "aliases": ["Brookline"]},
    {"name": "Cape Ann Platform Tennis", "aliases": ["Cape Ann"]},
    {"name": "Cohasset Golf Club", "aliases": ["Cohasset"]},
    {"name": "Concord Country Club", "aliases": ["Concord"]},
    {"name": "Dedham Country & Polo Club", "aliases": ["Dedham", "Dedham Country and Polo Club"]},
    {"name": "Duxbury Yacht Club", "aliases": ["Duxbury"]},
    {"name": "Eastern Yacht Club", "aliases": ["Eastern", "Eastern Yacht"]},
    {"name": "Essex County Club", "aliases": ["Essex"]},
    {"name": "Heritage Racquet Club", "aliases": ["Heritage"]},
    {"name": "Kingsbury Club", "aliases": ["Kingsbury"]},
    {"name": "Longwood", "aliases": ["Longwood Cricket Club"]},
    {"name": "Myopia Hunt Club", "aliases": ["Myopia"]},
    {"name": "Nahant Platform Tennis Club", "aliases": ["Nahant", "Nahant PTC"]},
    {"name": "Nashawtuc Country Club", "aliases": ["Nashawtuc"]},
    {"name": "Needham Platform Tennis Club", "aliases": ["Needham", "Needham PTC"]},
    {"name": "North Andover Country Club", "aliases": ["North Andover"]},
    {"name": "Scituate Racquet Club", "aliases": ["Scituate", "South Shore"]},
    {"name": "The Country Club", "aliases": ["TCC"]},
    {"name": "The Platform Tennis Club", "aliases": ["Platform Tennis Club", "TPTC"]},
    {"name": "Wellesley Country Club", "aliases": ["Wellesley"]},
    {"name": "Weston Golf Club", "aliases": ["Weston"]},
    {"name": "Winchester Country Club", "aliases": ["Winchester"]},
    {"name": "Woodland Golf Club", "aliases": ["Woodland"]},
    {"name": "York Platform Tennis Club", "aliases": ["York", "York PTC"]},
]


async def seed_club_directory():
    """Seed the club_directory collection from CLUB_DIRECTORY on startup."""
    for entry in CLUB_DIRECTORY:
        await db.club_directory.update_one(
            {"name": entry["name"]},
            {"$set": {"name": entry["name"], "aliases": entry["aliases"]}},
            upsert=True,
        )
    logger.info(f"Club directory seeded: {len(CLUB_DIRECTORY)} clubs")


async def resolve_club_name(input_name: str) -> str:
    """
    Resolve a club name (scraped team name or user input) to its official name.
    1. Strip trailing numbers (e.g. "Cape Ann 1" -> "Cape Ann")
    2. Strip trailing team suffixes (e.g. "Myopia Gold" -> "Myopia", "Cape Ann Cage Fighters" -> "Cape Ann")
    3. Check if input matches an official name (case-insensitive)
    4. Check if input matches any alias in club_directory (case-insensitive)
    5. Return original input unchanged for non-GBPTA clubs
    """
    if not input_name or not input_name.strip():
        return input_name

    name = input_name.strip()

    # Build lookup from DB
    entries = await db.club_directory.find({}, {"_id": 0}).to_list(100)
    official_names_lower = {e["name"].lower(): e["name"] for e in entries}
    alias_to_official = {}
    for e in entries:
        for alias in e.get("aliases", []):
            alias_to_official[alias.lower()] = e["name"]

    # Try exact official match first (case-insensitive)
    if name.lower() in official_names_lower:
        return official_names_lower[name.lower()]

    # Try alias match on raw input
    if name.lower() in alias_to_official:
        return alias_to_official[name.lower()]

    # Strip trailing numbers (e.g. "Cape Ann 1" -> "Cape Ann")
    stripped = re.sub(r'\s+\d+\w*\s*$', '', name).strip()
    if stripped != name:
        if stripped.lower() in official_names_lower:
            return official_names_lower[stripped.lower()]
        if stripped.lower() in alias_to_official:
            return alias_to_official[stripped.lower()]

    # Strip trailing word suffixes like team names ("Myopia Gold", "Cape Ann Cage Fighters")
    # Try progressively shorter prefixes
    words = stripped.split()
    for i in range(len(words) - 1, 0, -1):
        prefix = " ".join(words[:i])
        if prefix.lower() in official_names_lower:
            return official_names_lower[prefix.lower()]
        if prefix.lower() in alias_to_official:
            return alias_to_official[prefix.lower()]

    # No match — return original input (non-GBPTA club)
    return name


async def run_gbpta_full_sync():
    """
    Execute the full GBPTA sync pipeline.
    Called by the scheduler on Tuesdays.
    This is a wrapper that directly interacts with the database.
    """
    logger.info("Starting scheduled GBPTA sync...")
    try:
        now = datetime.now(timezone.utc).isoformat()

        # Step 1: Scrape clubs from standings page
        logger.info("Scheduled sync - Step 1: Scraping clubs")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        target_leagues = ["Metrowest", "North Shore", "Metrowest Women's Day League"]
        base_url = "https://gbpta.paddlescores.com"

        async with httpx.AsyncClient(timeout=30.0, headers=headers, follow_redirects=True) as http_client:
            # Fetch standings page
            response = await http_client.get(f"{base_url}/print_all_standings.php")
            response.raise_for_status()
            html = response.text

        # Parse standings
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        club_data = []
        current_league = None
        current_division = None

        for element in soup.find_all(['h1', 'h2', 'a']):
            if element.name == 'h1':
                league_name = element.get_text(strip=True)
                current_league = league_name if league_name in target_leagues else None
                current_division = None
            elif element.name == 'h2' and current_league:
                current_division = element.get_text(strip=True)
            elif element.name == 'a' and current_league and current_division:
                href = element.get('href', '')
                if 'tid=' in href:
                    team_name = element.get_text(strip=True)
                    if team_name:
                        roster_url = f"{base_url}{href}" if href.startswith('/') else href
                        club_data.append({
                            'name': team_name,
                            'league': current_league,
                            'division': current_division,
                            'roster_url': roster_url
                        })

        # Upsert clubs
        for club in club_data:
            existing = await db.clubs.find_one({"name": club['name'], "league": club['league']})
            if existing:
                await db.clubs.update_one(
                    {"id": existing['id']},
                    {"$set": {"division": club['division'], "roster_url": club['roster_url'], "last_scraped": now}}
                )
            else:
                await db.clubs.insert_one({
                    "id": str(uuid.uuid4()),
                    **club,
                    "last_scraped": now,
                    "created_at": now
                })

        logger.info(f"Scheduled sync - Found {len(club_data)} clubs")

        # Step 2: Scrape rosters
        logger.info("Scheduled sync - Step 2: Scraping rosters")
        clubs = await db.clubs.find({}, {"_id": 0}).to_list(1000)
        all_players = []

        async with httpx.AsyncClient(timeout=30.0, headers=headers, follow_redirects=True) as http_client:
            for club in clubs:
                try:
                    resolved_club = await resolve_club_name(club['name'])
                    response = await http_client.get(club['roster_url'])
                    response.raise_for_status()
                    soup = BeautifulSoup(response.text, 'html.parser')
                    roster_table = soup.find('table', class_='team_roster_table')
                    if roster_table:
                        for row in roster_table.find_all('tr'):
                            cells = row.find_all('td')
                            if len(cells) >= 2:
                                player_link = cells[0].find('a', href=lambda h: h and 'player.php' in h)
                                if player_link:
                                    player_name = player_link.get_text(strip=True)
                                    for suffix in ['(C)', '(c)', '(CC)', '(cc)']:
                                        player_name = player_name.replace(suffix, '')
                                    player_name = player_name.strip()
                                    pti_value = None
                                    if len(cells) > 1:
                                        try:
                                            pti_value = float(cells[1].get_text(strip=True))
                                        except ValueError:
                                            pass
                                    profile_url = player_link.get('href', '')
                                    if profile_url.startswith('/'):
                                        profile_url = f"{base_url}{profile_url}"
                                    if player_name:
                                        all_players.append({
                                            'player_name': player_name,
                                            'pti_value': pti_value,
                                            'profile_source_url': profile_url,
                                            'club': resolved_club
                                        })
                except Exception as e:
                    logger.error(f"Error scraping {club['name']}: {e}")

        for player in all_players:
            player['id'] = str(uuid.uuid4())
            player['scraped_at'] = now

        if all_players:
            await db.pti_roster_raw.delete_many({})
            await db.pti_roster_raw.insert_many(all_players)

        logger.info(f"Scheduled sync - Found {len(all_players)} player entries")

        # Step 3: Deduplicate
        logger.info("Scheduled sync - Step 3: Deduplicating")
        raw_entries = await db.pti_roster_raw.find({}, {"_id": 0}).to_list(10000)
        player_map = {}

        for entry in raw_entries:
            name = entry.get('player_name', '').lower().strip()
            if not name:
                continue
            if name not in player_map:
                player_map[name] = {
                    'player_name': entry['player_name'],
                    'pti_value': entry.get('pti_value'),
                    'clubs': [],
                    'profile_source_url': entry.get('profile_source_url'),
                }
            club = entry.get('club')
            if club and club not in player_map[name]['clubs']:
                player_map[name]['clubs'].append(club)
            if entry.get('pti_value') is not None:
                player_map[name]['pti_value'] = entry['pti_value']

        deduped_entries = []
        for normalized_name, data in player_map.items():
            deduped_entries.append({
                'id': str(uuid.uuid4()),
                'player_name': data['player_name'],
                'pti_value': data['pti_value'],
                'clubs': data['clubs'],
                'profile_image_url': None,
                'profile_source_url': data['profile_source_url'],
                'scraped_at': now
            })

        await db.pti_roster.delete_many({})
        if deduped_entries:
            await db.pti_roster.insert_many(deduped_entries)

        logger.info(f"Scheduled sync - {len(deduped_entries)} unique players")

        # Step 4: Record PTI history
        logger.info("Scheduled sync - Step 4: Recording PTI history")
        history_entries = []
        for entry in deduped_entries:
            if entry.get('pti_value') is not None:
                history_entries.append({
                    'id': str(uuid.uuid4()),
                    'player_name': entry['player_name'].lower().strip(),
                    'pti_value': entry['pti_value'],
                    'recorded_at': now
                })

        if history_entries:
            await db.pti_history.insert_many(history_entries)

        logger.info(f"Scheduled GBPTA sync complete: {len(club_data)} clubs, {len(deduped_entries)} players, {len(history_entries)} history records")

    except Exception as e:
        logger.error(f"Scheduled GBPTA sync failed: {e}")


async def run_tenniscores_sync():
    """
    Execute the full Tenniscores sync pipeline.
    Called by the scheduler on Tuesdays (after GBPTA sync).
    Step 1: Scrape rankings page → upsert tenniscores_players
    Step 2: Bulk scrape all individual player pages
    """
    logger.info("Starting scheduled Tenniscores sync...")
    try:
        now = datetime.now(timezone.utc).isoformat()

        # Step 1: Scrape rankings
        logger.info("Tenniscores sync - Step 1: Scraping rankings")
        html = await fetch_html(TENNISCORES_RANKINGS_URL)
        players = parse_tenniscores_rankings(html)
        logger.info(f"Tenniscores sync - Found {len(players)} players in rankings")

        inserted = 0
        updated = 0
        for player in players:
            player['last_scraped'] = now
            player['normalized_name'] = normalize_name(player['name'])
            existing = await db.tenniscores_players.find_one({'normalized_name': player['normalized_name']})
            if existing:
                await db.tenniscores_players.update_one({'_id': existing['_id']}, {'$set': player})
                updated += 1
            else:
                player['id'] = str(uuid.uuid4())
                player['created_at'] = now
                await db.tenniscores_players.insert_one(player)
                inserted += 1

        # Also update PTI values in pti_roster
        for player in players:
            if player['pti_current'] is not None:
                await db.pti_roster.update_many(
                    {'normalized_name': player['normalized_name']},
                    {'$set': {'pti_value': player['pti_current'], 'pti_updated': now}}
                )

        logger.info(f"Tenniscores sync - Rankings: {inserted} inserted, {updated} updated")

        # Step 2: Bulk scrape all player pages
        logger.info("Tenniscores sync - Step 2: Bulk scraping player pages")
        all_players = await db.tenniscores_players.find(
            {'profile_url': {'$exists': True, '$ne': None}},
            {'_id': 0}
        ).to_list(10000)

        scraped = 0
        errors = 0
        for i, ts_player in enumerate(all_players):
            try:
                name = ts_player.get('name', '')
                normalized = ts_player.get('normalized_name', normalize_name(name))

                player_html = await fetch_html(ts_player['profile_url'])
                player_data = parse_tenniscores_player_page(player_html, name)
                partner_stats = calculate_partner_stats(player_data['matches'], name)

                await db.match_history.update_one(
                    {'normalized_name': normalized},
                    {
                        '$set': {
                            'player_name': name,
                            'normalized_name': normalized,
                            'current_pti': player_data['current_pti'],
                            'matches': player_data['matches'],
                            'match_count': len(player_data['matches']),
                            'last_scraped': now
                        }
                    },
                    upsert=True
                )

                await db.partner_stats.update_one(
                    {'normalized_name': normalized},
                    {
                        '$set': {
                            'player_name': name,
                            'normalized_name': normalized,
                            'partners': partner_stats,
                            'last_calculated': now
                        }
                    },
                    upsert=True
                )

                scraped += 1
                if (i + 1) % 50 == 0:
                    logger.info(f"Tenniscores sync progress: {i + 1}/{len(all_players)} ({scraped} scraped, {errors} errors)")

                await asyncio.sleep(1.5)

            except Exception as e:
                errors += 1
                logger.error(f"Tenniscores sync - Error scraping {ts_player.get('name', '?')}: {e}")
                await asyncio.sleep(1.0)

        logger.info(f"Scheduled Tenniscores sync complete: {len(players)} rankings, {scraped}/{len(all_players)} player pages scraped, {errors} errors")

    except Exception as e:
        logger.error(f"Scheduled Tenniscores sync failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - start/stop scheduler"""
    # Schedule GBPTA sync for every Tuesday at 6:00 AM EST (11:00 UTC)
    scheduler.add_job(
        run_gbpta_full_sync,
        CronTrigger(day_of_week='tue', hour=11, minute=0),  # 11:00 UTC = 6:00 AM EST
        id='gbpta_sync',
        replace_existing=True
    )
    # Schedule Tenniscores sync for every Tuesday at 7:00 AM EST (12:00 UTC)
    scheduler.add_job(
        run_tenniscores_sync,
        CronTrigger(day_of_week='tue', hour=12, minute=0),  # 12:00 UTC = 7:00 AM EST
        id='tenniscores_sync',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started - GBPTA sync at 6:00 AM EST, Tenniscores sync at 7:00 AM EST (Tuesdays)")
    await seed_club_directory()
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped")

# Create the main app with lifespan
app = FastAPI(title="FindaFourth API", lifespan=lifespan)

# Uploads configuration
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
PROFILE_IMAGES_DIR = UPLOADS_DIR / "profile_images"
PROFILE_IMAGES_DIR.mkdir(exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

# Player Models
class PlayerBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    home_club: Optional[str] = None
    other_clubs: List[str] = []
    pti: Optional[float] = None
    notify_push: bool = True
    notify_sms: bool = False
    notify_email: bool = True
    visibility: str = "everyone"  # everyone, crews_only, hidden

class PlayerCreate(BaseModel):
    email: EmailStr
    password: str

class PlayerProfile(BaseModel):
    name: str
    home_club: str
    other_clubs: List[str] = []
    pti: Optional[float] = None
    pti_verified: Optional[bool] = False
    phone: Optional[str] = None

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    home_club: Optional[str] = None
    other_clubs: Optional[List[str]] = None
    pti: Optional[float] = None
    profile_image_url: Optional[str] = None
    notify_push: Optional[bool] = None
    notify_sms: Optional[bool] = None
    notify_email: Optional[bool] = None
    visibility: Optional[str] = None

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    home_club: Optional[str] = None
    other_clubs: List[str] = []
    pti: Optional[float] = None
    pti_verified: bool = False  # True if PTI was matched from scraped roster
    profile_image_url: Optional[str] = None  # User-uploaded or scraped profile image
    notify_push: bool = True
    notify_sms: bool = False
    notify_email: bool = True
    visibility: str = "everyone"
    profile_complete: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlayerPublic(BaseModel):
    id: str
    name: Optional[str]
    home_club: Optional[str]
    other_clubs: List[str]
    pti: Optional[float]
    pti_verified: bool = False
    profile_image_url: Optional[str] = None

# Auth Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    player: dict

# Crew Models
class CrewCreate(BaseModel):
    name: str

class CrewUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None

class Crew(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_by: str
    type: str = "invite_only"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CrewMember(BaseModel):
    crew_id: str
    player_id: str
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Favorite Models
class Favorite(BaseModel):
    player_id: str
    favorite_player_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request Models
class RequestCreate(BaseModel):
    date_time: datetime
    club: str
    court: Optional[str] = None
    spots_needed: int = Field(ge=1, le=3)
    skill_min: Optional[int] = None
    skill_max: Optional[int] = None
    mode: str = "quick_fill"  # quick_fill, organizer_picks
    audience: str = "crews"  # crews, club, regional
    target_crew_ids: List[str] = []
    target_club_names: List[str] = []  # Club names for 'club' audience
    notes: Optional[str] = None

class RequestUpdate(BaseModel):
    court: Optional[str] = None
    skill_min: Optional[int] = None
    skill_max: Optional[int] = None
    audience: Optional[str] = None
    target_crew_ids: Optional[List[str]] = None
    target_club_names: Optional[List[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class GameRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organizer_id: str
    date_time: datetime
    club: str
    court: Optional[str] = None
    spots_needed: int
    spots_filled: int = 0
    skill_min: Optional[int] = None
    skill_max: Optional[int] = None
    mode: str = "quick_fill"
    audience: str = "crews"
    target_crew_ids: List[str] = []
    status: str = "open"  # open, filled, cancelled, expired
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Response Models
class ResponseCreate(BaseModel):
    status: str = "interested"  # interested, confirmed, passed

class ResponseUpdate(BaseModel):
    status: str  # interested, confirmed, passed

class GameResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    player_id: str
    status: str = "interested"
    responded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Availability Models
class AvailabilityCreate(BaseModel):
    message: str
    available_date: str  # YYYY-MM-DD format
    clubs: List[str] = []
    expires_at: Optional[datetime] = None

class AvailabilityPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    message: str
    available_date: str
    clubs: List[str] = []
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# PTI Roster Models (for scraped data)

# Placeholder image for players without profile photos
DEFAULT_PROFILE_IMAGE = "/images/default-avatar.png"

class Club(BaseModel):
    """Represents a paddle tennis club scraped from GBPTA"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    league: str  # Metrowest, North Shore, Metrowest Women's Day League
    division: Optional[str] = None
    roster_url: str
    last_scraped: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PTIPlayerEntry(BaseModel):
    """Player entry from scraped PTI roster data"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str
    pti_value: Optional[float] = None
    profile_image_url: Optional[str] = None  # URL to player's profile image
    clubs: List[str] = []  # List of club names player belongs to
    profile_source_url: Optional[str] = None  # Link to player's profile page
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PTIHistory(BaseModel):
    """Historical PTI record for tracking player rating over time"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str  # Normalized player name for matching
    pti_value: float
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PTIImportRequest(BaseModel):
    players: List[dict]  # List of {player_name, pti_value, source_url?}

class InviteRequest(BaseModel):
    """Request to invite a non-registered player to join FindaFourth"""
    player_name: str
    club_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class Invite(BaseModel):
    """Stored invite record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    inviter_id: str
    inviter_name: str
    player_name: str
    club_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Target leagues for GBPTA scraping
GBPTA_TARGET_LEAGUES = [
    "Metrowest",
    "North Shore",
    "Metrowest Women's Day League"
]

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(player_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": player_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_player(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    player_id = decode_token(token)
    if not player_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    player = await db.players.find_one({"id": player_id}, {"_id": 0, "password_hash": 0})
    if not player:
        raise HTTPException(status_code=401, detail="Player not found")
    
    return player

def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings for MongoDB"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc: dict) -> dict:
    """Serialize a document for MongoDB storage"""
    return {k: serialize_datetime(v) for k, v in doc.items()}

def deserialize_datetime(value):
    """Convert ISO format strings back to datetime objects"""
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return value
    return value

# ==================== NOTIFICATION SYSTEM (Pingram.io / NotificationAPI) ====================

async def send_notification(
    notification_id: str,
    player: dict,
    merge_tags: dict = None
):
    """
    Send a notification via NotificationAPI (Pingram.io).
    Handles email, SMS, and web push based on player preferences and notification template config.

    Args:
        notification_id: The notification template ID configured in Pingram.io dashboard
        player: Player dict with id, email, phone, and notification preferences
        merge_tags: Template variables to merge into the notification
    """
    if not NOTIFICATIONAPI_CLIENT_ID or not NOTIFICATIONAPI_CLIENT_SECRET:
        # Fall back to logging if NotificationAPI not configured
        logger.info(f"[NOTIFICATION] {notification_id} to {player.get('email')}: {merge_tags}")
        return

    try:
        # Build the user object for NotificationAPI
        user = {
            "id": player['id'],
            "email": player.get('email'),
        }

        # Add phone number if SMS notifications are enabled
        if player.get('notify_sms') and player.get('phone'):
            user["number"] = player['phone']

        await notificationapi.send({
            "notificationId": notification_id,
            "user": user,
            "mergeTags": merge_tags or {}
        })

        logger.info(f"[NOTIFICATION] Sent {notification_id} to {player.get('email')}")

    except Exception as e:
        logger.error(f"[NOTIFICATION ERROR] Failed to send {notification_id} to {player.get('email')}: {e}")


async def notify_player(player: dict, title: str, body: str, notification_id: str = "general_notification"):
    """
    Send notifications to a player based on their preferences.
    This is the main function called throughout the app.

    Args:
        player: Player dict with notification preferences
        title: Notification title
        body: Notification body/message
        notification_id: NotificationAPI template ID (default: general_notification)
    """
    # Check if player wants any notifications
    wants_notifications = (
        player.get('notify_push') or
        player.get('notify_email') or
        player.get('notify_sms')
    )

    if not wants_notifications:
        logger.debug(f"[NOTIFICATION] Skipped - player {player.get('email')} has all notifications disabled")
        return

    await send_notification(
        notification_id=notification_id,
        player=player,
        merge_tags={
            "title": title,
            "body": body,
            "playerName": player.get('name', 'Player')
        }
    )

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: PlayerCreate):
    # Check if email already exists
    existing = await db.players.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create player
    player_id = str(uuid.uuid4())
    player_doc = {
        "id": player_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "name": None,
        "phone": None,
        "home_club": None,
        "other_clubs": [],
        "pti": None,
        "notify_push": True,
        "notify_sms": False,
        "notify_email": True,
        "visibility": "everyone",
        "profile_complete": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.players.insert_one(player_doc)
    
    # Create token
    token = create_token(player_id)
    
    # Remove password_hash and _id from response
    player_doc.pop('password_hash', None)
    player_doc.pop('_id', None)
    
    return TokenResponse(access_token=token, player=player_doc)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    player = await db.players.find_one({"email": data.email})
    if not player:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, player.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(player['id'])
    
    # Remove sensitive data
    player_response = {k: v for k, v in player.items() if k not in ['_id', 'password_hash']}
    
    return TokenResponse(access_token=token, player=player_response)

@api_router.get("/auth/me")
async def get_me(current_player: dict = Depends(get_current_player)):
    return current_player

@api_router.put("/auth/complete-profile")
async def complete_profile(profile: PlayerProfile, current_player: dict = Depends(get_current_player)):
    # Resolve club names to official GBPTA names
    normalized_home_club = await resolve_club_name(profile.home_club) if profile.home_club else profile.home_club
    normalized_other_clubs = []
    for club in (profile.other_clubs or []):
        normalized_other_clubs.append(await resolve_club_name(club))

    update_data = {
        "name": profile.name,
        "home_club": normalized_home_club,
        "other_clubs": normalized_other_clubs,
        "pti": profile.pti,
        "pti_verified": profile.pti_verified or False,
        "phone": profile.phone,
        "profile_complete": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.players.update_one(
        {"id": current_player['id']},
        {"$set": update_data}
    )
    
    updated_player = await db.players.find_one({"id": current_player['id']}, {"_id": 0, "password_hash": 0})
    return updated_player

# ==================== PLAYER ROUTES ====================

@api_router.get("/players")
async def list_players(
    search: Optional[str] = None,
    club: Optional[str] = None,
    current_player: dict = Depends(get_current_player)
):
    query = {"profile_complete": True}
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if club:
        query["$or"] = [{"home_club": club}, {"other_clubs": club}]
    
    players = await db.players.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return players

@api_router.get("/players/{player_id}")
async def get_player(player_id: str, current_player: dict = Depends(get_current_player)):
    player = await db.players.find_one({"id": player_id}, {"_id": 0, "password_hash": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@api_router.put("/players/{player_id}")
async def update_player(player_id: str, data: PlayerUpdate, current_player: dict = Depends(get_current_player)):
    if player_id != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if PTI is verified - don't allow PTI updates if verified
    existing_player = await db.players.find_one({"id": player_id}, {"_id": 0})
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    # If PTI is verified, remove PTI from update data (can't be changed by user)
    if existing_player and existing_player.get('pti_verified') and 'pti' in update_data:
        del update_data['pti']

    # Resolve club names to official GBPTA names
    if 'home_club' in update_data and update_data['home_club']:
        update_data['home_club'] = await resolve_club_name(update_data['home_club'])
    if 'other_clubs' in update_data and update_data['other_clubs']:
        update_data['other_clubs'] = [await resolve_club_name(c) for c in update_data['other_clubs']]

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.players.update_one({"id": player_id}, {"$set": update_data})
    
    updated_player = await db.players.find_one({"id": player_id}, {"_id": 0, "password_hash": 0})
    return updated_player

@api_router.post("/players/{player_id}/profile-image")
async def upload_profile_image(
    player_id: str,
    file: UploadFile = File(...),
    current_player: dict = Depends(get_current_player)
):
    """Upload a profile image for the current player"""
    if player_id != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{player_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = PROFILE_IMAGES_DIR / filename

    # Delete old profile image if exists
    existing_player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if existing_player and existing_player.get('profile_image_url'):
        old_url = existing_player['profile_image_url']
        # Only delete if it's a local upload (starts with /uploads/)
        if old_url.startswith('/uploads/'):
            old_path = ROOT_DIR / old_url.lstrip('/')
            if old_path.exists():
                old_path.unlink()

    # Save file
    with open(file_path, 'wb') as f:
        f.write(contents)

    # Update player with new image URL
    image_url = f"/uploads/profile_images/{filename}"
    await db.players.update_one(
        {"id": player_id},
        {"$set": {"profile_image_url": image_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    updated_player = await db.players.find_one({"id": player_id}, {"_id": 0, "password_hash": 0})
    return {"profile_image_url": image_url, "player": updated_player}

@api_router.delete("/players/{player_id}/profile-image")
async def delete_profile_image(player_id: str, current_player: dict = Depends(get_current_player)):
    """Delete the player's profile image"""
    if player_id != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")

    existing_player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if existing_player and existing_player.get('profile_image_url'):
        old_url = existing_player['profile_image_url']
        # Only delete if it's a local upload
        if old_url.startswith('/uploads/'):
            old_path = ROOT_DIR / old_url.lstrip('/')
            if old_path.exists():
                old_path.unlink()

    await db.players.update_one(
        {"id": player_id},
        {"$set": {"profile_image_url": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    updated_player = await db.players.find_one({"id": player_id}, {"_id": 0, "password_hash": 0})
    return {"message": "Profile image deleted", "player": updated_player}

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str, current_player: dict = Depends(get_current_player)):
    if player_id != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete player and related data
    await db.players.delete_one({"id": player_id})
    await db.crew_members.delete_many({"player_id": player_id})
    await db.favorites.delete_many({"$or": [{"player_id": player_id}, {"favorite_player_id": player_id}]})
    await db.responses.delete_many({"player_id": player_id})
    await db.availability_posts.delete_many({"player_id": player_id})
    # Also delete requests created by this player
    await db.requests.delete_many({"organizer_id": player_id})
    
    return {"message": "Account deleted successfully"}

# ==================== CREW ROUTES ====================

@api_router.get("/crews")
async def list_crews(current_player: dict = Depends(get_current_player)):
    # Crews are private - only return crews created by this player
    my_crews = await db.crews.find(
        {"created_by": current_player['id']},
        {"_id": 0}
    ).to_list(1000)

    # Add member count to each crew
    for crew in my_crews:
        members = await db.crew_members.find({"crew_id": crew['id']}).to_list(1000)
        crew['member_count'] = len(members)

    return my_crews

@api_router.post("/crews")
async def create_crew(data: CrewCreate, current_player: dict = Depends(get_current_player)):
    crew_id = str(uuid.uuid4())
    crew_doc = {
        "id": crew_id,
        "name": data.name,
        "created_by": current_player['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.crews.insert_one(crew_doc)

    # Remove _id from response
    crew_doc.pop('_id', None)
    crew_doc['member_count'] = 0

    return crew_doc

@api_router.get("/crews/{crew_id}")
async def get_crew(crew_id: str, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")

    # Crews are private - only creator can view
    if crew['created_by'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get members with player details
    members = await db.crew_members.find({"crew_id": crew_id}).to_list(1000)
    member_ids = [m['player_id'] for m in members]

    players = await db.players.find(
        {"id": {"$in": member_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)

    crew['members'] = players
    crew['member_count'] = len(players)

    return crew

@api_router.put("/crews/{crew_id}")
async def update_crew(crew_id: str, data: CrewUpdate, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    if crew['created_by'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    await db.crews.update_one({"id": crew_id}, {"$set": update_data})
    
    updated_crew = await db.crews.find_one({"id": crew_id}, {"_id": 0})
    return updated_crew

@api_router.delete("/crews/{crew_id}")
async def delete_crew(crew_id: str, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    if crew['created_by'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.crews.delete_one({"id": crew_id})
    await db.crew_members.delete_many({"crew_id": crew_id})
    
    return {"message": "Crew deleted successfully"}

@api_router.post("/crews/{crew_id}/members")
async def add_crew_member(crew_id: str, player_id: str, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    if crew['created_by'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already a member
    existing = await db.crew_members.find_one({"crew_id": crew_id, "player_id": player_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    
    member_doc = {
        "crew_id": crew_id,
        "player_id": player_id,
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    await db.crew_members.insert_one(member_doc)
    
    # Notify the added player
    player = await db.players.find_one({"id": player_id})
    if player:
        await notify_player(
            player,
            "Added to Crew",
            f"You've been added to {crew['name']}",
            notification_id="added_to_crew"
        )
    
    return {"message": "Member added successfully"}

@api_router.delete("/crews/{crew_id}/members/{player_id}")
async def remove_crew_member(crew_id: str, player_id: str, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    # Only creator can remove others, members can remove themselves
    if player_id != current_player['id'] and crew['created_by'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Creator cannot be removed
    if player_id == crew['created_by']:
        raise HTTPException(status_code=400, detail="Cannot remove crew creator")
    
    await db.crew_members.delete_one({"crew_id": crew_id, "player_id": player_id})
    
    return {"message": "Member removed successfully"}

# ==================== FAVORITES ROUTES ====================

@api_router.get("/favorites")
async def list_favorites(current_player: dict = Depends(get_current_player)):
    favorites = await db.favorites.find({"player_id": current_player['id']}).to_list(1000)
    favorite_ids = [f['favorite_player_id'] for f in favorites]
    
    players = await db.players.find(
        {"id": {"$in": favorite_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    return players

@api_router.post("/favorites/{favorite_player_id}")
async def add_favorite(favorite_player_id: str, current_player: dict = Depends(get_current_player)):
    if favorite_player_id == current_player['id']:
        raise HTTPException(status_code=400, detail="Cannot favorite yourself")
    
    # Check if player exists
    player = await db.players.find_one({"id": favorite_player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Check if already favorited
    existing = await db.favorites.find_one({
        "player_id": current_player['id'],
        "favorite_player_id": favorite_player_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already favorited")
    
    favorite_doc = {
        "player_id": current_player['id'],
        "favorite_player_id": favorite_player_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.favorites.insert_one(favorite_doc)
    
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{favorite_player_id}")
async def remove_favorite(favorite_player_id: str, current_player: dict = Depends(get_current_player)):
    await db.favorites.delete_one({
        "player_id": current_player['id'],
        "favorite_player_id": favorite_player_id
    })
    
    return {"message": "Removed from favorites"}

# ==================== REQUEST ROUTES ====================

@api_router.get("/requests")
async def list_requests(current_player: dict = Depends(get_current_player)):
    now = datetime.now(timezone.utc)
    
    # Get player's crews
    memberships = await db.crew_members.find({"player_id": current_player['id']}).to_list(1000)
    player_crew_ids = [m['crew_id'] for m in memberships]
    
    # Get player's favorites (players who have favorited the current player)
    favorited_by = await db.favorites.find({"favorite_player_id": current_player['id']}).to_list(1000)
    favorited_by_ids = [f['player_id'] for f in favorited_by]
    
    # Get all requests the user has responded to (for "My Games" section)
    user_responses = await db.responses.find({"player_id": current_player['id']}).to_list(1000)
    responded_request_ids = [r['request_id'] for r in user_responses]
    
    # Build query for visible requests - open requests OR requests user has responded to
    base_query = {"date_time": {"$gt": now.isoformat()}}
    
    # Filter based on visibility settings for open games
    if current_player.get('visibility') == 'hidden':
        # Hidden players only see their own requests
        visibility_filter = [{"organizer_id": current_player['id']}]
    elif current_player.get('visibility') == 'crews_only':
        # Only see requests targeting their crews
        visibility_filter = [
            {"organizer_id": current_player['id']},
            {"$and": [{"audience": "crews"}, {"target_crew_ids": {"$in": player_crew_ids}}, {"status": "open"}]}
        ]
    else:
        # Everyone visibility - see all applicable open requests
        visibility_filter = [
            {"organizer_id": current_player['id']},
            {"$and": [{"audience": "regional"}, {"status": "open"}]},
            {"$and": [{"audience": "club"}, {"club": {"$in": [current_player.get('home_club')] + current_player.get('other_clubs', [])}}, {"status": "open"}]},
            {"$and": [{"audience": "crews"}, {"target_crew_ids": {"$in": player_crew_ids}}, {"status": "open"}]},
            {"$and": [{"organizer_id": {"$in": favorited_by_ids}}, {"status": "open"}]}
        ]
    
    # Also include requests user has responded to (regardless of status, for My Games)
    if responded_request_ids:
        visibility_filter.append({"id": {"$in": responded_request_ids}})
    
    query = {
        **base_query,
        "$or": visibility_filter
    }
    
    requests = await db.requests.find(query, {"_id": 0}).to_list(1000)
    
    # Filter by skill level if player has PTI
    player_pti = current_player.get('pti')
    filtered_requests = []
    for req in requests:
        # Always include own requests
        if req['organizer_id'] == current_player['id']:
            filtered_requests.append(req)
            continue
        
        # Check skill filter
        skill_min = req.get('skill_min')
        skill_max = req.get('skill_max')
        
        if skill_min is None and skill_max is None:
            # No skill filter, include
            filtered_requests.append(req)
        elif player_pti is None:
            # Player has no PTI, include them (don't exclude unrated players)
            filtered_requests.append(req)
        else:
            # Check if player's PTI is in range
            in_range = True
            if skill_min is not None and player_pti < skill_min:
                in_range = False
            if skill_max is not None and player_pti > skill_max:
                in_range = False
            if in_range:
                filtered_requests.append(req)
    
    # Add organizer info and response status to each request
    for req in filtered_requests:
        organizer = await db.players.find_one({"id": req['organizer_id']}, {"_id": 0, "password_hash": 0})
        req['organizer'] = organizer
        
        # Check if current player has responded
        response = await db.responses.find_one({
            "request_id": req['id'],
            "player_id": current_player['id']
        }, {"_id": 0})
        req['my_response'] = response
    
    # Sort by date_time
    filtered_requests.sort(key=lambda x: x['date_time'])
    
    return filtered_requests

@api_router.post("/requests")
async def create_request(data: RequestCreate, current_player: dict = Depends(get_current_player)):
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "organizer_id": current_player['id'],
        "date_time": data.date_time.isoformat(),
        "club": data.club,
        "court": data.court,
        "spots_needed": data.spots_needed,
        "spots_filled": 0,
        "skill_min": data.skill_min,
        "skill_max": data.skill_max,
        "mode": data.mode,
        "audience": data.audience,
        "target_crew_ids": data.target_crew_ids,
        "target_club_names": data.target_club_names,
        "status": "open",
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.requests.insert_one(request_doc)
    
    # Remove _id from response
    request_doc.pop('_id', None)
    
    # Send notifications to target audience
    await notify_request_audience(request_doc, current_player)
    
    return request_doc

async def notify_request_audience(request: dict, organizer: dict):
    """Notify players based on request audience"""
    player_ids_to_notify = set()
    
    if request['audience'] == 'crews':
        # Get members of target crews
        for crew_id in request.get('target_crew_ids', []):
            members = await db.crew_members.find({"crew_id": crew_id}).to_list(1000)
            for m in members:
                player_ids_to_notify.add(m['player_id'])
        
        # Also notify favorites
        favorites = await db.favorites.find({"player_id": organizer['id']}).to_list(1000)
        for f in favorites:
            player_ids_to_notify.add(f['favorite_player_id'])
    
    elif request['audience'] == 'club':
        # Get players at the target clubs
        target_clubs = request.get('target_club_names', [])
        # Fallback to request's club if no target clubs specified
        if not target_clubs:
            target_clubs = [request['club']]

        players = await db.players.find({
            "$or": [
                {"home_club": {"$in": target_clubs}},
                {"other_clubs": {"$in": target_clubs}}
            ],
            "profile_complete": True
        }).to_list(1000)
        for p in players:
            player_ids_to_notify.add(p['id'])
    
    elif request['audience'] == 'regional':
        # Notify everyone (with profile complete)
        players = await db.players.find({"profile_complete": True}).to_list(1000)
        for p in players:
            player_ids_to_notify.add(p['id'])
    
    # Remove organizer from notifications
    player_ids_to_notify.discard(organizer['id'])
    
    # Filter by visibility and skill
    for player_id in player_ids_to_notify:
        player = await db.players.find_one({"id": player_id})
        if not player:
            continue
        
        # Check visibility
        if player.get('visibility') == 'hidden':
            continue
        if player.get('visibility') == 'crews_only':
            # Check if player is in one of the target crews
            memberships = await db.crew_members.find({"player_id": player_id}).to_list(1000)
            player_crew_ids = [m['crew_id'] for m in memberships]
            if not any(cid in request.get('target_crew_ids', []) for cid in player_crew_ids):
                continue
        
        # Check skill filter
        skill_min = request.get('skill_min')
        skill_max = request.get('skill_max')
        player_pti = player.get('pti')
        
        if skill_min is not None or skill_max is not None:
            if player_pti is not None:
                if skill_min is not None and player_pti < skill_min:
                    continue
                if skill_max is not None and player_pti > skill_max:
                    continue
        
        # Send notification
        time_str = request['date_time'].split('T')[1][:5] if 'T' in request['date_time'] else request['date_time']
        await notify_player(
            player,
            f"{organizer.get('name', 'Someone')} needs players",
            f"Need {request['spots_needed']} for {request['club']} at {time_str}",
            notification_id="new_game_request"
        )

@api_router.get("/requests/{request_id}")
async def get_request(request_id: str, current_player: dict = Depends(get_current_player)):
    request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get organizer info
    organizer = await db.players.find_one({"id": request['organizer_id']}, {"_id": 0, "password_hash": 0})
    request['organizer'] = organizer
    
    # Get responses with player info
    responses = await db.responses.find({"request_id": request_id}, {"_id": 0}).to_list(1000)
    for resp in responses:
        player = await db.players.find_one({"id": resp['player_id']}, {"_id": 0, "password_hash": 0})
        resp['player'] = player
    
    request['responses'] = responses
    
    # Check if current player has responded
    my_response = await db.responses.find_one({
        "request_id": request_id,
        "player_id": current_player['id']
    }, {"_id": 0})
    request['my_response'] = my_response
    request['is_organizer'] = request['organizer_id'] == current_player['id']
    
    return request

@api_router.put("/requests/{request_id}")
async def update_request(request_id: str, data: RequestUpdate, current_player: dict = Depends(get_current_player)):
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request['organizer_id'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If expanding audience, send new notifications
    old_audience = request.get('audience')
    new_audience = data.audience
    
    await db.requests.update_one({"id": request_id}, {"$set": update_data})
    
    updated_request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    
    # If audience expanded, notify new audience
    if new_audience and new_audience != old_audience:
        await notify_request_audience(updated_request, current_player)
    
    return updated_request

@api_router.delete("/requests/{request_id}")
async def cancel_request(request_id: str, current_player: dict = Depends(get_current_player)):
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request['organizer_id'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update status to cancelled
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify confirmed players
    confirmed_responses = await db.responses.find({
        "request_id": request_id,
        "status": "confirmed"
    }).to_list(1000)
    
    for resp in confirmed_responses:
        player = await db.players.find_one({"id": resp['player_id']})
        if player:
            await notify_player(
                player,
                "Game Cancelled",
                f"The game at {request['club']} has been cancelled",
                notification_id="game_cancelled"
            )
    
    return {"message": "Request cancelled"}

# ==================== RESPONSE ROUTES ====================

@api_router.post("/requests/{request_id}/respond")
async def respond_to_request(request_id: str, current_player: dict = Depends(get_current_player)):
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request['status'] != 'open':
        raise HTTPException(status_code=400, detail="Request is no longer open")
    
    if request['organizer_id'] == current_player['id']:
        raise HTTPException(status_code=400, detail="Cannot respond to your own request")
    
    # Check if already responded
    existing = await db.responses.find_one({
        "request_id": request_id,
        "player_id": current_player['id']
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already responded to this request")
    
    # Determine initial status based on mode
    if request['mode'] == 'quick_fill':
        # Check if spots available
        if request['spots_filled'] >= request['spots_needed']:
            raise HTTPException(status_code=400, detail="No spots available")
        
        # Auto-confirm
        response_status = "confirmed"
        new_spots_filled = request['spots_filled'] + 1
        
        # Update request spots
        update_data = {"spots_filled": new_spots_filled, "updated_at": datetime.now(timezone.utc).isoformat()}
        if new_spots_filled >= request['spots_needed']:
            update_data["status"] = "filled"
        
        await db.requests.update_one({"id": request_id}, {"$set": update_data})
        
        # Notify organizer
        organizer = await db.players.find_one({"id": request['organizer_id']})
        if organizer:
            await notify_player(
                organizer,
                f"{current_player.get('name', 'Someone')} is in!",
                f"Your {request['club']} game has {request['spots_needed'] - new_spots_filled} spot(s) left",
                notification_id="player_confirmed"
            )
    else:
        # Organizer picks mode - just mark as interested
        response_status = "interested"

        # Notify organizer
        organizer = await db.players.find_one({"id": request['organizer_id']})
        if organizer:
            await notify_player(
                organizer,
                f"{current_player.get('name', 'Someone')} is interested",
                f"New interest in your {request['club']} game",
                notification_id="player_interested"
            )
    
    # Create response
    response_doc = {
        "id": str(uuid.uuid4()),
        "request_id": request_id,
        "player_id": current_player['id'],
        "status": response_status,
        "responded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.responses.insert_one(response_doc)
    
    # Remove _id from response
    response_doc.pop('_id', None)
    
    return response_doc

@api_router.put("/requests/{request_id}/responses/{response_id}")
async def update_response(
    request_id: str,
    response_id: str,
    data: ResponseUpdate,
    current_player: dict = Depends(get_current_player)
):
    request = await db.requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    response = await db.responses.find_one({"id": response_id, "request_id": request_id})
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    
    # Only organizer can confirm/pass responses
    if request['organizer_id'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    old_status = response['status']
    new_status = data.status
    
    # Handle status changes
    if new_status == 'confirmed' and old_status != 'confirmed':
        # Check if spots available
        if request['spots_filled'] >= request['spots_needed']:
            raise HTTPException(status_code=400, detail="No spots available")
        
        new_spots_filled = request['spots_filled'] + 1
        update_data = {"spots_filled": new_spots_filled, "updated_at": datetime.now(timezone.utc).isoformat()}
        if new_spots_filled >= request['spots_needed']:
            update_data["status"] = "filled"
        
        await db.requests.update_one({"id": request_id}, {"$set": update_data})
        
        # Notify player they're confirmed
        player = await db.players.find_one({"id": response['player_id']})
        if player:
            await notify_player(
                player,
                "You're in!",
                f"You've been confirmed for the {request['club']} game",
                notification_id="you_confirmed"
            )
    
    elif old_status == 'confirmed' and new_status != 'confirmed':
        # Decrement spots if removing confirmation
        new_spots_filled = max(0, request['spots_filled'] - 1)
        await db.requests.update_one(
            {"id": request_id},
            {"$set": {"spots_filled": new_spots_filled, "status": "open", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Update response status
    await db.responses.update_one({"id": response_id}, {"$set": {"status": new_status}})
    
    updated_response = await db.responses.find_one({"id": response_id}, {"_id": 0})
    return updated_response

# ==================== AVAILABILITY ROUTES ====================

@api_router.get("/availability")
async def list_availability(current_player: dict = Depends(get_current_player)):
    now = datetime.now(timezone.utc)
    
    # Get non-expired posts
    posts = await db.availability_posts.find(
        {"expires_at": {"$gt": now.isoformat()}},
        {"_id": 0}
    ).to_list(1000)
    
    # Add player info
    for post in posts:
        player = await db.players.find_one({"id": post['player_id']}, {"_id": 0, "password_hash": 0})
        post['player'] = player
    
    # Sort by available_date
    posts.sort(key=lambda x: x['available_date'])
    
    return posts

@api_router.post("/availability")
async def create_availability(data: AvailabilityCreate, current_player: dict = Depends(get_current_player)):
    # Default expiration to end of available_date
    if data.expires_at:
        expires_at = data.expires_at.isoformat()
    else:
        # Set to end of the day
        expires_at = f"{data.available_date}T23:59:59+00:00"
    
    post_doc = {
        "id": str(uuid.uuid4()),
        "player_id": current_player['id'],
        "message": data.message,
        "available_date": data.available_date,
        "clubs": data.clubs if data.clubs else [current_player.get('home_club')] + current_player.get('other_clubs', []),
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.availability_posts.insert_one(post_doc)
    
    # Remove _id from response
    post_doc.pop('_id', None)
    
    return post_doc

@api_router.delete("/availability/{post_id}")
async def delete_availability(post_id: str, current_player: dict = Depends(get_current_player)):
    post = await db.availability_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post['player_id'] != current_player['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.availability_posts.delete_one({"id": post_id})

    return {"message": "Post deleted"}

# ==================== INVITE ROUTES ====================

@api_router.post("/invites/send")
async def send_invite(invite_data: InviteRequest, current_player: dict = Depends(get_current_player)):
    """
    Send an invite to a non-registered player to join FindaFourth.
    Rate limited to 10 invites per hour per user.
    """
    # Validate that either email or phone is provided
    if not invite_data.email and not invite_data.phone:
        raise HTTPException(
            status_code=400,
            detail="Either email or phone number is required"
        )

    # Check if recipient is already registered
    if invite_data.email:
        existing = await db.players.find_one({"email": invite_data.email})
        if existing:
            raise HTTPException(
                status_code=400,
                detail="This person is already registered on FindaFourth"
            )

    # Rate limiting: max 10 invites per hour per user
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_invites = await db.invites.count_documents({
        "inviter_id": current_player['id'],
        "sent_at": {"$gte": one_hour_ago.isoformat()}
    })

    if recent_invites >= 10:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 10 invites per hour."
        )

    # Create invite record
    invite = Invite(
        inviter_id=current_player['id'],
        inviter_name=current_player.get('name', 'A FindaFourth user'),
        player_name=invite_data.player_name,
        club_name=invite_data.club_name,
        email=invite_data.email,
        phone=invite_data.phone
    )

    invite_doc = serialize_doc(invite.model_dump())
    await db.invites.insert_one(invite_doc)
    invite_doc.pop('_id', None)

    # Send notification via Pingram
    # Create a pseudo-player object for the notification
    recipient = {
        "id": f"invite_{invite.id}",
        "email": invite_data.email,
        "phone": invite_data.phone,
        "notify_email": bool(invite_data.email),
        "notify_sms": bool(invite_data.phone)
    }

    await send_notification(
        notification_id="player_invite",
        player=recipient,
        merge_tags={
            "inviterName": current_player.get('name', 'A FindaFourth user'),
            "playerName": invite_data.player_name,
            "clubName": invite_data.club_name,
            "appUrl": "https://find4th.com"
        }
    )

    logger.info(f"[INVITE] {current_player.get('email')} invited {invite_data.player_name} from {invite_data.club_name}")

    return {
        "message": f"Invite sent to {invite_data.player_name}",
        "invite": invite_doc
    }

# ==================== PTI ROSTER ROUTES ====================

def normalize_name(name: str) -> str:
    """Normalize a player name for comparison (lowercase, strip whitespace)"""
    return ' '.join(name.strip().lower().split())  # Also normalize multiple spaces

def fuzzy_match_score(query: str, target: str) -> float:
    """Calculate fuzzy match score between two strings (0-100)"""
    from difflib import SequenceMatcher
    query = normalize_name(query)
    target = normalize_name(target)
    
    # Exact match
    if query == target:
        return 100.0
    
    # Check if query is contained in target or vice versa
    if query in target or target in query:
        return 90.0
    
    # Use SequenceMatcher for fuzzy matching
    ratio = SequenceMatcher(None, query, target).ratio() * 100
    return ratio

def dedupe_pti_players(players: List[dict]) -> List[dict]:
    """Deduplicate players by name and PTI value"""
    seen = set()
    deduped = []
    for player in players:
        name = normalize_name(player.get('player_name', ''))
        pti = player.get('pti_value')
        key = (name, pti)
        if key not in seen and name:
            seen.add(key)
            deduped.append(player)
    return deduped

@api_router.get("/admin/pti-roster")
async def get_pti_roster(current_player: dict = Depends(get_current_player)):
    """Get all PTI roster entries (scraped player data)"""
    roster = await db.pti_roster.find({}, {"_id": 0}).to_list(1000)
    return {"total": len(roster), "players": roster}

@api_router.get("/pti/lookup")
async def lookup_pti(name: str, current_player: dict = Depends(get_current_player)):
    """
    Fuzzy match a player name against the PTI roster.
    Returns best match if score > 70, otherwise returns no match.
    Now includes clubs array for multi-club player support.
    """
    if not name or len(name.strip()) < 2:
        return {"match": None, "suggestions": []}

    # Get all PTI roster entries
    roster = await db.pti_roster.find({}, {"_id": 0}).to_list(1000)

    if not roster:
        return {"match": None, "suggestions": []}

    # Calculate match scores for all players
    matches = []
    for entry in roster:
        player_name = entry.get('player_name', '')
        if not player_name:
            continue

        score = fuzzy_match_score(name, player_name)
        matches.append({
            "player_name": player_name,
            "pti_value": entry.get('pti_value'),
            "clubs": entry.get('clubs', []),
            "profile_source_url": entry.get('profile_source_url'),
            "profile_image_url": entry.get('profile_image_url'),
            "score": score
        })

    # Sort by score descending
    matches.sort(key=lambda x: x['score'], reverse=True)

    # Get best match if score > 70
    best_match = None
    if matches and matches[0]['score'] >= 70:
        best_match = matches[0]

    # Return top 10 suggestions for dropdown
    suggestions = [m for m in matches[:10] if m['pti_value'] is not None]

    return {
        "match": best_match,
        "suggestions": suggestions
    }

@api_router.get("/pti/roster-list")
async def get_pti_roster_list(current_player: dict = Depends(get_current_player)):
    """Get simplified PTI roster list for dropdown selection"""
    roster = await db.pti_roster.find(
        {"pti_value": {"$ne": None}},  # Only players with PTI
        {"_id": 0, "player_name": 1, "pti_value": 1, "clubs": 1}
    ).sort("player_name", 1).to_list(1000)

    return {"players": roster}

@api_router.get("/pti/history")
async def get_pti_history(
    player_name: str,
    limit: int = 52,  # Default to 1 year of weekly records
    current_player: dict = Depends(get_current_player)
):
    """
    Get PTI history for a player.
    Used for displaying PTI trend graph on profile page.
    Returns historical PTI values sorted by date (oldest first).
    Deduplicates by date to show only one entry per day.
    """
    # Normalize the player name for matching
    normalized_name = normalize_name(player_name)

    if not normalized_name:
        raise HTTPException(status_code=400, detail="Player name is required")

    # Find history records for this player
    all_history = await db.pti_history.find(
        {"player_name": normalized_name},
        {"_id": 0, "pti_value": 1, "recorded_at": 1}
    ).sort("recorded_at", 1).to_list(500)

    # Deduplicate by date (keep first entry per day)
    seen_dates = set()
    history = []
    for entry in all_history:
        recorded_at = entry.get('recorded_at', '')
        # Extract just the date part (YYYY-MM-DD)
        date_only = recorded_at[:10] if recorded_at else ''
        if date_only and date_only not in seen_dates:
            seen_dates.add(date_only)
            history.append(entry)
            if len(history) >= limit:
                break

    # Get current PTI from roster if available
    current_entry = await db.pti_roster.find_one(
        {"player_name": {"$regex": f"^{player_name}$", "$options": "i"}},
        {"_id": 0, "pti_value": 1, "scraped_at": 1}
    )

    current_pti = None
    if current_entry:
        current_pti = current_entry.get('pti_value')

    return {
        "player_name": player_name,
        "current_pti": current_pti,
        "history": history,
        "total_records": len(history)
    }

@api_router.post("/admin/pti-roster/import")
async def import_pti_roster(data: PTIImportRequest, current_player: dict = Depends(get_current_player)):
    """Import PTI roster data from scraped JSON, with deduplication"""
    if not data.players:
        raise HTTPException(status_code=400, detail="No players provided")
    
    # Process and deduplicate players
    processed_players = []
    for p in data.players:
        player_name = p.get('player_name', '').strip()
        pti_value = p.get('pti_value')
        
        if not player_name:
            continue
        
        # Handle PTI value - can be string or number
        if pti_value is not None:
            try:
                pti_value = float(pti_value)
            except (ValueError, TypeError):
                pti_value = None
        
        processed_players.append({
            'player_name': player_name,
            'pti_value': pti_value,
            'source_url': p.get('source_url') or p.get('player_name_url') or None
        })
    
    # Deduplicate
    deduped_players = dedupe_pti_players(processed_players)
    
    # Clear existing roster and insert new data
    await db.pti_roster.delete_many({})
    
    # Insert deduped players
    now = datetime.now(timezone.utc).isoformat()
    roster_docs = []
    for p in deduped_players:
        doc = {
            "id": str(uuid.uuid4()),
            "player_name": p['player_name'],
            "pti_value": p['pti_value'],
            "source_url": p.get('source_url'),
            "scraped_at": now
        }
        roster_docs.append(doc)
    
    if roster_docs:
        await db.pti_roster.insert_many(roster_docs)
    
    return {
        "message": "PTI roster imported successfully",
        "total_received": len(data.players),
        "total_after_dedup": len(roster_docs),
        "duplicates_removed": len(data.players) - len(roster_docs)
    }

@api_router.post("/admin/pti-roster/scrape")
async def scrape_pti_roster(current_player: dict = Depends(get_current_player)):
    """
    Scrape PTI roster data from GBPTA paddlescores.com.
    This triggers the full sync pipeline: scrape clubs, scrape rosters, deduplicate, record history.
    """
    try:
        result = await run_gbpta_full_sync()

        # Get counts from database for response
        clubs_count = await db.clubs.count_documents({})
        players_count = await db.pti_roster.count_documents({})
        unique_clubs = await db.pti_roster.distinct('clubs')

        return {
            "message": "GBPTA roster scraped and imported successfully",
            "clubs_scraped": clubs_count,
            "players_after_dedup": players_count,
            "unique_club_names": len(unique_clubs)
        }

    except Exception as e:
        logger.error(f"GBPTA scraping error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@api_router.post("/admin/pti-roster/sync-players")
async def sync_pti_to_players(current_player: dict = Depends(get_current_player)):
    """Sync PTI values from roster to registered players by matching names"""
    # Get all PTI roster entries
    roster = await db.pti_roster.find({}, {"_id": 0}).to_list(1000)
    if not roster:
        return {"message": "No PTI roster data available", "updated": 0}
    
    # Create a lookup dict with normalized names
    pti_lookup = {}
    for entry in roster:
        name = normalize_name(entry.get('player_name', ''))
        if name and entry.get('pti_value') is not None:
            pti_lookup[name] = entry['pti_value']
    
    # Get all registered players
    players = await db.players.find({"profile_complete": True}, {"_id": 0}).to_list(1000)
    
    updated_count = 0
    update_log = []
    
    for player in players:
        player_name = normalize_name(player.get('name', ''))
        if player_name in pti_lookup:
            new_pti = pti_lookup[player_name]
            old_pti = player.get('pti')
            
            # Convert PTI to int (as per existing schema)
            new_pti_int = int(round(new_pti))
            
            if old_pti != new_pti_int:
                await db.players.update_one(
                    {"id": player['id']},
                    {"$set": {
                        "pti": new_pti_int,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                updated_count += 1
                update_log.append({
                    "player_name": player.get('name'),
                    "old_pti": old_pti,
                    "new_pti": new_pti_int
                })
    
    return {
        "message": f"Synced PTI values to {updated_count} players",
        "total_roster_entries": len(roster),
        "total_registered_players": len(players),
        "updated": updated_count,
        "updates": update_log
    }

@api_router.delete("/admin/pti-roster")
async def clear_pti_roster(current_player: dict = Depends(get_current_player)):
    """Clear all PTI roster data"""
    result = await db.pti_roster.delete_many({})
    return {"message": "PTI roster cleared", "deleted": result.deleted_count}

# ==================== GBPTA SCRAPING ====================

GBPTA_STANDINGS_URL = "https://gbpta.paddlescores.com/print_all_standings.php"
GBPTA_BASE_URL = "https://gbpta.paddlescores.com"

SCRAPER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

async def fetch_html(url: str) -> str:
    """Fetch HTML content from URL with browser-like headers"""
    async with httpx.AsyncClient(timeout=30.0, headers=SCRAPER_HEADERS, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.text

def parse_gbpta_standings(html: str) -> List[dict]:
    """
    Parse the GBPTA standings page to extract club information.
    Returns list of clubs with name, league, division, and roster_url.

    Page structure:
    - h1: League names (Metrowest, North Shore, etc.)
    - h2: Division names (Division 1, Series 1, etc.)
    - a[href*='tid=']: Team links within each division
    """
    soup = BeautifulSoup(html, 'html.parser')
    clubs = []

    current_league = None
    current_division = None

    # Process all elements in order to track context
    for element in soup.find_all(['h1', 'h2', 'a']):
        if element.name == 'h1':
            # Check if this is a target league
            league_name = element.get_text(strip=True)
            if league_name in GBPTA_TARGET_LEAGUES:
                current_league = league_name
            else:
                current_league = None
            current_division = None

        elif element.name == 'h2' and current_league:
            # This is a division/series under a target league
            current_division = element.get_text(strip=True)

        elif element.name == 'a' and current_league and current_division:
            # Check if this is a team link (has tid parameter)
            href = element.get('href', '')
            if 'tid=' in href:
                team_name = element.get_text(strip=True)
                if team_name:
                    # Build full URL
                    roster_url = f"{GBPTA_BASE_URL}{href}" if href.startswith('/') else href
                    clubs.append({
                        'name': team_name,
                        'league': current_league,
                        'division': current_division,
                        'roster_url': roster_url
                    })

    return clubs

@api_router.post("/admin/gbpta/scrape-clubs")
async def scrape_gbpta_clubs(current_player: dict = Depends(get_current_player)):
    """
    Scrape GBPTA standings page to discover all clubs in target leagues.
    Updates the clubs collection with discovered clubs.
    """
    try:
        # Fetch the standings page
        html = await fetch_html(GBPTA_STANDINGS_URL)

        # Parse to extract club info
        club_data = parse_gbpta_standings(html)

        if not club_data:
            return {
                "message": "No clubs found in target leagues",
                "target_leagues": GBPTA_TARGET_LEAGUES
            }

        # Upsert clubs into database
        now = datetime.now(timezone.utc).isoformat()
        inserted = 0
        updated = 0

        for club in club_data:
            # Check if club already exists (by name and league)
            existing = await db.clubs.find_one({
                "name": club['name'],
                "league": club['league']
            })

            if existing:
                # Update existing club
                await db.clubs.update_one(
                    {"id": existing['id']},
                    {"$set": {
                        "division": club['division'],
                        "roster_url": club['roster_url'],
                        "last_scraped": now
                    }}
                )
                updated += 1
            else:
                # Insert new club
                club_doc = {
                    "id": str(uuid.uuid4()),
                    "name": club['name'],
                    "league": club['league'],
                    "division": club['division'],
                    "roster_url": club['roster_url'],
                    "last_scraped": now,
                    "created_at": now
                }
                await db.clubs.insert_one(club_doc)
                inserted += 1

        # Get counts by league
        league_counts = {}
        for club in club_data:
            league = club['league']
            league_counts[league] = league_counts.get(league, 0) + 1

        return {
            "message": "GBPTA clubs scraped successfully",
            "total_clubs": len(club_data),
            "inserted": inserted,
            "updated": updated,
            "by_league": league_counts
        }

    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching GBPTA standings: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch GBPTA standings: {str(e)}")
    except Exception as e:
        logger.error(f"Error scraping GBPTA clubs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@api_router.get("/admin/gbpta/clubs")
async def get_gbpta_clubs(
    league: Optional[str] = None,
    current_player: dict = Depends(get_current_player)
):
    """Get all scraped GBPTA clubs, optionally filtered by league"""
    query = {}
    if league:
        query["league"] = league

    clubs = await db.clubs.find(query, {"_id": 0}).to_list(1000)
    return {
        "clubs": clubs,
        "total": len(clubs)
    }

def parse_roster_page(html: str, club_name: str) -> List[dict]:
    """
    Parse a club roster page to extract player information.
    Returns list of players with name, pti_value, and profile_source_url.

    Table structure:
    - Row 0: Header (Team Name, R, W, L)
    - Row 1+: May have section headers like "Captains", "Alternates"
    - Player rows: [checkmark+number+name+(C/CC), PTI, Wins, Losses]
    """
    soup = BeautifulSoup(html, 'html.parser')
    players = []

    # Find the roster table - class contains 'team_roster_table'
    roster_table = soup.find('table', class_='team_roster_table')
    if not roster_table:
        return players

    # Find all rows in the table
    rows = roster_table.find_all('tr')

    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 2:
            continue

        # Find player link in the first cell
        player_link = cells[0].find('a', href=lambda h: h and 'player.php' in h)
        if not player_link:
            continue

        # Extract player name (remove captain designation like "(C)" or "(CC)")
        player_name = player_link.get_text(strip=True)
        # Remove captain designations
        for suffix in ['(C)', '(c)', '(CC)', '(cc)']:
            player_name = player_name.replace(suffix, '')
        player_name = player_name.strip()

        # Extract profile URL
        profile_url = player_link.get('href', '')
        if profile_url.startswith('/'):
            profile_url = f"{GBPTA_BASE_URL}{profile_url}"

        # PTI is in the second cell (index 1) - the "R" column
        pti_value = None
        if len(cells) > 1:
            pti_text = cells[1].get_text(strip=True)
            try:
                pti_value = float(pti_text)
            except ValueError:
                pass

        if player_name:
            players.append({
                'player_name': player_name,
                'pti_value': pti_value,
                'profile_source_url': profile_url,
                'club': club_name
            })

    return players

@api_router.post("/admin/gbpta/scrape-rosters")
async def scrape_gbpta_rosters(
    league: Optional[str] = None,
    current_player: dict = Depends(get_current_player)
):
    """
    Scrape all club roster pages to extract player information.
    Optionally filter by league. Updates the pti_roster collection.
    """
    try:
        # Get clubs to scrape
        query = {}
        if league:
            query["league"] = league

        clubs = await db.clubs.find(query, {"_id": 0}).to_list(1000)

        if not clubs:
            return {
                "message": "No clubs found. Run /admin/gbpta/scrape-clubs first.",
                "scraped": 0
            }

        all_players = []
        club_results = []
        errors = []

        async with httpx.AsyncClient(timeout=30.0, headers=SCRAPER_HEADERS, follow_redirects=True) as client:
            for club in clubs:
                try:
                    # Fetch the roster page
                    response = await client.get(club['roster_url'])
                    response.raise_for_status()

                    # Parse the roster
                    players = parse_roster_page(response.text, club['name'])
                    all_players.extend(players)

                    club_results.append({
                        "club": club['name'],
                        "league": club['league'],
                        "players_found": len(players)
                    })

                    # Update club's last_scraped timestamp
                    await db.clubs.update_one(
                        {"id": club['id']},
                        {"$set": {"last_scraped": datetime.now(timezone.utc).isoformat()}}
                    )

                except Exception as e:
                    errors.append({
                        "club": club['name'],
                        "error": str(e)
                    })
                    logger.error(f"Error scraping roster for {club['name']}: {str(e)}")

        # Store players in pti_roster (will be deduplicated in next step)
        now = datetime.now(timezone.utc).isoformat()
        for player in all_players:
            player['id'] = str(uuid.uuid4())
            player['scraped_at'] = now

        # Clear existing roster and insert new data
        if all_players:
            await db.pti_roster_raw.delete_many({})
            await db.pti_roster_raw.insert_many(all_players)

        return {
            "message": "Roster scraping complete",
            "total_clubs_scraped": len(club_results),
            "total_players_found": len(all_players),
            "errors": len(errors),
            "club_results": club_results[:10],  # First 10 for brevity
            "error_details": errors[:5] if errors else []
        }

    except Exception as e:
        logger.error(f"Error in roster scraping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Roster scraping failed: {str(e)}")

@api_router.post("/admin/gbpta/deduplicate")
async def deduplicate_pti_roster(current_player: dict = Depends(get_current_player)):
    """
    Deduplicate raw roster data and create final pti_roster collection.
    Players appearing on multiple clubs get their clubs merged into a list.
    Uses the most recent PTI value if there are differences.
    """
    try:
        # Get all raw roster entries
        raw_entries = await db.pti_roster_raw.find({}, {"_id": 0}).to_list(10000)

        if not raw_entries:
            return {
                "message": "No raw roster data found. Run /admin/gbpta/scrape-rosters first.",
                "deduplicated": 0
            }

        # Group by normalized player name
        player_map = {}
        for entry in raw_entries:
            name = normalize_name(entry.get('player_name', ''))
            if not name:
                continue

            if name not in player_map:
                player_map[name] = {
                    'player_name': entry['player_name'],  # Keep original formatting
                    'pti_value': entry.get('pti_value'),
                    'clubs': [],
                    'profile_source_url': entry.get('profile_source_url'),
                    'profile_image_url': None  # No images on paddlescores
                }

            # Add club to list if not already there (resolve to official name)
            club = entry.get('club')
            if club:
                club = await resolve_club_name(club)
                if club not in player_map[name]['clubs']:
                    player_map[name]['clubs'].append(club)

            # Use latest PTI value if present
            if entry.get('pti_value') is not None:
                player_map[name]['pti_value'] = entry['pti_value']

        # Create deduplicated roster entries
        now = datetime.now(timezone.utc).isoformat()
        deduped_entries = []
        multi_club_count = 0

        for normalized_name, data in player_map.items():
            entry = {
                'id': str(uuid.uuid4()),
                'player_name': data['player_name'],
                'pti_value': data['pti_value'],
                'clubs': data['clubs'],
                'profile_image_url': data['profile_image_url'],
                'profile_source_url': data['profile_source_url'],
                'scraped_at': now
            }
            deduped_entries.append(entry)

            if len(data['clubs']) > 1:
                multi_club_count += 1

        # Replace pti_roster collection with deduplicated data
        await db.pti_roster.delete_many({})
        if deduped_entries:
            await db.pti_roster.insert_many(deduped_entries)

        return {
            "message": "Deduplication complete",
            "raw_entries": len(raw_entries),
            "deduplicated_players": len(deduped_entries),
            "duplicates_merged": len(raw_entries) - len(deduped_entries),
            "multi_club_players": multi_club_count
        }

    except Exception as e:
        logger.error(f"Error in deduplication: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deduplication failed: {str(e)}")

@api_router.post("/admin/gbpta/full-sync")
async def full_gbpta_sync(current_player: dict = Depends(get_current_player)):
    """
    Run the complete GBPTA sync pipeline:
    1. Scrape clubs from standings page
    2. Scrape rosters from all club pages
    3. Deduplicate players
    4. Record PTI history
    5. Sync PTI values to registered app users
    """
    results = {}

    try:
        # Step 1: Scrape clubs
        logger.info("Starting GBPTA full sync - Step 1: Scraping clubs")
        html = await fetch_html(GBPTA_STANDINGS_URL)
        club_data = parse_gbpta_standings(html)

        now = datetime.now(timezone.utc).isoformat()
        clubs_inserted = 0
        clubs_updated = 0

        for club in club_data:
            existing = await db.clubs.find_one({
                "name": club['name'],
                "league": club['league']
            })
            if existing:
                await db.clubs.update_one(
                    {"id": existing['id']},
                    {"$set": {"division": club['division'], "roster_url": club['roster_url'], "last_scraped": now}}
                )
                clubs_updated += 1
            else:
                club_doc = {
                    "id": str(uuid.uuid4()),
                    "name": club['name'],
                    "league": club['league'],
                    "division": club['division'],
                    "roster_url": club['roster_url'],
                    "last_scraped": now,
                    "created_at": now
                }
                await db.clubs.insert_one(club_doc)
                clubs_inserted += 1

        results['clubs'] = {"inserted": clubs_inserted, "updated": clubs_updated, "total": len(club_data)}

        # Step 2: Scrape rosters
        logger.info("GBPTA full sync - Step 2: Scraping rosters")
        clubs = await db.clubs.find({}, {"_id": 0}).to_list(1000)
        all_players = []
        roster_errors = []

        async with httpx.AsyncClient(timeout=30.0, headers=SCRAPER_HEADERS, follow_redirects=True) as client:
            for club in clubs:
                try:
                    response = await client.get(club['roster_url'])
                    response.raise_for_status()
                    players = parse_roster_page(response.text, club['name'])
                    all_players.extend(players)
                except Exception as e:
                    roster_errors.append({"club": club['name'], "error": str(e)})

        for player in all_players:
            player['id'] = str(uuid.uuid4())
            player['scraped_at'] = now

        if all_players:
            await db.pti_roster_raw.delete_many({})
            await db.pti_roster_raw.insert_many(all_players)

        results['rosters'] = {"players_found": len(all_players), "errors": len(roster_errors)}

        # Step 3: Deduplicate
        logger.info("GBPTA full sync - Step 3: Deduplicating")
        raw_entries = await db.pti_roster_raw.find({}, {"_id": 0}).to_list(10000)
        player_map = {}

        for entry in raw_entries:
            name = normalize_name(entry.get('player_name', ''))
            if not name:
                continue
            if name not in player_map:
                player_map[name] = {
                    'player_name': entry['player_name'],
                    'pti_value': entry.get('pti_value'),
                    'clubs': [],
                    'profile_source_url': entry.get('profile_source_url'),
                    'profile_image_url': None
                }
            club = entry.get('club')
            if club and club not in player_map[name]['clubs']:
                player_map[name]['clubs'].append(club)
            if entry.get('pti_value') is not None:
                player_map[name]['pti_value'] = entry['pti_value']

        deduped_entries = []
        for normalized_name, data in player_map.items():
            deduped_entries.append({
                'id': str(uuid.uuid4()),
                'player_name': data['player_name'],
                'pti_value': data['pti_value'],
                'clubs': data['clubs'],
                'profile_image_url': data['profile_image_url'],
                'profile_source_url': data['profile_source_url'],
                'scraped_at': now
            })

        await db.pti_roster.delete_many({})
        if deduped_entries:
            await db.pti_roster.insert_many(deduped_entries)

        results['deduplication'] = {"unique_players": len(deduped_entries)}

        # Step 4: Record PTI history
        logger.info("GBPTA full sync - Step 4: Recording PTI history")
        history_entries = []
        for entry in deduped_entries:
            if entry.get('pti_value') is not None:
                history_entries.append({
                    'id': str(uuid.uuid4()),
                    'player_name': normalize_name(entry['player_name']),
                    'pti_value': entry['pti_value'],
                    'recorded_at': now
                })

        if history_entries:
            await db.pti_history.insert_many(history_entries)

        results['pti_history'] = {"records_added": len(history_entries)}

        logger.info("GBPTA full sync complete")
        return {
            "message": "Full GBPTA sync complete",
            "results": results
        }

    except Exception as e:
        logger.error(f"Error in full GBPTA sync: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Full sync failed: {str(e)}")

@api_router.post("/admin/gbpta/record-pti-history")
async def record_pti_history(current_player: dict = Depends(get_current_player)):
    """
    Record current PTI values from pti_roster to pti_history.
    This creates a snapshot of all player PTI values for historical tracking.
    Should be run weekly (Tuesdays) after roster sync.
    """
    try:
        # Get current roster
        roster = await db.pti_roster.find({}, {"_id": 0}).to_list(10000)

        if not roster:
            return {
                "message": "No roster data found. Run /admin/gbpta/full-sync first.",
                "recorded": 0
            }

        now = datetime.now(timezone.utc).isoformat()
        history_entries = []

        for entry in roster:
            if entry.get('pti_value') is not None:
                history_entries.append({
                    'id': str(uuid.uuid4()),
                    'player_name': normalize_name(entry['player_name']),
                    'pti_value': entry['pti_value'],
                    'recorded_at': now
                })

        if history_entries:
            await db.pti_history.insert_many(history_entries)

        return {
            "message": "PTI history recorded",
            "records_added": len(history_entries),
            "timestamp": now
        }

    except Exception as e:
        logger.error(f"Error recording PTI history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to record PTI history: {str(e)}")


# ==================== TENNISCORES INTEGRATION ====================

TENNISCORES_BASE_URL = "https://gbptl.tenniscores.com"
TENNISCORES_RANKINGS_URL = f"{TENNISCORES_BASE_URL}/?mod=nndz-SkhmOW1PQ3V4Zz09"


def parse_tenniscores_rankings(html: str) -> List[dict]:
    """
    Parse the Tenniscores rankings page to extract all players.
    Returns list of players with name, pti_start, pti_diff, pti_current, profile_url.
    """
    soup = BeautifulSoup(html, 'html.parser')
    players = []

    # Find the main table with player data
    tables = soup.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 5:
                # Check if this looks like a player row (has a link in last name column)
                link = cells[1].find('a') if len(cells) > 1 else None
                if link and 'uid=' in link.get('href', ''):
                    try:
                        first_name = cells[0].get_text(strip=True)
                        last_name = cells[1].get_text(strip=True)
                        profile_url = link.get('href', '')
                        if not profile_url.startswith('http'):
                            profile_url = f"{TENNISCORES_BASE_URL}/{profile_url}"

                        # Parse PTI values
                        pti_start_text = cells[2].get_text(strip=True) if len(cells) > 2 else ''
                        pti_diff_text = cells[3].get_text(strip=True) if len(cells) > 3 else ''
                        pti_current_text = cells[4].get_text(strip=True) if len(cells) > 4 else ''

                        pti_start = float(pti_start_text) if pti_start_text else None
                        pti_diff = float(pti_diff_text) if pti_diff_text else None
                        pti_current = float(pti_current_text) if pti_current_text else None

                        # Extract uid from profile URL
                        uid_match = profile_url.split('uid=')[-1] if 'uid=' in profile_url else None

                        players.append({
                            'first_name': first_name,
                            'last_name': last_name,
                            'name': f"{first_name} {last_name}".strip(),
                            'pti_start': pti_start,
                            'pti_diff': pti_diff,
                            'pti_current': pti_current,
                            'profile_url': profile_url,
                            'tenniscores_uid': uid_match
                        })
                    except (ValueError, AttributeError) as e:
                        continue

    return players


def parse_tenniscores_player_page(html: str, player_name: str) -> dict:
    """
    Parse a Tenniscores player page to extract rich match history.

    Each match is a div.shader containing:
    - div.rbox_top: result, date/event, player start/end rating
    - div.rbox_bottom: players (4 links), scores, player/team ratings

    Returns dict with player_name, current_pti, and matches list matching
    the target structure in docs/tennis_scores_dataset.json.
    """
    soup = BeautifulSoup(html, 'html.parser')

    parsed = {
        'player_name': player_name,
        'current_pti': None,
        'matches': [],
    }

    # Try to find current PTI from page header
    pti_elements = soup.find_all(string=lambda text: text and 'PTI' in text if text else False)
    for elem in pti_elements:
        parent = elem.parent
        if parent:
            text = parent.get_text()
            pti_match = re.search(r'[-]?\d+\.?\d*', text)
            if pti_match:
                try:
                    parsed['current_pti'] = float(pti_match.group())
                    break
                except ValueError:
                    pass

    normalized_subject = normalize_name(player_name)

    # Each match is a div.shader
    for shader in soup.find_all('div', class_='shader'):
        try:
            match_data = _parse_single_match(shader, normalized_subject)
            if match_data:
                parsed['matches'].append(match_data)
        except Exception as e:
            logger.debug(f"Failed to parse match block for {player_name}: {e}")
            continue

    return parsed


def _parse_single_match(shader, normalized_subject: str) -> dict | None:
    """Parse a single div.shader match block into the target structure."""
    rbox_top = shader.find('div', class_='rbox_top')
    rbox_bottom = shader.find('div', class_='rbox_bottom')
    if not rbox_top:
        return None

    # --- rbox_top: result, date/event, player rating ---
    result_div = rbox_top.find('div', class_='rbox_1')
    result_text = result_div.get_text(strip=True).upper() if result_div else ''
    match_result = 'W' if result_text.startswith('W') else 'L'

    # Date and event from rbox_inner divs
    rbox_inners = rbox_top.find_all('div', class_='rbox_inner')
    date_str = ''
    event_str = ''
    if len(rbox_inners) >= 1:
        # First rbox_inner: date/time line
        date_str = rbox_inners[0].get_text(strip=True)
    if len(rbox_inners) >= 2:
        # Second rbox_inner: event/league line
        event_str = rbox_inners[1].get_text(strip=True)

    # Player start/end rating from two separate div.rbox3top elements
    rbox3tops = rbox_top.find_all('div', class_='rbox3top')
    subject_rating_before = None
    subject_rating_after = None
    if len(rbox3tops) >= 1:
        span = rbox3tops[0].find('span', class_='demi')
        if span:
            subject_rating_before = _safe_float(span.get_text(strip=True))
    if len(rbox3tops) >= 2:
        span = rbox3tops[1].find('span', class_='demi')
        if span:
            subject_rating_after = _safe_float(span.get_text(strip=True))

    # Parse event string for venue, line number, teams
    venue, line_num, home_team, away_team = _parse_event_string(event_str)

    # --- rbox_bottom: players, scores, ratings ---
    players = []       # 4 player names: H1, H2, A1, A2
    score_data = []
    player_start_ratings = []   # H1, H2, A1, A2 start ratings
    player_end_ratings = []     # H1, H2, A1, A2 end ratings
    team_start_ratings = []     # Home, Away team start
    team_end_ratings = []       # Home, Away team end

    if rbox_bottom:
        # Player names from rbox_wrap_2 links
        wrap2 = rbox_bottom.find('div', class_='rbox_wrap_2')
        if wrap2:
            links = wrap2.find_all('a')
            players = [link.get_text(strip=True) for link in links[:4]]

        # Scores from rbox_wrap_4
        wrap4 = rbox_bottom.find('div', class_='rbox_wrap_4')
        if wrap4:
            score_data = _parse_scores(wrap4)

        # Player ratings from rbox_wrap_3 (appears twice: start then end)
        wrap3_all = rbox_bottom.find_all('div', class_='rbox_wrap_3')
        if len(wrap3_all) >= 1:
            player_start_ratings = _extract_ratings(wrap3_all[0])
        if len(wrap3_all) >= 2:
            player_end_ratings = _extract_ratings(wrap3_all[1])

        # Team ratings from rbox_wrap_5 (appears twice: start then end)
        wrap5_all = rbox_bottom.find_all('div', class_='rbox_wrap_5')
        if len(wrap5_all) >= 1:
            team_start_ratings = _extract_ratings(wrap5_all[0])
        if len(wrap5_all) >= 2:
            team_end_ratings = _extract_ratings(wrap5_all[1])

    # Identify which side the subject is on (home=0,1 or away=2,3)
    subject_idx = None
    for i, name in enumerate(players):
        if normalize_name(name) == normalized_subject:
            subject_idx = i
            break

    if subject_idx is None and players:
        # Fallback: partial match on last name
        subject_parts = normalized_subject.split()
        for i, name in enumerate(players):
            if subject_parts[-1] in normalize_name(name):
                subject_idx = i
                break

    is_home = subject_idx is not None and subject_idx < 2
    partner_idx = None
    opp_indices = []

    if subject_idx is not None:
        if is_home:
            partner_idx = 1 if subject_idx == 0 else 0
            opp_indices = [2, 3]
            venue = venue or 'Home'
        else:
            partner_idx = 3 if subject_idx == 2 else 2
            opp_indices = [0, 1]
            venue = venue or 'Away'

    # Build the match structure
    match = {
        'result': match_result,
        'date': date_str,
        'event': event_str,
        'venue': venue or '',
        'line': line_num,
        'rating_before': subject_rating_before,
        'rating_after': subject_rating_after,
    }

    # Partner
    if partner_idx is not None and partner_idx < len(players):
        match['partner'] = {
            'name': players[partner_idx],
            'rating_before': player_start_ratings[partner_idx] if partner_idx < len(player_start_ratings) else None,
            'rating_after': player_end_ratings[partner_idx] if partner_idx < len(player_end_ratings) else None,
        }
    else:
        match['partner'] = None

    # Team ratings for subject's side
    if is_home:
        match['team_rating_before'] = team_start_ratings[0] if len(team_start_ratings) >= 1 else None
        match['team_rating_after'] = team_end_ratings[0] if len(team_end_ratings) >= 1 else None
    else:
        match['team_rating_before'] = team_start_ratings[1] if len(team_start_ratings) >= 2 else None
        match['team_rating_after'] = team_end_ratings[1] if len(team_end_ratings) >= 2 else None

    # Opponents
    if opp_indices and all(i < len(players) for i in opp_indices):
        opp_team = away_team if is_home else home_team
        opp = {
            'team': opp_team or '',
            'player_1': {
                'name': players[opp_indices[0]],
                'rating_before': player_start_ratings[opp_indices[0]] if opp_indices[0] < len(player_start_ratings) else None,
                'rating_after': player_end_ratings[opp_indices[0]] if opp_indices[0] < len(player_end_ratings) else None,
            },
            'player_2': {
                'name': players[opp_indices[1]],
                'rating_before': player_start_ratings[opp_indices[1]] if opp_indices[1] < len(player_start_ratings) else None,
                'rating_after': player_end_ratings[opp_indices[1]] if opp_indices[1] < len(player_end_ratings) else None,
            },
            'team_rating_before': team_start_ratings[1] if is_home and len(team_start_ratings) >= 2 else (team_start_ratings[0] if not is_home and len(team_start_ratings) >= 1 else None),
            'team_rating_after': team_end_ratings[1] if is_home and len(team_end_ratings) >= 2 else (team_end_ratings[0] if not is_home and len(team_end_ratings) >= 1 else None),
            'venue': 'Away' if is_home else 'Home',
        }
        match['opponent'] = [opp]
    else:
        match['opponent'] = []

    # Scores
    match['score'] = score_data if score_data else []

    return match


def _parse_event_string(event: str) -> tuple:
    """
    Parse event string like "North Shore: Division 1 - Myopia Red vs Cape Ann 2  at Line 7"
    Returns (venue_hint, line_number, home_team, away_team).
    venue_hint is None here — determined by subject's position in player list.
    """
    venue_hint = None
    line_num = None
    home_team = None
    away_team = None

    # Extract line number: "at Line 7"
    line_match = re.search(r'at\s+[Ll]ine\s*(\d+)', event)
    if line_match:
        line_num = int(line_match.group(1))

    # Extract teams from "X vs Y" pattern (after colon if present)
    vs_part = event.split(':', 1)[-1].strip() if ':' in event else event
    # Strip "at Line N" suffix before parsing teams
    vs_part = re.sub(r'\s+at\s+[Ll]ine\s*\d+', '', vs_part).strip()
    # Strip division prefix like "Division 1 - " or "2020 RMPL Division 2 - "
    vs_part = re.sub(r'^(?:[\w\s]+\s)?Division\s+\d+\s*-\s*', '', vs_part).strip()
    vs_match = re.match(r'(.+?)\s+vs\.?\s+(.+)', vs_part, re.IGNORECASE)
    if vs_match:
        home_team = vs_match.group(1).strip()
        away_team = vs_match.group(2).strip()

    return venue_hint, line_num, home_team, away_team


def _parse_scores(wrap4) -> list:
    """
    Parse set scores from rbox_wrap_4.
    Structure: rboxtop, clearfix, home scores (rbox_4_set), clearfix, away scores (rbox_4_set), clearfix.
    Scores are grouped into rows separated by clearfix divs.
    Returns list with single dict of set_1, set_2, optionally set_3.
    """
    # Collect score rows: groups of rbox_4_set values between clearfix divs
    rows = []
    current_row = []

    for child in wrap4.children:
        if not hasattr(child, 'get'):
            continue
        classes = child.get('class', [])
        if 'clearfix' in classes:
            if current_row:
                rows.append(current_row)
                current_row = []
            continue
        if 'rbox_4_set' in classes:
            val = _safe_int(child.get_text(strip=True))
            if val is not None:
                current_row.append(val)
    if current_row:
        rows.append(current_row)

    # First score row = home, second = away
    home_scores = rows[0] if len(rows) >= 1 else []
    away_scores = rows[1] if len(rows) >= 2 else []

    if not home_scores and not away_scores:
        return []

    sets = {}
    for i in range(max(len(home_scores), len(away_scores))):
        set_key = f'set_{i + 1}'
        sets[set_key] = {
            'home': home_scores[i] if i < len(home_scores) else None,
            'away': away_scores[i] if i < len(away_scores) else None,
        }

    return [sets] if sets else []


def _extract_ratings(wrap_div) -> list:
    """
    Extract numeric ratings from a rbox_wrap_3 or rbox_wrap_5 div.
    Player ratings use div.rboxhalf.rbox_3, team ratings use div.rbox.rbox_5.
    """
    ratings = []
    # Try rbox_3 (player ratings) and rbox_5 (team ratings)
    for div in wrap_div.find_all('div', class_=['rbox_3', 'rbox_5']):
        # Skip header divs (rboxtop)
        if 'rboxtop' in (div.get('class', [])):
            continue
        text = div.get_text(strip=True)
        if text:
            val = _safe_float(text)
            if val is not None:
                ratings.append(val)
    return ratings


def _safe_float(text: str):
    """Convert text to float, returning None on failure."""
    try:
        return float(text)
    except (ValueError, TypeError):
        return None


def _safe_int(text: str):
    """Convert text to int, returning None on failure."""
    try:
        return int(text)
    except (ValueError, TypeError):
        return None


def calculate_partner_stats(matches: List[dict], player_name: str) -> List[dict]:
    """
    Calculate partner chemistry stats from match history.
    Returns list of partners with win rate, matches played, avg_partner_rating, etc.
    Partner field may be a dict {name, rating_before, rating_after} or a plain string.
    """
    partner_data = {}

    for match in matches:
        partner = match.get('partner')
        if not partner:
            continue

        # Handle both dict partner (new format) and string partner (legacy)
        if isinstance(partner, dict):
            partner_name = partner.get('name', '')
            partner_rating = partner.get('rating_before')
        else:
            partner_name = partner
            partner_rating = None

        if not partner_name:
            continue

        if partner_name not in partner_data:
            partner_data[partner_name] = {
                'partner_name': partner_name,
                'matches_played': 0,
                'wins': 0,
                'losses': 0,
                'ratings': [],
            }

        partner_data[partner_name]['matches_played'] += 1
        if match.get('result') == 'W':
            partner_data[partner_name]['wins'] += 1
        else:
            partner_data[partner_name]['losses'] += 1
        if partner_rating is not None:
            partner_data[partner_name]['ratings'].append(partner_rating)

    # Calculate win rates, avg rating, and sort by matches played
    partner_stats = []
    for partner_name, stats in partner_data.items():
        stats['win_rate'] = round(stats['wins'] / stats['matches_played'] * 100, 1) if stats['matches_played'] > 0 else 0
        ratings = stats.pop('ratings')
        stats['avg_partner_rating'] = round(sum(ratings) / len(ratings), 1) if ratings else None
        partner_stats.append(stats)

    partner_stats.sort(key=lambda x: x['matches_played'], reverse=True)
    return partner_stats


@api_router.post("/admin/tenniscores/scrape-rankings")
async def scrape_tenniscores_rankings(current_player: dict = Depends(get_current_player)):
    """
    Scrape the Tenniscores rankings page to get all players with current PTI.
    Updates the tenniscores_players collection.
    """
    try:
        logger.info("Scraping Tenniscores rankings page...")
        html = await fetch_html(TENNISCORES_RANKINGS_URL)

        players = parse_tenniscores_rankings(html)
        logger.info(f"Found {len(players)} players on Tenniscores")

        if not players:
            return {"message": "No players found", "count": 0}

        # Update tenniscores_players collection
        now = datetime.now(timezone.utc).isoformat()
        inserted = 0
        updated = 0

        for player in players:
            player['last_scraped'] = now
            player['normalized_name'] = normalize_name(player['name'])

            existing = await db.tenniscores_players.find_one({
                'normalized_name': player['normalized_name']
            })

            if existing:
                await db.tenniscores_players.update_one(
                    {'_id': existing['_id']},
                    {'$set': player}
                )
                updated += 1
            else:
                player['id'] = str(uuid.uuid4())
                player['created_at'] = now
                await db.tenniscores_players.insert_one(player)
                inserted += 1

        # Also update PTI values in pti_roster for matching players
        pti_updated = 0
        for player in players:
            if player['pti_current'] is not None:
                result = await db.pti_roster.update_many(
                    {'normalized_name': player['normalized_name']},
                    {'$set': {'pti_value': player['pti_current'], 'pti_updated': now}}
                )
                pti_updated += result.modified_count

        return {
            "message": "Tenniscores rankings scraped successfully",
            "total_found": len(players),
            "inserted": inserted,
            "updated": updated,
            "pti_roster_updated": pti_updated
        }

    except Exception as e:
        logger.error(f"Error scraping Tenniscores rankings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/tenniscores/scrape-player/{player_name}")
async def scrape_tenniscores_player(
    player_name: str,
    current_player: dict = Depends(get_current_player)
):
    """
    Scrape a specific player's Tenniscores page to get their match history.
    Any authenticated user can call this. Rate limited to once per 24 hours per player.
    """
    try:
        # Find the player in tenniscores_players
        normalized = normalize_name(player_name)
        ts_player = await db.tenniscores_players.find_one({'normalized_name': normalized})

        if not ts_player or not ts_player.get('profile_url'):
            raise HTTPException(status_code=404, detail="Player not found in Tenniscores data. Run rankings scrape first.")

        # Check 24h rate limit
        existing_history = await db.match_history.find_one(
            {'normalized_name': normalized},
            {'_id': 0, 'last_scraped': 1}
        )
        if existing_history and existing_history.get('last_scraped'):
            last_scraped = datetime.fromisoformat(existing_history['last_scraped'])
            cooldown = timedelta(hours=24)
            next_available = last_scraped + cooldown
            now_utc = datetime.now(timezone.utc)
            if now_utc < next_available:
                hours_remaining = (next_available - now_utc).total_seconds() / 3600
                raise HTTPException(
                    status_code=429,
                    detail=f"This player's data was refreshed recently. Next refresh available in {hours_remaining:.1f} hours ({next_available.strftime('%b %d at %I:%M %p')} UTC)."
                )

        logger.info(f"Scraping Tenniscores player page for {player_name}...")
        html = await fetch_html(ts_player['profile_url'])

        player_data = parse_tenniscores_player_page(html, player_name)
        partner_stats = calculate_partner_stats(player_data['matches'], player_name)

        # Store match history
        now = datetime.now(timezone.utc).isoformat()

        await db.match_history.update_one(
            {'normalized_name': normalized},
            {
                '$set': {
                    'player_name': player_name,
                    'normalized_name': normalized,
                    'current_pti': player_data['current_pti'],
                    'matches': player_data['matches'],
                    'match_count': len(player_data['matches']),
                    'last_scraped': now
                }
            },
            upsert=True
        )

        # Store partner stats
        await db.partner_stats.update_one(
            {'normalized_name': normalized},
            {
                '$set': {
                    'player_name': player_name,
                    'normalized_name': normalized,
                    'partners': partner_stats,
                    'last_calculated': now
                }
            },
            upsert=True
        )

        return {
            "message": f"Player data scraped for {player_name}",
            "matches_found": len(player_data['matches']),
            "partners_found": len(partner_stats),
            "current_pti": player_data['current_pti']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scraping Tenniscores player: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/tenniscores/scrape-all-players")
async def scrape_all_tenniscores_players(current_player: dict = Depends(get_current_player)):
    """
    Bulk scrape all Tenniscores player pages for match history.
    Prerequisite: tenniscores_players must be populated via /admin/tenniscores/scrape-rankings.
    """
    try:
        all_players = await db.tenniscores_players.find(
            {'profile_url': {'$exists': True, '$ne': None}},
            {'_id': 0}
        ).to_list(10000)

        if not all_players:
            return {"message": "No players found. Run /admin/tenniscores/scrape-rankings first.", "total": 0}

        logger.info(f"Starting bulk Tenniscores scrape for {len(all_players)} players...")
        now = datetime.now(timezone.utc).isoformat()
        scraped = 0
        errors = 0

        for i, ts_player in enumerate(all_players):
            try:
                name = ts_player.get('name', '')
                normalized = ts_player.get('normalized_name', normalize_name(name))

                html = await fetch_html(ts_player['profile_url'])
                player_data = parse_tenniscores_player_page(html, name)
                partner_stats = calculate_partner_stats(player_data['matches'], name)

                await db.match_history.update_one(
                    {'normalized_name': normalized},
                    {
                        '$set': {
                            'player_name': name,
                            'normalized_name': normalized,
                            'current_pti': player_data['current_pti'],
                            'matches': player_data['matches'],
                            'match_count': len(player_data['matches']),
                            'last_scraped': now
                        }
                    },
                    upsert=True
                )

                await db.partner_stats.update_one(
                    {'normalized_name': normalized},
                    {
                        '$set': {
                            'player_name': name,
                            'normalized_name': normalized,
                            'partners': partner_stats,
                            'last_calculated': now
                        }
                    },
                    upsert=True
                )

                scraped += 1
                if (i + 1) % 50 == 0:
                    logger.info(f"Tenniscores bulk scrape progress: {i + 1}/{len(all_players)} ({scraped} scraped, {errors} errors)")

                # Rate limiting: 1-2 second delay between requests
                await asyncio.sleep(1.5)

            except Exception as e:
                errors += 1
                logger.error(f"Error scraping Tenniscores player {ts_player.get('name', '?')}: {e}")
                await asyncio.sleep(1.0)

        logger.info(f"Tenniscores bulk scrape complete: {scraped}/{len(all_players)} scraped, {errors} errors")

        return {
            "message": "Bulk Tenniscores scrape complete",
            "total": len(all_players),
            "scraped": scraped,
            "errors": errors
        }

    except Exception as e:
        logger.error(f"Error in bulk Tenniscores scrape: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/migrate-club-names")
async def migrate_club_names(current_player: dict = Depends(get_current_player)):
    """
    One-time migration: map old short club names to official GBPTA names
    in pti_roster.clubs, players.home_club, and players.other_clubs.
    """
    # Build alias -> official name mapping
    entries = await db.club_directory.find({}, {"_id": 0}).to_list(100)
    alias_map = {}
    for e in entries:
        for alias in e.get("aliases", []):
            alias_map[alias.lower()] = e["name"]
        # Also map official name to itself (for case normalization)
        alias_map[e["name"].lower()] = e["name"]

    def resolve(name):
        if not name:
            return name
        return alias_map.get(name.strip().lower(), name.strip())

    stats = {"pti_roster_updated": 0, "players_home_club_updated": 0, "players_other_clubs_updated": 0}

    # Migrate pti_roster.clubs
    roster_docs = await db.pti_roster.find({}, {"_id": 0, "id": 1, "clubs": 1}).to_list(10000)
    for doc in roster_docs:
        old_clubs = doc.get("clubs", [])
        new_clubs = [resolve(c) for c in old_clubs]
        if new_clubs != old_clubs:
            await db.pti_roster.update_one({"id": doc["id"]}, {"$set": {"clubs": new_clubs}})
            stats["pti_roster_updated"] += 1

    # Migrate players.home_club
    players = await db.players.find(
        {"home_club": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "home_club": 1, "other_clubs": 1}
    ).to_list(10000)
    for player in players:
        updates = {}
        old_home = player.get("home_club")
        new_home = resolve(old_home)
        if new_home != old_home:
            updates["home_club"] = new_home
            stats["players_home_club_updated"] += 1

        old_other = player.get("other_clubs", [])
        if old_other:
            new_other = [resolve(c) for c in old_other]
            if new_other != old_other:
                updates["other_clubs"] = new_other
                stats["players_other_clubs_updated"] += 1

        if updates:
            await db.players.update_one({"id": player["id"]}, {"$set": updates})

    return {"message": "Club name migration complete", "stats": stats}


@api_router.get("/players/{player_id}/match-history")
async def get_player_match_history(
    player_id: str,
    current_player: dict = Depends(get_current_player)
):
    """
    Get a player's match history and partner stats.
    """
    # Get the player
    player = await db.players.find_one({'id': player_id}, {'_id': 0, 'password_hash': 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    normalized = normalize_name(player.get('name', ''))

    # Get match history
    match_history = await db.match_history.find_one(
        {'normalized_name': normalized},
        {'_id': 0}
    )

    # Get partner stats
    partner_stats = await db.partner_stats.find_one(
        {'normalized_name': normalized},
        {'_id': 0}
    )

    # Get PTI trend from tenniscores_players
    ts_player = await db.tenniscores_players.find_one(
        {'normalized_name': normalized},
        {'_id': 0}
    )

    return {
        "player": {
            "id": player['id'],
            "name": player.get('name'),
            "pti": player.get('pti')
        },
        "match_history": match_history,
        "partner_stats": partner_stats.get('partners', []) if partner_stats else [],
        "pti_trend": {
            "start": ts_player.get('pti_start') if ts_player else None,
            "current": ts_player.get('pti_current') if ts_player else None,
            "diff": ts_player.get('pti_diff') if ts_player else None
        } if ts_player else None
    }


@api_router.get("/players/{player_id}/partner-chemistry")
async def get_partner_chemistry(
    player_id: str,
    current_player: dict = Depends(get_current_player)
):
    """
    Get a player's partner chemistry stats - who they play well with.
    """
    player = await db.players.find_one({'id': player_id}, {'_id': 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    normalized = normalize_name(player.get('name', ''))

    partner_stats = await db.partner_stats.find_one(
        {'normalized_name': normalized},
        {'_id': 0}
    )

    if not partner_stats:
        return {
            "player_name": player.get('name'),
            "partners": [],
            "message": "No partner data available. Scrape player history first."
        }

    # Enrich partner data with registered player info
    enriched_partners = []
    for partner in partner_stats.get('partners', []):
        partner_normalized = normalize_name(partner['partner_name'])

        # Check if partner is registered
        registered_partner = await db.players.find_one(
            {'name': {'$regex': f'^{partner["partner_name"]}$', '$options': 'i'}, 'profile_complete': True},
            {'_id': 0, 'id': 1, 'name': 1, 'profile_image_url': 1, 'pti': 1}
        )

        enriched_partners.append({
            **partner,
            'is_registered': registered_partner is not None,
            'player_id': registered_partner.get('id') if registered_partner else None,
            'profile_image_url': registered_partner.get('profile_image_url') if registered_partner else None,
            'current_pti': registered_partner.get('pti') if registered_partner else None
        })

    return {
        "player_name": player.get('name'),
        "partners": enriched_partners,
        "last_calculated": partner_stats.get('last_calculated')
    }


# ==================== UTILITY ROUTES ====================

@api_router.get("/clubs")
async def list_clubs(
    league: Optional[str] = None,
    current_player: dict = Depends(get_current_player)
):
    """
    List all clubs from GBPTA scraping.
    Optionally filter by league (Metrowest, North Shore, Metrowest Women's Day League).
    Returns clubs with member counts.
    """
    query = {}
    if league:
        query["league"] = league

    clubs = await db.clubs.find(query, {"_id": 0}).to_list(1000)

    # Add member counts from pti_roster
    for club in clubs:
        # Count players who have this club in their clubs array
        member_count = await db.pti_roster.count_documents({"clubs": club['name']})
        club['member_count'] = member_count

        # Count registered app users with this as home_club
        registered_count = await db.players.count_documents({
            "profile_complete": True,
            "$or": [
                {"home_club": club['name']},
                {"other_clubs": club['name']}
            ]
        })
        club['registered_count'] = registered_count

    return {
        "clubs": clubs,
        "total": len(clubs)
    }

@api_router.get("/clubs/names")
async def get_club_names(current_player: dict = Depends(get_current_player)):
    """Get unique normalized club names from pti_roster"""
    # Get distinct clubs from pti_roster (these are normalized)
    pti_clubs = await db.pti_roster.distinct("clubs")

    # Also get clubs from registered players
    home_clubs = await db.players.distinct("home_club")
    other_clubs_nested = await db.players.distinct("other_clubs")

    # Combine all clubs
    all_clubs = set()
    for club in pti_clubs:
        if club:
            all_clubs.add(club)
    for club in home_clubs:
        if club:
            all_clubs.add(club)
    for clubs in other_clubs_nested:
        if isinstance(clubs, list):
            for club in clubs:
                if club:
                    all_clubs.add(club)
        elif clubs:
            all_clubs.add(clubs)

    return sorted(list(all_clubs))


@api_router.get("/clubs/with-details")
async def get_clubs_with_details(current_player: dict = Depends(get_current_player)):
    """
    Get unique normalized club names with league/division info.
    Maps normalized club names to their league/division from the clubs collection.
    """
    # Get distinct clubs from pti_roster (these are normalized)
    pti_clubs = await db.pti_roster.distinct("clubs")

    # Also get clubs from registered players
    home_clubs = await db.players.distinct("home_club")
    other_clubs_nested = await db.players.distinct("other_clubs")

    # Combine all clubs
    all_club_names = set()
    for club in pti_clubs:
        if club:
            all_club_names.add(club)
    for club in home_clubs:
        if club:
            all_club_names.add(club)
    for clubs in other_clubs_nested:
        if isinstance(clubs, list):
            for club in clubs:
                if club:
                    all_club_names.add(club)
        elif clubs:
            all_club_names.add(clubs)

    # Get all team entries from clubs collection to map league/division
    team_entries = await db.clubs.find({}, {"_id": 0, "name": 1, "league": 1, "division": 1}).to_list(1000)

    # Build a mapping from club name prefix to league/division
    # Team names like "Cape Ann 1" map to club "Cape Ann"
    club_to_league = {}
    club_to_divisions = {}
    for team in team_entries:
        team_name = team.get('name', '')
        league = team.get('league', '')
        division = team.get('division', '')

        # For each normalized club name, check if team name starts with it
        for club_name in all_club_names:
            if team_name.startswith(club_name):
                # Store league (should be same for all teams of a club)
                if club_name not in club_to_league and league:
                    club_to_league[club_name] = league
                # Collect all divisions for this club
                if division:
                    if club_name not in club_to_divisions:
                        club_to_divisions[club_name] = set()
                    club_to_divisions[club_name].add(division)

    # Build result list with member counts
    result = []
    for club_name in sorted(all_club_names):
        # Count players in pti_roster with this club
        member_count = await db.pti_roster.count_documents({"clubs": club_name})

        # Count registered app users with this club
        registered_count = await db.players.count_documents({
            "profile_complete": True,
            "$or": [
                {"home_club": club_name},
                {"other_clubs": club_name}
            ]
        })

        club_obj = {
            "name": club_name,
            "league": club_to_league.get(club_name, ""),
            "divisions": sorted(list(club_to_divisions.get(club_name, set()))),
            "member_count": member_count,
            "registered_count": registered_count
        }
        result.append(club_obj)

    return result

@api_router.get("/clubs/suggestions")
async def get_club_suggestions(current_player: dict = Depends(get_current_player)):
    """Get known clubs for autocomplete — official GBPTA names plus any non-GBPTA player-entered clubs"""
    # Official names from club directory
    entries = await db.club_directory.find({}, {"_id": 0, "name": 1}).to_list(100)
    official_names = {e["name"] for e in entries}
    all_clubs = set(official_names)

    # Add non-GBPTA player-entered clubs
    home_clubs = await db.players.distinct("home_club")
    other_clubs = await db.players.distinct("other_clubs")

    for club in home_clubs:
        if club:
            all_clubs.add(club)
    for clubs in other_clubs:
        if isinstance(clubs, list):
            for club in clubs:
                if club:
                    all_clubs.add(club)
        elif clubs:
            all_clubs.add(clubs)

    all_clubs.discard("")

    return sorted(list(all_clubs))

@api_router.get("/clubs/{club_id}")
async def get_club(club_id: str, current_player: dict = Depends(get_current_player)):
    """
    Get club details with full roster.
    Returns both scraped players and registered app users.
    Supports both team names (e.g., "Cape Ann 1") and normalized club names (e.g., "Cape Ann").
    """
    decoded_id = club_id  # Already decoded by FastAPI

    # First, try to find by team name in clubs collection
    club = await db.clubs.find_one(
        {"$or": [{"id": decoded_id}, {"name": decoded_id}]},
        {"_id": 0}
    )

    # If found in clubs collection (team entry), use that
    if club:
        club_name = club['name']
    else:
        # Try to find as a normalized club name in pti_roster
        # Check if any player has this club in their clubs array
        player_with_club = await db.pti_roster.find_one({"clubs": decoded_id})
        if player_with_club:
            # This is a normalized club name
            club_name = decoded_id

            # Find league/division from teams that start with this club name
            team_entries = await db.clubs.find(
                {},
                {"_id": 0, "name": 1, "league": 1, "division": 1}
            ).to_list(1000)

            league = ""
            divisions = set()
            for team in team_entries:
                if team.get('name', '').startswith(club_name):
                    if not league and team.get('league'):
                        league = team['league']
                    if team.get('division'):
                        divisions.add(team['division'])

            # Construct a club object for normalized name
            club = {
                "name": club_name,
                "league": league,
                "division": ", ".join(sorted(divisions)) if divisions else ""
            }
        else:
            raise HTTPException(status_code=404, detail="Club not found")

    # Get all players from pti_roster who belong to this club
    roster_players = await db.pti_roster.find(
        {"clubs": club_name},
        {"_id": 0}
    ).to_list(1000)

    # Get registered app users for this club
    registered_users = await db.players.find(
        {
            "profile_complete": True,
            "$or": [
                {"home_club": club_name},
                {"other_clubs": club_name}
            ]
        },
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)

    # Create a lookup of registered users by normalized name
    registered_lookup = {}
    for user in registered_users:
        normalized = normalize_name(user.get('name', ''))
        if normalized:
            registered_lookup[normalized] = user

    # Build combined roster
    combined_roster = []
    for player in roster_players:
        normalized = normalize_name(player['player_name'])
        is_registered = normalized in registered_lookup

        roster_entry = {
            'player_name': player['player_name'],
            'pti_value': player.get('pti_value'),
            'profile_image_url': player.get('profile_image_url'),
            'is_registered': is_registered,
            'player_id': registered_lookup[normalized]['id'] if is_registered else None
        }

        # If registered, use their app profile image if they have one
        if is_registered and registered_lookup[normalized].get('profile_image_url'):
            roster_entry['profile_image_url'] = registered_lookup[normalized]['profile_image_url']

        combined_roster.append(roster_entry)

    # Sort by PTI (lower is better, None values at end)
    combined_roster.sort(key=lambda x: (x['pti_value'] is None, x['pti_value'] or 999))

    return {
        "club": club,
        "roster": combined_roster,
        "total_members": len(combined_roster),
        "registered_count": len(registered_users)
    }


@api_router.get("/")
async def root():
    return {"message": "FindaFourth API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
