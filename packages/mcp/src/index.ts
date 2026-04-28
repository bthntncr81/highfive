import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getPrismaClient, disconnectPrisma } from './prisma';
import { registerAllTools } from './lib/register-tools';
import { registerAllResources } from './lib/register-resources';

async function main() {
  const prisma = getPrismaClient();

  try {
    await prisma.$connect();
    console.error('[MCP] Database connected');
  } catch (err) {
    console.error('[MCP] Database connection failed:', err);
    process.exit(1);
  }

  const server = new McpServer({
    name: 'highfive-mcp',
    version: '1.0.0',
  });

  registerAllTools(server, prisma);
  registerAllResources(server, prisma);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] HighFive MCP server started on stdio');

  process.on('SIGINT', async () => {
    await disconnectPrisma();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});
