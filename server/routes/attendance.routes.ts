/**
 * ═══════════════════════════════════════════════════════════════════
 *  Attendance Routes — Core Attendance Verification Endpoints
 * ═══════════════════════════════════════════════════════════════════
 */

import { Hono } from 'hono';
import { proximityGuard } from '../middleware/proximity-guard.middleware.js';
import { processAttendance } from '../services/attendance.service.js';
import {
  createSession,
  getSession,
  getActiveSessions,
  endSession,
  getAttendanceLog,
} from '../store/memory-store.js';
import { broadcastSessionStarted, broadcastSessionEnded } from '../services/broadcast.service.js';
import type { ApiResponse, AttendanceRequest, AttendanceResult } from '../../shared/types.js';

const attendanceRoutes = new Hono();

// ─── Attendance Verification ─────────────────────────────────────

/**
 * POST /api/attendance/verify
 *
 * The primary endpoint. Protected by the Proximity Guard middleware.
 * Flow:
 *   1. Proximity Guard validates RSSI + session token → 403/401 on fail
 *   2. Attendance Service runs the full verification pipeline
 *   3. On success, broadcasts to professor's dashboard via WebSocket
 */
attendanceRoutes.post('/verify', proximityGuard, async (c) => {
  // Re-parse the body (Hono caches internally, so this is efficient)
  const body = await c.req.json<AttendanceRequest>();

  try {
    const result = await processAttendance(body);

    const status = result.verified ? 200 : 403;
    return c.json<ApiResponse<AttendanceResult>>(
      {
        success: result.verified,
        data: result,
        error: result.error,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  } catch (err) {
    console.error('[Attendance] Unexpected error:', err);
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: `Internal verification error: ${(err as Error).message}`,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

// ─── Session Management ──────────────────────────────────────────

/**
 * POST /api/attendance/session/start
 * Professor starts a new attendance session for a classroom.
 */
attendanceRoutes.post('/session/start', async (c) => {
  const body = await c.req.json<{ professorId: string; className: string }>();
  const { professorId, className } = body;

  if (!professorId || !className) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Missing professorId or className',
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  const session = createSession(professorId, className);
  broadcastSessionStarted(session.id, session.id, session.className);

  console.log(
    `[Session] Started: ${session.id} for "${className}" by professor ${professorId}`,
  );

  return c.json<ApiResponse<typeof session>>({
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/attendance/session/end
 * Professor ends an attendance session.
 */
attendanceRoutes.post('/session/end', async (c) => {
  const body = await c.req.json<{ sessionId: string }>();
  const { sessionId } = body;

  const session = getSession(sessionId);
  if (!session) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      },
      404,
    );
  }

  endSession(sessionId);
  broadcastSessionEnded(sessionId, sessionId, session.verifiedStudents.length);

  console.log(
    `[Session] Ended: ${sessionId}. Verified: ${session.verifiedStudents.length} students`,
  );

  return c.json<ApiResponse<{ totalVerified: number }>>({
    success: true,
    data: { totalVerified: session.verifiedStudents.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/attendance/sessions
 * List all active sessions.
 */
attendanceRoutes.get('/sessions', async (c) => {
  const sessions = getActiveSessions();
  return c.json<ApiResponse<typeof sessions>>({
    success: true,
    data: sessions,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/attendance/log/:sessionId
 * Get the attendance log for a session.
 */
attendanceRoutes.get('/log/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = getSession(sessionId);

  if (!session) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString(),
      },
      404,
    );
  }

  const log = getAttendanceLog(sessionId);
  return c.json<ApiResponse<typeof log>>({
    success: true,
    data: log,
    timestamp: new Date().toISOString(),
  });
});

export { attendanceRoutes };
