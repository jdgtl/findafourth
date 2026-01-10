import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clubAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Building2, Users, UserCheck, Search, MapPin } from 'lucide-react';

const ClubList = () => {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClubs = useCallback(async () => {
    try {
      const response = await clubAPI.list();
      setClubs(response.data.clubs || []);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  // Group clubs by league
  const clubsByLeague = clubs.reduce((acc, club) => {
    const league = club.league || 'Other';
    if (!acc[league]) {
      acc[league] = [];
    }
    acc[league].push(club);
    return acc;
  }, {});

  // Filter clubs by search term
  const filterClubs = (clubList) => {
    if (!searchTerm) return clubList;
    return clubList.filter(
      (club) =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.division?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // League order
  const leagueOrder = ['Metrowest', 'North Shore', "Metrowest Women's Day League"];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="clubs-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clubs</h1>
          <Badge variant="secondary" className="text-sm">
            {clubs.length} clubs
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search clubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="club-search"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {leagueOrder.map((league) => {
              const leagueClubs = filterClubs(clubsByLeague[league] || []);
              if (leagueClubs.length === 0) return null;

              return (
                <section key={league}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {league}
                    </h2>
                    <Badge variant="outline" className="text-xs">
                      {leagueClubs.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {leagueClubs.map((club) => (
                      <ClubCard
                        key={club.id}
                        club={club}
                        onClick={() => navigate(`/clubs/${encodeURIComponent(club.name)}`)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {Object.keys(clubsByLeague).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No clubs found
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Club data is synced every Tuesday
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
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
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {club.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {club.division}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 text-gray-500">
            <Users className="w-4 h-4" />
            <span>{club.member_count || 0}</span>
          </div>
          {club.registered_count > 0 && (
            <div className="flex items-center gap-1 text-emerald-600">
              <UserCheck className="w-4 h-4" />
              <span>{club.registered_count}</span>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ClubList;
