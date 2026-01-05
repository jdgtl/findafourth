"""
Tests for player endpoints.
"""
import pytest
from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


class TestGetPlayer:
    """Tests for GET /api/players/{player_id}."""

    async def test_get_own_profile(self, async_client, test_player):
        """Test getting own player profile."""
        response = await async_client.get(
            f"/api/players/{test_player['id']}",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_player["id"]
        assert data["email"] == test_player["email"]

    async def test_get_other_profile(self, async_client, test_player, test_player2):
        """Test getting another player's profile."""
        response = await async_client.get(
            f"/api/players/{test_player2['id']}",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_player2["id"]

    async def test_get_nonexistent_player(self, async_client, test_player):
        """Test getting non-existent player returns 404."""
        response = await async_client.get(
            "/api/players/00000000-0000-4000-8000-000000000000",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 404


class TestUpdatePlayer:
    """Tests for PUT /api/players/{player_id}."""

    async def test_update_own_profile(self, async_client, test_player):
        """Test updating own profile."""
        response = await async_client.put(
            f"/api/players/{test_player['id']}",
            headers=auth_header(test_player["token"]),
            json={"name": "Updated Name", "pti": 50}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["pti"] == 50

    async def test_update_other_profile_forbidden(self, async_client, test_player, test_player2):
        """Test updating another player's profile is forbidden."""
        response = await async_client.put(
            f"/api/players/{test_player2['id']}",
            headers=auth_header(test_player["token"]),
            json={"name": "Hacked Name"}
        )
        assert response.status_code == 403

    async def test_complete_profile(self, async_client, clean_db):
        """Test completing profile after registration."""
        # First register a new user
        reg_response = await async_client.post("/api/auth/register", json={
            "email": "incomplete@example.com",
            "password": "securepass123"
        })
        assert reg_response.status_code == 200
        token = reg_response.json()["access_token"]
        player_id = reg_response.json()["player"]["id"]

        # Complete the profile by updating name and home_club
        response = await async_client.put(
            f"/api/players/{player_id}",
            headers=auth_header(token),
            json={
                "name": "New User",
                "home_club": "New Club"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New User"
        assert data["home_club"] == "New Club"


class TestDeletePlayer:
    """Tests for DELETE /api/players/{player_id}."""

    async def test_delete_own_account(self, async_client, test_player):
        """Test deleting own account."""
        response = await async_client.delete(
            f"/api/players/{test_player['id']}",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200

        # Verify player is deleted
        get_response = await async_client.get(
            f"/api/players/{test_player['id']}",
            headers=auth_header(test_player["token"])
        )
        assert get_response.status_code == 401  # Token no longer valid

    async def test_delete_other_account_forbidden(self, async_client, test_player, test_player2):
        """Test deleting another player's account is forbidden."""
        response = await async_client.delete(
            f"/api/players/{test_player2['id']}",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 403
