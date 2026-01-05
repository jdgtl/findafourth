"""
Tests for crew endpoints.
"""
import pytest
from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


class TestCreateCrew:
    """Tests for POST /api/crews."""

    async def test_create_open_crew(self, async_client, test_player):
        """Test creating an open crew."""
        response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "My Crew", "type": "open"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "My Crew"
        assert data["type"] == "open"
        assert data["is_creator"] is True
        assert data["is_member"] is True

    async def test_create_invite_only_crew(self, async_client, test_player):
        """Test creating an invite-only crew."""
        response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "Private Crew", "type": "invite_only"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "invite_only"


class TestListCrews:
    """Tests for GET /api/crews."""

    async def test_list_crews(self, async_client, test_player):
        """Test listing crews shows user's crews."""
        # Create a crew first
        await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "Test Crew", "type": "open"}
        )

        response = await async_client.get(
            "/api/crews",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(c["name"] == "Test Crew" for c in data)


class TestJoinCrew:
    """Tests for POST /api/crews/{crew_id}/join."""

    async def test_join_open_crew(self, async_client, test_player, test_player2):
        """Test joining an open crew."""
        # Create a crew
        create_response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "Joinable Crew", "type": "open"}
        )
        crew_id = create_response.json()["id"]

        # Join with second player
        response = await async_client.post(
            f"/api/crews/{crew_id}/join",
            headers=auth_header(test_player2["token"])
        )
        assert response.status_code == 200

    async def test_join_invite_only_crew_fails(self, async_client, test_player, test_player2):
        """Test joining invite-only crew without invite fails."""
        # Create an invite-only crew
        create_response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "Private Crew", "type": "invite_only"}
        )
        crew_id = create_response.json()["id"]

        # Try to join with second player
        response = await async_client.post(
            f"/api/crews/{crew_id}/join",
            headers=auth_header(test_player2["token"])
        )
        assert response.status_code == 403


class TestLeaveCrew:
    """Tests for POST /api/crews/{crew_id}/leave."""

    async def test_leave_crew(self, async_client, test_player, test_player2):
        """Test leaving a crew."""
        # Create and join a crew
        create_response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "Leavable Crew", "type": "open"}
        )
        crew_id = create_response.json()["id"]

        await async_client.post(
            f"/api/crews/{crew_id}/join",
            headers=auth_header(test_player2["token"])
        )

        # Leave the crew
        response = await async_client.post(
            f"/api/crews/{crew_id}/leave",
            headers=auth_header(test_player2["token"])
        )
        assert response.status_code == 200

    async def test_creator_cannot_leave(self, async_client, test_player):
        """Test creator cannot leave their own crew."""
        create_response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "My Crew", "type": "open"}
        )
        crew_id = create_response.json()["id"]

        response = await async_client.post(
            f"/api/crews/{crew_id}/leave",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 400


class TestDeleteCrew:
    """Tests for DELETE /api/crews/{crew_id}."""

    async def test_delete_own_crew(self, async_client, test_player):
        """Test creator can delete their crew."""
        create_response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "Deletable Crew", "type": "open"}
        )
        crew_id = create_response.json()["id"]

        response = await async_client.delete(
            f"/api/crews/{crew_id}",
            headers=auth_header(test_player["token"])
        )
        assert response.status_code == 200

    async def test_non_creator_cannot_delete(self, async_client, test_player, test_player2):
        """Test non-creator cannot delete crew."""
        create_response = await async_client.post(
            "/api/crews",
            headers=auth_header(test_player["token"]),
            json={"name": "Protected Crew", "type": "open"}
        )
        crew_id = create_response.json()["id"]

        # Join with second player
        await async_client.post(
            f"/api/crews/{crew_id}/join",
            headers=auth_header(test_player2["token"])
        )

        # Try to delete as non-creator
        response = await async_client.delete(
            f"/api/crews/{crew_id}",
            headers=auth_header(test_player2["token"])
        )
        assert response.status_code == 403
