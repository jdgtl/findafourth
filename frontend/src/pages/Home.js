import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { requestAPI, availabilityAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import RequestCard from '@/components/RequestCard';
import AvailabilityCard from '@/components/AvailabilityCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronDown, ChevronUp, RefreshCw, Calendar, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Home = () => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const [requests, setRequests] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [requestsRes, availabilityRes] = await Promise.all([
        requestAPI.list(),
        availabilityAPI.list(),
      ]);
      setRequests(requestsRes.data);
      setAvailability(availabilityRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds for updates
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRespond = async (requestId) => {
    try {
      await requestAPI.respond(requestId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to respond');
    }
  };

  const myRequests = requests.filter((r) => r.organizer_id === player?.id);
  const otherRequests = requests.filter((r) => r.organizer_id !== player?.id);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="home-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Find a Game
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            data-testid="refresh-btn"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* My Active Requests */}
        {myRequests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              My Requests
            </h2>
            <div className="space-y-3">
              {myRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isOrganizer={true}
                  onClick={() => navigate(`/requests/${request.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Active Requests */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Open Games
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-10 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : otherRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No open games right now
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Create a request to find players!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {otherRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isOrganizer={false}
                  myResponse={request.my_response}
                  onRespond={() => handleRespond(request.id)}
                  onClick={() => navigate(`/requests/${request.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Available Players */}
        <Collapsible open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Available Players ({availability.length})
              </h2>
              {availabilityOpen ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {availability.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No one has posted availability yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {availability.map((post) => (
                  <AvailabilityCard
                    key={post.id}
                    post={post}
                    onInvite={() => navigate('/requests/new', { state: { club: post.clubs?.[0] } })}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Floating Action Button */}
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                data-testid="fab-btn"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/requests/new')}>
                <Users className="w-4 h-4 mr-2" />
                I Need Players
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/availability/new')}>
                <Calendar className="w-4 h-4 mr-2" />
                I'm Available
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;
