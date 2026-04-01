import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PresenceState } from '@/lib/collaboration';

interface PresenceAvatarsProps {
  presence: PresenceState[];
  currentUserId?: string;
  maxVisible?: number;
}

// Generate consistent color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  if (name.length <= 2) return name.toUpperCase();
  
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  return name.slice(0, 2).toUpperCase();
}

export function PresenceAvatars({
  presence,
  currentUserId,
  maxVisible = 5,
}: PresenceAvatarsProps) {
  // Filter out current user and deduplicate
  const otherUsers = presence.filter(
    (p, index, self) =>
      p.user_id !== currentUserId &&
      self.findIndex(s => s.user_id === p.user_id) === index
  );

  if (otherUsers.length === 0) {
    return null;
  }

  const visibleUsers = otherUsers.slice(0, maxVisible);
  const overflowCount = otherUsers.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((user) => (
          <Tooltip key={user.user_id}>
            <TooltipTrigger asChild>
              <Avatar
                className={`w-7 h-7 border-2 border-background ring-2 ring-green-500 cursor-default ${stringToColor(user.user_email)}`}
              >
                <AvatarFallback className="text-xs text-white bg-transparent">
                  {getInitials(user.user_email)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">{user.user_email}</p>
              <p className="text-xs text-muted-foreground">
                {user.current_panel_id
                  ? `Viewing panel ${user.current_panel_id}`
                  : 'Online'}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {overflowCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="w-7 h-7 border-2 border-background bg-muted cursor-default">
                <AvatarFallback className="text-xs">
                  +{overflowCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{overflowCount} more collaborator{overflowCount > 1 ? 's' : ''} online</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
