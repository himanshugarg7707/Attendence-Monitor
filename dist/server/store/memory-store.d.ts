/**
 * ═══════════════════════════════════════════════════════════════════
 *  In-Memory Data Store
 *  Demo-ready storage with typed interfaces.
 *  Swap this for PostgreSQL/Redis in production.
 * ═══════════════════════════════════════════════════════════════════
 */
import type { StudentProfile, StoredCredential, ClassroomSession } from '../../shared/types.js';
export declare function getStudent(studentId: string): StudentProfile | undefined;
export declare function createStudent(profile: StudentProfile): void;
export declare function getAllStudents(): StudentProfile[];
export declare function storeCredential(studentId: string, credential: StoredCredential): void;
export declare function getCredential(credentialId: string): StoredCredential | undefined;
export declare function getStudentCredentials(studentId: string): StoredCredential[];
export declare function updateCredentialCounter(credentialId: string, newCounter: number): void;
export declare function createSession(professorId: string, className: string): ClassroomSession;
export declare function getSession(sessionId: string): ClassroomSession | undefined;
export declare function getActiveSessions(): ClassroomSession[];
export declare function endSession(sessionId: string): void;
export declare function validateSessionToken(sessionId: string, token: string): boolean;
export declare function markStudentVerified(sessionId: string, studentId: string, rssi: number): void;
export declare function getAttendanceLog(sessionId: string): Array<{
    studentId: string;
    verifiedAt: string;
    rssi: number;
}>;
export declare function storeChallenge(key: string, challenge: string, ttlMs?: number): void;
export declare function getAndConsumeChallenge(key: string): string | undefined;
export declare function seedDemoData(): void;
//# sourceMappingURL=memory-store.d.ts.map