import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';

const AvailabilityCard = ({ post, onInvite, isOwn }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  return (
    <Card data-testid="availability-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                {getInitials(post.player?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {post.player?.name || 'Unknown Player'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {post.message}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.available_date)}
                </Badge>
                {post.clubs?.map((club) => (
                  <Badge key={club} variant="secondary" className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {club}
                  </Badge>
                ))}
                {post.player?.pti && (
                  <Badge variant="outline">PTI {post.player.pti}</Badge>
                )}
              </div>
            </div>
          </div>
          {!isOwn && onInvite && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onInvite();
              }}
              data-testid="invite-btn"
            >
              Invite
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilityCard;
