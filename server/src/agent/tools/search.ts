import { AgentTool } from '../types';

export const searchTool: AgentTool = {
  name: 'search',
  definition: {
    type: 'function',
    function: {
      name: 'search',
      description: 'Search the web for information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },
  run: async ({ query }: { query: string }) => {
    // Mock search with delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `Results for "${query}":\n1. "AgentChat is a new framework..."\n2. "The latest AI news says..."`;
  },
};
