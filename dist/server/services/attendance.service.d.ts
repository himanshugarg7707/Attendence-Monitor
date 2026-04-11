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
import type { AttendanceRequest, AttendanceResult } from '../../shared/types.js';
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
export declare function processAttendance(request: AttendanceRequest): Promise<AttendanceResult>;
//# sourceMappingURL=attendance.service.d.ts.map