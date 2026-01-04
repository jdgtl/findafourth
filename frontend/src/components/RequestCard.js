import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { MapPin, Clock, Users, ChevronDown, ChevronUp, Check, Hourglass } from 'lucide-react';

const RequestCard = ({ request, isOrganizer, myResponse, onRespond, onClick }) => {
  const [expanded, setExpanded] = useState(false);

  const getTimeDisplay = (dateTimeStr) => {
    const date = parseISO(dateTimeStr);
    if (isToday(date)) {
      return `Tonight at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, "EEE, MMM d 'at' h:mm a");
    }
  };

  const getSpotsText = () => {
    const remaining = request.spots_needed - request.spots_filled;
    if (remaining === 1) return 'Need 1 more';
    return `Need ${remaining} more`;
  };

  const getSkillRangeText = () => {
    if (!request.skill_min && !request.skill_max) return null;
    if (request.skill_min && request.skill_max) {
      return `PTI ${request.skill_min}-${request.skill_max}`;
    }
    if (request.skill_min) return `PTI ${request.skill_min}+`;
    if (request.skill_max) return `PTI up to ${request.skill_max}`;
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

  const getStatusBadge = () => {
    if (request.status === 'filled') {
      return <Badge className="bg-blue-500">Filled</Badge>;
    }
    if (request.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return null;
  };

  const getResponseButton = () => {
    if (isOrganizer) {
      return (
        <Button variant="outline" size="sm" onClick={onClick}>
          Manage
        </Button>
      );
    }

    if (myResponse?.status === 'confirmed') {
      return (
        <Button variant="outline" size="sm" className="text-emerald-600" disabled>
          <Check className="w-4 h-4 mr-1" />
          You're In!
        </Button>
      );
    }

    if (myResponse?.status === 'interested') {
      return (
        <Button variant="outline" size="sm" className="text-amber-600" disabled>
          <Hourglass className="w-4 h-4 mr-1" />
          Pending
        </Button>
      );
    }

    if (request.spots_filled >= request.spots_needed) {
      return (
        <Button variant="outline" size="sm" disabled>
          Full
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700"
        onClick={(e) => {
          e.stopPropagation();
          onRespond?.();
        }}
        data-testid="im-in-btn"
      >
        I'm In
      </Button>
    );
  };

  const skillRange = getSkillRangeText();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-testid="request-card"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Time */}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
              <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {getTimeDisplay(request.date_time)}
              {getStatusBadge()}
            </div>

            {/* Club */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {request.club}
                {request.court && ` - Court ${request.court}`}
              </span>
            </div>

            {/* Spots & Skill */}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {getSpotsText()}
              </Badge>
              {skillRange && (
                <Badge variant="outline">{skillRange}</Badge>
              )}
            </div>

            {/* Organizer */}
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                  {getInitials(request.organizer?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isOrganizer ? 'You' : request.organizer?.name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Response Button */}
          <div className="flex flex-col items-end gap-2">
            {getResponseButton()}
            {(request.notes || request.court) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && request.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {request.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestCard;
