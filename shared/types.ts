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

// ─── Proximity & Hotspot Data ─────────────────────────────────────

/**
 * Faculty Hotspot verification data sent from student device.
 */
export interface HotspotData {
  /** Name of the Wi-Fi Hotspot the student is connected to */
  ssid: string;
  /** Whether the student device is confirmed connected to faculty's hotspot */
  connected: boolean;
  /** Gateway IP (e.g. 192.168.43.1 or 172.20.10.1) */
  gatewayIp?: string;
  /** Client IP assigned by the hotspot DHCP */
  clientIp?: string;
  /** BSSID or MAC address if available */
  bssid?: string;
}

/**
 * Proximity data sent from the student's device.
 */
export interface ProximityData {
  /** BLE or Wi-Fi signal strength in dBm (typically -30 to -100) */
  signalStrength: number;
  /** Classroom beacon's rolling session token (rotates every 30s) */
  rollingSessionToken: string;
  /** UUID of the BLE beacon or hotspot session */
  beaconUUID: string;
  /** Hotspot verification details */
  hotspot?: HotspotData;
  /** Real network round-trip ping time in ms */
  networkLatencyMs?: number;
  /** Name of real physical Bluetooth device if scanned */
  realBluetoothDevice?: string | null;
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
 * Historical record of a student's attendance in a class on a specific date.
 */
export interface StudentAttendanceHistoryRecord {
  id: string;
  sessionId: string;
  className: string;
  facultyName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. 10:15 AM
  timestamp: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  hotspotVerified?: boolean;
  rssi?: number;
}

/**
 * Summary of a student's attendance percentage and date-wise history.
 */
export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  records: StudentAttendanceHistoryRecord[];
}

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
 * Active classroom attendance session managed by a faculty member.
 */
export interface ClassroomSession {
  id: string;
  professorId: string;
  facultyName?: string;
  department?: string;
  className: string;
  /** Hotspot configuration for this session */
  hotspotSSID?: string;
  hotspotBSSID?: string;
  hotspotGateway?: string;
  requireHotspot?: boolean;
  facultyIp?: string;
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
  hotspotConnected?: boolean;
  hotspotSSID?: string;
  networkLatencyMs?: number;
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

// ─── Authentication & User Segregation ──────────────────────────

export interface CampusAuthUser {
  id: string;
  name: string;
  role: 'faculty' | 'student';
  department?: string;
}

// ─── API Response Wrapper ────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
