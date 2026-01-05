import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { requestAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import PlayerAvatar from '@/components/PlayerAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  Hourglass,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { player } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRequest = useCallback(async () => {
    try {
      const response = await requestAPI.get(id);
      setRequest(response.data);
    } catch (err) {
      setError('Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
    // Poll for updates
    const interval = setInterval(fetchRequest, 15000);
    return () => clearInterval(interval);
  }, [fetchRequest]);

  const handleRespond = async () => {
    setActionLoading(true);
    try {
      await requestAPI.respond(id);
      fetchRequest();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to respond');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateResponse = async (responseId, status) => {
    setActionLoading(true);
    try {
      await requestAPI.updateResponse(id, responseId, status);
      fetchRequest();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update response');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await requestAPI.cancel(id);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExpandAudience = async () => {
    setActionLoading(true);
    try {
      const newAudience = request.audience === 'crews' ? 'club' : 'regional';
      await requestAPI.update(id, { audience: newAudience });
      fetchRequest();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to expand audience');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-emerald-500">Confirmed</Badge>;
      case 'interested':
        return <Badge className="bg-amber-500">Interested</Badge>;
      case 'passed':
        return <Badge variant="secondary">Passed</Badge>;
      default:
        return null;
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
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!request) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto">
          <Alert variant="destructive">
            <AlertDescription>Request not found</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const isOrganizer = request.is_organizer;
  const confirmedResponses = request.responses?.filter((r) => r.status === 'confirmed') || [];
  const interestedResponses = request.responses?.filter((r) => r.status === 'interested') || [];
  const spotsRemaining = request.spots_needed - request.spots_filled;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-4" data-testid="request-detail-page">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Request Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl">Game Details</CardTitle>
              {request.status === 'filled' && (
                <Badge className="bg-blue-500">Filled</Badge>
              )}
              {request.status === 'cancelled' && (
                <Badge variant="destructive">Cancelled</Badge>
              )}
              {request.status === 'open' && (
                <Badge className="bg-emerald-500">Open</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">
                {format(parseISO(request.date_time), "EEEE, MMMM d 'at' h:mm a")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>
                {request.club}
                {request.court && ` - Court ${request.court}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>
                {spotsRemaining > 0
                  ? `Need ${spotsRemaining} more player${spotsRemaining > 1 ? 's' : ''}`
                  : 'All spots filled!'}
              </span>
            </div>

            {(request.skill_min || request.skill_max) && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  PTI {request.skill_min || '0'}-{request.skill_max || '100'}
                </Badge>
              </div>
            )}

            {request.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {request.notes}
                </p>
              </div>
            )}

            {/* Organizer Info */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <PlayerAvatar name={request.organizer?.name} size="lg" />
              <div>
                <p className="font-medium">
                  {isOrganizer ? 'You' : request.organizer?.name}
                </p>
                <p className="text-sm text-gray-500">Organizer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Actions (for non-organizers) */}
        {!isOrganizer && request.status === 'open' && (
          <Card>
            <CardContent className="p-4">
              {request.my_response?.status === 'confirmed' ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">You're in! See you there.</span>
                </div>
              ) : request.my_response?.status === 'interested' ? (
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <Hourglass className="w-5 h-5" />
                  <span className="font-medium">Waiting for organizer to confirm</span>
                </div>
              ) : spotsRemaining > 0 ? (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleRespond}
                  disabled={actionLoading}
                  data-testid="respond-btn"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  I'm In!
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <span>This game is full</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Responses (for organizers) */}
        {isOrganizer && (
          <>
            {/* Confirmed Players */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  Confirmed ({confirmedResponses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {confirmedResponses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No confirmed players yet</p>
                ) : (
                  <div className="space-y-3">
                    {confirmedResponses.map((response) => (
                      <div
                        key={response.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <PlayerAvatar name={response.player?.name} size="lg" />
                          <div>
                            <p className="font-medium">{response.player?.name}</p>
                            {response.player?.pti && (
                              <p className="text-sm text-gray-500">PTI {response.player.pti}</p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(response.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interested Players (for organizer_picks mode) */}
            {request.mode === 'organizer_picks' && interestedResponses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hourglass className="w-5 h-5 text-amber-500" />
                    Interested ({interestedResponses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {interestedResponses.map((response) => (
                      <div
                        key={response.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <PlayerAvatar name={response.player?.name} size="lg" variant="amber" />
                          <div>
                            <p className="font-medium">{response.player?.name}</p>
                            {response.player?.pti && (
                              <p className="text-sm text-gray-500">PTI {response.player.pti}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600"
                            onClick={() => handleUpdateResponse(response.id, 'confirmed')}
                            disabled={actionLoading || spotsRemaining <= 0}
                            data-testid={`confirm-${response.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => handleUpdateResponse(response.id, 'passed')}
                            disabled={actionLoading}
                            data-testid={`pass-${response.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organizer Actions */}
            {request.status === 'open' && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  {request.audience !== 'regional' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleExpandAudience}
                      disabled={actionLoading}
                      data-testid="expand-audience-btn"
                    >
                      Expand Audience
                      <span className="text-xs text-gray-500 ml-2">
                        (Currently: {request.audience})
                      </span>
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700"
                        data-testid="cancel-request-btn"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Cancel Request
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will notify all confirmed players that the game has been
                          cancelled. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Request</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancel}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Cancel Request
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default RequestDetail;
