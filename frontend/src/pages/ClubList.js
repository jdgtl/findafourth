import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { clubAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  ArrowDownAZ,
  ArrowUpZA,
  Star,
  Users,
  UserCheck,
} from 'lucide-react';

const ClubList = () => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(true);
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');

  const fetchClubs = useCallback(async () => {
    try {
      const response = await clubAPI.getWithDetails();
      setClubs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  // Get unique leagues and divisions for filters
  const { leagues, divisions } = useMemo(() => {
    const leagueSet = new Set();
    const divisionSet = new Set();

    clubs.forEach((club) => {
      if (club.league) leagueSet.add(club.league);
      if (club.divisions) {
        club.divisions.forEach((d) => divisionSet.add(d));
      }
    });

    return {
      leagues: Array.from(leagueSet).sort(),
      divisions: Array.from(divisionSet).sort(),
    };
  }, [clubs]);

  // User's club data (always shown, not affected by filters)
  const userClub = player?.home_club;
  const userClubData = useMemo(() => {
    if (!userClub) return null;
    return clubs.find((c) => c.name === userClub);
  }, [clubs, userClub]);

  // Filter and sort clubs (excluding user's club)
  const filteredClubs = useMemo(() => {
    let result = clubs.filter((c) => c.name !== userClub);

    // Apply league filter
    if (leagueFilter && leagueFilter !== 'all') {
      result = result.filter((c) => c.league === leagueFilter);
    }

    // Apply division filter
    if (divisionFilter && divisionFilter !== 'all') {
      result = result.filter((c) => c.divisions?.includes(divisionFilter));
    }

    // Sort alphabetically
    result.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [clubs, userClub, leagueFilter, divisionFilter, sortAsc]);

  const hasActiveFilters = (leagueFilter && leagueFilter !== 'all') || (divisionFilter && divisionFilter !== 'all');

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4" data-testid="clubs-page">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* User's Club - Very top */}
            {userClubData && (
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/clubs/${encodeURIComponent(userClubData.name)}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    My Club
                  </span>
                </div>
                <Card className="border-amber-400 border-2 bg-amber-50 dark:bg-amber-900/20 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="font-semibold text-base text-gray-900 dark:text-white flex-1 truncate">
                        {userClubData.name}
                      </span>
                      <div className="flex items-center gap-3 text-sm text-gray-500 shrink-0">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{userClubData.member_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600">
                          <UserCheck className="w-4 h-4" />
                          <span>{userClubData.registered_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Header with count */}
            <div className="flex items-center justify-between pt-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clubs</h1>
              <Badge variant="secondary" className="text-sm">
                {filteredClubs.length} club{filteredClubs.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3">
              <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Leagues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues</SelectItem>
                  {leagues.map((league) => (
                    <SelectItem key={league} value={league}>
                      {league}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortAsc(!sortAsc)}
                className="h-10 w-10"
                title={sortAsc ? 'Sort Z-A' : 'Sort A-Z'}
              >
                {sortAsc ? (
                  <ArrowDownAZ className="w-5 h-5" />
                ) : (
                  <ArrowUpZA className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* All Clubs Grid */}
            {filteredClubs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredClubs.map((club) => (
                  <ClubCard
                    key={club.name}
                    club={club}
                    onClick={() => navigate(`/clubs/${encodeURIComponent(club.name)}`)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {hasActiveFilters ? 'No clubs match your filters' : 'No clubs found'}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setLeagueFilter('all');
                        setDivisionFilter('all');
                      }}
                      className="mt-2 text-emerald-600"
                    >
                      Clear filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

const ClubCard = ({ club, onClick }) => (
  <Card
    className="cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
    data-testid="club-card"
  >
    <CardContent className="p-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <span className="font-medium text-sm text-gray-900 dark:text-white flex-1 truncate">
          {club.name}
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{club.member_count || 0}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{club.registered_count || 0}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ClubList;
