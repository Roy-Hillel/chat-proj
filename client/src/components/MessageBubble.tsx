import React from 'react';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';
  
  return (
    <div className={clsx("flex w-full mb-6 animate-[fadeIn_0.3s_ease-out]", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx(
        "flex max-w-[85%] md:max-w-[80%]",
        isUser ? "flex-row-reverse gap-3" : "flex-row gap-4"
      )}>
        {/* Avatar */}
        <div className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
          isUser 
            ? "bg-gray-100 border-gray-200 text-gray-600" 
            : "bg-black border-black text-white"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        
        {/* Bubble */}
        <div className={clsx(
          "px-5 py-3.5 text-[15px] leading-7 shadow-sm prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-50",
          isUser
            ? "bg-gray-100 text-gray-900 rounded-3xl rounded-tr-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-3xl rounded-tl-sm"
        )}>
          <ReactMarkdown>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
