import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clubAPI, inviteAPI, favoriteAPI, crewAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getProfileImageUrl } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Building2,
  Users,
  UserCheck,
  UsersRound,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
  Check,
  Plus,
} from 'lucide-react';

const ClubDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { player: currentPlayer } = useAuth();
  const [club, setClub] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [crews, setCrews] = useState([]);
  const [addToCrewPlayer, setAddToCrewPlayer] = useState(null);

  const fetchClub = useCallback(async () => {
    try {
      const response = await clubAPI.get(decodeURIComponent(id));
      setClub(response.data.club);
      setRoster(response.data.roster || []);
    } catch (err) {
      console.error('Failed to fetch club:', err);
      setError('Club not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  // Fetch favorites and crews for action icons
  useEffect(() => {
    const fetchFavoritesAndCrews = async () => {
      try {
        const [favRes, crewRes] = await Promise.all([
          favoriteAPI.list(),
          crewAPI.list(),
        ]);
        setFavoriteIds(new Set(favRes.data.map((f) => f.id)));
        setCrews(crewRes.data);
      } catch (err) {
        // Non-critical — icons just won't show pre-filled state
      }
    };
    fetchFavoritesAndCrews();
  }, []);

  const toggleFavorite = useCallback(async (playerId) => {
    const wasFavorite = favoriteIds.has(playerId);
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
    try {
      if (wasFavorite) await favoriteAPI.remove(playerId);
      else await favoriteAPI.add(playerId);
    } catch {
      // Revert on error
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(playerId);
        else next.delete(playerId);
        return next;
      });
    }
  }, [favoriteIds]);

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPTI = (pti) => {
    if (pti === null || pti === undefined) return 'N/A';
    return pti.toFixed(1);
  };

  const [sortBy, setSortBy] = useState('first'); // 'first' | 'last' | 'pti_asc' | 'pti_desc'

  const sortPlayers = (players) => {
    return [...players].sort((a, b) => {
      switch (sortBy) {
        case 'first': {
          const aFirst = a.player_name.split(' ')[0] || '';
          const bFirst = b.player_name.split(' ')[0] || '';
          return aFirst.localeCompare(bFirst);
        }
        case 'last': {
          const aParts = a.player_name.split(' ');
          const bParts = b.player_name.split(' ');
          const aLast = aParts[aParts.length - 1] || '';
          const bLast = bParts[bParts.length - 1] || '';
          return aLast.localeCompare(bLast);
        }
        case 'pti_asc':
          return (a.pti_value ?? Infinity) - (b.pti_value ?? Infinity);
        case 'pti_desc':
          return (b.pti_value ?? -Infinity) - (a.pti_value ?? -Infinity);
        default:
          return 0;
      }
    });
  };

  // Separate registered and non-registered players
  const registeredPlayers = sortPlayers(roster.filter((p) => p.is_registered));
  const nonRegisteredPlayers = sortPlayers(roster.filter((p) => !p.is_registered));

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/clubs')}
              >
                Back to Clubs
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="club-detail-page">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/clubs')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {club?.name}
          </h1>
        </div>

        {/* Stats Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-900 dark:text-white">
                  <Users className="w-5 h-5 text-gray-400" />
                  {roster.length}
                </div>
                <p className="text-sm text-gray-500">Total Members</p>
              </div>
              <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                  {registeredPlayers.length}
                </div>
                <p className="text-sm text-gray-500">Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sort Controls */}
        {roster.length > 0 && (
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-gray-400 mr-0.5">Sort:</span>
            {[
              { key: 'first', label: 'First' },
              { key: 'last', label: 'Last' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
                  sortBy === key
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
            {[
              { key: 'pti_asc', Icon: ArrowUp },
              { key: 'pti_desc', Icon: ArrowDown },
            ].map(({ key, Icon }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5 ${
                  sortBy === key
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-xs font-medium">PTI</span>
                <Icon className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Registered Players */}
        {registeredPlayers.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Registered Club Members
            </h2>
            <div className="space-y-2">
              {registeredPlayers.map((player, idx) => (
                <PlayerCard
                  key={idx}
                  player={player}
                  isRegistered
                  clubName={club?.name}
                  currentPlayerId={currentPlayer?.id}
                  isFavorite={favoriteIds.has(player.player_id)}
                  onToggleFavorite={toggleFavorite}
                  onAddToCrew={setAddToCrewPlayer}
                />
              ))}
            </div>
          </section>
        )}

        {/* Non-Registered Players */}
        {nonRegisteredPlayers.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              All Club Members
              <Badge variant="outline" className="text-xs font-normal">
                Unregistered
              </Badge>
            </h2>
            <div className="space-y-2">
              {nonRegisteredPlayers.map((player, idx) => (
                <PlayerCard key={idx} player={player} isRegistered={false} clubName={club?.name} />
              ))}
            </div>
          </section>
        )}
      </div>

      <AddToCrewModal
        isOpen={!!addToCrewPlayer}
        onClose={() => setAddToCrewPlayer(null)}
        player={addToCrewPlayer}
        crews={crews}
        onCrewsUpdated={(updated) => setCrews(updated)}
      />
    </AppLayout>
  );
};

const InviteModal = ({ isOpen, onClose, playerName, clubName, inviteType }) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const isEmail = inviteType === 'email';
  const placeholder = isEmail ? 'email@example.com' : '(555) 123-4567';
  const label = isEmail ? 'Email Address' : 'Phone Number';
  const inputType = isEmail ? 'email' : 'tel';

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isEmail && !validateEmail(value)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isEmail && !validatePhone(value)) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setLoading(true);
    try {
      const data = {
        player_name: playerName,
        club_name: clubName,
      };
      if (isEmail) {
        data.email = value;
      } else {
        data.phone = value.replace(/\D/g, '');
      }

      await inviteAPI.send(data);
      setSuccess(true);
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to send invite';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setValue('');
    setError(null);
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEmail ? (
              <Mail className="w-5 h-5 text-blue-500" />
            ) : (
              <MessageSquare className="w-5 h-5 text-green-500" />
            )}
            Invite {playerName}
          </DialogTitle>
          <DialogDescription>
            Send an invite to join Find4th. They'll receive a link to sign up.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Invite Sent!
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {playerName} will receive your invite shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-input">{label}</Label>
                <Input
                  id="invite-input"
                  type={inputType}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !value}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AddToCrewModal = ({ isOpen, onClose, player, crews, onCrewsUpdated }) => {
  const [crewMembers, setCrewMembers] = useState({}); // crewId -> Set of playerIds
  const [loadingCrews, setLoadingCrews] = useState(false);
  const [addingTo, setAddingTo] = useState(null); // crewId currently adding to
  const [addedTo, setAddedTo] = useState(new Set()); // crewIds successfully added during this session
  const [newCrewName, setNewCrewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch crew members when modal opens to know which crews already contain this player
  useEffect(() => {
    if (!isOpen || !player) return;
    const fetchMembers = async () => {
      setLoadingCrews(true);
      try {
        const results = await Promise.all(
          crews.map((c) => crewAPI.get(c.id).then((r) => [c.id, r.data.members]))
        );
        const membersMap = {};
        for (const [crewId, members] of results) {
          membersMap[crewId] = new Set(members.map((m) => m.id));
        }
        setCrewMembers(membersMap);
      } catch {
        // Non-critical — we just won't know pre-existing membership
      } finally {
        setLoadingCrews(false);
      }
    };
    fetchMembers();
  }, [isOpen, player, crews]);

  const handleClose = () => {
    setError(null);
    setAddedTo(new Set());
    setNewCrewName('');
    onClose();
  };

  const handleAddToCrew = async (crewId) => {
    setAddingTo(crewId);
    setError(null);
    try {
      await crewAPI.addMember(crewId, player.player_id);
      setAddedTo((prev) => new Set(prev).add(crewId));
      setCrewMembers((prev) => {
        const next = { ...prev };
        next[crewId] = new Set(prev[crewId] || []).add(player.player_id);
        return next;
      });
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to add to crew';
      setError(message);
    } finally {
      setAddingTo(null);
    }
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newCrewName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const createRes = await crewAPI.create({ name: newCrewName.trim() });
      const newCrew = createRes.data;
      await crewAPI.addMember(newCrew.id, player.player_id);
      // Refresh crews list
      const crewRes = await crewAPI.list();
      onCrewsUpdated(crewRes.data);
      setAddedTo((prev) => new Set(prev).add(newCrew.id));
      setCrewMembers((prev) => ({
        ...prev,
        [newCrew.id]: new Set([player.player_id]),
      }));
      setNewCrewName('');
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to create crew';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const isAlreadyInCrew = (crewId) =>
    crewMembers[crewId]?.has(player?.player_id) || addedTo.has(crewId);

  if (!player) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-blue-500" />
            Add {player.player_name} to Crew
          </DialogTitle>
          <DialogDescription>
            Choose an existing crew or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-60 overflow-y-auto">
          {loadingCrews ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : crews.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              You don't have any crews yet. Create one below.
            </p>
          ) : (
            crews.map((crew) => {
              const alreadyIn = isAlreadyInCrew(crew.id);
              return (
                <div
                  key={crew.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md border border-gray-200 dark:border-gray-700"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {crew.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {crew.member_count} member{crew.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {alreadyIn ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Added
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={addingTo === crew.id}
                      onClick={() => handleAddToCrew(crew.id)}
                    >
                      {addingTo === crew.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleCreateAndAdd} className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Input
            placeholder="New crew name"
            value={newCrewName}
            onChange={(e) => setNewCrewName(e.target.value)}
            disabled={creating}
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={creating || !newCrewName.trim()}>
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create & Add'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PlayerCard = ({ player, isRegistered, clubName, currentPlayerId, isFavorite, onToggleFavorite, onAddToCrew }) => {
  const [inviteModal, setInviteModal] = useState({ open: false, type: null });
  const isSelf = isRegistered && player.player_id === currentPlayerId;

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPTI = (pti) => {
    if (pti === null || pti === undefined) return 'N/A';
    return pti.toFixed(1);
  };

  const handleInviteEmail = (e) => {
    e.stopPropagation();
    setInviteModal({ open: true, type: 'email' });
  };

  const handleInviteText = (e) => {
    e.stopPropagation();
    setInviteModal({ open: true, type: 'sms' });
  };

  return (
    <>
      <InviteModal
        isOpen={inviteModal.open}
        onClose={() => setInviteModal({ open: false, type: null })}
        playerName={player.player_name}
        clubName={clubName}
        inviteType={inviteModal.type}
      />
    <TooltipProvider>
      <div
        className="group p-3 rounded-[0.4rem] transition-all duration-500 ease-out
          border border-transparent
          hover:border-gray-300 hover:duration-300
          dark:hover:border-gray-600"
        data-testid="player-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 transition-all duration-300 opacity-80 group-hover:opacity-100">
              <AvatarImage src={getProfileImageUrl(player.profile_image_url)} />
              <AvatarFallback className={`transition-colors duration-300 ${isRegistered ? 'bg-emerald-100/70 text-emerald-700 group-hover:bg-emerald-100' : 'bg-gray-100/70 text-gray-600 group-hover:bg-gray-100'}`}>
                {getInitials(player.player_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-medium transition-all duration-300
                    text-gray-600 dark:text-gray-400
                    group-hover:text-gray-900 dark:group-hover:text-white"
                  style={{
                    textShadow: 'inset 1px 1px 1px rgba(255,255,255,0.8), inset -1px -1px 1px rgba(0,0,0,0.1)'
                  }}
                >
                  {player.player_name}
                </h3>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {/* Action icons - only for registered, non-self players */}
            {isRegistered && !isSelf && (
              <>
                <div className="flex items-center gap-1 pr-3 action-icons opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(player.player_id);
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            isFavorite
                              ? 'fill-gray-400 text-gray-400 group-hover:fill-gray-500 group-hover:text-gray-500'
                              : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCrew(player);
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 group-hover:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <UsersRound className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to crew</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="h-8 w-px bg-gray-200/50 dark:bg-gray-600/50 mr-3 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors duration-300" />
              </>
            )}
            {/* Invite icons - only for non-registered */}
            {!isRegistered && (
              <>
                <div className="flex items-center gap-2 pr-3 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleInviteEmail}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 group-hover:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Invite via email</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleInviteText}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 group-hover:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Invite via text</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {/* Pipe separator */}
                <div className="h-8 w-px bg-gray-200/50 dark:bg-gray-600/50 mr-3 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors duration-300" />
              </>
            )}
            {/* PTI - always on far right */}
            <div className="text-center min-w-[36px]">
              <span
                className="font-semibold leading-none transition-all duration-300
                  text-gray-500 dark:text-gray-500
                  group-hover:text-gray-900 dark:group-hover:text-white"
              >
                {formatPTI(player.pti_value)}
              </span>
              <span className="block text-[10px] text-gray-400 group-hover:text-gray-500 leading-tight mt-0.5 transition-colors duration-300">PTI</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
    </>
  );
};

export default ClubDetail;
