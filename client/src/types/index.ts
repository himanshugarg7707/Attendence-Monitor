/**
 * Client-side shared types.
 * These are duplicated from ../../shared/types.ts for Vite compatibility.
 * In a production monorepo, use workspace references or a shared package.
 */

// ─── Hybrid Logical Clock ────────────────────────────────────────

export interface HLCTimestamp {
  physical: number;
  logical: number;
  nodeId: string;
}

// ─── Proximity ───────────────────────────────────────────────────

export interface ProximityData {
  signalStrength: number;
  rollingSessionToken: string;
  beaconUUID: string;
}

// ─── Attendance ──────────────────────────────────────────────────

export interface AttendanceRequest {
  studentId: string;
  classroomId: string;
  proximity: ProximityData;
  hlcTimestamp: HLCTimestamp;
  nonce: string;
  webauthnAssertion: unknown;
}

export interface VerificationStep {
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

export interface AttendanceResult {
  verified: boolean;
  studentName: string;
  timestamp: string;
  verificationSteps: VerificationStep[];
  error?: string;
}

// ─── Student ─────────────────────────────────────────────────────

export interface StudentVerifiedPayload {
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  verifiedAt: string;
  signalStrength: number;
  verificationSteps: VerificationStep[];
}

// ─── Dashboard Events ────────────────────────────────────────────

export type DashboardEvent =
  | { type: 'STUDENT_VERIFIED'; payload: StudentVerifiedPayload }
  | { type: 'SESSION_STARTED'; payload: { sessionId: string; className: string } }
  | { type: 'SESSION_ENDED'; payload: { sessionId: string; totalVerified: number } }
  | { type: 'HEARTBEAT'; payload: { timestamp: number } };
