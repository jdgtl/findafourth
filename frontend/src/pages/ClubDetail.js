import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clubAPI } from '@/lib/api';
import { getProfileImageUrl } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Building2,
  Users,
  UserCheck,
  ArrowLeft,
  MapPin,
  Mail,
  Trophy
} from 'lucide-react';

const ClubDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Separate registered and non-registered players
  const registeredPlayers = roster.filter((p) => p.is_registered);
  const nonRegisteredPlayers = roster.filter((p) => !p.is_registered);

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {club?.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>{club?.league}</span>
              <span>-</span>
              <span>{club?.division}</span>
            </div>
          </div>
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
                <p className="text-sm text-gray-500">On FindaFourth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registered Players */}
        {registeredPlayers.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              On FindaFourth
            </h2>
            <div className="space-y-2">
              {registeredPlayers.map((player, idx) => (
                <PlayerCard
                  key={idx}
                  player={player}
                  onClick={() => navigate(`/players/${player.player_id}`)}
                  isRegistered
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
              Club Members
              <Badge variant="outline" className="text-xs font-normal">
                Not on app yet
              </Badge>
            </h2>
            <div className="space-y-2">
              {nonRegisteredPlayers.map((player, idx) => (
                <PlayerCard key={idx} player={player} isRegistered={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

const PlayerCard = ({ player, onClick, isRegistered }) => {
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

  return (
    <Card
      className={`${
        isRegistered ? 'cursor-pointer hover:shadow-md' : ''
      } transition-shadow`}
      onClick={isRegistered ? onClick : undefined}
      data-testid="player-card"
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={getProfileImageUrl(player.profile_image_url)} />
              <AvatarFallback className={isRegistered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                {getInitials(player.player_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {player.player_name}
                </h3>
                {isRegistered && (
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                    Member
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatPTI(player.pti_value)}
                </span>
              </div>
              <span className="text-xs text-gray-500">PTI</span>
            </div>
            {!isRegistered && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement invite functionality
                  alert('Invite feature coming soon!');
                }}
              >
                <Mail className="w-3 h-3 mr-1" />
                Invite
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClubDetail;
