import { FastifyInstance } from 'fastify';
declare const CHANNELS: {
    ORDERS: string;
    KITCHEN: string;
    TABLES: string;
    NOTIFICATIONS: string;
};
export declare function setupWebSocket(server: FastifyInstance): void;
export declare function broadcast(channel: string, data: any): void;
export declare function broadcastOrderUpdate(order: any): void;
export declare function broadcastNewOrder(order: any): void;
export declare function broadcastTableUpdate(table: any): void;
export { CHANNELS };
//# sourceMappingURL=index.d.ts.map