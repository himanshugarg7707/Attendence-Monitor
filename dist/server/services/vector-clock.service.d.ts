/**
 * ═══════════════════════════════════════════════════════════════════
 *  Hybrid Logical Clock (HLC) Service — Anti-Replay Engine
 *
 *  Combines wall-clock time with logical counters to handle clock
 *  drift between mobile devices and the server. Integrates nonce
 *  tracking to prevent replay attacks.
 *
 *  Anti-Replay Strategy:
 *  1. HLC drift window check (|server_ts - client_ts| < MAX_DRIFT)
 *  2. One-time nonce verification (cached with TTL)
 *  3. Monotonic HLC ordering per device (nodeId)
 * ═══════════════════════════════════════════════════════════════════
 */
import type { HLCTimestamp } from '../../shared/types.js';
/**
 * Advance the server's HLC for a local event.
 * Called whenever the server processes an event.
 */
export declare function tickServerHLC(): HLCTimestamp;
/**
 * Merge a received HLC with the server's HLC.
 * This implements the HLC receive algorithm:
 *   physical = max(local_physical, remote_physical, wall_clock)
 *   logical = resolved based on which is dominant
 */
export declare function mergeHLC(remote: HLCTimestamp): HLCTimestamp;
/**
 * Compare two HLC timestamps.
 * Returns:
 *  -1 if a < b (a happened before b)
 *   0 if a == b (concurrent)
 *   1 if a > b (a happened after b)
 */
export declare function compareHLC(a: HLCTimestamp, b: HLCTimestamp): -1 | 0 | 1;
export interface HLCValidationResult {
    valid: boolean;
    reason: string;
    driftMs?: number;
}
/**
 * Validate an incoming request's HLC timestamp and nonce.
 *
 * Checks:
 * 1. Clock drift is within acceptable bounds
 * 2. Nonce has not been previously used
 * 3. HLC is monotonically increasing for this device
 *
 * @param clientHLC - The client's hybrid logical clock timestamp
 * @param nonce - One-time-use nonce from the client
 */
export declare function validateAntiReplay(clientHLC: HLCTimestamp, nonce: string): HLCValidationResult;
/**
 * Get the current server HLC timestamp (for debugging / API responses).
 */
export declare function getServerHLC(): HLCTimestamp;
//# sourceMappingURL=vector-clock.service.d.ts.map