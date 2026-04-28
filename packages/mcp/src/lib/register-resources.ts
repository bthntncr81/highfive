import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { registerSchemaResource } from '../resources/schema';
import { registerMenuResource } from '../resources/menu';
import { registerActiveOrdersResource } from '../resources/active-orders';
import { registerTablesResource } from '../resources/tables';

export function registerAllResources(server: McpServer, prisma: PrismaClient): void {
  registerSchemaResource(server, prisma);
  registerMenuResource(server, prisma);
  registerActiveOrdersResource(server, prisma);
  registerTablesResource(server, prisma);
}
