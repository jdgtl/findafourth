import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { clubAPI, ptiAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, X, Info, Check, Search, ChevronDown, Shield, Building2, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WireMeshBg, GlowOrb } from '@/components/MarketingEffects';

// US Flag icon — monochrome, matches muted input text
const USFlag = ({ className }) => (
  <svg viewBox="0 0 24 16" fill="none" className={className} aria-hidden="true">
    {[0,2,4,6,8,10,12].map(y => (
      <rect key={`s${y}`} x="0" y={y * (16/13)} width="24" height={16/13} fill="currentColor" opacity="0.35" />
    ))}
    {[1,3,5,7,9,11].map(y => (
      <rect key={`w${y}`} x="0" y={y * (16/13)} width="24" height={16/13} fill="currentColor" opacity="0.15" />
    ))}
    <rect x="0" y="0" width="10" height={16 * 7/13} rx="0.5" fill="currentColor" opacity="0.45" />
  </svg>
);

// Format digits as (XXX) XXX-XXXX
const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const stripPhoneFormatting = (value) => value.replace(/\D/g, '');

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
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-lg font-medium text-warm">{text}</span>
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
  const [homeClubOpen, setHomeClubOpen] = useState(false);
  const [homeClubCustom, setHomeClubCustom] = useState(false);
  const [otherClubOpen, setOtherClubOpen] = useState(false);
  const [otherClubCustom, setOtherClubCustom] = useState(false);

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
    'Connecting to APTA Database...',
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
      const response = await clubAPI.getSuggestions();
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
      setPti(ptiMatch.pti_value.toString());
      setPtiVerified(true);

      // Auto-populate clubs from the match
      const matchedClubs = ptiMatch.clubs || [];
      if (matchedClubs.length > 0) {
        // Set first club as home club, rest as other clubs
        setHomeClub(matchedClubs[0]);
        if (matchedClubs.length > 1) {
          setOtherClubs(matchedClubs.slice(1));
        }
      }

      setPtiLookupState('idle');
    }
  };

  const handleRejectMatch = () => {
    setPtiMatch(null);
    setPtiLookupState('not_found');
  };

  const handleSelectFromDropdown = (player) => {
    setName(player.player_name);
    setPti(player.pti_value.toString());
    setPtiVerified(true);

    // Auto-populate clubs from the selected player
    const matchedClubs = player.clubs || [];
    if (matchedClubs.length > 0) {
      setHomeClub(matchedClubs[0]);
      if (matchedClubs.length > 1) {
        setOtherClubs(matchedClubs.slice(1));
      }
    }

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
        pti: pti ? parseFloat(pti) : null,
        pti_verified: ptiVerified,
        phone: stripPhoneFormatting(phone) || null,
      });
      navigate('/home');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : 'Failed to save profile');
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
        <div className="mt-4 p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
      const matchedClubs = ptiMatch.clubs || [];
      return (
        <div className="mt-4 p-6 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <span className="text-emerald-400 font-semibold">We found your APTA rating!</span>
          </div>

          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-warm">{ptiMatch.player_name}</p>
                <p className="text-sm text-warm-muted">APTA Verified Rating</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-400">{ptiMatch.pti_value}</p>
                <p className="text-xs text-warm-muted uppercase tracking-wide">PTI</p>
              </div>
            </div>
            {matchedClubs.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 text-sm text-warm-muted mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>{matchedClubs.length === 1 ? 'Club' : 'Clubs'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchedClubs.map((club, idx) => (
                    <Badge
                      key={club}
                      variant="secondary"
                      className={idx === 0 ? 'bg-emerald-400/10 text-emerald-400' : ''}
                    >
                      {club}
                      {idx === 0 && matchedClubs.length > 1 && (
                        <span className="ml-1 text-xs opacity-75">(home)</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleConfirmMatch}
              className="flex-1 rounded-full text-night font-semibold"
              style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}
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
        <div className="mt-4 p-6 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-amber-400 font-semibold">We couldn&apos;t automatically find your PTI</span>
          </div>

          <p className="text-warm-muted text-sm mb-4">
            Select your name from the league roster, or enter your PTI manually.
          </p>

          {/* Searchable Dropdown */}
          <div className="relative mb-4">
            <div
              className="rounded-lg p-3 cursor-pointer flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => setShowDropdown(!showDropdown)}
              data-testid="pti-roster-dropdown"
            >
              <span className="text-warm-muted">Search league roster...</span>
              <ChevronDown className={`w-5 h-5 text-warm-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" style={{ background: '#1b2838', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="p-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Input
                    placeholder="Type to search..."
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    className="text-sm bg-white/5 border-white/6 text-warm"
                    autoFocus
                    data-testid="pti-roster-search"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredRoster.length === 0 ? (
                    <div className="p-4 text-center text-warm-muted text-sm">
                      No players found
                    </div>
                  ) : (
                    filteredRoster.map((p, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-3 hover:bg-white/5 cursor-pointer last:border-0"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onClick={() => handleSelectFromDropdown(p)}
                        data-testid={`pti-roster-item-${idx}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-warm">{p.player_name}</span>
                          <span className="text-emerald-400 font-semibold">{p.pti_value}</span>
                        </div>
                        {p.clubs && p.clubs.length > 0 && (
                          <div className="text-xs text-warm-muted mt-1">
                            {p.clubs.join(', ')}
                          </div>
                        )}
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
              className="flex-1 text-warm-muted"
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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden" style={{ background: 'linear-gradient(170deg, #0a0f1a, #0d1b2a, #1b2838)' }}>
      <WireMeshBg />
      <GlowOrb className="w-96 h-96 -top-40 -right-40" color="#34d399" />
      <GlowOrb className="w-64 h-64 bottom-20 -left-40" color="#f59e0b" />
      <div className="w-full max-w-lg flex flex-col items-center relative z-10">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
            <span className="text-white font-black text-lg">4</span>
          </div>
          <span className="text-2xl font-serif text-warm tracking-tight">Find4th</span>
        </div>
      <Card className="w-full rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }} data-testid="complete-profile-card">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl tracking-tight font-serif text-warm">Complete Your Profile</CardTitle>
          <CardDescription className="text-sm text-warm-muted">
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
              <p className="text-xs text-warm-muted">
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
                    <Badge className="bg-emerald-400/10 text-emerald-400 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      APTA Verified
                    </Badge>
                  )}
                </Label>
                {ptiVerified ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div className="text-2xl font-bold text-emerald-400">{pti}</div>
                    <div className="text-sm text-warm-muted">APTA Official Rating</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-warm-muted"
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
                    <p className="text-xs text-warm-muted flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Your Platform Tennis Index rating. Typical range is 20-80.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="homeClub">Home Club *</Label>
              {homeClubCustom ? (
                <div className="flex gap-2">
                  <Input
                    id="homeClub"
                    placeholder="Enter your club name"
                    value={homeClub}
                    onChange={(e) => setHomeClub(e.target.value)}
                    data-testid="home-club-input"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setHomeClubCustom(false); setHomeClub(''); }}
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
                      className="w-full justify-between font-normal"
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
              <Label>Other Clubs (optional)</Label>
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
                    data-testid="other-club-input"
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
                      className="w-full justify-between font-normal"
                      data-testid="other-club-input"
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
              <div className="flex h-9 w-full rounded-md border border-input bg-transparent shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
                <div className="flex items-center gap-1.5 pl-3 pr-2 text-muted-foreground/70 select-none border-r border-input">
                  <USFlag className="w-5 h-auto" />
                  <span className="text-sm">+1</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  placeholder="(234) 567-8910"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  className="flex-1 bg-transparent px-3 py-1 text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="phone-input"
                />
              </div>
              <p className="text-xs text-warm-muted flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Add mobile number to enable instant SMS notifications for game &amp; player requests. Managed in profile settings.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full rounded-full text-night font-semibold hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}
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
    </div>
  );
};

export default CompleteProfile;
