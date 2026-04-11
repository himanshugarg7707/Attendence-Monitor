/**
 * ═══════════════════════════════════════════════════════════════════
 *  Dashboard Routes — WebSocket Upgrade for Professor's Live View
 * ═══════════════════════════════════════════════════════════════════
 */
import { Hono } from 'hono';
import type { WSContext } from 'hono/ws';
/**
 * Create dashboard routes.
 * The WebSocket upgrade handler is passed in because it requires
 * runtime-specific initialization (Node.js vs Bun vs Cloudflare).
 */
export declare function createDashboardRoutes(upgradeWebSocket: (handler: (c: unknown) => {
    onOpen?: (evt: Event, ws: WSContext) => void;
    onMessage?: (evt: MessageEvent, ws: WSContext) => void;
    onClose?: (evt: CloseEvent, ws: WSContext) => void;
    onError?: (evt: Event, ws: WSContext) => void;
}) => unknown): Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
//# sourceMappingURL=dashboard.routes.d.ts.map