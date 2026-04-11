/**
 * ═══════════════════════════════════════════════════════════════════
 *  Dashboard Routes — WebSocket Upgrade for Professor's Live View
 * ═══════════════════════════════════════════════════════════════════
 */
import { Hono } from 'hono';
import { addConnection, removeConnection, getConnectionStats } from '../services/broadcast.service.js';
/**
 * Create dashboard routes.
 * The WebSocket upgrade handler is passed in because it requires
 * runtime-specific initialization (Node.js vs Bun vs Cloudflare).
 */
export function createDashboardRoutes(upgradeWebSocket) {
    const dashboardRoutes = new Hono();
    /**
     * GET /api/dashboard/ws
     * WebSocket endpoint for the professor's live attendance dashboard.
     *
     * Query params:
     *   - classroomId: The classroom session to subscribe to
     *
     * When a student verifies, a STUDENT_VERIFIED event is pushed
     * through this connection, causing the student's card to "pop"
     * onto the professor's screen in <100ms.
     */
    dashboardRoutes.get('/ws', upgradeWebSocket((c) => {
        const classroomId = new URL(c.req.url).searchParams.get('classroomId') ?? 'default';
        return {
            onOpen(_evt, ws) {
                addConnection(classroomId, ws);
                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'CONNECTED',
                    payload: {
                        classroomId,
                        message: 'Connected to live attendance dashboard',
                        timestamp: new Date().toISOString(),
                    },
                }));
            },
            onMessage(evt, ws) {
                // Handle client messages (e.g., ping)
                try {
                    const data = JSON.parse(String(evt.data));
                    if (data.type === 'PING') {
                        ws.send(JSON.stringify({
                            type: 'PONG',
                            payload: { timestamp: Date.now() },
                        }));
                    }
                }
                catch {
                    // Ignore malformed messages
                }
            },
            onClose(_evt, ws) {
                removeConnection(ws);
            },
            onError(_evt, ws) {
                console.error('[Dashboard WS] Connection error');
                removeConnection(ws);
            },
        };
    }));
    /**
     * GET /api/dashboard/stats
     * Get current WebSocket connection statistics.
     */
    dashboardRoutes.get('/stats', async (c) => {
        const stats = getConnectionStats();
        return c.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString(),
        });
    });
    return dashboardRoutes;
}
//# sourceMappingURL=dashboard.routes.js.map