import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { crewAPI, playerAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfileImageUrl } from '@/lib/utils';
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
  UserPlus,
  UserMinus,
  Trash2,
  Loader2,
  Search,
  Users,
} from 'lucide-react';

const CrewDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [crew, setCrew] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchCrew = useCallback(async () => {
    try {
      const response = await crewAPI.get(id);
      setCrew(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this crew');
      } else {
        setError('Failed to load crew');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCrew();
  }, [fetchCrew]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await playerAPI.list({ search: query });
      // Filter out existing members
      const memberIds = crew?.members?.map((m) => m.id) || [];
      setSearchResults(response.data.filter((p) => !memberIds.includes(p.id)));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddPlayer = async (playerId) => {
    setActionLoading(true);
    try {
      await crewAPI.addMember(id, playerId);
      setAddOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchCrew();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add player');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    setActionLoading(true);
    try {
      await crewAPI.removeMember(id, playerId);
      fetchCrew();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove player');
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

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <Button variant="ghost" className="mb-4" onClick={() => navigate('/crews')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error || 'Crew not found'}</AlertDescription>
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
            <CardTitle className="text-xl">{crew.name}</CardTitle>
            <Badge variant="secondary" className="w-fit">
              {crew.member_count} player{crew.member_count !== 1 ? 's' : ''}
            </Badge>
          </CardHeader>
        </Card>

        {/* Players */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Players</CardTitle>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="add-players-btn">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Players</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
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
                              <AvatarImage src={getProfileImageUrl(p.profile_image_url)} />
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
                            onClick={() => handleAddPlayer(p.id)}
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
          </CardHeader>
          <CardContent>
            {crew.members?.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No players yet</p>
                <p className="text-sm text-gray-400">Add players to this crew</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crew.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={getProfileImageUrl(member.profile_image_url)} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">
                          {member.home_club}
                          {member.pti && ` • PTI ${member.pti}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleRemovePlayer(member.id)}
                      disabled={actionLoading}
                      data-testid={`remove-${member.id}`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete */}
        <Card>
          <CardContent className="p-4">
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
                    This will permanently delete the crew. This action cannot be undone.
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CrewDetail;
