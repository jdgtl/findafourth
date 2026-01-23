import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityAPI, clubAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Loader2, ArrowLeft, X, ChevronsUpDown, Check, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CreateAvailability = () => {
  const navigate = useNavigate();
  const { player } = useAuth();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [message, setMessage] = useState('');
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [open, setOpen] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherClub, setOtherClub] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch clubs on mount
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await clubAPI.getNames();
        setAllClubs(response.data);
      } catch (err) {
        console.error('Failed to fetch clubs:', err);
      } finally {
        setLoadingClubs(false);
      }
    };
    fetchClubs();
  }, []);

  // Initialize with player's clubs
  useEffect(() => {
    if (player) {
      const playerClubs = [player.home_club, ...(player.other_clubs || [])].filter(Boolean);
      setSelectedClubs(playerClubs);
    }
  }, [player]);

  const handleSelectClub = (clubName) => {
    if (clubName === '__other__') {
      setShowOtherInput(true);
      setOpen(false);
      return;
    }

    if (selectedClubs.includes(clubName)) {
      setSelectedClubs(selectedClubs.filter((c) => c !== clubName));
    } else {
      setSelectedClubs([...selectedClubs, clubName]);
    }
  };

  const handleAddOtherClub = () => {
    if (otherClub.trim() && !selectedClubs.includes(otherClub.trim())) {
      setSelectedClubs([...selectedClubs, otherClub.trim()]);
      setOtherClub('');
      setShowOtherInput(false);
    }
  };

  const handleRemoveClub = (club) => {
    setSelectedClubs(selectedClubs.filter((c) => c !== club));
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
        clubs: selectedClubs,
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
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                      disabled={loadingClubs}
                      data-testid="club-select-trigger"
                    >
                      {loadingClubs ? (
                        <span className="text-muted-foreground">Loading clubs...</span>
                      ) : selectedClubs.length > 0 ? (
                        <span className="text-muted-foreground">
                          {selectedClubs.length} club{selectedClubs.length !== 1 ? 's' : ''} selected
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select clubs...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder="Search clubs..." />
                      <CommandList>
                        <CommandEmpty>No club found.</CommandEmpty>
                        <CommandGroup heading="Clubs">
                          {allClubs.map((club) => (
                            <CommandItem
                              key={club}
                              value={club}
                              onSelect={(value) => handleSelectClub(club)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedClubs.includes(club) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {club}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Custom">
                          <CommandItem
                            value="other-enter-manually"
                            onSelect={() => handleSelectClub('__other__')}
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

                {/* Other club input */}
                {showOtherInput && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Enter club name"
                      value={otherClub}
                      onChange={(e) => setOtherClub(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOtherClub())}
                      autoFocus
                    />
                    <Button type="button" variant="outline" onClick={handleAddOtherClub}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowOtherInput(false);
                        setOtherClub('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Selected clubs */}
                {selectedClubs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedClubs.map((club) => (
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
