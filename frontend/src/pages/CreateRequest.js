import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { requestAPI, crewAPI } from '@/lib/api';
import { logError } from '@/lib/errors';
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
import { Loader2, ArrowLeft, Info, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';

const CreateRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { player } = useAuth();

  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(7);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('PM');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [club, setClub] = useState(location.state?.club || player?.home_club || '');
  const [court, setCourt] = useState('');
  const [spotsNeeded, setSpotsNeeded] = useState(1);
  const [useSkillFilter, setUseSkillFilter] = useState(false);
  const [skillRange, setSkillRange] = useState([20, 60]);
  const [audience, setAudience] = useState('crews');
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [includeFavorites, setIncludeFavorites] = useState(true);
  const [mode, setMode] = useState('quick_fill');
  const [notes, setNotes] = useState('');

  // Data state
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Hours for time picker (1-12)
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  // Minutes for time picker (15 min intervals)
  const minutes = [0, 15, 30, 45];

  const getDisplayTime = () => {
    const min = selectedMinute.toString().padStart(2, '0');
    return `${selectedHour}:${min} ${selectedPeriod}`;
  };

  const get24Hour = () => {
    let hour = selectedHour;
    if (selectedPeriod === 'PM' && hour !== 12) hour += 12;
    if (selectedPeriod === 'AM' && hour === 12) hour = 0;
    return hour;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const crewsRes = await crewAPI.list();
      const myCrews = crewsRes.data.filter((c) => c.is_member);
      setCrews(myCrews);
      setSelectedCrews(myCrews.map((c) => c.id));
    } catch (err) {
      logError('CreateRequest.loadData', err);
      // Non-blocking error - crews are optional
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
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const hour24 = get24Hour().toString().padStart(2, '0');
    const min = selectedMinute.toString().padStart(2, '0');
    const dateTime = new Date(`${dateStr}T${hour24}:${min}:00`);
    
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

  // Calendar helper functions
  const getDaysInMonth = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  };

  const getStartPadding = () => {
    const start = startOfMonth(calendarMonth);
    return start.getDay();
  };

  const isDateDisabled = (date) => {
    return isBefore(date, startOfDay(new Date()));
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
                
                {/* Custom Calendar */}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                        className="h-10 w-10 p-0"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <span className="font-semibold text-lg">
                        {format(calendarMonth, 'MMMM yyyy')}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                        className="h-10 w-10 p-0"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-sm font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: getStartPadding() }).map((_, i) => (
                        <div key={`pad-${i}`} className="h-11" />
                      ))}
                      
                      {getDaysInMonth().map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentDay = isToday(day);
                        const disabled = isDateDisabled(day);
                        
                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedDate(day)}
                            className={`
                              h-11 rounded-lg text-sm font-medium transition-colors
                              ${isSelected 
                                ? 'bg-emerald-500 text-white' 
                                : isCurrentDay
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                              }
                              ${disabled ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Custom Time Picker */}
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(!showTimePicker)}
                      className="w-full h-12 px-4 text-left text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-between"
                    >
                      <span>{getDisplayTime()}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showTimePicker ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showTimePicker && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                        <div className="flex gap-2">
                          {/* Hour */}
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500 mb-2 block">Hour</Label>
                            <div className="grid grid-cols-4 gap-1">
                              {hours.map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setSelectedHour(h)}
                                  className={`h-10 rounded text-sm font-medium ${
                                    selectedHour === h 
                                      ? 'bg-emerald-500 text-white' 
                                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Minute */}
                          <div className="w-20">
                            <Label className="text-xs text-gray-500 mb-2 block">Min</Label>
                            <div className="grid grid-cols-1 gap-1">
                              {minutes.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setSelectedMinute(m)}
                                  className={`h-10 rounded text-sm font-medium ${
                                    selectedMinute === m 
                                      ? 'bg-emerald-500 text-white' 
                                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  :{m.toString().padStart(2, '0')}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* AM/PM */}
                          <div className="w-16">
                            <Label className="text-xs text-gray-500 mb-2 block">Period</Label>
                            <div className="grid grid-cols-1 gap-1">
                              {['AM', 'PM'].map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setSelectedPeriod(p)}
                                  className={`h-10 rounded text-sm font-medium ${
                                    selectedPeriod === p 
                                      ? 'bg-emerald-500 text-white' 
                                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setShowTimePicker(false)}
                        >
                          Done
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Club */}
                <div className="space-y-2">
                  <Label htmlFor="club">Club</Label>
                  <Input
                    id="club"
                    placeholder="Enter club name"
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    required
                    className="h-12 text-base"
                    autoComplete="off"
                    data-testid="club-input"
                  />
                </div>

                {/* Court */}
                <div className="space-y-2">
                  <Label htmlFor="court">Court (optional)</Label>
                  <Input
                    id="court"
                    placeholder="e.g., Court 3"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    className="h-12 text-base"
                    autoComplete="off"
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
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
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
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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
                  
                  {/* Favorites & Crew checkboxes */}
                  {audience === 'crews' && (
                    <div className="mt-4 ml-8 space-y-3">
                      {/* Favorites option */}
                      <label 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={includeFavorites}
                          onCheckedChange={setIncludeFavorites}
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <span className="text-sm">Favorites</span>
                      </label>
                      
                      {/* Crew options */}
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
                      
                      {crews.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No crews yet - Favorites will still receive your request
                        </p>
                      )}
                    </div>
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
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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

                {/* Open Option */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    audience === 'regional' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setAudience('regional')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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
