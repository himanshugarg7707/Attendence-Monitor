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
/**
 * Extended Hono context variables set by the Proximity Guard.
 * Downstream handlers can access these via `c.get('proximityVerified')`.
 */
export interface ProximityGuardVariables {
    proximityVerified: boolean;
    classroomSessionId: string;
}
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
export declare const proximityGuard: import("hono").MiddlewareHandler<any, string, {}, Response | (Response & import("hono").TypedResponse<{
    success: false;
    error: string;
    timestamp: string;
}, 400, "json">)>;
//# sourceMappingURL=proximity-guard.middleware.d.ts.map