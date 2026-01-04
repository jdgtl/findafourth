import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { utilityAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Info } from 'lucide-react';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { completeProfile, player } = useAuth();
  const [name, setName] = useState('');
  const [homeClub, setHomeClub] = useState('');
  const [otherClubs, setOtherClubs] = useState([]);
  const [newClub, setNewClub] = useState('');
  const [pti, setPti] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubSuggestions, setClubSuggestions] = useState([]);

  useEffect(() => {
    if (player?.profile_complete) {
      navigate('/home');
    }
    loadClubSuggestions();
  }, [player, navigate]);

  const loadClubSuggestions = async () => {
    try {
      const response = await utilityAPI.getClubSuggestions();
      setClubSuggestions(response.data);
    } catch (err) {
      console.error('Failed to load club suggestions');
    }
  };

  const handleAddClub = () => {
    if (newClub.trim() && !otherClubs.includes(newClub.trim())) {
      setOtherClubs([...otherClubs, newClub.trim()]);
      setNewClub('');
    }
  };

  const handleRemoveClub = (club) => {
    setOtherClubs(otherClubs.filter((c) => c !== club));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!homeClub.trim()) {
      setError('Home club is required');
      return;
    }

    setLoading(true);

    try {
      await completeProfile({
        name: name.trim(),
        home_club: homeClub.trim(),
        other_clubs: otherClubs,
        pti: pti ? parseInt(pti) : null,
        phone: phone.trim() || null,
      });
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg" data-testid="complete-profile-card">
        <CardHeader className="text-center">
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Tell us about yourself so we can find the right matches for you
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeClub">Home Club *</Label>
              <Input
                id="homeClub"
                placeholder="Your primary club"
                value={homeClub}
                onChange={(e) => setHomeClub(e.target.value)}
                list="club-suggestions"
                required
                data-testid="home-club-input"
              />
              <datalist id="club-suggestions">
                {clubSuggestions.map((club) => (
                  <option key={club} value={club} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Other Clubs (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add another club"
                  value={newClub}
                  onChange={(e) => setNewClub(e.target.value)}
                  list="club-suggestions"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddClub())}
                  data-testid="other-club-input"
                />
                <Button type="button" variant="outline" onClick={handleAddClub}>
                  Add
                </Button>
              </div>
              {otherClubs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {otherClubs.map((club) => (
                    <Badge key={club} variant="secondary" className="flex items-center gap-1">
                      {club}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => handleRemoveClub(club)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pti">PTI Rating (optional)</Label>
              <Input
                id="pti"
                type="number"
                placeholder="e.g., 45"
                value={pti}
                onChange={(e) => setPti(e.target.value)}
                min="0"
                max="100"
                data-testid="pti-input"
              />
              <p className="text-xs text-gray-500 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Your Platform Tennis Index rating. Typical range is 20-80. If you don't
                know it, make your best guess based on skill level.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="For SMS notifications"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="phone-input"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
              data-testid="complete-profile-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Complete Profile'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CompleteProfile;
