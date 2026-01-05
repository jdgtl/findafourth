import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { favoriteAPI, playerAPI } from '@/lib/api';
import { logError } from '@/lib/errors';
import { useDebounce } from '@/hooks/useDebounce';
import { getInitials } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Star, Plus, X, Search, Loader2, MapPin } from 'lucide-react';

const Favorites = () => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    try {
      const response = await favoriteAPI.list();
      setFavorites(response.data);
    } catch (err) {
      logError('Favorites.fetch', err);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search query to prevent API calls on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

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
        // Filter out self and existing favorites
        const favoriteIds = favorites.map((f) => f.id);
        setSearchResults(
          response.data.filter((p) => p.id !== player?.id && !favoriteIds.includes(p.id))
        );
      } catch (err) {
        logError('Favorites.search', err);
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, favorites, player]);

  const handleAddFavorite = async (playerId) => {
    setActionLoading(true);
    try {
      await favoriteAPI.add(playerId);
      setAddOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchFavorites();
      toast.success('Added to favorites');
    } catch (err) {
      logError('Favorites.add', err);
      toast.error('Failed to add favorite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFavorite = async (playerId) => {
    setActionLoading(true);
    try {
      await favoriteAPI.remove(playerId);
      fetchFavorites();
      toast.success('Removed from favorites');
    } catch (err) {
      logError('Favorites.remove', err);
      toast.error('Failed to remove favorite');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="favorites-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Favorites</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="add-favorite-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Favorite Player</DialogTitle>
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
                          onClick={() => handleAddFavorite(p.id)}
                          disabled={actionLoading}
                        >
                          <Star className="w-4 h-4" />
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
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No favorites yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Add players you frequently play with for quick access
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => (
              <Card key={fav.id} data-testid="favorite-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {getInitials(fav.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {fav.name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {fav.home_club}
                          {fav.pti && (
                            <Badge variant="outline" className="text-xs">
                              PTI {fav.pti}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleRemoveFavorite(fav.id)}
                      disabled={actionLoading}
                      data-testid={`remove-favorite-${fav.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;
