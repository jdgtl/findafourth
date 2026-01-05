import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { crewAPI, playerAPI } from '@/lib/api';
import { logError } from '@/lib/errors';
import { useDebounce } from '@/hooks/useDebounce';
import { getInitials } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Crown,
  Lock,
  Globe,
  UserPlus,
  UserMinus,
  Trash2,
  LogOut,
  Loader2,
  Search,
} from 'lucide-react';

const CrewDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { player } = useAuth();
  const [crew, setCrew] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Debounce search query to prevent API calls on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const fetchCrew = useCallback(async () => {
    try {
      const response = await crewAPI.get(id);
      setCrew(response.data);
    } catch (err) {
      setError('Failed to load crew');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCrew();
  }, [fetchCrew]);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await playerAPI.list({ search: debouncedSearchQuery });
        // Filter out existing members
        const memberIds = crew?.members?.map((m) => m.id) || [];
        setSearchResults(response.data.filter((p) => !memberIds.includes(p.id)));
      } catch (err) {
        logError('CrewDetail.search', err);
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, crew]);

  const handleInvite = async (playerId) => {
    setActionLoading(true);
    try {
      await crewAPI.addMember(id, playerId);
      setInviteOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchCrew();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (playerId) => {
    setActionLoading(true);
    try {
      await crewAPI.removeMember(id, playerId);
      fetchCrew();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      await crewAPI.join(id);
      fetchCrew();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join crew');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await crewAPI.leave(id);
      navigate('/crews');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to leave crew');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await crewAPI.delete(id);
      navigate('/crews');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete crew');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!crew) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto">
          <Alert variant="destructive">
            <AlertDescription>Crew not found</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-4" data-testid="crew-detail-page">
        <Button variant="ghost" onClick={() => navigate('/crews')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Crew Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {crew.name}
                  {crew.is_creator && <Crown className="w-5 h-5 text-amber-500" />}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  {crew.type === 'invite_only' ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Invite Only
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Open
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {crew.member_count} member{crew.member_count !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Members</CardTitle>
            {crew.is_creator && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="invite-players-btn">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Players</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="search-players-input"
                      />
                    </div>
                    {searching ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {searchResults.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                                  {getInitials(p.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.home_club}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleInvite(p.id)}
                              disabled={actionLoading}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <p className="text-center text-gray-500 py-4">No players found</p>
                    ) : (
                      <p className="text-center text-gray-500 py-4">
                        Type at least 2 characters to search
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {crew.members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name}</p>
                        {member.id === crew.created_by && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {member.home_club}
                        {member.pti && ` • PTI ${member.pti}`}
                      </p>
                    </div>
                  </div>
                  {crew.is_creator && member.id !== crew.created_by && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={actionLoading}
                      data-testid={`remove-${member.id}`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {!crew.is_member && crew.type === 'open' && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleJoin}
                disabled={actionLoading}
                data-testid="join-crew-btn"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Join Crew
              </Button>
            )}

            {crew.is_member && !crew.is_creator && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" data-testid="leave-crew-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Crew
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave this crew?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You can rejoin anytime if it's an open crew, or be invited again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {crew.is_creator && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700"
                    data-testid="delete-crew-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Crew
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this crew?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the crew and remove all members. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CrewDetail;
