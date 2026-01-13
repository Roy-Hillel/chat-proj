import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { MessageSquare, Plus, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from './Avatar';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatLayoutProps {
  children: React.ReactNode;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  agentState?: 'idle' | 'thinking' | 'tool:search' | 'tool:calculator' | 'error';
}

// Extract name from email: take prefix until first '.' or '@'
function extractNameFromEmail(email: string): string {
  const dotIndex = email.indexOf('.');
  const atIndex = email.indexOf('@');

  // Find the first occurrence of '.' or '@'
  let endIndex = email.length;
  if (dotIndex !== -1) endIndex = Math.min(endIndex, dotIndex);
  if (atIndex !== -1) endIndex = Math.min(endIndex, atIndex);

  const name = email.substring(0, endIndex);
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function ChatLayout({
  children,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  agentState = 'idle'
}: ChatLayoutProps) {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, currentConversationId]);

  const loadConversations = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/conversations/user/${user.id}`);
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to load conversations', error);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div 
        className={clsx(
          "flex-shrink-0 bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "w-[260px]" : "w-0 overflow-hidden opacity-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-sm text-gray-700 font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-xs font-semibold text-gray-400 mb-2 px-2">History</div>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors",
                currentConversationId === conv.id
                  ? "bg-gray-200 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {conv.title}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">
                {user?.name || (user?.email ? extractNameFromEmail(user.email) : 'User')}
              </div>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-gray-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <span className="font-semibold text-gray-700">AgentChat</span>
            <div className="ml-2">
               <Avatar state={agentState} size="sm" />
            </div>
          </div>
        </header>

        {/* Content Container - Centralized */}
        <main className="flex-1 overflow-hidden relative flex flex-col items-center">
          <div className="w-full max-w-3xl flex-1 flex flex-col relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
