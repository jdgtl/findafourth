from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
from firecrawl import FirecrawlApp

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'needafourth')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'needafourth-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Firecrawl Configuration
FIRECRAWL_API_KEY = os.environ.get('FIRECRAWL_API_KEY', '')

# Create the main app
app = FastAPI(title="NeedaFourth API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Player Models
class PlayerBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    home_club: Optional[str] = None
    other_clubs: List[str] = []
    pti: Optional[int] = None
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
    pti: Optional[int] = None
    phone: Optional[str] = None

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    home_club: Optional[str] = None
    other_clubs: Optional[List[str]] = None
    pti: Optional[int] = None
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
    pti: Optional[int] = None
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
    pti: Optional[int]

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
    type: str = "invite_only"  # open, invite_only

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
    notes: Optional[str] = None

class RequestUpdate(BaseModel):
    court: Optional[str] = None
    skill_min: Optional[int] = None
    skill_max: Optional[int] = None
    audience: Optional[str] = None
    target_crew_ids: Optional[List[str]] = None
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
class PTIPlayerEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str
    pti_value: float
    source_url: Optional[str] = None
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PTIImportRequest(BaseModel):
    players: List[dict]  # List of {player_name, pti_value, source_url?}

class PTIScrapeRequest(BaseModel):
    urls: List[str]
    prompt: Optional[str] = None

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

# ==================== NOTIFICATION PLACEHOLDERS ====================

async def send_push_notification(player_id: str, title: str, body: str):
    """Placeholder for push notification - to be implemented"""
    logger.info(f"[PUSH] To: {player_id}, Title: {title}, Body: {body}")

async def send_email_notification(email: str, subject: str, body: str):
    """Placeholder for email notification - to be implemented"""
    logger.info(f"[EMAIL] To: {email}, Subject: {subject}, Body: {body}")

async def send_sms_notification(phone: str, message: str):
    """Placeholder for SMS notification (Twilio) - to be implemented"""
    logger.info(f"[SMS] To: {phone}, Message: {message}")

async def notify_player(player: dict, title: str, body: str):
    """Send notifications based on player preferences"""
    if player.get('notify_push'):
        await send_push_notification(player['id'], title, body)
    if player.get('notify_email'):
        await send_email_notification(player['email'], title, body)
    if player.get('notify_sms') and player.get('phone'):
        await send_sms_notification(player['phone'], body)

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
    update_data = {
        "name": profile.name,
        "home_club": profile.home_club,
        "other_clubs": profile.other_clubs,
        "pti": profile.pti,
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
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.players.update_one({"id": player_id}, {"$set": update_data})
    
    updated_player = await db.players.find_one({"id": player_id}, {"_id": 0, "password_hash": 0})
    return updated_player

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
    # Get crews the player is a member of
    memberships = await db.crew_members.find({"player_id": current_player['id']}).to_list(1000)
    crew_ids = [m['crew_id'] for m in memberships]
    
    # Get all crews (for open crews discovery)
    all_crews = await db.crews.find({}, {"_id": 0}).to_list(1000)
    
    # Add member count and membership status to each crew
    for crew in all_crews:
        members = await db.crew_members.find({"crew_id": crew['id']}).to_list(1000)
        crew['member_count'] = len(members)
        crew['is_member'] = crew['id'] in crew_ids
        crew['is_creator'] = crew['created_by'] == current_player['id']
    
    return all_crews

@api_router.post("/crews")
async def create_crew(data: CrewCreate, current_player: dict = Depends(get_current_player)):
    crew_id = str(uuid.uuid4())
    crew_doc = {
        "id": crew_id,
        "name": data.name,
        "created_by": current_player['id'],
        "type": data.type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.crews.insert_one(crew_doc)
    
    # Add creator as a member
    member_doc = {
        "crew_id": crew_id,
        "player_id": current_player['id'],
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    await db.crew_members.insert_one(member_doc)
    
    # Remove _id from response
    crew_doc.pop('_id', None)
    
    crew_doc['member_count'] = 1
    crew_doc['is_member'] = True
    crew_doc['is_creator'] = True
    
    return crew_doc

@api_router.get("/crews/{crew_id}")
async def get_crew(crew_id: str, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id}, {"_id": 0})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    # Get members with player details
    members = await db.crew_members.find({"crew_id": crew_id}).to_list(1000)
    member_ids = [m['player_id'] for m in members]
    
    players = await db.players.find(
        {"id": {"$in": member_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    crew['members'] = players
    crew['member_count'] = len(players)
    crew['is_member'] = current_player['id'] in member_ids
    crew['is_creator'] = crew['created_by'] == current_player['id']
    
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
        await notify_player(player, "Added to Crew", f"You've been added to {crew['name']}")
    
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

@api_router.post("/crews/{crew_id}/join")
async def join_crew(crew_id: str, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    if crew['type'] != 'open':
        raise HTTPException(status_code=403, detail="This crew is invite only")
    
    # Check if already a member
    existing = await db.crew_members.find_one({"crew_id": crew_id, "player_id": current_player['id']})
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    
    member_doc = {
        "crew_id": crew_id,
        "player_id": current_player['id'],
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    await db.crew_members.insert_one(member_doc)
    
    return {"message": "Joined crew successfully"}

@api_router.post("/crews/{crew_id}/leave")
async def leave_crew(crew_id: str, current_player: dict = Depends(get_current_player)):
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    if crew['created_by'] == current_player['id']:
        raise HTTPException(status_code=400, detail="Creator cannot leave crew. Delete it instead.")
    
    await db.crew_members.delete_one({"crew_id": crew_id, "player_id": current_player['id']})
    
    return {"message": "Left crew successfully"}

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
        # Get players at the same club
        players = await db.players.find({
            "$or": [
                {"home_club": request['club']},
                {"other_clubs": request['club']}
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
            f"Need {request['spots_needed']} for {request['club']} at {time_str}"
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
                f"The game at {request['club']} has been cancelled"
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
                f"Your {request['club']} game has {request['spots_needed'] - new_spots_filled} spot(s) left"
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
                f"New interest in your {request['club']} game"
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
                f"You've been confirmed for the {request['club']} game"
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

# ==================== PTI ROSTER ROUTES ====================

def normalize_name(name: str) -> str:
    """Normalize a player name for comparison (lowercase, strip whitespace)"""
    return name.strip().lower()

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
async def scrape_pti_roster(data: PTIScrapeRequest, current_player: dict = Depends(get_current_player)):
    """Scrape PTI roster data from paddlescores.com using Firecrawl agent"""
    if not FIRECRAWL_API_KEY:
        raise HTTPException(status_code=500, detail="Firecrawl API key not configured")
    
    if not data.urls:
        raise HTTPException(status_code=400, detail="No URLs provided")
    
    try:
        # Initialize Firecrawl
        app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
        
        # Build the prompt for extracting player data
        urls_list = "\n".join([f"- {url}" for url in data.urls])
        default_prompt = f"""Extract player names and their associated PTI values (from the 'R' column) from the table with class 'team_roster_table' from the provided Cape Ann Paddle Team URLs. For each player, also extract the 'href' attribute from the link within their name cell that has the class 'lightbox-auto'. Do not include captain designations.

Target URLs:
{urls_list}"""
        
        prompt = data.prompt if data.prompt else default_prompt
        
        # Define the schema for extraction
        class ExtractSchema(BaseModel):
            cape_ann_paddle_team_roster: List[dict]
        
        # Run the Firecrawl agent
        result = app.agent(
            schema=ExtractSchema,
            prompt=prompt,
        )
        
        # Process the result
        if not result or not hasattr(result, 'cape_ann_paddle_team_roster'):
            # Try to extract from dict if result is dict-like
            roster_data = []
            if isinstance(result, dict):
                roster_data = result.get('cape_ann_paddle_team_roster', [])
            elif hasattr(result, '__dict__'):
                roster_data = getattr(result, 'cape_ann_paddle_team_roster', [])
        else:
            roster_data = result.cape_ann_paddle_team_roster
        
        if not roster_data:
            return {
                "message": "Scrape completed but no player data found",
                "raw_result": str(result)[:500]  # Include truncated raw result for debugging
            }
        
        # Process and deduplicate the scraped data
        processed_players = []
        for p in roster_data:
            player_name = p.get('player_name', '').strip()
            pti_value = p.get('pti_value')
            
            if not player_name:
                continue
            
            if pti_value is not None:
                try:
                    pti_value = float(pti_value)
                except (ValueError, TypeError):
                    pti_value = None
            
            processed_players.append({
                'player_name': player_name,
                'pti_value': pti_value,
                'source_url': p.get('player_name_url') or p.get('href') or None
            })
        
        # Deduplicate
        deduped_players = dedupe_pti_players(processed_players)
        
        # Clear existing roster and insert new data
        await db.pti_roster.delete_many({})
        
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
            "message": "PTI roster scraped and imported successfully",
            "total_scraped": len(roster_data),
            "total_after_dedup": len(roster_docs),
            "duplicates_removed": len(roster_data) - len(roster_docs)
        }
        
    except Exception as e:
        logger.error(f"Firecrawl scraping error: {str(e)}")
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

# ==================== UTILITY ROUTES ====================

@api_router.get("/clubs/suggestions")
async def get_club_suggestions(current_player: dict = Depends(get_current_player)):
    """Get common clubs for autocomplete"""
    # Get distinct clubs from players
    home_clubs = await db.players.distinct("home_club")
    other_clubs = await db.players.distinct("other_clubs")
    
    # Combine and dedupe
    all_clubs = set()
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
    
    # Add some common platform tennis clubs
    common_clubs = [
        "Paddle Club",
        "Country Club",
        "Tennis & Paddle Club",
        "Racquet Club",
        "Athletic Club",
        "Sports Club"
    ]
    for club in common_clubs:
        all_clubs.add(club)
    
    return sorted(list(all_clubs))

@api_router.get("/")
async def root():
    return {"message": "NeedaFourth API", "version": "1.0.0"}

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
