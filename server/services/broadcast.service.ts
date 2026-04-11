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
import { CONFIG } from '../config.js';

// ─── Connection Registry ─────────────────────────────────────────

/**
 * Maps classroomId → Set of active WebSocket connections.
 * Each professor viewing a classroom's dashboard has a connection here.
 */
const classroomConnections = new Map<string, Set<WSContext>>();

/**
 * Maps each WebSocket to its classroom ID for cleanup on disconnect.
 */
const connectionClassroom = new Map<WSContext, string>();

// ─── Connection Lifecycle ────────────────────────────────────────

/**
 * Register a new WebSocket connection for a classroom dashboard.
 */
export function addConnection(classroomId: string, ws: WSContext): void {
  if (!classroomConnections.has(classroomId)) {
    classroomConnections.set(classroomId, new Set());
  }
  classroomConnections.get(classroomId)!.add(ws);
  connectionClassroom.set(ws, classroomId);

  const count = classroomConnections.get(classroomId)!.size;
  console.log(`[WS] Professor connected to ${classroomId}. Total viewers: ${count}`);
}

/**
 * Remove a WebSocket connection (on close or error).
 */
export function removeConnection(ws: WSContext): void {
  const classroomId = connectionClassroom.get(ws);
  if (classroomId) {
    const connections = classroomConnections.get(classroomId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        classroomConnections.delete(classroomId);
      }
    }
    connectionClassroom.delete(ws);
    console.log(
      `[WS] Professor disconnected from ${classroomId}. ` +
      `Remaining: ${classroomConnections.get(classroomId)?.size ?? 0}`,
    );
  }
}

// ─── Broadcasting ────────────────────────────────────────────────

/**
 * Broadcast a dashboard event to all professors viewing a classroom.
 * This is the core function for the "Live" dashboard — when a student
 * verifies, their card pops onto every connected professor's screen.
 */
export function broadcastToClassroom(
  classroomId: string,
  event: DashboardEvent,
): void {
  const connections = classroomConnections.get(classroomId);
  if (!connections || connections.size === 0) {
    console.log(`[WS] No viewers for classroom ${classroomId}, skipping broadcast`);
    return;
  }

  const payload = JSON.stringify(event);
  let delivered = 0;
  const failed: WSContext[] = [];

  for (const ws of connections) {
    try {
      ws.send(payload);
      delivered++;
    } catch (err) {
      console.error(`[WS] Failed to send to connection:`, err);
      failed.push(ws);
    }
  }

  // Clean up failed connections
  for (const ws of failed) {
    removeConnection(ws);
  }

  console.log(
    `[WS] Broadcast ${event.type} to ${delivered}/${connections.size} ` +
    `viewer(s) in ${classroomId}`,
  );
}

/**
 * Convenience: broadcast a student verification event.
 */
export function broadcastStudentVerified(
  classroomId: string,
  payload: StudentVerifiedPayload,
): void {
  broadcastToClassroom(classroomId, {
    type: 'STUDENT_VERIFIED',
    payload,
  });
}

/**
 * Broadcast a session lifecycle event.
 */
export function broadcastSessionStarted(
  classroomId: string,
  sessionId: string,
  className: string,
): void {
  broadcastToClassroom(classroomId, {
    type: 'SESSION_STARTED',
    payload: { sessionId, className },
  });
}

export function broadcastSessionEnded(
  classroomId: string,
  sessionId: string,
  totalVerified: number,
): void {
  broadcastToClassroom(classroomId, {
    type: 'SESSION_ENDED',
    payload: { sessionId, totalVerified },
  });
}

// ─── Heartbeat ───────────────────────────────────────────────────

/**
 * Start the heartbeat interval. Sends periodic pings to keep
 * connections alive and detect stale ones.
 */
export function startHeartbeat(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [classroomId, connections] of classroomConnections) {
      const event: DashboardEvent = {
        type: 'HEARTBEAT',
        payload: { timestamp: now },
      };
      const payload = JSON.stringify(event);

      for (const ws of connections) {
        try {
          ws.send(payload);
        } catch {
          removeConnection(ws);
        }
      }
    }
  }, CONFIG.WS.HEARTBEAT_INTERVAL_MS);
}

// ─── Stats ───────────────────────────────────────────────────────

export function getConnectionStats() {
  const stats: Record<string, number> = {};
  for (const [classroomId, connections] of classroomConnections) {
    stats[classroomId] = connections.size;
  }
  return {
    totalClassrooms: classroomConnections.size,
    totalConnections: Array.from(classroomConnections.values()).reduce(
      (sum, set) => sum + set.size,
      0,
    ),
    perClassroom: stats,
  };
}
