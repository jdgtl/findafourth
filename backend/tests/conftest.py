"""
Pytest configuration and fixtures for backend tests.
"""
import os
import sys
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import patch, AsyncMock

# Set test environment variables before importing server
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['JWT_SECRET'] = 'test-secret-key-for-testing-only'
os.environ['CORS_ORIGINS'] = 'http://localhost:3000'
os.environ['DB_NAME'] = 'test_needafourth'

# Now we need to mock the database before importing server
from mongomock_motor import AsyncMongoMockClient

# Create mock client and db
mock_client = AsyncMongoMockClient()
mock_db = mock_client['test_needafourth']

# Patch the database in server module before importing
import server as server_module
server_module.client = mock_client
server_module.db = mock_db

from server import app, create_token, hash_password
from httpx import AsyncClient, ASGITransport


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def clean_db():
    """Clean all collections before each test."""
    collections = ['players', 'crews', 'crew_members', 'requests', 'request_responses',
                   'availability', 'favorites']
    for collection in collections:
        await mock_db[collection].delete_many({})
    yield
    # Cleanup after test
    for collection in collections:
        await mock_db[collection].delete_many({})


@pytest.fixture
async def test_player(clean_db) -> dict:
    """Create a test player and return player data with token."""
    import uuid
    from datetime import datetime, timezone

    player_id = str(uuid.uuid4())
    player_doc = {
        "id": player_id,
        "email": "test@example.com",
        "password_hash": hash_password("testpass123"),
        "name": "Test Player",
        "phone": "+1234567890",
        "home_club": "Test Club",
        "other_clubs": ["Other Club"],
        "pti": 45,
        "notify_push": True,
        "notify_sms": False,
        "notify_email": True,
        "visibility": "everyone",
        "profile_complete": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await mock_db.players.insert_one(player_doc)

    token = create_token(player_id)

    return {
        "id": player_id,
        "email": player_doc["email"],
        "name": player_doc["name"],
        "token": token,
        "player": player_doc
    }


@pytest.fixture
async def test_player2(clean_db) -> dict:
    """Create a second test player."""
    import uuid
    from datetime import datetime, timezone

    player_id = str(uuid.uuid4())
    player_doc = {
        "id": player_id,
        "email": "test2@example.com",
        "password_hash": hash_password("testpass123"),
        "name": "Test Player 2",
        "phone": "+1987654321",
        "home_club": "Test Club 2",
        "other_clubs": [],
        "pti": 50,
        "notify_push": True,
        "notify_sms": False,
        "notify_email": True,
        "visibility": "everyone",
        "profile_complete": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await mock_db.players.insert_one(player_doc)

    token = create_token(player_id)

    return {
        "id": player_id,
        "email": player_doc["email"],
        "name": player_doc["name"],
        "token": token,
        "player": player_doc
    }


def auth_header(token: str) -> dict:
    """Create authorization header for authenticated requests."""
    return {"Authorization": f"Bearer {token}"}
