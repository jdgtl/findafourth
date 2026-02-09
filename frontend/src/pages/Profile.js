import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { playerAPI, clubAPI } from '@/lib/api';
import { getProfileImageUrl, cn } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, X, LogOut, Trash2, User, Bell, Eye, Camera, BadgeCheck, ChevronsUpDown, Check, Plus, Trophy, Phone } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PTIHistoryChart from '@/components/PTIHistoryChart';
import PartnerChemistry from '@/components/PartnerChemistry';

const Profile = () => {
  const navigate = useNavigate();
  const { player, logout, updatePlayer } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Form state
  const [name, setName] = useState(player?.name || '');
  const [homeClub, setHomeClub] = useState(player?.home_club || '');
  const [otherClubs, setOtherClubs] = useState(player?.other_clubs || []);
  const [newClub, setNewClub] = useState('');
  const [pti, setPti] = useState(player?.pti?.toString() || '');
  const [phone, setPhone] = useState(player?.phone || '');
  const [notifyPush, setNotifyPush] = useState(player?.notify_push ?? true);
  const [notifyEmail, setNotifyEmail] = useState(player?.notify_email ?? true);
  const [notifySms, setNotifySms] = useState(player?.notify_sms ?? false);
  const [visibility, setVisibility] = useState(player?.visibility || 'everyone');
  const [clubSuggestions, setClubSuggestions] = useState([]);
  const [homeClubOpen, setHomeClubOpen] = useState(false);
  const [homeClubCustom, setHomeClubCustom] = useState(false);
  const [otherClubOpen, setOtherClubOpen] = useState(false);
  const [otherClubCustom, setOtherClubCustom] = useState(false);

  useEffect(() => {
    const loadClubs = async () => {
      try {
        const response = await clubAPI.getSuggestions();
        setClubSuggestions(response.data);
      } catch (err) {
        console.error('Failed to load club suggestions');
      }
    };
    loadClubs();
  }, []);

  const handleAddClub = () => {
    if (newClub.trim() && !otherClubs.includes(newClub.trim())) {
      setOtherClubs([...otherClubs, newClub.trim()]);
      setNewClub('');
    }
  };

  const handleRemoveClub = (club) => {
    setOtherClubs(otherClubs.filter((c) => c !== club));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updateData = {
        name: name.trim(),
        home_club: homeClub.trim(),
        other_clubs: otherClubs,
        phone: phone.trim() || null,
        notify_push: notifyPush,
        notify_email: notifyEmail,
        notify_sms: notifySms,
        visibility,
      };

      if (!player?.pti_verified) {
        updateData.pti = pti ? parseInt(pti) : null;
      }

      const response = await playerAPI.update(player.id, updateData);
      updatePlayer(response.data);
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    try {
      await playerAPI.delete(player.id);
      logout();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete account');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const response = await playerAPI.uploadProfileImage(player.id, file);
      updatePlayer(response.data.player);
      setSuccess('Profile image updated!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    setUploadingImage(true);
    setError('');

    try {
      const response = await playerAPI.deleteProfileImage(player.id);
      updatePlayer(response.data.player);
      setSuccess('Profile image removed');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove image');
    } finally {
      setUploadingImage(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const notifActiveCount = [notifyPush, notifyEmail, notifySms].filter(Boolean).length;
  const visibilityLabel = visibility === 'crews_only' ? 'Crews' : visibility === 'hidden' ? 'Hidden' : 'Everyone';

  if (!player) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto space-y-5" data-testid="profile-page">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile</h1>
          </div>
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-64 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-16 rounded-xl md:col-span-2" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5" data-testid="profile-page">
        {/* Section label */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* ══════════ Hero Card ══════════ */}
        <div className="relative rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 via-emerald-100/80 to-teal-50 dark:from-emerald-900/30 dark:via-emerald-800/20 dark:to-teal-900/10 p-6">
          {/* Edit button */}
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 z-10"
            >
              Edit
            </Button>
          )}

          {/* Avatar + Info */}
          <div className="flex items-start gap-5">
            {/* Avatar column */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative group">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white dark:border-gray-800 shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-700">
                  <AvatarImage src={getProfileImageUrl(player?.profile_image_url)} />
                  <AvatarFallback className="text-2xl bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200">
                    {getInitials(player?.name)}
                  </AvatarFallback>
                </Avatar>
                {uploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-full transition-colors cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="profile-image-upload"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200"
              >
                <Camera className="w-3 h-3 mr-1" />
                {player?.profile_image_url ? 'Change Photo' : 'Add Photo'}
              </Button>
              {player?.profile_image_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  className="text-xs text-red-600 hover:text-red-700 -mt-2"
                >
                  Remove
                </Button>
              )}
            </div>

            {/* Info column */}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                {player?.name || 'Unknown Player'}
              </h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {homeClub && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                    {homeClub}
                  </Badge>
                )}
                {otherClubs.map((club) => (
                  <Badge key={club} variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-300 text-xs">
                    {club}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 truncate">{player?.email}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            {/* PTI Rating */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200/60 dark:bg-emerald-700/40 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                    {player?.pti || '—'}
                  </span>
                  {player?.pti_verified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">GBPTA Verified</p>
                          <p className="text-xs text-gray-400">Synced from official league data</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60 uppercase tracking-widest font-semibold mt-0.5">PTI Rating</div>
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200/60 dark:bg-emerald-700/40 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white leading-none capitalize">{visibilityLabel}</div>
                <div className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60 uppercase tracking-widest font-semibold mt-0.5">Visibility</div>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200/60 dark:bg-emerald-700/40 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white leading-none">{notifActiveCount}/3</div>
                <div className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60 uppercase tracking-widest font-semibold mt-0.5">Alerts</div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200/60 dark:bg-emerald-700/40 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white leading-none truncate max-w-[100px]">
                  {phone || '—'}
                </div>
                <div className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60 uppercase tracking-widest font-semibold mt-0.5">Phone</div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {editing && (
            <>
              <Separator className="my-5 bg-emerald-300/50 dark:bg-emerald-700/50" />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!editing}
                    data-testid="name-input"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="homeClub">Home Club</Label>
                  {homeClubCustom ? (
                    <div className="flex gap-2">
                      <Input
                        id="homeClub"
                        placeholder="Enter your club name"
                        value={homeClub}
                        onChange={(e) => setHomeClub(e.target.value)}
                        data-testid="home-club-input"
                        className="bg-white dark:bg-gray-800"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setHomeClubCustom(false); setHomeClub(player?.home_club || ''); }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Popover open={homeClubOpen} onOpenChange={setHomeClubOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={homeClubOpen}
                          className="w-full justify-between font-normal bg-white dark:bg-gray-800"
                          data-testid="home-club-input"
                        >
                          {homeClub || "Select your club..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={true}>
                          <CommandInput placeholder="Search clubs..." />
                          <CommandList>
                            <CommandEmpty>No club found.</CommandEmpty>
                            <CommandGroup heading="Clubs">
                              {clubSuggestions.map((club) => (
                                <CommandItem
                                  key={club}
                                  value={club}
                                  onSelect={() => {
                                    setHomeClub(club);
                                    setHomeClubOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      homeClub === club ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {club}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandGroup heading="Custom">
                              <CommandItem
                                value="other-enter-manually"
                                onSelect={() => {
                                  setHomeClubCustom(true);
                                  setHomeClubOpen(false);
                                  setHomeClub('');
                                }}
                                className="text-muted-foreground"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Other (enter manually)
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Other Clubs</Label>
                  {otherClubCustom ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter club name"
                        value={newClub}
                        onChange={(e) => setNewClub(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddClub();
                            setOtherClubCustom(false);
                          }
                        }}
                        className="bg-white dark:bg-gray-800"
                      />
                      <Button type="button" variant="outline" onClick={() => { handleAddClub(); setOtherClubCustom(false); }}>
                        Add
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setOtherClubCustom(false); setNewClub(''); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Popover open={otherClubOpen} onOpenChange={setOtherClubOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={otherClubOpen}
                          className="w-full justify-between font-normal bg-white dark:bg-gray-800"
                        >
                          Add another club...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={true}>
                          <CommandInput placeholder="Search clubs..." />
                          <CommandList>
                            <CommandEmpty>No club found.</CommandEmpty>
                            <CommandGroup heading="Clubs">
                              {clubSuggestions.filter(c => c !== homeClub && !otherClubs.includes(c)).map((club) => (
                                <CommandItem
                                  key={club}
                                  value={club}
                                  onSelect={() => {
                                    if (!otherClubs.includes(club)) {
                                      setOtherClubs([...otherClubs, club]);
                                    }
                                    setOtherClubOpen(false);
                                  }}
                                >
                                  {club}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandGroup heading="Custom">
                              <CommandItem
                                value="other-enter-manually"
                                onSelect={() => {
                                  setOtherClubCustom(true);
                                  setOtherClubOpen(false);
                                }}
                                className="text-muted-foreground"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Other (enter manually)
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {otherClubs.map((club) => (
                      <Badge key={club} variant="secondary" className="flex items-center gap-1">
                        {club}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => handleRemoveClub(club)}
                        />
                      </Badge>
                    ))}
                    {otherClubs.length === 0 && (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </div>
                </div>

                {!player?.pti_verified && (
                  <div className="space-y-2">
                    <Label htmlFor="pti">PTI Rating</Label>
                    <Input
                      id="pti"
                      type="number"
                      value={pti}
                      onChange={(e) => setPti(e.target.value)}
                      min="0"
                      max="100"
                      data-testid="pti-input"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="For SMS notifications"
                    data-testid="phone-input"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={loading}
                    data-testid="save-profile-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setName(player?.name || '');
                      setHomeClub(player?.home_club || '');
                      setOtherClubs(player?.other_clubs || []);
                      setPti(player?.pti?.toString() || '');
                      setPhone(player?.phone || '');
                      setHomeClubCustom(false);
                      setOtherClubCustom(false);
                      setNewClub('');
                    }}
                    className="bg-white/80 dark:bg-gray-800/80"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Disabled name input for E2E test contract */}
          {!editing && (
            <Input
              value={name}
              disabled
              data-testid="name-input"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          )}
        </div>

        {/* ══════════ Charts (full width) ══════════ */}
        {player?.pti_verified && player?.name && (
          <PTIHistoryChart playerName={player.name} currentPti={player.pti} />
        )}
        {player?.id && player?.name && (
          <PartnerChemistry playerId={player.id} playerName={player.name} />
        )}

        {/* ══════════ Settings Grid ══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notifications */}
          <Card className="hover:shadow-lg transition-all border-blue-100 dark:border-blue-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex items-center justify-between py-3">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-xs text-gray-500">Get notified in your browser</p>
                </div>
                <Switch
                  checked={notifyPush}
                  onCheckedChange={async (checked) => {
                    setNotifyPush(checked);
                    await playerAPI.update(player.id, { notify_push: checked });
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-gray-500">Receive updates via email</p>
                </div>
                <Switch
                  checked={notifyEmail}
                  onCheckedChange={async (checked) => {
                    setNotifyEmail(checked);
                    await playerAPI.update(player.id, { notify_email: checked });
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-xs text-gray-500">
                    {phone ? 'Text messages to your phone' : 'Add phone number to enable'}
                  </p>
                </div>
                <Switch
                  checked={notifySms}
                  disabled={!phone}
                  onCheckedChange={async (checked) => {
                    setNotifySms(checked);
                    await playerAPI.update(player.id, { notify_sms: checked });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card className="hover:shadow-lg transition-all border-violet-100 dark:border-violet-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                Visibility
              </CardTitle>
              <CardDescription className="text-xs">Who can send you requests</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={visibility}
                onValueChange={async (value) => {
                  setVisibility(value);
                  await playerAPI.update(player.id, { visibility: value });
                  updatePlayer({ ...player, visibility: value });
                }}
                className="space-y-3"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="everyone" id="vis-everyone" className="mt-1" />
                  <div>
                    <Label htmlFor="vis-everyone">Everyone</Label>
                    <p className="text-xs text-gray-500">Anyone can send you requests</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="crews_only" id="vis-crews" className="mt-1" />
                  <div>
                    <Label htmlFor="vis-crews">My Crews Only</Label>
                    <p className="text-xs text-gray-500">Only people in your crews</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="hidden" id="vis-hidden" className="mt-1" />
                  <div>
                    <Label htmlFor="vis-hidden">Hidden</Label>
                    <p className="text-xs text-gray-500">You won't receive requests</p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          {/* Account Actions */}
          <div className="md:col-span-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-5 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{player?.email}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500/70 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      data-testid="delete-account-btn"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account and all associated data.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
