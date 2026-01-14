import { AgentTool, ToolContext } from '../types';

interface CalculatorArgs {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

export const calculatorTool: AgentTool = {
  name: 'calculator',
  definition: {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Perform basic arithmetic operations (add, subtract, multiply, divide).',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
          a: { type: 'number' },
          b: { type: 'number' },
        },
        required: ['operation', 'a', 'b'],
      },
    },
  },
  run: async (args: Record<string, unknown>, _context: ToolContext) => {
    const { operation, a, b } = args as unknown as CalculatorArgs;
    switch (operation) {
      case 'add': return String(a + b);
      case 'subtract': return String(a - b);
      case 'multiply': return String(a * b);
      case 'divide': return String(a / b);
      default: return 'Invalid operation';
    }
  },
};
