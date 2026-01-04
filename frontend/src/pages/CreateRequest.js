import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { requestAPI, crewAPI, utilityAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, ArrowLeft, Info } from 'lucide-react';
import { format } from 'date-fns';

const CreateRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { player } = useAuth();

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('19:00');
  const [club, setClub] = useState(location.state?.club || player?.home_club || '');
  const [court, setCourt] = useState('');
  const [spotsNeeded, setSpotsNeeded] = useState(1);
  const [useSkillFilter, setUseSkillFilter] = useState(false);
  const [skillMin, setSkillMin] = useState('');
  const [skillMax, setSkillMax] = useState('');
  const [audience, setAudience] = useState('crews');
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [includeFavorites, setIncludeFavorites] = useState(true);
  const [mode, setMode] = useState('quick_fill');
  const [notes, setNotes] = useState('');

  // Data state
  const [crews, setCrews] = useState([]);
  const [clubSuggestions, setClubSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skillFilterOpen, setSkillFilterOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [crewsRes, clubsRes] = await Promise.all([
        crewAPI.list(),
        utilityAPI.getClubSuggestions(),
      ]);
      setCrews(crewsRes.data.filter((c) => c.is_member));
      setClubSuggestions(clubsRes.data);
      // Select all crews by default
      setSelectedCrews(crewsRes.data.filter((c) => c.is_member).map((c) => c.id));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleCrewToggle = (crewId) => {
    setSelectedCrews((prev) =>
      prev.includes(crewId) ? prev.filter((id) => id !== crewId) : [...prev, crewId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!club.trim()) {
      setError('Club is required');
      return;
    }

    // Create datetime
    const dateTime = new Date(`${date}T${time}:00`);
    if (dateTime <= new Date()) {
      setError('Date and time must be in the future');
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        date_time: dateTime.toISOString(),
        club: club.trim(),
        court: court.trim() || null,
        spots_needed: spotsNeeded,
        skill_min: useSkillFilter && skillMin ? parseInt(skillMin) : null,
        skill_max: useSkillFilter && skillMax ? parseInt(skillMax) : null,
        mode,
        audience,
        target_crew_ids: audience === 'crews' ? selectedCrews : [],
        notes: notes.trim() || null,
      };

      await requestAPI.create(requestData);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto" data-testid="create-request-page">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>I Need Players</CardTitle>
            <CardDescription>Create a request to find players for your game</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* When & Where */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">When & Where</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
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
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      data-testid="time-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="club">Club</Label>
                  <Input
                    id="club"
                    placeholder="Select or enter club"
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    list="club-suggestions"
                    required
                    data-testid="club-input"
                  />
                  <datalist id="club-suggestions">
                    {clubSuggestions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="court">Court (optional)</Label>
                  <Input
                    id="court"
                    placeholder="e.g., Court 3"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    data-testid="court-input"
                  />
                </div>
              </div>

              {/* How Many */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">How Many Players?</h3>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={spotsNeeded === num ? 'default' : 'outline'}
                      className={spotsNeeded === num ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                      onClick={() => setSpotsNeeded(num)}
                      data-testid={`spots-${num}-btn`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Skill Filter */}
              <Collapsible open={skillFilterOpen} onOpenChange={setSkillFilterOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium">
                    Skill Level (optional)
                    <ChevronDown className={`w-4 h-4 transition-transform ${skillFilterOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="skill-filter"
                      checked={useSkillFilter}
                      onCheckedChange={setUseSkillFilter}
                    />
                    <Label htmlFor="skill-filter">Filter by PTI</Label>
                  </div>
                  {useSkillFilter && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="skillMin">Min PTI</Label>
                        <Input
                          id="skillMin"
                          type="number"
                          placeholder="e.g., 30"
                          value={skillMin}
                          onChange={(e) => setSkillMin(e.target.value)}
                          min="0"
                          max="100"
                          data-testid="skill-min-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="skillMax">Max PTI</Label>
                        <Input
                          id="skillMax"
                          type="number"
                          placeholder="e.g., 60"
                          value={skillMax}
                          onChange={(e) => setSkillMax(e.target.value)}
                          min="0"
                          max="100"
                          data-testid="skill-max-input"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Leave off to invite players of any level. Unrated players will still be included.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Who to Ask */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Who to Ask</h3>
                <RadioGroup value={audience} onValueChange={setAudience}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="crews" id="audience-crews" />
                    <Label htmlFor="audience-crews">My Crews & Favorites</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="club" id="audience-club" />
                    <Label htmlFor="audience-club">My Club</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="regional" id="audience-regional" />
                    <Label htmlFor="audience-regional">All Clubs (Regional)</Label>
                  </div>
                </RadioGroup>

                {audience === 'crews' && crews.length > 0 && (
                  <div className="space-y-2 pl-6 border-l-2 border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="favorites"
                        checked={includeFavorites}
                        onCheckedChange={setIncludeFavorites}
                      />
                      <Label htmlFor="favorites">Favorites</Label>
                    </div>
                    {crews.map((crew) => (
                      <div key={crew.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`crew-${crew.id}`}
                          checked={selectedCrews.includes(crew.id)}
                          onCheckedChange={() => handleCrewToggle(crew.id)}
                        />
                        <Label htmlFor={`crew-${crew.id}`}>
                          {crew.name} ({crew.member_count})
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {audience === 'crews' && crews.length === 0 && (
                  <p className="text-sm text-gray-500 pl-6">
                    You haven't joined any crews yet. Consider creating one or expanding your audience.
                  </p>
                )}
              </div>

              {/* Fill Mode */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Fill Mode</h3>
                <RadioGroup value={mode} onValueChange={setMode}>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="quick_fill" id="mode-quick" className="mt-1" />
                    <div>
                      <Label htmlFor="mode-quick">Quick Fill</Label>
                      <p className="text-xs text-gray-500">First responders automatically get spots</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="organizer_picks" id="mode-picks" className="mt-1" />
                    <div>
                      <Label htmlFor="mode-picks">I'll Pick</Label>
                      <p className="text-xs text-gray-500">You choose from interested players</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional info..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
                data-testid="send-request-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Request'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreateRequest;
