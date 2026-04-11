/**
 * ═══════════════════════════════════════════════════════════════════
 *  WebAuthn Routes — Registration & Authentication Endpoints
 * ═══════════════════════════════════════════════════════════════════
 */

import { Hono } from 'hono';
import {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptions,
} from '../services/webauthn.service.js';
import { createStudent, getStudent } from '../store/memory-store.js';
import type { ApiResponse, WebAuthnRegistrationRequest } from '../../shared/types.js';

const authRoutes = new Hono();

// ─── Registration ────────────────────────────────────────────────

/**
 * POST /api/auth/register/options
 * Generate WebAuthn registration options (challenge) for a new student.
 */
authRoutes.post('/register/options', async (c) => {
  const body = await c.req.json<WebAuthnRegistrationRequest>();
  const { studentId, studentName, studentEmail } = body;

  if (!studentId || !studentName || !studentEmail) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Missing studentId, studentName, or studentEmail',
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  // Create student profile if not exists
  if (!getStudent(studentId)) {
    createStudent({
      id: studentId,
      name: studentName,
      email: studentEmail,
      registeredAt: new Date().toISOString(),
    });
  }

  try {
    const options = await createRegistrationOptions(studentId, studentName, studentEmail);
    return c.json<ApiResponse<typeof options>>({
      success: true,
      data: options,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * POST /api/auth/register/verify
 * Verify the registration response and store the credential.
 */
authRoutes.post('/register/verify', async (c) => {
  const body = await c.req.json<{
    studentId: string;
    response: Record<string, unknown>;
  }>();

  const { studentId, response } = body;
  if (!studentId || !response) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Missing studentId or response',
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  try {
    const result = await verifyRegistration(studentId, response as never);
    return c.json<ApiResponse<typeof result>>({
      success: result.verified,
      data: result,
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

// ─── Authentication (Assertion) ──────────────────────────────────

/**
 * POST /api/auth/assertion/options
 * Generate WebAuthn authentication options (challenge) for attendance.
 */
authRoutes.post('/assertion/options', async (c) => {
  const body = await c.req.json<{ studentId: string }>();
  const { studentId } = body;

  if (!studentId) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Missing studentId',
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  try {
    const options = await createAuthenticationOptions(studentId);
    return c.json<ApiResponse<typeof options>>({
      success: true,
      data: options,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

export { authRoutes };
