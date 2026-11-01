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

// ─── Proximity & Hotspot ─────────────────────────────────────────

export interface HotspotData {
  ssid: string;
  connected: boolean;
  gatewayIp?: string;
  clientIp?: string;
  bssid?: string;
}

export interface ProximityData {
  signalStrength: number;
  rollingSessionToken: string;
  beaconUUID: string;
  hotspot?: HotspotData;
  networkLatencyMs?: number;
  realBluetoothDevice?: string | null;
}

// ─── Session ─────────────────────────────────────────────────────

export interface ClassroomSession {
  id: string;
  professorId: string;
  facultyName?: string;
  department?: string;
  className: string;
  hotspotSSID?: string;
  hotspotBSSID?: string;
  hotspotGateway?: string;
  requireHotspot?: boolean;
  facultyIp?: string;
  currentToken: string;
  previousTokens: string[];
  startedAt: string;
  verifiedStudents: string[];
  isActive: boolean;
}

// ─── Authentication & User Segregation ──────────────────────────

export interface CampusAuthUser {
  id: string;
  name: string;
  role: 'faculty' | 'student';
  department?: string;
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

// ─── Student Attendance History & Percentage ─────────────────────

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

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  records: StudentAttendanceHistoryRecord[];
}

// ─── Student ─────────────────────────────────────────────────────

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

// ─── Dashboard Events ────────────────────────────────────────────

export type DashboardEvent =
  | { type: 'STUDENT_VERIFIED'; payload: StudentVerifiedPayload }
  | { type: 'SESSION_STARTED'; payload: { sessionId: string; className: string } }
  | { type: 'SESSION_ENDED'; payload: { sessionId: string; totalVerified: number } }
  | { type: 'HEARTBEAT'; payload: { timestamp: number } };
