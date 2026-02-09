import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { clubAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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

  const userClub = player?.home_club;
  const userClubData = useMemo(() => {
    if (!userClub) return null;
    return clubs.find((c) => c.name === userClub);
  }, [clubs, userClub]);

  const filteredClubs = useMemo(() => {
    let result = clubs.filter((c) => c.name !== userClub);

    if (leagueFilter && leagueFilter !== 'all') {
      result = result.filter((c) => c.league === leagueFilter);
    }

    if (divisionFilter && divisionFilter !== 'all') {
      result = result.filter((c) => c.divisions?.includes(divisionFilter));
    }

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
            {/* Hero skeleton */}
            <Skeleton className="h-52 w-full rounded-2xl" />
            {/* Filter skeleton */}
            <Skeleton className="h-10 w-full" />
            {/* Card skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* My Club Hero Card */}
            {userClubData && (
              <MyClubHeroCard
                club={userClubData}
                onClick={() => navigate(`/clubs/${encodeURIComponent(userClubData.name)}`)}
              />
            )}

            {/* Header with count */}
            <div className="flex items-center justify-between pt-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-warm font-serif">Clubs</h1>
              <Badge variant="secondary" className="text-sm">
                {filteredClubs.length} club{filteredClubs.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3">
              <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                <SelectTrigger className="w-[160px]">
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
                <SelectTrigger className="w-[130px]">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

const MyClubHeroCard = ({ club, onClick }) => {
  const memberCount = club.member_count || 0;
  const registeredCount = club.registered_count || 0;
  const adoptionPct = memberCount > 0 ? Math.round((registeredCount / memberCount) * 100) : 0;

  return (
    <div
      className="cursor-pointer group"
      onClick={onClick}
      data-testid="my-club-hero"
    >
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          My Club
        </span>
      </div>
      <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-600 bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-900/30 dark:to-amber-800/20 p-6 group-hover:shadow-lg transition-all">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-200 dark:bg-amber-700 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-amber-700 dark:text-amber-200" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {club.name}
            </h2>
            {(club.league || (club.divisions && club.divisions.length > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {club.league && (
                  <Badge variant="secondary" className="text-xs bg-amber-200/60 dark:bg-amber-700/50 text-amber-800 dark:text-amber-200 border-0">
                    {club.league}
                  </Badge>
                )}
                {club.divisions?.map((d) => (
                  <Badge key={d} variant="outline" className="text-xs border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-200/60 dark:bg-amber-700/40 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                {memberCount}
              </div>
              <div className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                Total Members
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center">
              <UserCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                {registeredCount}
              </div>
              <div className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                Registered
              </div>
            </div>
          </div>
        </div>

        {/* Adoption progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-amber-700/70 dark:text-amber-400/70">
              Adoption
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {adoptionPct}% on app
            </span>
          </div>
          <Progress
            value={adoptionPct}
            className="h-2 bg-amber-200/50 dark:bg-amber-800/50 [&>div]:bg-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};

const ClubCard = ({ club, onClick }) => {
  const memberCount = club.member_count || 0;
  const registeredCount = club.registered_count || 0;
  const adoptionPct = memberCount > 0 ? Math.round((registeredCount / memberCount) * 100) : 0;

  const visibleDivisions = club.divisions?.slice(0, 2) || [];
  const overflowCount = (club.divisions?.length || 0) - 2;

  return (
    <div data-testid="club-card">
      <Card
        className="cursor-pointer hover:shadow-lg transition-all h-full"
        onClick={onClick}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {club.name}
              </h3>
              {(club.league || visibleDivisions.length > 0) && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {club.league && (
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0">
                      {club.league}
                    </Badge>
                  )}
                  {visibleDivisions.map((d) => (
                    <Badge key={d} variant="outline" className="text-[11px] px-1.5 py-0">
                      {d}
                    </Badge>
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-0.5">
                      +{overflowCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator className="my-3" />

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{memberCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
              <span>{registeredCount}</span>
            </div>
            <div className="flex-1" />
            <span className="text-xs text-gray-400 dark:text-gray-500">{adoptionPct}%</span>
          </div>

          {/* Slim progress bar */}
          <Progress
            value={adoptionPct}
            className="h-1.5 mt-2 bg-gray-100 dark:bg-gray-800 [&>div]:bg-emerald-500"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubList;
