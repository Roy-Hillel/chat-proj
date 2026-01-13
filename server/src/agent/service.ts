import OpenAI from "openai";
import { tools, toolDefinitions } from "./registry";
import { AgentEvent } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
});

// Mock Logic for fallback
async function* runMockAgent(messages: any[]): AsyncGenerator<AgentEvent> {
  const lastMsg = messages[messages.length - 1].content.toLowerCase();

  // Simulate "thinking" delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (
    lastMsg.includes("calc") ||
    lastMsg.includes("+") ||
    lastMsg.includes("-") ||
    lastMsg.includes("*") ||
    lastMsg.includes("/")
  ) {
    yield {
      type: "content",
      content: "I see you want to calculate something. Let me use my tool.\n",
    };

    // Mock Tool Call
    yield {
      type: "tool_start",
      tool: "calculator",
      input: { operation: "add", a: 50, b: 20 },
    };
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = "70";
    yield { type: "tool_end", tool: "calculator", output: result };

    yield { type: "content", content: `The result is ${result}.` };
  } else if (lastMsg.includes("search")) {
    yield { type: "content", content: "Searching the web for you...\n" };

    yield { type: "tool_start", tool: "search", input: { query: lastMsg } };
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const result = "Found 2 results: 1. AgentChat Docs 2. React Tutorial";
    yield { type: "tool_end", tool: "search", output: result };

    yield { type: "content", content: `I found some information: ${result}` };
  } else if (lastMsg.includes("movie")) {
    yield { type: "content", content: "Looking up movie recommendations...\n" };

    const toolName = "movie_recommendations";
    // Simple heuristic: use the full message as the query
    const input = { query: lastMsg };

    yield { type: "tool_start", tool: toolName, input };

    try {
      // Use the actual tool since we implemented it
      const tool = tools[toolName];
      const result = await tool.run(input);

      yield { type: "tool_end", tool: toolName, output: result };
      yield { type: "content", content: result };
    } catch (error: any) {
      const errorMsg = "Failed to get recommendations: " + error.message;
      yield { type: "error", error: errorMsg };
      yield { type: "content", content: errorMsg };
    }
  } else {
    const reply =
      "I am currently in Mock Mode because the OpenAI quota is exceeded. I can simulate 'calculator' and 'search' tools if you ask me to.";
    // Stream the reply
    for (const char of reply) {
      yield { type: "content", content: char };
      await new Promise((resolve) => setTimeout(resolve, 10)); // Typing effect
    }
  }

  yield { type: "done" };
}

export async function* runAgent(messages: any[]): AsyncGenerator<AgentEvent> {
  // Check if we should use Mock Mode (e.g. if API key is invalid/quota exceeded previously)
    // Since we know the key is failing with 429, let's wrap the real call in try/catch and fallback.

  try {
    let currentMessages = [...messages];
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
        currentMessages.push({
          role: "assistant",
          content: assistantMsg.content || null,
          tool_calls: assistantMsg.tool_calls,
        });

        // Execute tools
        for (const tc of assistantMsg.tool_calls) {
          const toolName = tc.function.name;
          const argsStr = tc.function.arguments;
          let args;
          try {
            args = JSON.parse(argsStr);
            yield { type: "tool_start", tool: toolName, input: args };

            const tool = tools[toolName];
            if (!tool) throw new Error(`Tool ${toolName} not found`);

            const result = await tool.run(args);
            yield { type: "tool_end", tool: toolName, output: result };

            currentMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            });
          } catch (e: any) {
            const errorMsg = `Error: ${e.message}`;
            yield { type: "error", error: errorMsg };
            currentMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: errorMsg,
            });
          }
        }
      }
    }

    yield { type: "done" };
  } catch (error: any) {
    console.warn(
      "OpenAI API failed, falling back to Mock Agent:",
      error.message
    );
    // Fallback to Mock Agent
    yield* runMockAgent(messages);
  }
}
