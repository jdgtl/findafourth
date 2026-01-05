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
import { Slider } from '@/components/ui/slider';
import { Loader2, ArrowLeft, Info } from 'lucide-react';
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
  const [skillRange, setSkillRange] = useState([20, 60]);
  const [audience, setAudience] = useState('crews');
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [mode, setMode] = useState('quick_fill');
  const [notes, setNotes] = useState('');

  // Data state
  const [crews, setCrews] = useState([]);
  const [clubSuggestions, setClubSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Time options (15 min intervals)
  const timeOptions = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const min = m.toString().padStart(2, '0');
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      timeOptions.push({
        value: `${hour}:${min}`,
        label: `${displayHour}:${min} ${ampm}`
      });
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [crewsRes, clubsRes] = await Promise.all([
        crewAPI.list(),
        utilityAPI.getClubSuggestions(),
      ]);
      const myCrews = crewsRes.data.filter((c) => c.is_member);
      setCrews(myCrews);
      setClubSuggestions(clubsRes.data);
      // Select all crews by default
      setSelectedCrews(myCrews.map((c) => c.id));
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
        skill_min: useSkillFilter ? skillRange[0] : null,
        skill_max: useSkillFilter ? skillRange[1] : null,
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
      <div className="max-w-lg mx-auto pb-8" data-testid="create-request-page">
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
            <CardContent className="space-y-8">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* When & Where */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">When & Where</h3>
                
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
                      className="h-12 text-base"
                      data-testid="date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <select
                      id="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full h-12 px-3 text-base border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="time-input"
                    >
                      {timeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
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
                    className="h-12 text-base"
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
                    className="h-12 text-base"
                    data-testid="court-input"
                  />
                </div>
              </div>

              {/* How Many Players */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">How Many Players?</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={spotsNeeded === num ? 'default' : 'outline'}
                      className={`h-14 text-lg font-semibold ${
                        spotsNeeded === num 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setSpotsNeeded(num)}
                      data-testid={`spots-${num}-btn`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Skill Level */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Skill Level</h3>
                  <Switch
                    checked={useSkillFilter}
                    onCheckedChange={setUseSkillFilter}
                    data-testid="skill-filter-toggle"
                  />
                </div>
                
                {useSkillFilter && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">PTI Range</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {skillRange[0]} - {skillRange[1]}
                      </span>
                    </div>
                    <Slider
                      value={skillRange}
                      onValueChange={setSkillRange}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                      data-testid="skill-range-slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0 (Beginner)</span>
                      <span>50</span>
                      <span>100 (Pro)</span>
                    </div>
                  </div>
                )}
                
                {!useSkillFilter && (
                  <p className="text-sm text-gray-500 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    All skill levels welcome
                  </p>
                )}
              </div>

              {/* Who to Ask */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Who to Ask</h3>
                
                {/* My Crews Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    audience === 'crews' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setAudience('crews')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      audience === 'crews' 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-300'
                    }`}>
                      {audience === 'crews' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-medium">My Crews</span>
                  </div>
                  
                  {/* Crew checkboxes - show when crews is selected */}
                  {audience === 'crews' && crews.length > 0 && (
                    <div className="mt-4 ml-8 space-y-3">
                      {crews.map((crew) => (
                        <label 
                          key={crew.id} 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedCrews.includes(crew.id)}
                            onCheckedChange={() => handleCrewToggle(crew.id)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <span className="text-sm">
                            {crew.name} ({crew.member_count})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {audience === 'crews' && crews.length === 0 && (
                    <p className="mt-3 ml-8 text-sm text-gray-500">
                      You haven't joined any crews yet
                    </p>
                  )}
                </div>

                {/* My Club Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    audience === 'club' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setAudience('club')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      audience === 'club' 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-300'
                    }`}>
                      {audience === 'club' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-medium">My Club</span>
                  </div>
                </div>

                {/* Open (Regional) Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    audience === 'regional' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setAudience('regional')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      audience === 'regional' 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-300'
                    }`}>
                      {audience === 'regional' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-medium">Open</span>
                  </div>
                </div>
              </div>

              {/* Fill Mode */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Fill Mode</h3>
                
                {/* Quick Fill */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    mode === 'quick_fill' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setMode('quick_fill')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      mode === 'quick_fill' 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-300'
                    }`}>
                      {mode === 'quick_fill' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Quick Fill</span>
                      <p className="text-sm text-gray-500">First response gets spot</p>
                    </div>
                  </div>
                </div>

                {/* Managed */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    mode === 'organizer_picks' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setMode('organizer_picks')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      mode === 'organizer_picks' 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-300'
                    }`}>
                      {mode === 'organizer_picks' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Managed</span>
                      <p className="text-sm text-gray-500">You choose from interested players</p>
                    </div>
                  </div>
                </div>
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
                  className="text-base"
                  data-testid="notes-input"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
                data-testid="send-request-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
