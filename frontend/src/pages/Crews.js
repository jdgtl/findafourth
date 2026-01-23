import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { crewAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users } from 'lucide-react';

const Crews = () => {
  const navigate = useNavigate();
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCrews = useCallback(async () => {
    try {
      const response = await crewAPI.list();
      setCrews(response.data);
    } catch (err) {
      console.error('Failed to fetch crews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrews();
  }, [fetchCrews]);

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
        ) : crews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No crews yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Create a crew to organize players for quick game requests
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {crews.map((crew) => (
              <CrewCard
                key={crew.id}
                crew={crew}
                onClick={() => navigate(`/crews/${crew.id}`)}
              />
            ))}
          </div>
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {crew.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {crew.member_count} player{crew.member_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Crews;
