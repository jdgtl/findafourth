# PTI Sync Feature - Implementation Plan

## Overview

Implement automated PTI (Platform Tennis Index) synchronization using Firecrawl to scrape player data from Paddlescores/Tenniscores and keep player ratings current in the Find a Fourth app.

**Goal:** Players link their Paddlescores profile once, and their PTI updates automatically weekly.

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Paddlescores   │     │    Firecrawl     │     │     MongoDB      │
│   Print Pages    │ ──▶ │       API        │ ──▶ │   players.pti    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                           │
                              ┌─────────────────────────────┘
                              ▼
                       ┌──────────────────┐
                       │  Find a Fourth   │
                       │       PWA        │
                       └──────────────────┘
```

---

## URL Patterns

### Player Print Page
```
Original:  https://gbpta.paddlescores.com/player.php?print&p={player_id}
Redirects: https://gbpta.tenniscores.com/?print&mod={mod_id}&p={player_id}
```

### Team Roster Page
```
https://gbpta.paddlescores.com/?mod={division_id}&team={team_id}
```

### Example URLs
- Print page: `https://gbpta.tenniscores.com/?print&mod=nndz-Sm5yb2lPdTcxdFJibXc9PQ%3D%3D&p=nndz-WkM2NXhyMzZoQT09`
- Team page: `https://gbpta.paddlescores.com/?mod=nndz-TjJiOWtORzkwTlJFb0NVU1NzOD0%3D&team=nndz-WnlHOHdyLy8%3D`

---

## Data to Extract

From player print page:
- **Player Name**: e.g., "Jonathan Glass"
- **PTI Score**: e.g., 35.3
- **Club**: e.g., "Cape Ann Platform Tennis"
- **Match History** (optional): Date, Opponent, Result, Rating

---

## Implementation Tasks

### Phase 1: Backend Service Setup

#### 1.1 Add Dependencies
**File:** `backend/requirements.txt`
```
httpx==0.27.0
```

#### 1.2 Create PTI Sync Service
**File:** `backend/services/pti_sync.py` (new file)

```python
import httpx
import os
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, parse_qs

FIRECRAWL_API_KEY = os.environ.get('FIRECRAWL_API_KEY')
FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1"


class PTISyncService:
    """Service for syncing PTI data from Paddlescores via Firecrawl"""

    def validate_print_url(self, url: str) -> bool:
        """Validate that URL is a valid Paddlescores/Tenniscores print page"""
        patterns = [
            r'https?://\w+\.paddlescores\.com/player\.php\?print&p=[\w\-=%]+',
            r'https?://\w+\.tenniscores\.com/\?print&mod=[\w\-=%]+&p=[\w\-=%]+'
        ]
        return any(re.match(p, url) for p in patterns)

    def parse_print_url(self, url: str) -> dict:
        """Extract league and player ID from print URL"""
        parsed = urlparse(url)
        params = parse_qs(parsed.query)

        league = parsed.netloc.split('.')[0]  # e.g., 'gbpta'
        player_id = params.get('p', [None])[0]
        mod_id = params.get('mod', [None])[0]

        return {
            'league': league,
            'player_id': player_id,
            'mod_id': mod_id,
            'original_url': url
        }

    async def extract_pti(self, print_url: str) -> dict:
        """
        Extract PTI data from a player's print page using Firecrawl.

        Returns:
            {
                'success': bool,
                'player_name': str,
                'pti': float,
                'club': str,
                'error': str (if failed)
            }
        """
        if not FIRECRAWL_API_KEY:
            return {'success': False, 'error': 'FIRECRAWL_API_KEY not configured'}

        if not self.validate_print_url(print_url):
            return {'success': False, 'error': 'Invalid Paddlescores print page URL'}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{FIRECRAWL_BASE_URL}/scrape",
                    headers={
                        "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "url": print_url,
                        "formats": ["extract"],
                        "extract": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "player_name": {
                                        "type": "string",
                                        "description": "The player's full name, usually displayed as a heading"
                                    },
                                    "pti": {
                                        "type": "number",
                                        "description": "Platform Tennis Index score, a decimal number like 35.3"
                                    },
                                    "club": {
                                        "type": "string",
                                        "description": "The player's home club name"
                                    }
                                },
                                "required": ["player_name", "pti"]
                            }
                        }
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    extracted = data.get("data", {}).get("extract", {})

                    if extracted.get("pti") is not None:
                        return {
                            'success': True,
                            'player_name': extracted.get("player_name"),
                            'pti': float(extracted.get("pti")),
                            'club': extracted.get("club"),
                            'synced_at': datetime.utcnow().isoformat()
                        }
                    else:
                        return {
                            'success': False,
                            'error': 'Could not extract PTI from page'
                        }
                else:
                    return {
                        'success': False,
                        'error': f'Firecrawl API error: {response.status_code}'
                    }

            except httpx.TimeoutException:
                return {'success': False, 'error': 'Request timed out'}
            except Exception as e:
                return {'success': False, 'error': str(e)}

    async def scrape_team_roster(self, team_url: str) -> dict:
        """
        Scrape all players and PTIs from a team roster page.

        Returns:
            {
                'success': bool,
                'team_name': str,
                'players': [{'name': str, 'pti': float}, ...],
                'error': str (if failed)
            }
        """
        if not FIRECRAWL_API_KEY:
            return {'success': False, 'error': 'FIRECRAWL_API_KEY not configured'}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{FIRECRAWL_BASE_URL}/scrape",
                    headers={
                        "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "url": team_url,
                        "formats": ["extract"],
                        "extract": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "team_name": {
                                        "type": "string",
                                        "description": "The team name"
                                    },
                                    "players": {
                                        "type": "array",
                                        "description": "List of players on the roster",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "name": {"type": "string"},
                                                "pti": {"type": "number"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    extracted = data.get("data", {}).get("extract", {})
                    return {
                        'success': True,
                        'team_name': extracted.get("team_name"),
                        'players': extracted.get("players", [])
                    }
                else:
                    return {
                        'success': False,
                        'error': f'Firecrawl API error: {response.status_code}'
                    }

            except Exception as e:
                return {'success': False, 'error': str(e)}
```

#### 1.3 Create Pydantic Models
**File:** `backend/server.py` (add to existing models section)

```python
class PTILinkRequest(BaseModel):
    print_page_url: str

class PTILinkResponse(BaseModel):
    success: bool
    pti: Optional[float] = None
    player_name: Optional[str] = None
    message: str

class PTISyncStatus(BaseModel):
    linked: bool
    print_page_url: Optional[str] = None
    current_pti: Optional[float] = None
    last_synced_at: Optional[datetime] = None
    sync_enabled: bool = False
```

---

### Phase 2: API Endpoints

#### 2.1 Link PTI Endpoint
**File:** `backend/server.py` (add endpoint)

```python
@api_router.post("/players/{player_id}/pti/link", response_model=PTILinkResponse)
async def link_pti(
    player_id: str,
    request: PTILinkRequest,
    current_player: dict = Depends(get_current_player)
):
    """
    Link a player's Paddlescores print page for PTI sync.
    Performs initial sync to verify the URL works.
    """
    # Verify ownership
    if current_player['id'] != player_id:
        raise HTTPException(status_code=403, detail="Can only link your own PTI")

    # Import service
    from services.pti_sync import PTISyncService
    pti_service = PTISyncService()

    # Validate URL format
    if not pti_service.validate_print_url(request.print_page_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Please provide your Paddlescores print page URL."
        )

    # Attempt first sync
    result = await pti_service.extract_pti(request.print_page_url)

    if not result['success']:
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract PTI: {result.get('error', 'Unknown error')}"
        )

    # Update player with PTI data
    await db.players.update_one(
        {"id": player_id},
        {"$set": {
            "pti": result['pti'],
            "pti_source_url": request.print_page_url,
            "pti_source_name": result.get('player_name'),
            "pti_last_synced": datetime.utcnow(),
            "pti_sync_enabled": True
        }}
    )

    return PTILinkResponse(
        success=True,
        pti=result['pti'],
        player_name=result.get('player_name'),
        message=f"PTI linked successfully! Current PTI: {result['pti']}"
    )
```

#### 2.2 Refresh PTI Endpoint
**File:** `backend/server.py` (add endpoint)

```python
@api_router.post("/players/{player_id}/pti/refresh")
async def refresh_pti(
    player_id: str,
    current_player: dict = Depends(get_current_player)
):
    """Manually refresh PTI from linked Paddlescores page"""

    # Get player
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if not player.get('pti_source_url'):
        raise HTTPException(
            status_code=400,
            detail="No PTI source linked. Please link your Paddlescores page first."
        )

    # Import and use service
    from services.pti_sync import PTISyncService
    pti_service = PTISyncService()

    result = await pti_service.extract_pti(player['pti_source_url'])

    if result['success']:
        old_pti = player.get('pti')
        new_pti = result['pti']

        await db.players.update_one(
            {"id": player_id},
            {"$set": {
                "pti": new_pti,
                "pti_last_synced": datetime.utcnow()
            }}
        )

        return {
            "success": True,
            "pti": new_pti,
            "previous_pti": old_pti,
            "changed": old_pti != new_pti
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh PTI: {result.get('error')}"
        )
```

#### 2.3 Get PTI Status Endpoint
**File:** `backend/server.py` (add endpoint)

```python
@api_router.get("/players/{player_id}/pti/status", response_model=PTISyncStatus)
async def get_pti_status(
    player_id: str,
    current_player: dict = Depends(get_current_player)
):
    """Get PTI sync status for a player"""

    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    return PTISyncStatus(
        linked=bool(player.get('pti_source_url')),
        print_page_url=player.get('pti_source_url'),
        current_pti=player.get('pti'),
        last_synced_at=player.get('pti_last_synced'),
        sync_enabled=player.get('pti_sync_enabled', False)
    )
```

#### 2.4 Unlink PTI Endpoint
**File:** `backend/server.py` (add endpoint)

```python
@api_router.delete("/players/{player_id}/pti/link")
async def unlink_pti(
    player_id: str,
    current_player: dict = Depends(get_current_player)
):
    """Unlink PTI sync for a player"""

    if current_player['id'] != player_id:
        raise HTTPException(status_code=403, detail="Can only unlink your own PTI")

    await db.players.update_one(
        {"id": player_id},
        {"$unset": {
            "pti_source_url": "",
            "pti_source_name": "",
            "pti_last_synced": "",
            "pti_sync_enabled": ""
        }}
    )

    return {"success": True, "message": "PTI sync unlinked"}
```

---

### Phase 3: Frontend Integration

#### 3.1 Add API Methods
**File:** `frontend/src/lib/api.js` (add to existing API)

```javascript
// Add to existing api object
ptiAPI: {
  getStatus: (playerId) => api.get(`/players/${playerId}/pti/status`),
  link: (playerId, printPageUrl) => api.post(`/players/${playerId}/pti/link`, { print_page_url: printPageUrl }),
  refresh: (playerId) => api.post(`/players/${playerId}/pti/refresh`),
  unlink: (playerId) => api.delete(`/players/${playerId}/pti/link`),
},
```

#### 3.2 Create PTI Link Component
**File:** `frontend/src/components/PTILinkCard.js` (new file)

```jsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link, Unlink, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { ptiAPI } from '@/lib/api';
import { toast } from 'sonner';

export function PTILinkCard({ playerId, currentPTI, onPTIUpdate }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [printUrl, setPrintUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatus();
  }, [playerId]);

  const fetchStatus = async () => {
    try {
      const response = await ptiAPI.getStatus(playerId);
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch PTI status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!printUrl.trim()) {
      setError('Please enter your Paddlescores print page URL');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const response = await ptiAPI.link(playerId, printUrl);
      toast.success(response.data.message);
      setStatus({ ...status, linked: true, current_pti: response.data.pti });
      if (onPTIUpdate) onPTIUpdate(response.data.pti);
      setPrintUrl('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to link PTI');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setActionLoading(true);
    try {
      const response = await ptiAPI.refresh(playerId);
      if (response.data.changed) {
        toast.success(`PTI updated: ${response.data.previous_pti} → ${response.data.pti}`);
      } else {
        toast.info('PTI is already up to date');
      }
      setStatus({ ...status, current_pti: response.data.pti });
      if (onPTIUpdate) onPTIUpdate(response.data.pti);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to refresh PTI');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlink = async () => {
    setActionLoading(true);
    try {
      await ptiAPI.unlink(playerId);
      toast.success('PTI sync unlinked');
      setStatus({ ...status, linked: false, print_page_url: null });
    } catch (err) {
      toast.error('Failed to unlink PTI');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          PTI Sync
          {status?.linked && (
            <Badge variant="secondary" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Linked
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {status?.linked
            ? 'Your PTI syncs automatically from Paddlescores'
            : 'Link your Paddlescores profile for automatic PTI updates'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status?.linked ? (
          <>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current PTI</p>
                <p className="text-3xl font-bold">{status.current_pti}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last synced</p>
                <p className="text-sm">
                  {status.last_synced_at
                    ? new Date(status.last_synced_at).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="print-url">Paddlescores Print Page URL</Label>
              <Input
                id="print-url"
                placeholder="https://gbpta.paddlescores.com/player.php?print&p=..."
                value={printUrl}
                onChange={(e) => setPrintUrl(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertDescription>
                <strong>How to find your print page URL:</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                  <li>Go to your league's Paddlescores site</li>
                  <li>Find your name on your team roster</li>
                  <li>Click "Print" next to your name</li>
                  <li>Copy the URL from your browser</li>
                </ol>
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {status?.linked ? (
          <>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Now
            </Button>
            <Button
              variant="ghost"
              onClick={handleUnlink}
              disabled={actionLoading}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Unlink
            </Button>
          </>
        ) : (
          <Button onClick={handleLink} disabled={actionLoading}>
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Link className="h-4 w-4 mr-2" />
            )}
            Link PTI
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

#### 3.3 Add to Profile Page
**File:** `frontend/src/pages/Profile.js` (add import and component)

```jsx
// Add import at top
import { PTILinkCard } from '@/components/PTILinkCard';

// Add inside the profile page component, after other profile sections
<PTILinkCard
  playerId={player.id}
  currentPTI={player.pti}
  onPTIUpdate={(newPTI) => setPlayer({...player, pti: newPTI})}
/>
```

---

### Phase 4: Background Sync Job (Optional)

#### 4.1 Create Sync Job
**File:** `backend/jobs/pti_sync_job.py` (new file)

```python
"""
Weekly PTI sync job.
Run with: python -m jobs.pti_sync_job
Or schedule with cron: 0 0 * * 0 cd /app && python -m jobs.pti_sync_job
"""

import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Import the service
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.pti_sync import PTISyncService


async def sync_all_ptis():
    """Sync PTIs for all players with sync enabled"""

    # Connect to database
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'needafourth')

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    pti_service = PTISyncService()

    # Find all players with PTI sync enabled
    players = await db.players.find({
        "pti_sync_enabled": True,
        "pti_source_url": {"$exists": True, "$ne": None}
    }).to_list(1000)

    print(f"Found {len(players)} players with PTI sync enabled")

    success_count = 0
    fail_count = 0
    updated_count = 0

    for player in players:
        try:
            result = await pti_service.extract_pti(player['pti_source_url'])

            if result['success']:
                old_pti = player.get('pti')
                new_pti = result['pti']

                await db.players.update_one(
                    {"id": player['id']},
                    {"$set": {
                        "pti": new_pti,
                        "pti_last_synced": datetime.utcnow()
                    }}
                )

                success_count += 1

                if old_pti != new_pti:
                    updated_count += 1
                    print(f"  Updated {player.get('name', player['id'])}: {old_pti} → {new_pti}")
            else:
                fail_count += 1
                print(f"  Failed for {player.get('name', player['id'])}: {result.get('error')}")

        except Exception as e:
            fail_count += 1
            print(f"  Error for {player.get('name', player['id'])}: {e}")

        # Rate limit: wait between requests to be nice to Firecrawl
        await asyncio.sleep(2)

    print(f"\nSync complete: {success_count} success, {fail_count} failed, {updated_count} updated")

    client.close()


if __name__ == "__main__":
    asyncio.run(sync_all_ptis())
```

---

### Phase 5: Environment Configuration

#### 5.1 Add Environment Variables
**File:** `backend/.env.example` (create or update)

```env
# Existing vars...
MONGO_URL=mongodb://localhost:27017
DB_NAME=needafourth
JWT_SECRET=your-secret-key-change-in-production

# PTI Sync (Firecrawl)
FIRECRAWL_API_KEY=fc-your-api-key-here
```

#### 5.2 Document Setup
**File:** `backend/README.md` (add section)

```markdown
## PTI Sync Setup

1. Create a free account at [firecrawl.dev](https://firecrawl.dev)
2. Get your API key from the dashboard
3. Add to environment: `FIRECRAWL_API_KEY=fc-your-key`

### Manual Sync Job
```bash
python -m jobs.pti_sync_job
```

### Scheduled Sync (cron)
```bash
# Run weekly on Sunday at midnight
0 0 * * 0 cd /path/to/backend && python -m jobs.pti_sync_job
```
```

---

## Testing Checklist

### Backend Tests
- [ ] `PTISyncService.validate_print_url()` accepts valid URLs
- [ ] `PTISyncService.validate_print_url()` rejects invalid URLs
- [ ] `PTISyncService.extract_pti()` returns correct data structure
- [ ] `/players/{id}/pti/link` creates link and updates PTI
- [ ] `/players/{id}/pti/refresh` updates PTI from source
- [ ] `/players/{id}/pti/status` returns correct status
- [ ] `/players/{id}/pti/link` DELETE removes link

### Frontend Tests
- [ ] PTILinkCard shows "Link PTI" when not linked
- [ ] PTILinkCard shows current PTI when linked
- [ ] Link button validates URL before submitting
- [ ] Refresh button updates PTI display
- [ ] Unlink button removes the link
- [ ] Error messages display correctly

### Integration Tests
- [ ] Full flow: Link → Verify PTI → Refresh → Unlink
- [ ] Background sync job processes all enabled players

---

## Validation Commands

```bash
# Quick syntax check
./scripts/validate.sh --quick

# Full validation with deps
./scripts/validate.sh --install

# Test Firecrawl API directly
curl -X POST https://api.firecrawl.dev/v1/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://gbpta.tenniscores.com/?print&mod=nndz-Sm5yb2lPdTcxdFJibXc9PQ%3D%3D&p=nndz-WkM2NXhyMzZoQT09",
    "formats": ["extract"],
    "extract": {
      "schema": {
        "type": "object",
        "properties": {
          "player_name": {"type": "string"},
          "pti": {"type": "number"},
          "club": {"type": "string"}
        }
      }
    }
  }'
```

---

## Cost Estimate

| Usage | Credits/Month | Cost |
|-------|---------------|------|
| 200 players, manual refresh only | ~200 | Free tier |
| 200 players, weekly auto-sync | ~800 | Free tier |
| 500 players, weekly auto-sync | ~2000 | $16/mo Hobby |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/requirements.txt` | Add `httpx` |
| `backend/services/pti_sync.py` | Create (new) |
| `backend/server.py` | Add models and endpoints |
| `backend/jobs/pti_sync_job.py` | Create (new) |
| `backend/.env.example` | Add Firecrawl key |
| `frontend/src/lib/api.js` | Add ptiAPI methods |
| `frontend/src/components/PTILinkCard.js` | Create (new) |
| `frontend/src/pages/Profile.js` | Add PTILinkCard |

---

## Start Command for New Session

```
Implement the PTI Sync feature following PTI_SYNC_IMPLEMENTATION.md.

Work through each phase in order:
1. Backend service setup
2. API endpoints
3. Frontend integration
4. Background sync job
5. Environment configuration

After each phase:
1. Run ./scripts/validate.sh --quick
2. Fix any errors before proceeding
3. Commit with descriptive message

Test the full flow manually before marking complete.
Do not ask for human input unless blocked.
```
