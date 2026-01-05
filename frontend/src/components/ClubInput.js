import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

/**
 * Reusable club input component with add/remove functionality
 * @param {string[]} clubs - Array of current clubs
 * @param {function} setClubs - State setter for clubs array
 * @param {string} newClub - Current input value for new club
 * @param {function} setNewClub - State setter for new club input
 * @param {string[]} suggestions - Optional array of club suggestions for datalist
 * @param {string} placeholder - Optional placeholder text
 * @param {string} testId - Optional test ID prefix
 */
const ClubInput = memo(({
  clubs,
  setClubs,
  newClub,
  setNewClub,
  suggestions = [],
  placeholder = 'Add a club',
  testId = 'club'
}) => {
  const handleAddClub = () => {
    const trimmed = newClub.trim();
    if (trimmed && !clubs.includes(trimmed)) {
      setClubs([...clubs, trimmed]);
      setNewClub('');
    }
  };

  const handleRemoveClub = (club) => {
    setClubs(clubs.filter((c) => c !== club));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddClub();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newClub}
          onChange={(e) => setNewClub(e.target.value)}
          onKeyPress={handleKeyPress}
          list={suggestions.length > 0 ? `${testId}-suggestions` : undefined}
          data-testid={`${testId}-input`}
        />
        <Button type="button" variant="outline" onClick={handleAddClub}>
          Add
        </Button>
      </div>
      {suggestions.length > 0 && (
        <datalist id={`${testId}-suggestions`}>
          {suggestions.map((club) => (
            <option key={club} value={club} />
          ))}
        </datalist>
      )}
      {clubs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {clubs.map((club) => (
            <Badge key={club} variant="secondary" className="flex items-center gap-1">
              {club}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => handleRemoveClub(club)}
                data-testid={`${testId}-remove-${club}`}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});

export default ClubInput;
