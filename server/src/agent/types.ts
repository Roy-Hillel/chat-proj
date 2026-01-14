import { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Context passed to tools at runtime.
 * Contains user-scoped information needed for personalized operations.
 */
export interface ToolContext {
  userId: string;
}

export interface AgentTool {
  name: string;
  definition: ChatCompletionTool;
  run: (args: Record<string, unknown>, context: ToolContext) => Promise<string>;
}

export type AgentEvent = 
  | { type: 'content'; content: string }
  | { type: 'tool_start'; tool: string; input: any }
  | { type: 'tool_end'; tool: string; output: any }
  | { type: 'error'; error: string }
  | { type: 'done' };
