/**
 * ═══════════════════════════════════════════════════════════════════
 *  Trusted Proximity Attendance — Shared Type Definitions
 *  Used by both server and client for end-to-end type safety.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { AuthenticationResponseJSON, RegistrationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/types';

// ─── Hybrid Logical Clock (HLC) ──────────────────────────────────

/**
 * Hybrid Logical Clock timestamp.
 * Combines wall-clock time with a logical counter to handle
 * clock drift between mobile device and server.
 */
export interface HLCTimestamp {
  /** Wall-clock milliseconds since Unix epoch */
  physical: number;
  /** Monotonic counter for events within the same millisecond */
  logical: number;
  /** Unique device/node identifier */
  nodeId: string;
}

// ─── Proximity Data ──────────────────────────────────────────────

/**
 * BLE proximity data sent from the student's device.
 */
export interface ProximityData {
  /** BLE signal strength in dBm (typically -30 to -100) */
  signalStrength: number;
  /** Classroom beacon's rolling session token (rotates every 30s) */
  rollingSessionToken: string;
  /** UUID of the BLE beacon being detected */
  beaconUUID: string;
}

// ─── Attendance Request / Response ───────────────────────────────

/**
 * Full attendance verification request sent from the client.
 */
export interface AttendanceRequest {
  /** Student's unique identifier */
  studentId: string;
  /** Classroom session identifier */
  classroomId: string;
  /** BLE proximity data */
  proximity: ProximityData;
  /** Client's hybrid logical clock timestamp */
  hlcTimestamp: HLCTimestamp;
  /** One-time-use nonce for replay prevention */
  nonce: string;
  /** FIDO2/WebAuthn authentication assertion */
  webauthnAssertion: AuthenticationResponseJSON;
}

/**
 * Individual verification step result.
 */
export interface VerificationStep {
  name: string;
  passed: boolean;
  details: string;
  /** Time taken for this step in milliseconds */
  durationMs: number;
}

/**
 * Server response after attendance verification.
 */
export interface AttendanceResult {
  /** Whether all verification steps passed */
  verified: boolean;
  /** Student display name */
  studentName: string;
  /** Server-side timestamp of verification */
  timestamp: string;
  /** Detailed breakdown of each verification step */
  verificationSteps: VerificationStep[];
  /** Error message if verification failed */
  error?: string;
}

// ─── Student / Credential Types ──────────────────────────────────

/**
 * Stored student profile.
 */
export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  /** ISO timestamp of account creation */
  registeredAt: string;
}

/**
 * Stored WebAuthn credential for a student.
 */
export interface StoredCredential {
  credentialId: string;
  credentialPublicKey: Uint8Array;
  counter: number;
  /** Whether this credential uses a secure enclave / TPM */
  isHardwareBacked: boolean;
  /** Authenticator Attestation GUID */
  aaguid: string;
  /** Associated transports (usb, ble, nfc, internal) */
  transports?: AuthenticatorTransportFuture[];
}

// ─── Classroom Session ───────────────────────────────────────────

/**
 * Active classroom attendance session managed by a professor.
 */
export interface ClassroomSession {
  id: string;
  professorId: string;
  className: string;
  /** Currently active rolling session token */
  currentToken: string;
  /** Tokens that have been used (for grace period acceptance) */
  previousTokens: string[];
  /** ISO timestamp when the session started */
  startedAt: string;
  /** Student IDs that have been verified in this session */
  verifiedStudents: string[];
  /** Whether the session is currently accepting attendance */
  isActive: boolean;
}

// ─── WebSocket / Dashboard Events ────────────────────────────────

/**
 * Events broadcast over WebSocket to the professor's dashboard.
 */
export type DashboardEvent =
  | { type: 'STUDENT_VERIFIED'; payload: StudentVerifiedPayload }
  | { type: 'SESSION_STARTED'; payload: { sessionId: string; className: string } }
  | { type: 'SESSION_ENDED'; payload: { sessionId: string; totalVerified: number } }
  | { type: 'HEARTBEAT'; payload: { timestamp: number } };

export interface StudentVerifiedPayload {
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  verifiedAt: string;
  signalStrength: number;
  verificationSteps: VerificationStep[];
}

// ─── WebAuthn Challenge Types ────────────────────────────────────

export interface WebAuthnRegistrationRequest {
  studentId: string;
  studentName: string;
  studentEmail: string;
}

export interface WebAuthnChallengeResponse {
  challenge: string;
  options: Record<string, unknown>;
}

// ─── API Response Wrapper ────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
