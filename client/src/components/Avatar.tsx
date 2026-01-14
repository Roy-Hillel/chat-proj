import React from 'react';
import { Bot, Brain, Search, Bookmark, Film, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export type AvatarState = 'idle' | 'thinking' | 'tool:search' | 'tool:watchlist' | 'tool:movies' | 'error';

interface AvatarProps {
  state: AvatarState;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ state, className, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1',
    md: 'w-12 h-12 p-2',
    lg: 'w-16 h-16 p-3'
  };

  const getIcon = () => {
    switch (state) {
      case 'thinking': return <Brain className="animate-pulse text-purple-600" />;
      case 'tool:search': return <Search className="animate-bounce text-blue-600" />;
      case 'tool:watchlist': return <Bookmark className="animate-bounce text-rose-600" />;
      case 'tool:movies': return <Film className="animate-bounce text-amber-600" />;
      case 'error': return <AlertCircle className="text-red-600" />;
      default: return <Bot className="text-gray-700" />;
    }
  };

  const getBgColor = () => {
    switch (state) {
      case 'thinking': return 'bg-purple-100 ring-2 ring-purple-300';
      case 'tool:search': return 'bg-blue-100 ring-2 ring-blue-300';
      case 'tool:watchlist': return 'bg-rose-100 ring-2 ring-rose-300';
      case 'tool:movies': return 'bg-amber-100 ring-2 ring-amber-300';
      case 'error': return 'bg-red-100 ring-2 ring-red-300';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center transition-all duration-300',
      sizeClasses[size],
      getBgColor(),
      className
    )}>
      {getIcon()}
    </div>
  );
}
