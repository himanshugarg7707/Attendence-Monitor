/**
 * Client-side Hybrid Logical Clock (HLC) implementation.
 * Generates timestamps and nonces for anti-replay protection.
 */

import type { HLCTimestamp } from '../types';

let localHLC: HLCTimestamp = {
  physical: Date.now(),
  logical: 0,
  nodeId: `device-${crypto.randomUUID().slice(0, 8)}`,
};

/**
 * Generate a new HLC timestamp for an outgoing request.
 */
export function tickHLC(): HLCTimestamp {
  const now = Date.now();
  if (now > localHLC.physical) {
    localHLC = { ...localHLC, physical: now, logical: 0 };
  } else {
    localHLC = { ...localHLC, logical: localHLC.logical + 1 };
  }
  return { ...localHLC };
}

/**
 * Generate a cryptographically random nonce.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get the current device node ID.
 */
export function getNodeId(): string {
  return localHLC.nodeId;
}
