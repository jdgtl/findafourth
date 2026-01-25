import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clubAPI, inviteAPI } from '@/lib/api';
import { getProfileImageUrl } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Building2,
  Users,
  UserCheck,
  ArrowLeft,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {club?.name}
          </h1>
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
                  isRegistered
                  clubName={club?.name}
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
                <PlayerCard key={idx} player={player} isRegistered={false} clubName={club?.name} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

const InviteModal = ({ isOpen, onClose, playerName, clubName, inviteType }) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const isEmail = inviteType === 'email';
  const placeholder = isEmail ? 'email@example.com' : '(555) 123-4567';
  const label = isEmail ? 'Email Address' : 'Phone Number';
  const inputType = isEmail ? 'email' : 'tel';

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isEmail && !validateEmail(value)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isEmail && !validatePhone(value)) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setLoading(true);
    try {
      const data = {
        player_name: playerName,
        club_name: clubName,
      };
      if (isEmail) {
        data.email = value;
      } else {
        data.phone = value.replace(/\D/g, '');
      }

      await inviteAPI.send(data);
      setSuccess(true);
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to send invite';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setValue('');
    setError(null);
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEmail ? (
              <Mail className="w-5 h-5 text-blue-500" />
            ) : (
              <MessageSquare className="w-5 h-5 text-green-500" />
            )}
            Invite {playerName}
          </DialogTitle>
          <DialogDescription>
            Send an invite to join FindaFourth. They'll receive a link to sign up.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Invite Sent!
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {playerName} will receive your invite shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-input">{label}</Label>
                <Input
                  id="invite-input"
                  type={inputType}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !value}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PlayerCard = ({ player, isRegistered, clubName }) => {
  const [inviteModal, setInviteModal] = useState({ open: false, type: null });

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

  const handleInviteEmail = (e) => {
    e.stopPropagation();
    setInviteModal({ open: true, type: 'email' });
  };

  const handleInviteText = (e) => {
    e.stopPropagation();
    setInviteModal({ open: true, type: 'sms' });
  };

  return (
    <>
      <InviteModal
        isOpen={inviteModal.open}
        onClose={() => setInviteModal({ open: false, type: null })}
        playerName={player.player_name}
        clubName={clubName}
        inviteType={inviteModal.type}
      />
    <TooltipProvider>
      <div
        className="group p-3 rounded-[0.4rem] transition-all duration-500 ease-out
          border border-transparent
          hover:border-gray-300 hover:duration-300
          dark:hover:border-gray-600"
        data-testid="player-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 transition-all duration-300 opacity-80 group-hover:opacity-100">
              <AvatarImage src={getProfileImageUrl(player.profile_image_url)} />
              <AvatarFallback className={`transition-colors duration-300 ${isRegistered ? 'bg-emerald-100/70 text-emerald-700 group-hover:bg-emerald-100' : 'bg-gray-100/70 text-gray-600 group-hover:bg-gray-100'}`}>
                {getInitials(player.player_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-medium transition-all duration-300
                    text-gray-600 dark:text-gray-400
                    group-hover:text-gray-900 dark:group-hover:text-white"
                  style={{
                    textShadow: 'inset 1px 1px 1px rgba(255,255,255,0.8), inset -1px -1px 1px rgba(0,0,0,0.1)'
                  }}
                >
                  {player.player_name}
                </h3>
                {isRegistered && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-emerald-100/50 text-emerald-700/70 border-0
                      transition-all duration-300
                      group-hover:bg-emerald-100 group-hover:text-emerald-700"
                  >
                    Member
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {/* Invite icons - only for non-registered */}
            {!isRegistered && (
              <>
                <div className="flex items-center gap-2 pr-3 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleInviteEmail}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 group-hover:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Invite via email</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleInviteText}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 group-hover:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Invite via text</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {/* Pipe separator */}
                <div className="h-8 w-px bg-gray-200/50 dark:bg-gray-600/50 mr-3 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors duration-300" />
              </>
            )}
            {/* PTI - always on far right */}
            <div className="text-center min-w-[36px]">
              <span
                className="font-semibold leading-none transition-all duration-300
                  text-gray-500 dark:text-gray-500
                  group-hover:text-gray-900 dark:group-hover:text-white"
              >
                {formatPTI(player.pti_value)}
              </span>
              <span className="block text-[10px] text-gray-400 group-hover:text-gray-500 leading-tight mt-0.5 transition-colors duration-300">PTI</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
    </>
  );
};

export default ClubDetail;
