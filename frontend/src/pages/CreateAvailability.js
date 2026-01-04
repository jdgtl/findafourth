import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { format } from 'date-fns';

const CreateAvailability = () => {
  const navigate = useNavigate();
  const { player } = useAuth();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [message, setMessage] = useState('');
  const [clubs, setClubs] = useState([player?.home_club, ...(player?.other_clubs || [])].filter(Boolean));
  const [newClub, setNewClub] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddClub = () => {
    if (newClub.trim() && !clubs.includes(newClub.trim())) {
      setClubs([...clubs, newClub.trim()]);
      setNewClub('');
    }
  };

  const handleRemoveClub = (club) => {
    setClubs(clubs.filter((c) => c !== club));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    setLoading(true);

    try {
      await availabilityAPI.create({
        message: message.trim(),
        available_date: date,
        clubs,
      });
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post availability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto" data-testid="create-availability-page">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>I'm Available</CardTitle>
            <CardDescription>
              Let others know you're looking for a game
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
                <Label htmlFor="date">When are you available?</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                  data-testid="date-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="e.g., Free after 6pm, looking for a game!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  required
                  data-testid="message-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Where can you play?</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a club"
                    value={newClub}
                    onChange={(e) => setNewClub(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddClub())}
                    data-testid="club-input"
                  />
                  <Button type="button" variant="outline" onClick={handleAddClub}>
                    Add
                  </Button>
                </div>
                {clubs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {clubs.map((club) => (
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

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
                data-testid="post-availability-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Availability'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreateAvailability;
