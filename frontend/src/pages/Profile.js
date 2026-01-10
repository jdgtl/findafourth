import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { playerAPI } from '@/lib/api';
import { getProfileImageUrl } from '@/lib/utils';
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
import { Loader2, X, LogOut, Trash2, User, Bell, Eye, Shield, Camera } from 'lucide-react';
import PTIHistoryChart from '@/components/PTIHistoryChart';

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
      
      // Only include PTI in update if not verified
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
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

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6" data-testid="profile-page">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>

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

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={getProfileImageUrl(player?.profile_image_url)} />
                  <AvatarFallback className="text-2xl bg-emerald-100 text-emerald-700">
                    {getInitials(player?.name)}
                  </AvatarFallback>
                </Avatar>
                {uploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="profile-image-upload"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Camera className="w-4 h-4 mr-1" />
                  {player?.profile_image_url ? 'Change Photo' : 'Add Photo'}
                </Button>
                {player?.profile_image_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={player?.email || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editing}
                data-testid="name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeClub">Home Club</Label>
              <Input
                id="homeClub"
                value={homeClub}
                onChange={(e) => setHomeClub(e.target.value)}
                disabled={!editing}
                data-testid="home-club-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Other Clubs</Label>
              {editing && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add another club"
                    value={newClub}
                    onChange={(e) => setNewClub(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddClub())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddClub}>
                    Add
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {otherClubs.map((club) => (
                  <Badge key={club} variant="secondary" className="flex items-center gap-1">
                    {club}
                    {editing && (
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => handleRemoveClub(club)}
                      />
                    )}
                  </Badge>
                ))}
                {otherClubs.length === 0 && !editing && (
                  <span className="text-sm text-gray-500">None</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pti" className="flex items-center gap-2">
                PTI Rating
                {player?.pti_verified && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    League Verified
                  </Badge>
                )}
              </Label>
              {player?.pti_verified ? (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-2xl font-bold text-emerald-600">{player?.pti}</div>
                  <div className="text-sm text-gray-600">
                    <p>Official PTI Rating</p>
                    <p className="text-xs text-gray-500">Updated weekly from league data</p>
                  </div>
                </div>
              ) : (
                <Input
                  id="pti"
                  type="number"
                  value={pti}
                  onChange={(e) => setPti(e.target.value)}
                  disabled={!editing}
                  min="0"
                  max="100"
                  data-testid="pti-input"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editing}
                placeholder="For SMS notifications"
                data-testid="phone-input"
              />
            </div>

            {editing && (
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
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PTI History Chart - only show for verified PTI users */}
        {player?.pti_verified && player?.name && (
          <PTIHistoryChart playerName={player.name} currentPti={player.pti} />
        )}

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Visibility
            </CardTitle>
            <CardDescription>Control who can send you game requests</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={visibility}
              onValueChange={async (value) => {
                setVisibility(value);
                await playerAPI.update(player.id, { visibility: value });
                updatePlayer({ ...player, visibility: value });
              }}
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
        <Card>
          <CardContent className="p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700"
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
