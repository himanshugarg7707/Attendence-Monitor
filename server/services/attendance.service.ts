/**
 * ═══════════════════════════════════════════════════════════════════
 *  Attendance Service — The Verification Orchestrator
 *
 *  This is the CORE engine that ties together all verification
 *  steps into a single, auditable pipeline:
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │ 1. Proximity Check  (already passed via middleware)         │
 *  │ 2. HLC Validation   (clock drift + monotonic ordering)     │
 *  │ 3. Nonce Check      (one-time-use replay prevention)       │
 *  │ 4. WebAuthn Verify  (signed challenge with stored pubkey)  │
 *  │ 5. Hardware Attest  (UV flag + secure enclave check)       │
 *  │ 6. Record + Broadcast (store + push to dashboard)          │
 *  └─────────────────────────────────────────────────────────────┘
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
  AttendanceRequest,
  AttendanceResult,
  VerificationStep,
} from '../../shared/types.js';

import { validateAntiReplay } from './vector-clock.service.js';
import { verifyAuthentication } from './webauthn.service.js';
import { broadcastStudentVerified } from './broadcast.service.js';
import {
  getStudent,
  getSession,
  markStudentVerified,
} from '../store/memory-store.js';

// ─── Main Verification Pipeline ─────────────────────────────────

/**
 * Process a full attendance verification request.
 *
 * By the time this function is called, the Proximity Guard middleware
 * has already validated:
 *   ✓ RSSI > -60 dBm (student is physically close to beacon)
 *   ✓ Rolling session token belongs to an active classroom
 *
 * This function handles the remaining verification steps.
 *
 * @param request - The full attendance request from the client
 * @returns AttendanceResult with pass/fail and step-by-step breakdown
 */
export async function processAttendance(
  request: AttendanceRequest,
): Promise<AttendanceResult> {
  const steps: VerificationStep[] = [];
  const startTime = performance.now();

  // ─── Step 1: Validate Student Exists ───────────────────────
  const stepStart1 = performance.now();
  const student = getStudent(request.studentId);
  if (!student) {
    steps.push({
      name: 'Student Lookup',
      passed: false,
      details: `Student "${request.studentId}" not found in system`,
      durationMs: performance.now() - stepStart1,
    });
    return buildResult(false, 'Unknown', steps, 'Student not registered');
  }
  steps.push({
    name: 'Student Lookup',
    passed: true,
    details: `Found student: ${student.name} (${student.email})`,
    durationMs: performance.now() - stepStart1,
  });

  // ─── Step 2: Check Duplicate Attendance ────────────────────
  const stepStart2 = performance.now();
  const session = getSession(request.classroomId);
  if (session?.verifiedStudents.includes(request.studentId)) {
    steps.push({
      name: 'Duplicate Check',
      passed: false,
      details: `Student "${student.name}" already verified in this session`,
      durationMs: performance.now() - stepStart2,
    });
    return buildResult(false, student.name, steps, 'Already verified in this session');
  }
  steps.push({
    name: 'Duplicate Check',
    passed: true,
    details: 'First verification attempt in this session',
    durationMs: performance.now() - stepStart2,
  });

  // ─── Step 3: HLC Anti-Replay Validation ───────────────────
  const stepStart3 = performance.now();
  const hlcResult = validateAntiReplay(request.hlcTimestamp, request.nonce);
  steps.push({
    name: 'Anti-Replay (HLC + Nonce)',
    passed: hlcResult.valid,
    details: hlcResult.reason,
    durationMs: performance.now() - stepStart3,
  });
  if (!hlcResult.valid) {
    return buildResult(false, student.name, steps, hlcResult.reason);
  }

  // ─── Step 4: WebAuthn Biometric Verification ──────────────
  const stepStart4 = performance.now();
  const authResult = await verifyAuthentication(
    request.studentId,
    request.webauthnAssertion,
  );
  steps.push({
    name: 'WebAuthn Assertion',
    passed: authResult.verified,
    details: authResult.verified
      ? `Signature verified. UV=${authResult.userVerified}, HW=${authResult.isHardwareBacked}`
      : `Failed: ${authResult.error}`,
    durationMs: performance.now() - stepStart4,
  });
  if (!authResult.verified) {
    return buildResult(false, student.name, steps, authResult.error);
  }

  // ─── Step 5: Hardware Attestation Check ───────────────────
  const stepStart5 = performance.now();
  steps.push({
    name: 'Hardware Attestation',
    passed: authResult.isHardwareBacked,
    details: authResult.isHardwareBacked
      ? 'Authenticator is hardware-backed (TPM/Secure Enclave)'
      : '⚠ Software-based authenticator detected. Attestation format not from secure hardware. ' +
        'This is acceptable for demo purposes but should require `direct` attestation in production.',
    durationMs: performance.now() - stepStart5,
  });
  // Note: We don't reject on software authenticators in demo mode.
  // In production, set CONFIG.ATTESTATION.TYPE to 'direct' to enforce.

  // ─── Step 6: User Verification (Biometric) Confirmation ───
  const stepStart6 = performance.now();
  steps.push({
    name: 'Biometric Verification (UV Flag)',
    passed: authResult.userVerified,
    details: authResult.userVerified
      ? 'User Verified flag is set — biometric or PIN was confirmed by the authenticator'
      : 'UV flag NOT set — authenticator did not verify user identity',
    durationMs: performance.now() - stepStart6,
  });
  if (!authResult.userVerified) {
    return buildResult(false, student.name, steps, 'Biometric verification required');
  }

  // ═══ ALL CHECKS PASSED — Record Attendance ═════════════════
  const stepStart7 = performance.now();
  markStudentVerified(
    request.classroomId,
    request.studentId,
    request.proximity.signalStrength,
  );
  steps.push({
    name: 'Record Attendance',
    passed: true,
    details: `Attendance recorded at RSSI ${request.proximity.signalStrength} dBm`,
    durationMs: performance.now() - stepStart7,
  });

  // ─── Broadcast to Professor's Dashboard ───────────────────
  const totalDurationMs = performance.now() - startTime;
  broadcastStudentVerified(request.classroomId, {
    studentId: request.studentId,
    studentName: student.name,
    avatarUrl: student.avatarUrl,
    verifiedAt: new Date().toISOString(),
    signalStrength: request.proximity.signalStrength,
    verificationSteps: steps,
  });

  console.log(
    `[Attendance] ✅ ${student.name} verified in ${totalDurationMs.toFixed(1)}ms ` +
    `(RSSI: ${request.proximity.signalStrength} dBm, ` +
    `HW: ${authResult.isHardwareBacked}, ` +
    `Drift: ${hlcResult.driftMs}ms)`,
  );

  return buildResult(true, student.name, steps);
}

// ─── Helper ──────────────────────────────────────────────────────

function buildResult(
  verified: boolean,
  studentName: string,
  steps: VerificationStep[],
  error?: string,
): AttendanceResult {
  return {
    verified,
    studentName,
    timestamp: new Date().toISOString(),
    verificationSteps: steps,
    error,
  };
}
