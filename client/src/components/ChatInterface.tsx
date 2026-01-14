import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../api";
import { ChatLayout } from "./ChatLayout";
import { MessageBubble } from "./MessageBubble";
import { ActivityIndicator } from "./ActivityIndicator";
import { Send, StopCircle, ArrowUp } from "lucide-react";
import { Avatar as AvatarStateDisplay, type AvatarState } from "./Avatar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationHelpersRef = useRef<{
    refresh: () => void;
    updateTitle: (id: string, title: string) => void;
  } | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activities]);

  // Focus input when conversation changes (new chat or selecting from history)
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentConvId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createNewChat = async () => {
    if (!user) return;
    try {
      const res = await api.post("/conversations", { userId: user.id });
      setCurrentConvId(res.data.id);
      setMessages([]);
      setActivities([]);
    } catch (e: any) {
      console.error(e);
      showError("Failed to create new chat. Please try again.");
    }
  };

  const loadConversation = async (id: string) => {
    setCurrentConvId(id);
    setActivities([]);
    try {
      const res = await api.get(`/conversations/${id}`);
      setMessages(res.data.messages);
    } catch (e: any) {
      console.error(e);
      showError("Failed to load conversation. Please try again.");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    let convId = currentConvId;
    if (!convId) {
      const res = await api.post("/conversations", {
        userId: user.id,
        title: input.substring(0, 30),
      });
      convId = res.data.id;
      setCurrentConvId(convId);
    }

    const userMsg = {
      id: Date.now().toString(),
      role: "user" as const,
      content: input,
    };
    
    // Optimistically update the title if this is the first message
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage && convId) {
      const newTitle = input.substring(0, 50).trim() || 'New Chat';
      conversationHelpersRef.current?.updateTitle(convId, newTitle);
    }
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setAvatarState("thinking");
    setActivities([]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          conversationId: convId,
          userId: user.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsgContent = "";

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const type = line.split("\n")[0].replace("event: ", "");
            const dataStr = line.split("\n")[1]?.replace("data: ", "");

            if (!dataStr) continue;
            if (dataStr === "[DONE]") break;

            try {
              const data = JSON.parse(dataStr);
              if (type === "content") {
                assistantMsgContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: assistantMsgContent }
                      : m
                  )
                );
              } else if (type === "tool_start") {
                setActivities((prev) => [
                  ...prev,
                  { type: "tool_start", ...data, timestamp: Date.now() },
                ]);
                // Set avatar state based on tool type
                const toolName = data.tool as string;
                if (toolName === "search_movie_info") {
                  setAvatarState("tool:search");
                } else if (
                  toolName.includes("watchlist") ||
                  toolName === "add_to_watchlist" ||
                  toolName === "get_watchlist" ||
                  toolName === "remove_from_watchlist" ||
                  toolName === "rate_watchlist_movie" ||
                  toolName === "mark_as_watched"
                ) {
                  setAvatarState("tool:watchlist");
                } else if (
                  toolName.includes("movie") ||
                  toolName === "movie_similarity" ||
                  toolName === "movie_ratings" ||
                  toolName === "movie_recommendations"
                ) {
                  setAvatarState("tool:movies");
                } else {
                  setAvatarState("thinking");
                }
              } else if (type === "tool_end") {
                // Update the existing tool_start activity instead of adding a new one
                setActivities((prev) =>
                  prev.map((activity) =>
                    activity.type === "tool_start" && activity.tool === data.tool
                      ? { ...activity, type: "tool_end", output: data.output }
                      : activity
                  )
                );
                setAvatarState("thinking");
              } else if (type === "error") {
                setActivities((prev) => [
                  ...prev,
                  { type: "error", ...data, timestamp: Date.now() },
                ]);
                setAvatarState("error");
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
      setAvatarState("idle");
      // Refresh conversations list to sync with server (e.g., updatedAt timestamp)
      conversationHelpersRef.current?.refresh();
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error(error);
        setAvatarState("error");
        showError("Oops... Something went wrong while sending your message.");
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteConversation = (deletedId: string) => {
    // Clear current conversation if it was the one deleted
    if (currentConvId === deletedId) {
      setCurrentConvId(null);
      setMessages([]);
      setActivities([]);
    }
  };

  return (
    <ChatLayout
      currentConversationId={currentConvId}
      onSelectConversation={loadConversation}
      onNewChat={createNewChat}
      onDeleteConversation={handleDeleteConversation}
      onRegisterConversationHelpers={(helpers) => { conversationHelpersRef.current = helpers; }}
      agentState={avatarState}
    >
      <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                <AvatarStateDisplay state={avatarState} size="lg" />
                <h2 className="mt-4 text-xl font-semibold text-gray-800">
                  How can I help you today?
                </h2>
                <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
                  I can perform calculations, search the web, and recommend movies.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <MessageBubble 
                  key={m.id} 
                  role={m.role} 
                  content={m.content}
                  userInitial={user?.email?.[0]?.toUpperCase()}
                />
              ))}
              {activities.length > 0 && (
                <div className="animate-[slideIn_0.3s_ease-out]">
                  <ActivityIndicator activities={activities} />
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 bg-white/80 backdrop-blur-sm">
          <form
            onSubmit={sendMessage}
            className="relative shadow-lg rounded-2xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-black/5 transition-all"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message MovieMate..."
              className="w-full bg-transparent text-gray-900 placeholder-gray-400 border-0 rounded-2xl py-4 pl-5 pr-14 focus:ring-0 resize-none text-base"
              disabled={isStreaming}
              autoFocus
            />
            <div className="absolute right-2 bottom-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={() => abortControllerRef.current?.abort()}
                  className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-black transition-colors"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
          <div className="text-center mt-3 text-xs text-gray-400">
            AI can make mistakes. Please check important info.
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
