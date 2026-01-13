import { ChatCompletionTool } from 'openai/resources/chat/completions';

export interface AgentTool {
  name: string;
  definition: ChatCompletionTool;
  run: (args: any) => Promise<string>;
}

export type AgentEvent = 
  | { type: 'content'; content: string }
  | { type: 'tool_start'; tool: string; input: any }
  | { type: 'tool_end'; tool: string; output: any }
  | { type: 'error'; error: string }
  | { type: 'done' };
