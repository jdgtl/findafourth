"""
Tests for authentication endpoints.
"""
import pytest
from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


class TestRegister:
    """Tests for /api/auth/register endpoint."""

    async def test_register_success(self, async_client, clean_db):
        """Test successful user registration."""
        response = await async_client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "securepass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["player"]["email"] == "newuser@example.com"
        assert data["player"]["profile_complete"] is False

    async def test_register_duplicate_email(self, async_client, test_player):
        """Test registration with existing email fails."""
        response = await async_client.post("/api/auth/register", json={
            "email": test_player["email"],
            "password": "securepass123"
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    async def test_register_invalid_email(self, async_client, clean_db):
        """Test registration with invalid email fails."""
        response = await async_client.post("/api/auth/register", json={
            "email": "notanemail",
            "password": "securepass123"
        })
        assert response.status_code == 422  # Validation error

    async def test_register_short_password(self, async_client, clean_db):
        """Test registration with short password fails."""
        response = await async_client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "short"
        })
        assert response.status_code == 422  # Validation error


class TestLogin:
    """Tests for /api/auth/login endpoint."""

    async def test_login_success(self, async_client, test_player):
        """Test successful login."""
        response = await async_client.post("/api/auth/login", json={
            "email": test_player["email"],
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["player"]["email"] == test_player["email"]

    async def test_login_wrong_password(self, async_client, test_player):
        """Test login with wrong password fails."""
        response = await async_client.post("/api/auth/login", json={
            "email": test_player["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    async def test_login_nonexistent_user(self, async_client, clean_db):
        """Test login with non-existent user fails."""
        response = await async_client.post("/api/auth/login", json={
            "email": "noone@example.com",
            "password": "somepassword"
        })
        assert response.status_code == 401


class TestMe:
    """Tests for /api/auth/me endpoint."""

    async def test_me_authenticated(self, async_client, test_player):
        """Test getting current user when authenticated."""
        response = await async_client.get(
            "/api/auth/me",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_player["email"]
        assert data["name"] == test_player["name"]

    async def test_me_unauthenticated(self, async_client, clean_db):
        """Test getting current user without authentication fails."""
        response = await async_client.get("/api/auth/me")
        assert response.status_code == 403  # HTTPBearer returns 403 for missing auth

    async def test_me_invalid_token(self, async_client, clean_db):
        """Test getting current user with invalid token fails."""
        response = await async_client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401
