/**
 * ═══════════════════════════════════════════════════════════════════
 *  WebSocket Broadcast Service
 *
 *  Manages real-time WebSocket connections for the professor's
 *  live attendance dashboard. When a student verifies, their
 *  profile card is broadcast to all connected professors viewing
 *  that classroom — targeting <100ms delivery.
 * ═══════════════════════════════════════════════════════════════════
 */
import type { WSContext } from 'hono/ws';
import type { DashboardEvent, StudentVerifiedPayload } from '../../shared/types.js';
/**
 * Register a new WebSocket connection for a classroom dashboard.
 */
export declare function addConnection(classroomId: string, ws: WSContext): void;
/**
 * Remove a WebSocket connection (on close or error).
 */
export declare function removeConnection(ws: WSContext): void;
/**
 * Broadcast a dashboard event to all professors viewing a classroom.
 * This is the core function for the "Live" dashboard — when a student
 * verifies, their card pops onto every connected professor's screen.
 */
export declare function broadcastToClassroom(classroomId: string, event: DashboardEvent): void;
/**
 * Convenience: broadcast a student verification event.
 */
export declare function broadcastStudentVerified(classroomId: string, payload: StudentVerifiedPayload): void;
/**
 * Broadcast a session lifecycle event.
 */
export declare function broadcastSessionStarted(classroomId: string, sessionId: string, className: string): void;
export declare function broadcastSessionEnded(classroomId: string, sessionId: string, totalVerified: number): void;
/**
 * Start the heartbeat interval. Sends periodic pings to keep
 * connections alive and detect stale ones.
 */
export declare function startHeartbeat(): void;
export declare function getConnectionStats(): {
    totalClassrooms: number;
    totalConnections: number;
    perClassroom: Record<string, number>;
};
//# sourceMappingURL=broadcast.service.d.ts.map