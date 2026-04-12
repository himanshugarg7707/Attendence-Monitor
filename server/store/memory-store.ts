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

export function createSession(
  professorId: string,
  className: string,
): ClassroomSession {
  const session: ClassroomSession = {
    id: crypto.randomBytes(4).toString('hex').toUpperCase(),
    professorId,
    className,
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

  // Accept current token or recent previous tokens (grace period)
  if (session.currentToken === token) return true;
  return session.previousTokens.includes(token);
}

export function markStudentVerified(
  sessionId: string,
  studentId: string,
  rssi: number,
): void {
  const session = sessions.get(sessionId);
  if (session && !session.verifiedStudents.includes(studentId)) {
    session.verifiedStudents.push(studentId);
    const log = attendanceLog.get(sessionId) ?? [];
    log.push({ studentId, verifiedAt: new Date().toISOString(), rssi });
    attendanceLog.set(sessionId, log);
  }
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
  // Empty seed. Users will create their own accounts.
}
