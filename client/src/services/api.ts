/**
 * HTTP API client for communication with the attendance server.
 */

const API_BASE = 'http://localhost:3001';

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

export async function startSession(professorId: string, className: string) {
  return request('/api/attendance/session/start', {
    method: 'POST',
    body: JSON.stringify({ professorId, className }),
  });
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
