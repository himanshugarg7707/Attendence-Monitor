/**
 * ═══════════════════════════════════════════════════════════════════
 *  In-Memory Data Store
 *  Demo-ready storage with typed interfaces.
 *  Swap this for PostgreSQL/Redis in production.
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
  StudentProfile,
  StoredCredential,
  ClassroomSession,
  StudentAttendanceHistoryRecord,
  StudentAttendanceSummary,
} from '../../shared/types.js';
import crypto from 'node:crypto';
import { CONFIG } from '../config.js';

// ─── Storage Maps ────────────────────────────────────────────────

/** Student profiles keyed by studentId */
const students = new Map<string, StudentProfile>();

/** WebAuthn credentials keyed by credentialId (base64url) */
const credentials = new Map<string, StoredCredential>();

/** Map studentId → credential IDs */
const studentCredentials = new Map<string, string[]>();

/** Active classroom sessions keyed by sessionId */
const sessions = new Map<string, ClassroomSession>();

/** Pending WebAuthn challenges keyed by challengeId (temporary) */
const pendingChallenges = new Map<string, { challenge: string; expiresAt: number }>();

/** Attendance log: sessionId → Array of verified records */
const attendanceLog = new Map<
  string,
  Array<{ studentId: string; verifiedAt: string; rssi: number }>
>();

/** Student date-wise attendance records: studentId → Array of historical records */
const studentAttendanceRecords = new Map<string, StudentAttendanceHistoryRecord[]>();

// ─── Student Operations ──────────────────────────────────────────

export function getStudent(studentId: string): StudentProfile | undefined {
  return students.get(studentId);
}

export function createStudent(profile: StudentProfile): void {
  students.set(profile.id, profile);
}

export function getAllStudents(): StudentProfile[] {
  return Array.from(students.values());
}

// ─── Credential Operations ───────────────────────────────────────

export function storeCredential(
  studentId: string,
  credential: StoredCredential,
): void {
  credentials.set(credential.credentialId, credential);
  const existing = studentCredentials.get(studentId) ?? [];
  existing.push(credential.credentialId);
  studentCredentials.set(studentId, existing);
}

export function getCredential(credentialId: string): StoredCredential | undefined {
  return credentials.get(credentialId);
}

export function getStudentCredentials(studentId: string): StoredCredential[] {
  const ids = studentCredentials.get(studentId) ?? [];
  return ids.map((id) => credentials.get(id)).filter(Boolean) as StoredCredential[];
}

export function updateCredentialCounter(credentialId: string, newCounter: number): void {
  const cred = credentials.get(credentialId);
  if (cred) {
    cred.counter = newCounter;
  }
}

// ─── Session Operations ──────────────────────────────────────────

export interface CreateSessionParams {
  professorId: string;
  className: string;
  facultyName?: string;
  department?: string;
  hotspotSSID?: string;
  hotspotBSSID?: string;
  hotspotGateway?: string;
  requireHotspot?: boolean;
  facultyIp?: string;
}

export function createSession(
  professorIdOrParams: string | CreateSessionParams,
  classNameParam?: string,
): ClassroomSession {
  const isParams = typeof professorIdOrParams === 'object';
  const profId = isParams ? professorIdOrParams.professorId : professorIdOrParams;
  const clsName = isParams ? professorIdOrParams.className : (classNameParam ?? 'Classroom');

  const session: ClassroomSession = {
    id: crypto.randomBytes(4).toString('hex').toUpperCase(),
    professorId: profId,
    className: clsName,
    facultyName: isParams ? professorIdOrParams.facultyName : undefined,
    department: isParams ? professorIdOrParams.department : undefined,
    hotspotSSID: isParams ? professorIdOrParams.hotspotSSID : undefined,
    hotspotBSSID: isParams ? professorIdOrParams.hotspotBSSID : undefined,
    hotspotGateway: isParams ? professorIdOrParams.hotspotGateway : undefined,
    requireHotspot: isParams ? (professorIdOrParams.requireHotspot ?? false) : false,
    facultyIp: isParams ? professorIdOrParams.facultyIp : undefined,
    currentToken: generateSessionToken(),
    previousTokens: [],
    startedAt: new Date().toISOString(),
    verifiedStudents: [],
    isActive: true,
  };
  sessions.set(session.id, session);
  attendanceLog.set(session.id, []);

  // Start token rotation
  startTokenRotation(session.id);

  return session;
}

export function getSession(sessionId: string): ClassroomSession | undefined {
  return sessions.get(sessionId);
}

export function getActiveSessions(): ClassroomSession[] {
  return Array.from(sessions.values()).filter((s) => s.isActive);
}

export function endSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.isActive = false;
    // Stop token rotation
    const interval = tokenRotationIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      tokenRotationIntervals.delete(sessionId);
    }
  }
}

export function validateSessionToken(
  sessionId: string,
  token: string,
): boolean {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive) return false;

  // Accept current token or recent previous tokens (30-second rolling grace period)
  if (session.currentToken === token) return true;
  if (session.previousTokens.includes(token)) return true;

  // If testing or local fallback
  if (token === 'demo-token' && (!session.currentToken || session.currentToken === 'demo-token')) return true;

  return false;
}

export function markStudentVerified(
  sessionId: string,
  studentId: string,
  rssi: number,
): void {
  const session = sessions.get(sessionId);
  if (session && !session.verifiedStudents.includes(studentId)) {
    session.verifiedStudents.push(studentId);
    const now = new Date();
    const log = attendanceLog.get(sessionId) ?? [];
    log.push({ studentId, verifiedAt: now.toISOString(), rssi });
    attendanceLog.set(sessionId, log);

    // Record in student's date-wise attendance history
    recordStudentAttendance(studentId, {
      sessionId,
      className: session.className,
      facultyName: session.facultyName || session.professorId,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString(),
      status: 'PRESENT',
      hotspotVerified: Boolean(session.requireHotspot),
      rssi,
    });
  }
}

export function recordStudentAttendance(
  studentId: string,
  record: Omit<StudentAttendanceHistoryRecord, 'id'>,
): void {
  const list = studentAttendanceRecords.get(studentId) ?? [];
  // Avoid duplicate record for same session on same day
  const exists = list.some((r) => r.sessionId === record.sessionId);
  if (!exists) {
    list.unshift({
      ...record,
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    });
    studentAttendanceRecords.set(studentId, list);
  }
}

export function getStudentAttendanceSummary(studentId: string): StudentAttendanceSummary {
  const student = students.get(studentId);
  const records = studentAttendanceRecords.get(studentId) ?? [];
  const attended = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const total = records.length;
  const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;

  return {
    studentId,
    studentName: student?.name || 'Student',
    totalClasses: total,
    attendedClasses: attended,
    percentage,
    records,
  };
}

export function getAttendanceLog(
  sessionId: string,
): Array<{ studentId: string; verifiedAt: string; rssi: number }> {
  return attendanceLog.get(sessionId) ?? [];
}

// ─── Challenge Operations ────────────────────────────────────────

export function storeChallenge(key: string, challenge: string, ttlMs = 60_000): void {
  pendingChallenges.set(key, {
    challenge,
    expiresAt: Date.now() + ttlMs,
  });
}

export function getAndConsumeChallenge(key: string): string | undefined {
  const entry = pendingChallenges.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    pendingChallenges.delete(key);
    return undefined;
  }
  pendingChallenges.delete(key);
  return entry.challenge;
}

// ─── Token Rotation ──────────────────────────────────────────────

const tokenRotationIntervals = new Map<string, ReturnType<typeof setInterval>>();

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function startTokenRotation(sessionId: string): void {
  const interval = setInterval(() => {
    const session = sessions.get(sessionId);
    if (!session || !session.isActive) {
      clearInterval(interval);
      tokenRotationIntervals.delete(sessionId);
      return;
    }

    // Rotate: current → previous, generate new
    session.previousTokens.unshift(session.currentToken);
    // Keep only the grace-period worth of old tokens
    session.previousTokens = session.previousTokens.slice(
      0,
      CONFIG.PROXIMITY.TOKEN_GRACE_COUNT,
    );
    session.currentToken = generateSessionToken();
  }, CONFIG.PROXIMITY.TOKEN_ROTATION_INTERVAL_MS);

  tokenRotationIntervals.set(sessionId, interval);
}

// ─── Seed Demo Data ──────────────────────────────────────────────

export function seedDemoData(): void {
  // Pre-seed demo students with credentials for immediate testing
  const demoStudents = [
    { id: 'stu-101', name: 'Alex Rivera', email: 'alex.rivera@campus.edu' },
    { id: 'stu-102', name: 'Priya Sharma', email: 'priya.sharma@campus.edu' },
    { id: 'stu-103', name: 'David Kim', email: 'david.kim@campus.edu' },
    { id: 'stu-104', name: 'Samantha Chen', email: 'sam.chen@campus.edu' },
  ];

  for (const s of demoStudents) {
    if (!students.has(s.id)) {
      students.set(s.id, {
        id: s.id,
        name: s.name,
        email: s.email,
        registeredAt: new Date().toISOString(),
      });
      const demoCredId = `demo-cred-${s.id}`;
      credentials.set(demoCredId, {
        credentialId: demoCredId,
        credentialPublicKey: new Uint8Array([1, 2, 3, 4]),
        counter: 1,
        isHardwareBacked: true,
        aaguid: 'fbfc3007-154e-4ecc-8c0b-6e020557d7bd', // Apple Secure Enclave
      });
      studentCredentials.set(s.id, [demoCredId]);
    }
  }

  // Pre-seed date-wise attendance records for Priya Sharma (stu-102)
  if (!studentAttendanceRecords.has('stu-102')) {
    const historicalClasses = [
      {
        sessionId: 'CS402-OCT31',
        className: 'CS-402 Distributed Systems',
        facultyName: 'Prof. Dr. Rajesh Sharma',
        date: '2026-10-31',
        time: '10:00 AM',
        timestamp: '2026-10-31T10:00:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -42,
      },
      {
        sessionId: 'CS301-OCT30',
        className: 'CS-301 Data Structures',
        facultyName: 'Prof. Dr. Sarah Jenkins',
        date: '2026-10-30',
        time: '02:15 PM',
        timestamp: '2026-10-30T14:15:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -38,
      },
      {
        sessionId: 'CS305-OCT28',
        className: 'CS-305 Computer Networks',
        facultyName: 'Dr. Alan Turing',
        date: '2026-10-28',
        time: '11:30 AM',
        timestamp: '2026-10-28T11:30:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -46,
      },
      {
        sessionId: 'CS402-OCT27',
        className: 'CS-402 Distributed Systems',
        facultyName: 'Prof. Dr. Rajesh Sharma',
        date: '2026-10-27',
        time: '10:05 AM',
        timestamp: '2026-10-27T10:05:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -45,
      },
      {
        sessionId: 'CS301-OCT25',
        className: 'CS-301 Data Structures',
        facultyName: 'Prof. Dr. Sarah Jenkins',
        date: '2026-10-25',
        time: '02:00 PM',
        timestamp: '2026-10-25T14:00:00.000Z',
        status: 'ABSENT' as const,
        hotspotVerified: false,
        rssi: -90,
      },
      {
        sessionId: 'CS402-OCT24',
        className: 'CS-402 Distributed Systems',
        facultyName: 'Prof. Dr. Rajesh Sharma',
        date: '2026-10-24',
        time: '10:10 AM',
        timestamp: '2026-10-24T10:10:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -40,
      },
      {
        sessionId: 'CS305-OCT22',
        className: 'CS-305 Computer Networks',
        facultyName: 'Dr. Alan Turing',
        date: '2026-10-22',
        time: '11:35 AM',
        timestamp: '2026-10-22T11:35:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -48,
      },
      {
        sessionId: 'CS301-OCT20',
        className: 'CS-301 Data Structures',
        facultyName: 'Prof. Dr. Sarah Jenkins',
        date: '2026-10-20',
        time: '02:05 PM',
        timestamp: '2026-10-20T14:05:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -44,
      },
      {
        sessionId: 'CS402-OCT18',
        className: 'CS-402 Distributed Systems',
        facultyName: 'Prof. Dr. Rajesh Sharma',
        date: '2026-10-18',
        time: '10:02 AM',
        timestamp: '2026-10-18T10:02:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -39,
      },
      {
        sessionId: 'CS305-OCT15',
        className: 'CS-305 Computer Networks',
        facultyName: 'Dr. Alan Turing',
        date: '2026-10-15',
        time: '11:30 AM',
        timestamp: '2026-10-15T11:30:00.000Z',
        status: 'ABSENT' as const,
        hotspotVerified: false,
        rssi: -95,
      },
    ];

    for (const h of historicalClasses) {
      recordStudentAttendance('stu-102', h);
    }
  }

  // Pre-seed date-wise attendance records for Alex Rivera (stu-101)
  if (!studentAttendanceRecords.has('stu-101')) {
    const historicalAlex = [
      {
        sessionId: 'CS402-OCT31',
        className: 'CS-402 Distributed Systems',
        facultyName: 'Prof. Dr. Rajesh Sharma',
        date: '2026-10-31',
        time: '10:01 AM',
        timestamp: '2026-10-31T10:01:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -36,
      },
      {
        sessionId: 'CS301-OCT30',
        className: 'CS-301 Data Structures',
        facultyName: 'Prof. Dr. Sarah Jenkins',
        date: '2026-10-30',
        time: '02:10 PM',
        timestamp: '2026-10-30T14:10:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -41,
      },
      {
        sessionId: 'CS305-OCT28',
        className: 'CS-305 Computer Networks',
        facultyName: 'Dr. Alan Turing',
        date: '2026-10-28',
        time: '11:28 AM',
        timestamp: '2026-10-28T11:28:00.000Z',
        status: 'PRESENT' as const,
        hotspotVerified: true,
        rssi: -45,
      },
    ];
    for (const h of historicalAlex) {
      recordStudentAttendance('stu-101', h);
    }
  }
}
