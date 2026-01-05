"""
Tests for game request endpoints.
"""
import pytest
from datetime import datetime, timezone, timedelta
from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


def get_future_datetime(hours: int = 24) -> str:
    """Get ISO datetime string for hours in the future."""
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


class TestCreateRequest:
    """Tests for POST /api/requests."""

    async def test_create_request(self, async_client, test_player):
        """Test creating a game request."""
        response = await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "quick_fill",
                "audience": "club"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["club"] == "Test Club"
        assert data["spots_needed"] == 3
        assert data["spots_filled"] == 0
        assert data["status"] == "open"
        assert "id" in data  # Verify we got a valid response

    async def test_create_request_with_skill_range(self, async_client, test_player):
        """Test creating a request with skill range."""
        response = await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "quick_fill",
                "audience": "club",
                "skill_min": 40,
                "skill_max": 60
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["skill_min"] == 40
        assert data["skill_max"] == 60


class TestListRequests:
    """Tests for GET /api/requests."""

    async def test_list_requests(self, async_client, test_player):
        """Test listing game requests."""
        # Create a request first
        await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "quick_fill",
                "audience": "regional"
            }
        )

        response = await async_client.get(
            "/api/requests",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1


class TestRespondToRequest:
    """Tests for POST /api/requests/{request_id}/respond."""

    async def test_respond_to_request_quick_fill(self, async_client, test_player, test_player2):
        """Test responding to a quick-fill request auto-confirms."""
        # Create a request
        create_response = await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "quick_fill",
                "audience": "regional"
            }
        )
        request_id = create_response.json()["id"]

        # Respond with second player
        response = await async_client.post(
            f"/api/requests/{request_id}/respond",
            headers=auth_header(test_player2["token"])
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"

    async def test_respond_to_request_organizer_picks(self, async_client, test_player, test_player2):
        """Test responding to organizer-picks request creates interested status."""
        # Create a request
        create_response = await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "organizer_picks",
                "audience": "regional"
            }
        )
        request_id = create_response.json()["id"]

        # Respond with second player
        response = await async_client.post(
            f"/api/requests/{request_id}/respond",
            headers=auth_header(test_player2["token"])
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "interested"

    async def test_cannot_respond_to_own_request(self, async_client, test_player):
        """Test organizer cannot respond to their own request."""
        create_response = await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "quick_fill",
                "audience": "regional"
            }
        )
        request_id = create_response.json()["id"]

        response = await async_client.post(
            f"/api/requests/{request_id}/respond",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 400


class TestCancelRequest:
    """Tests for DELETE /api/requests/{request_id}."""

    async def test_cancel_own_request(self, async_client, test_player):
        """Test cancelling own request."""
        create_response = await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "quick_fill",
                "audience": "regional"
            }
        )
        request_id = create_response.json()["id"]

        response = await async_client.delete(
            f"/api/requests/{request_id}",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200

    async def test_cannot_cancel_others_request(self, async_client, test_player, test_player2):
        """Test cannot cancel another player's request."""
        create_response = await async_client.post(
            "/api/requests",
            headers=auth_header(test_player["token"]),
            json={
                "club": "Test Club",
                "date_time": get_future_datetime(24),
                "spots_needed": 3,
                "mode": "quick_fill",
                "audience": "regional"
            }
        )
        request_id = create_response.json()["id"]

        response = await async_client.delete(
            f"/api/requests/{request_id}",
            headers=auth_header(test_player2["token"])
        )
        assert response.status_code == 403
