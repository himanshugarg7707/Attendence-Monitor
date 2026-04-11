/**
 * ═══════════════════════════════════════════════════════════════════
 *  Proximity Guard Middleware
 *
 *  Hono middleware that validates BLE proximity data before
 *  allowing attendance processing. Acts as the first line of
 *  defense: if a student isn't physically near the classroom
 *  beacon, the request is rejected immediately.
 *
 *  Checks:
 *  1. RSSI signal strength > -60 dBm (≈ within 2-3 meters)
 *  2. Rolling session token matches an active classroom session
 *
 *  💡 Senior Tip: Mobile OS restrictions (iOS especially) are
 *  strict about background Bluetooth. The mobile app should use
 *  a Foreground Service / Background Mode to keep BLE scanning
 *  active while the professor is taking attendance.
 * ═══════════════════════════════════════════════════════════════════
 */
import { createMiddleware } from 'hono/factory';
import { CONFIG } from '../config.js';
import { validateSessionToken, getSession } from '../store/memory-store.js';
/**
 * Proximity Guard Middleware for Hono.
 *
 * Expects the request body to contain:
 * - proximity.signalStrength: number (dBm)
 * - proximity.rollingSessionToken: string
 * - classroomId: string
 *
 * Rejects with 403 if RSSI is below threshold.
 * Rejects with 401 if session token is invalid.
 */
export const proximityGuard = createMiddleware(async (c, next) => {
    const startTime = performance.now();
    // Parse the request body
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({
            success: false,
            error: 'Invalid JSON body',
            timestamp: new Date().toISOString(),
        }, 400);
    }
    // Extract proximity data
    const proximity = body.proximity;
    const classroomId = body.classroomId;
    // ─── Validate Required Fields ────────────────────────────────
    if (!proximity || typeof proximity.signalStrength !== 'number') {
        return c.json({
            success: false,
            error: 'Missing proximity.signalStrength (dBm)',
            timestamp: new Date().toISOString(),
        }, 400);
    }
    if (!proximity.rollingSessionToken || typeof proximity.rollingSessionToken !== 'string') {
        return c.json({
            success: false,
            error: 'Missing proximity.rollingSessionToken',
            timestamp: new Date().toISOString(),
        }, 400);
    }
    if (!classroomId || typeof classroomId !== 'string') {
        return c.json({
            success: false,
            error: 'Missing classroomId',
            timestamp: new Date().toISOString(),
        }, 400);
    }
    const { signalStrength, rollingSessionToken } = proximity;
    // ─── RSSI Threshold Check ────────────────────────────────────
    // RSSI values: 0 dBm = strongest, -100 dBm = weakest
    // Threshold: -60 dBm ≈ within 2-3 meters
    //
    //   -30 dBm  │████████████████████│  Very close (< 1m)
    //   -50 dBm  │██████████████      │  Near (1-2m)
    //   -60 dBm  │██████████          │  ← THRESHOLD
    //   -70 dBm  │██████              │  Medium (3-5m)
    //   -90 dBm  │██                  │  Far (5-10m)
    //  -100 dBm  │                    │  Very far / no signal
    if (signalStrength <= CONFIG.PROXIMITY.RSSI_THRESHOLD) {
        const distance = estimateDistance(signalStrength);
        console.log(`[ProximityGuard] ❌ REJECTED: RSSI ${signalStrength} dBm ` +
            `≤ threshold ${CONFIG.PROXIMITY.RSSI_THRESHOLD} dBm ` +
            `(est. ${distance.toFixed(1)}m away)`);
        return c.json({
            success: false,
            error: 'Too far from classroom beacon',
            details: {
                signalStrength,
                threshold: CONFIG.PROXIMITY.RSSI_THRESHOLD,
                estimatedDistanceMeters: distance,
                recommendation: 'Move closer to the classroom and try again',
            },
            timestamp: new Date().toISOString(),
        }, 403);
    }
    // ─── Session Token Validation ────────────────────────────────
    // The rolling session token rotates every 30 seconds.
    // We accept the current token + previous N tokens (grace period).
    if (!validateSessionToken(classroomId, rollingSessionToken)) {
        const session = getSession(classroomId);
        console.log(`[ProximityGuard] ❌ REJECTED: Invalid session token for classroom ${classroomId}. ` +
            `Session ${session ? 'exists' : 'NOT FOUND'}, active: ${session?.isActive ?? 'N/A'}`);
        return c.json({
            success: false,
            error: 'Invalid or expired session token',
            details: {
                classroomId,
                sessionActive: session?.isActive ?? false,
                recommendation: session
                    ? 'Token may have expired. The classroom beacon rotates tokens every 30 seconds.'
                    : 'No active session found for this classroom. Ask your professor to start the session.',
            },
            timestamp: new Date().toISOString(),
        }, 401);
    }
    // ─── All Proximity Checks Passed ─────────────────────────────
    const durationMs = performance.now() - startTime;
    const distance = estimateDistance(signalStrength);
    console.log(`[ProximityGuard] ✅ PASSED: RSSI ${signalStrength} dBm ` +
        `(est. ${distance.toFixed(1)}m), token valid, ${durationMs.toFixed(1)}ms`);
    // Set variables for downstream handlers
    c.set('proximityVerified', true);
    c.set('classroomSessionId', classroomId);
    // Store parsed body for downstream (avoid re-parsing)
    c.set('parsedBody', body);
    await next();
});
// ─── Distance Estimation ─────────────────────────────────────────
/**
 * Estimate physical distance from RSSI using the log-distance
 * path loss model.
 *
 * Formula: distance = 10 ^ ((txPower - RSSI) / (10 * n))
 *
 * Where:
 *   txPower = calibrated RSSI at 1 meter (typically -59 dBm)
 *   n = path loss exponent (2.0 for free space, 2.5-4.0 for indoors)
 *
 * ⚠ This is an approximation. RSSI is heavily affected by
 *   obstacles, reflections, and antenna orientation.
 *   Use Kalman filtering for smoother readings in production.
 */
function estimateDistance(rssi) {
    const TX_POWER = -59; // Calibrated RSSI at 1 meter
    const PATH_LOSS_EXPONENT = 2.5; // Indoor environment
    if (rssi === 0)
        return -1; // Unknown
    const ratio = (TX_POWER - rssi) / (10 * PATH_LOSS_EXPONENT);
    return Math.pow(10, ratio);
}
//# sourceMappingURL=proximity-guard.middleware.js.map