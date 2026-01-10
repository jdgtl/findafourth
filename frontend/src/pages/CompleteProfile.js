import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { utilityAPI, ptiAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Info, Check, Search, ChevronDown, Shield } from 'lucide-react';

// Animated text component for PTI lookup steps
const AnimatedStep = ({ text, isActive, isExiting }) => {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
        isActive && !isExiting
          ? 'opacity-100 transform translate-y-0'
          : isExiting
          ? 'opacity-0 transform translate-y-8'
          : 'opacity-0 transform -translate-y-8'
      }`}
    >
      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-lg font-medium text-gray-700">{text}</span>
        </div>
      </div>
    </div>
  );
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { completeProfile, player } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [homeClub, setHomeClub] = useState('');
  const [otherClubs, setOtherClubs] = useState([]);
  const [newClub, setNewClub] = useState('');
  const [pti, setPti] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubSuggestions, setClubSuggestions] = useState([]);
  
  // PTI Lookup state
  const [ptiLookupState, setPtiLookupState] = useState('idle'); // idle, searching, found, not_found, manual
  const [ptiMatch, setPtiMatch] = useState(null);
  const [ptiRoster, setPtiRoster] = useState([]);
  const [searchStep, setSearchStep] = useState(0);
  const [exitingStep, setExitingStep] = useState(false);
  const [ptiVerified, setPtiVerified] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  const searchSteps = [
    'Connecting to PTI Database...',
    `Searching for ${name || 'player'}...`,
    `Match found for ${name || 'player'}!`,
  ];

  useEffect(() => {
    if (player?.profile_complete) {
      navigate('/home');
    }
    loadClubSuggestions();
    loadPtiRoster();
  }, [player, navigate]);

  const loadClubSuggestions = async () => {
    try {
      const response = await utilityAPI.getClubSuggestions();
      setClubSuggestions(response.data);
    } catch (err) {
      console.error('Failed to load club suggestions');
    }
  };

  const loadPtiRoster = async () => {
    try {
      const response = await ptiAPI.getRosterList();
      setPtiRoster(response.data.players || []);
    } catch (err) {
      console.error('Failed to load PTI roster');
    }
  };

  const runPtiLookup = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) return;
    
    setPtiLookupState('searching');
    setSearchStep(0);
    setExitingStep(false);
    setPtiMatch(null);
    setPtiVerified(false);
    
    // Step 1: Connecting...
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Transition to step 2
    setExitingStep(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    setSearchStep(1);
    setExitingStep(false);
    
    // Step 2: Searching... (do actual lookup here)
    let matchResult = null;
    try {
      const response = await ptiAPI.lookup(name.trim());
      matchResult = response.data.match;
    } catch (err) {
      console.error('PTI lookup failed:', err);
    }
    
    // Add delay for effect
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (matchResult && matchResult.score >= 70) {
      // Transition to step 3: Match found
      setExitingStep(true);
      await new Promise(resolve => setTimeout(resolve, 400));
      setSearchStep(2);
      setExitingStep(false);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPtiMatch(matchResult);
      setPtiLookupState('found');
    } else {
      // No match found
      setPtiLookupState('not_found');
    }
  }, [name]);

  const handleNameBlur = () => {
    if (name.trim().length >= 2 && ptiLookupState === 'idle') {
      runPtiLookup();
    }
  };

  const handleConfirmMatch = () => {
    if (ptiMatch) {
      setPti(Math.round(ptiMatch.pti_value).toString());
      setPtiVerified(true);
      setPtiLookupState('idle');
    }
  };

  const handleRejectMatch = () => {
    setPtiMatch(null);
    setPtiLookupState('not_found');
  };

  const handleSelectFromDropdown = (player) => {
    setName(player.player_name);
    setPti(Math.round(player.pti_value).toString());
    setPtiVerified(true);
    setPtiLookupState('idle');
    setShowDropdown(false);
    setDropdownSearch('');
  };

  const handleManualEntry = () => {
    setPtiLookupState('manual');
    setPtiVerified(false);
  };

  const handleNoPti = () => {
    setPti('');
    setPtiVerified(false);
    setPtiLookupState('idle');
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
        pti_verified: ptiVerified,
        phone: phone.trim() || null,
      });
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // Filter roster for dropdown
  const filteredRoster = ptiRoster.filter(p => 
    p.player_name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  // Render PTI Lookup Animation
  const renderPtiLookup = () => {
    if (ptiLookupState === 'searching') {
      return (
        <div className="mt-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-inner">
          <div className="relative h-16 overflow-hidden">
            {searchSteps.map((step, index) => (
              <AnimatedStep
                key={index}
                text={index === 1 ? `Searching for ${name}...` : index === 2 ? `Match found for ${name}!` : step}
                isActive={searchStep === index}
                isExiting={exitingStep && searchStep === index}
              />
            ))}
          </div>
        </div>
      );
    }

    if (ptiLookupState === 'found' && ptiMatch) {
      return (
        <div className="mt-4 p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <span className="text-emerald-700 font-semibold">We found your official PTI rating!</span>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-emerald-200 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">{ptiMatch.player_name}</p>
                <p className="text-sm text-gray-500">League-verified rating</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-600">{ptiMatch.pti_value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">PTI</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleConfirmMatch}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              data-testid="confirm-pti-match-btn"
            >
              <Check className="w-4 h-4 mr-2" />
              Yes, that&apos;s me
            </Button>
            <Button 
              onClick={handleRejectMatch}
              variant="outline"
              className="flex-1"
              data-testid="reject-pti-match-btn"
            >
              That&apos;s not me
            </Button>
          </div>
        </div>
      );
    }

    if (ptiLookupState === 'not_found') {
      return (
        <div className="mt-4 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-amber-700 font-semibold">We couldn&apos;t automatically find your PTI</span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">
            Select your name from the league roster, or enter your PTI manually.
          </p>
          
          {/* Searchable Dropdown */}
          <div className="relative mb-4">
            <div 
              className="bg-white rounded-lg border border-amber-200 p-3 cursor-pointer flex items-center justify-between"
              onClick={() => setShowDropdown(!showDropdown)}
              data-testid="pti-roster-dropdown"
            >
              <span className="text-gray-600">Search league roster...</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </div>
            
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-64 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-gray-100">
                  <Input
                    placeholder="Type to search..."
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    className="text-sm"
                    autoFocus
                    data-testid="pti-roster-search"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredRoster.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No players found
                    </div>
                  ) : (
                    filteredRoster.map((p, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0"
                        onClick={() => handleSelectFromDropdown(p)}
                        data-testid={`pti-roster-item-${idx}`}
                      >
                        <span className="font-medium text-gray-900">{p.player_name}</span>
                        <span className="text-emerald-600 font-semibold">{p.pti_value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleManualEntry}
              variant="outline"
              className="flex-1"
              data-testid="manual-pti-entry-btn"
            >
              Enter PTI manually
            </Button>
            <Button 
              onClick={handleNoPti}
              variant="ghost"
              className="flex-1 text-gray-500"
              data-testid="no-pti-btn"
            >
              I don&apos;t have a PTI yet
            </Button>
          </div>
        </div>
      );
    }

    return null;
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
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Reset PTI lookup if name changes after verification
                  if (ptiVerified) {
                    setPtiVerified(false);
                    setPti('');
                  }
                  if (ptiLookupState !== 'idle' && ptiLookupState !== 'searching') {
                    setPtiLookupState('idle');
                  }
                }}
                onBlur={handleNameBlur}
                required
                disabled={ptiLookupState === 'searching'}
                data-testid="name-input"
              />
              <p className="text-xs text-gray-500">
                Enter your name exactly as it appears in league records for automatic PTI lookup
              </p>
            </div>

            {/* PTI Lookup Section */}
            {renderPtiLookup()}

            {/* Show PTI field only if verified or manual entry */}
            {(ptiVerified || ptiLookupState === 'manual') && (
              <div className="space-y-2">
                <Label htmlFor="pti" className="flex items-center gap-2">
                  PTI Rating
                  {ptiVerified && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </Label>
                {ptiVerified ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-600">{pti}</div>
                    <div className="text-sm text-gray-600">Official PTI Rating</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-gray-500"
                      onClick={() => {
                        setPtiVerified(false);
                        setPtiLookupState('idle');
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
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
                      Your Platform Tennis Index rating. Typical range is 20-80.
                    </p>
                  </>
                )}
              </div>
            )}

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
              disabled={loading || ptiLookupState === 'searching'}
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
