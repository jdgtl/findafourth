import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { crewAPI } from '@/lib/api';
import { logError } from '@/lib/errors';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, Crown, Lock, Globe } from 'lucide-react';

const Crews = () => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCrews = useCallback(async () => {
    try {
      const response = await crewAPI.list();
      setCrews(response.data);
    } catch (err) {
      logError('Crews.fetch', err);
      toast.error('Failed to load crews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrews();
  }, [fetchCrews]);

  const myCrews = crews.filter((c) => c.is_member);
  const otherCrews = crews.filter((c) => !c.is_member && c.type === 'open');

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="crews-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crews</h1>
          <Button
            onClick={() => navigate('/crews/new')}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="create-crew-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Crew
          </Button>
        </div>

        {/* My Crews */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            My Crews
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myCrews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  You haven't joined any crews yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Create your own or join an open crew below
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myCrews.map((crew) => (
                <CrewCard
                  key={crew.id}
                  crew={crew}
                  onClick={() => navigate(`/crews/${crew.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Open Crews */}
        {otherCrews.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Open Crews to Join
            </h2>
            <div className="space-y-3">
              {otherCrews.map((crew) => (
                <CrewCard
                  key={crew.id}
                  crew={crew}
                  onClick={() => navigate(`/crews/${crew.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

const CrewCard = ({ crew, onClick }) => (
  <Card
    className="cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
    data-testid="crew-card"
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {crew.name}
              </h3>
              {crew.is_creator && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {crew.member_count} member{crew.member_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Crews;
