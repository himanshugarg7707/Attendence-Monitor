/**
 * ═══════════════════════════════════════════════════════════════════
 *  Server Configuration
 *  Constants, thresholds, and environment-based settings.
 * ═══════════════════════════════════════════════════════════════════
 */
export declare const CONFIG: {
    /** Server port */
    readonly PORT: number;
    /** Relying Party configuration for WebAuthn */
    readonly RP: {
        readonly name: "Trusted Proximity Attendance";
        readonly id: string;
        readonly origin: string;
    };
    /** BLE Proximity thresholds */
    readonly PROXIMITY: {
        /**
         * Minimum acceptable RSSI in dBm.
         * RSSI > -60 dBm ≈ within ~2-3 meters of the beacon.
         * Values closer to 0 = stronger signal = closer proximity.
         */
        readonly RSSI_THRESHOLD: -60;
        /** How often the rolling session token rotates (ms) */
        readonly TOKEN_ROTATION_INTERVAL_MS: 30000;
        /** Number of previous tokens to accept (grace period) */
        readonly TOKEN_GRACE_COUNT: 2;
    };
    /** Hybrid Logical Clock / Anti-Replay settings */
    readonly HLC: {
        /**
         * Maximum allowed clock drift between client and server (ms).
         * Requests with timestamps outside this window are rejected.
         */
        readonly MAX_DRIFT_MS: 5000;
        /** How long to retain used nonces before purging (ms) */
        readonly NONCE_TTL_MS: 60000;
        /** Nonce cache cleanup interval (ms) */
        readonly NONCE_CLEANUP_INTERVAL_MS: 30000;
    };
    /** WebSocket configuration */
    readonly WS: {
        /** Heartbeat ping interval (ms) */
        readonly HEARTBEAT_INTERVAL_MS: 15000;
        /** Connection considered dead after this many missed heartbeats */
        readonly MAX_MISSED_HEARTBEATS: 3;
    };
    /** WebAuthn attestation settings */
    readonly ATTESTATION: {
        /**
         * Require direct attestation to verify hardware backing.
         * Set to 'none' for development/testing.
         */
        readonly TYPE: "direct" | "indirect" | "none";
        /**
         * Require User Verification (biometric/PIN).
         * This ensures the authenticator verified the user's identity.
         */
        readonly USER_VERIFICATION: "required";
    };
};
//# sourceMappingURL=config.d.ts.map