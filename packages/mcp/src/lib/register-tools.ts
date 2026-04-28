import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { registerOrderTools } from '../tools/orders';
import { registerMenuTools } from '../tools/menu';
import { registerTableTools } from '../tools/tables';
import { registerStockTools } from '../tools/stock';
import { registerAnalyticsTools } from '../tools/analytics';
import { registerLoyaltyTools } from '../tools/loyalty';
import { registerDatabaseTools } from '../tools/database';
import { registerSystemTools } from '../tools/system';

export function registerAllTools(server: McpServer, prisma: PrismaClient): void {
  registerOrderTools(server, prisma);
  registerMenuTools(server, prisma);
  registerTableTools(server, prisma);
  registerStockTools(server, prisma);
  registerAnalyticsTools(server, prisma);
  registerLoyaltyTools(server, prisma);
  registerDatabaseTools(server, prisma);
  registerSystemTools(server, prisma);
}
