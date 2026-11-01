/**
 * HTTP API client for communication with the attendance server.
 */

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? 'http://localhost:4000' : 'https://attendence-monitor.onrender.com';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Auth Endpoints ──────────────────────────────────────────

export async function getRegistrationOptions(
  studentId: string,
  studentName: string,
  studentEmail: string,
) {
  return request('/api/auth/register/options', {
    method: 'POST',
    body: JSON.stringify({ studentId, studentName, studentEmail }),
  });
}

export async function verifyRegistration(studentId: string, response: unknown) {
  return request('/api/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify({ studentId, response }),
  });
}

export async function getAssertionOptions(studentId: string) {
  return request('/api/auth/assertion/options', {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
}

// ─── Attendance Endpoints ────────────────────────────────────

export async function verifyAttendance(payload: unknown) {
  return request('/api/attendance/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface StartSessionPayload {
  professorId: string;
  className: string;
  facultyName?: string;
  department?: string;
  hotspotSSID?: string;
  hotspotGateway?: string;
  requireHotspot?: boolean;
}

export async function startSession(
  professorIdOrPayload: string | StartSessionPayload,
  className?: string,
) {
  const body =
    typeof professorIdOrPayload === 'object'
      ? professorIdOrPayload
      : { professorId: professorIdOrPayload, className: className ?? '' };

  return request('/api/attendance/session/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function pingServer(): Promise<{
  success: boolean;
  latencyMs: number;
  clientIp?: string;
  serverTime?: number;
}> {
  const start = performance.now();
  try {
    const res = await request<{ status: string; clientIp: string; serverTime: number }>('/api/ping');
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: res.success,
      latencyMs,
      clientIp: res.data?.clientIp,
      serverTime: res.data?.serverTime,
    };
  } catch {
    return {
      success: false,
      latencyMs: -1,
    };
  }
}

export async function endSession(sessionId: string) {
  return request('/api/attendance/session/end', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export async function getActiveSessions() {
  return request('/api/attendance/sessions');
}

export async function getAttendanceLog(sessionId: string) {
  return request(`/api/attendance/log/${sessionId}`);
}

export async function getStudentAttendance(studentId: string) {
  return request<import('../types').StudentAttendanceSummary>(`/api/attendance/student/${studentId}`);
}
