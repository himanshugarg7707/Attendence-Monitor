/**
 * ═══════════════════════════════════════════════════════════════════
 *  In-Memory Data Store
 *  Demo-ready storage with typed interfaces.
 *  Swap this for PostgreSQL/Redis in production.
 * ═══════════════════════════════════════════════════════════════════
 */
import crypto from 'node:crypto';
import { CONFIG } from '../config.js';
// ─── Storage Maps ────────────────────────────────────────────────
/** Student profiles keyed by studentId */
const students = new Map();
/** WebAuthn credentials keyed by credentialId (base64url) */
const credentials = new Map();
/** Map studentId → credential IDs */
const studentCredentials = new Map();
/** Active classroom sessions keyed by sessionId */
const sessions = new Map();
/** Pending WebAuthn challenges keyed by challengeId (temporary) */
const pendingChallenges = new Map();
/** Attendance log: sessionId → Array of verified records */
const attendanceLog = new Map();
// ─── Student Operations ──────────────────────────────────────────
export function getStudent(studentId) {
    return students.get(studentId);
}
export function createStudent(profile) {
    students.set(profile.id, profile);
}
export function getAllStudents() {
    return Array.from(students.values());
}
// ─── Credential Operations ───────────────────────────────────────
export function storeCredential(studentId, credential) {
    credentials.set(credential.credentialId, credential);
    const existing = studentCredentials.get(studentId) ?? [];
    existing.push(credential.credentialId);
    studentCredentials.set(studentId, existing);
}
export function getCredential(credentialId) {
    return credentials.get(credentialId);
}
export function getStudentCredentials(studentId) {
    const ids = studentCredentials.get(studentId) ?? [];
    return ids.map((id) => credentials.get(id)).filter(Boolean);
}
export function updateCredentialCounter(credentialId, newCounter) {
    const cred = credentials.get(credentialId);
    if (cred) {
        cred.counter = newCounter;
    }
}
// ─── Session Operations ──────────────────────────────────────────
export function createSession(professorId, className) {
    const session = {
        id: crypto.randomUUID(),
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
export function getSession(sessionId) {
    return sessions.get(sessionId);
}
export function getActiveSessions() {
    return Array.from(sessions.values()).filter((s) => s.isActive);
}
export function endSession(sessionId) {
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
export function validateSessionToken(sessionId, token) {
    const session = sessions.get(sessionId);
    if (!session || !session.isActive)
        return false;
    // Accept current token or recent previous tokens (grace period)
    if (session.currentToken === token)
        return true;
    return session.previousTokens.includes(token);
}
export function markStudentVerified(sessionId, studentId, rssi) {
    const session = sessions.get(sessionId);
    if (session && !session.verifiedStudents.includes(studentId)) {
        session.verifiedStudents.push(studentId);
        const log = attendanceLog.get(sessionId) ?? [];
        log.push({ studentId, verifiedAt: new Date().toISOString(), rssi });
        attendanceLog.set(sessionId, log);
    }
}
export function getAttendanceLog(sessionId) {
    return attendanceLog.get(sessionId) ?? [];
}
// ─── Challenge Operations ────────────────────────────────────────
export function storeChallenge(key, challenge, ttlMs = 60_000) {
    pendingChallenges.set(key, {
        challenge,
        expiresAt: Date.now() + ttlMs,
    });
}
export function getAndConsumeChallenge(key) {
    const entry = pendingChallenges.get(key);
    if (!entry)
        return undefined;
    if (Date.now() > entry.expiresAt) {
        pendingChallenges.delete(key);
        return undefined;
    }
    pendingChallenges.delete(key);
    return entry.challenge;
}
// ─── Token Rotation ──────────────────────────────────────────────
const tokenRotationIntervals = new Map();
function generateSessionToken() {
    return crypto.randomBytes(32).toString('base64url');
}
function startTokenRotation(sessionId) {
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
        session.previousTokens = session.previousTokens.slice(0, CONFIG.PROXIMITY.TOKEN_GRACE_COUNT);
        session.currentToken = generateSessionToken();
    }, CONFIG.PROXIMITY.TOKEN_ROTATION_INTERVAL_MS);
    tokenRotationIntervals.set(sessionId, interval);
}
// ─── Seed Demo Data ──────────────────────────────────────────────
export function seedDemoData() {
    // Create a demo professor session
    const demoStudents = [
        {
            id: 'student-001',
            name: 'Arjun Mehta',
            email: 'arjun@university.edu',
            registeredAt: new Date().toISOString(),
        },
        {
            id: 'student-002',
            name: 'Priya Sharma',
            email: 'priya@university.edu',
            registeredAt: new Date().toISOString(),
        },
        {
            id: 'student-003',
            name: 'Rahul Gupta',
            email: 'rahul@university.edu',
            registeredAt: new Date().toISOString(),
        },
    ];
    demoStudents.forEach((s) => createStudent(s));
}
//# sourceMappingURL=memory-store.js.map