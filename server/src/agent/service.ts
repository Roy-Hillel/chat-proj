import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { tools, toolDefinitions } from "./registry";
import { AgentEvent, ToolContext } from "./types";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { runMockAgent } from "./mockAgent";

const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || "dummy")
    .trim()
    .replace(/[^\x00-\x7F]/g, ""),
});

export async function* runAgent(
  messages: ChatCompletionMessageParam[],
  context: ToolContext
): AsyncGenerator<AgentEvent> {
  // Check if we should use Mock Mode (e.g. if API key is invalid/quota exceeded previously)
    // Since we know the key is failing with 429, let's wrap the real call in try/catch and fallback.

  try {
    // Prepend system instructions at runtime (we don't store system messages in DB).
    const currentMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];
    let keepGoing = true;

    // Fast-fail if key is dummy to avoid API hit
    if (openai.apiKey === "dummy") throw new Error("No API Key");

    while (keepGoing) {
      keepGoing = false;

      let assistantMsg = {
        role: "assistant",
        content: "",
        tool_calls: [] as any[],
      };

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: currentMessages,
        tools: toolDefinitions,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        if (delta?.content) {
          assistantMsg.content += delta.content;
          yield { type: "content", content: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index;
            if (!assistantMsg.tool_calls[index]) {
              assistantMsg.tool_calls[index] = {
                id: "",
                type: "function",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id) assistantMsg.tool_calls[index].id += tc.id;
            if (tc.function?.name)
              assistantMsg.tool_calls[index].function.name += tc.function.name;
            if (tc.function?.arguments)
              assistantMsg.tool_calls[index].function.arguments +=
                tc.function.arguments;
          }
        }

        if (finishReason === "tool_calls") {
          keepGoing = true;
        }
      }

      if (keepGoing && assistantMsg.tool_calls.length > 0) {
        // Add assistant message to history
        const assistantMessage: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: assistantMsg.content || null,
          tool_calls: assistantMsg.tool_calls,
        };
        currentMessages.push(assistantMessage);

        // Execute tools
        for (const tc of assistantMsg.tool_calls) {
          const toolName = tc.function.name;
          const argsStr = tc.function.arguments;
          let args: Record<string, unknown>;
          try {
            args = JSON.parse(argsStr) as Record<string, unknown>;
            yield { type: "tool_start", tool: toolName, input: args };

            const tool = tools[toolName];
            if (!tool) throw new Error(`Tool ${toolName} not found`);

            const result = await tool.run(args, context);
            yield { type: "tool_end", tool: toolName, output: result };

            const toolMessage: ChatCompletionToolMessageParam = {
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            };
            currentMessages.push(toolMessage);
          } catch (e) {
            const errorMsg = `Error: ${
              e instanceof Error ? e.message : "Unknown error"
            }`;
            yield { type: "error", error: errorMsg };
            const errorToolMessage: ChatCompletionToolMessageParam = {
              role: "tool",
              tool_call_id: tc.id,
              content: errorMsg,
            };
            currentMessages.push(errorToolMessage);
          }
        }
      }
    }

    yield { type: "done" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("OpenAI API failed:", errorMessage);

    // Fallback to Mock Agent
    yield* runMockAgent(messages, context);
  }
}
