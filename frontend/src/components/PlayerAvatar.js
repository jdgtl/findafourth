import React, { memo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

/**
 * Reusable player avatar component with initials
 * @param {string} name - Player name for initials
 * @param {string} size - Size variant: 'sm' (w-6), 'md' (w-8), 'lg' (w-10), 'xl' (w-12)
 * @param {string} variant - Color variant: 'default' (emerald), 'amber', 'gray'
 * @param {string} className - Additional classes for Avatar wrapper
 */
const PlayerAvatar = memo(({ name, size = 'md', variant = 'default', className }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
    xl: 'text-base',
  };

  const variantClasses = {
    default: 'bg-emerald-100 text-emerald-700',
    primary: 'bg-emerald-600 text-white',
    amber: 'bg-amber-100 text-amber-700',
    gray: 'bg-gray-200 text-gray-600',
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className={cn(variantClasses[variant], textSizeClasses[size])}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
});

export default PlayerAvatar;
