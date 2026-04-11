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
import { CONFIG } from '../config.js';

// ─── Server-side HLC State ───────────────────────────────────────

let serverHLC: HLCTimestamp = {
  physical: Date.now(),
  logical: 0,
  nodeId: 'server',
};

/**
 * Cache of recently used nonces to detect replays.
 * Map<nonce, expiresAt>
 */
const nonceCache = new Map<string, number>();

/**
 * Last seen HLC per device for monotonic ordering.
 * Map<nodeId, HLCTimestamp>
 */
const lastSeenHLC = new Map<string, HLCTimestamp>();

// ─── Nonce Cleanup (runs periodically) ──────────────────────────

setInterval(() => {
  const now = Date.now();
  let purged = 0;
  for (const [nonce, expiresAt] of nonceCache) {
    if (now > expiresAt) {
      nonceCache.delete(nonce);
      purged++;
    }
  }
  if (purged > 0) {
    console.log(`[HLC] Purged ${purged} expired nonces. Cache size: ${nonceCache.size}`);
  }
}, CONFIG.HLC.NONCE_CLEANUP_INTERVAL_MS);

// ─── HLC Operations ─────────────────────────────────────────────

/**
 * Advance the server's HLC for a local event.
 * Called whenever the server processes an event.
 */
export function tickServerHLC(): HLCTimestamp {
  const now = Date.now();
  if (now > serverHLC.physical) {
    serverHLC = { physical: now, logical: 0, nodeId: 'server' };
  } else {
    serverHLC = { ...serverHLC, logical: serverHLC.logical + 1 };
  }
  return { ...serverHLC };
}

/**
 * Merge a received HLC with the server's HLC.
 * This implements the HLC receive algorithm:
 *   physical = max(local_physical, remote_physical, wall_clock)
 *   logical = resolved based on which is dominant
 */
export function mergeHLC(remote: HLCTimestamp): HLCTimestamp {
  const now = Date.now();
  const maxPhysical = Math.max(serverHLC.physical, remote.physical, now);

  let logical: number;
  if (maxPhysical === serverHLC.physical && maxPhysical === remote.physical) {
    // Same physical time — take max logical + 1
    logical = Math.max(serverHLC.logical, remote.logical) + 1;
  } else if (maxPhysical === serverHLC.physical) {
    logical = serverHLC.logical + 1;
  } else if (maxPhysical === remote.physical) {
    logical = remote.logical + 1;
  } else {
    // Wall clock is ahead — reset
    logical = 0;
  }

  serverHLC = { physical: maxPhysical, logical, nodeId: 'server' };
  return { ...serverHLC };
}

/**
 * Compare two HLC timestamps.
 * Returns:
 *  -1 if a < b (a happened before b)
 *   0 if a == b (concurrent)
 *   1 if a > b (a happened after b)
 */
export function compareHLC(a: HLCTimestamp, b: HLCTimestamp): -1 | 0 | 1 {
  if (a.physical < b.physical) return -1;
  if (a.physical > b.physical) return 1;
  if (a.logical < b.logical) return -1;
  if (a.logical > b.logical) return 1;
  return 0;
}

// ─── Anti-Replay Validation ──────────────────────────────────────

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
export function validateAntiReplay(
  clientHLC: HLCTimestamp,
  nonce: string,
): HLCValidationResult {
  const now = Date.now();

  // ① Clock Drift Check
  const driftMs = Math.abs(now - clientHLC.physical);
  if (driftMs > CONFIG.HLC.MAX_DRIFT_MS) {
    return {
      valid: false,
      reason: `Clock drift too large: ${driftMs}ms (max: ${CONFIG.HLC.MAX_DRIFT_MS}ms). ` +
        `Server time: ${now}, Client time: ${clientHLC.physical}`,
      driftMs,
    };
  }

  // ② Nonce Replay Check
  if (nonceCache.has(nonce)) {
    return {
      valid: false,
      reason: `Nonce "${nonce.slice(0, 8)}..." has already been used. Possible replay attack.`,
      driftMs,
    };
  }

  // ③ Monotonic HLC Check per device
  const lastSeen = lastSeenHLC.get(clientHLC.nodeId);
  if (lastSeen) {
    const cmp = compareHLC(lastSeen, clientHLC);
    if (cmp >= 0) {
      return {
        valid: false,
        reason: `HLC is not strictly increasing for device "${clientHLC.nodeId}". ` +
          `Last: [${lastSeen.physical}:${lastSeen.logical}], ` +
          `Received: [${clientHLC.physical}:${clientHLC.logical}]`,
        driftMs,
      };
    }
  }

  // ✅ All checks passed — record nonce and update last-seen HLC
  nonceCache.set(nonce, now + CONFIG.HLC.NONCE_TTL_MS);
  lastSeenHLC.set(clientHLC.nodeId, { ...clientHLC });

  // Merge with server HLC
  mergeHLC(clientHLC);

  return {
    valid: true,
    reason: `HLC validated. Drift: ${driftMs}ms. Device: ${clientHLC.nodeId}`,
    driftMs,
  };
}

/**
 * Get the current server HLC timestamp (for debugging / API responses).
 */
export function getServerHLC(): HLCTimestamp {
  return { ...serverHLC };
}
