/**
 * ═══════════════════════════════════════════════════════════════════
 *  Server Configuration
 *  Constants, thresholds, and environment-based settings.
 * ═══════════════════════════════════════════════════════════════════
 */

export const CONFIG = {
  /** Server port */
  PORT: Number(process.env.PORT) || 4000,

  /** Relying Party configuration for WebAuthn */
  RP: {
    name: 'Trusted Proximity Attendance',
    id: 'attendence-monitor.onrender.com',
    origin: 'https://attendence-monitor.vercel.app',
  },

  /** BLE Proximity thresholds */
  PROXIMITY: {
    /**
     * Minimum acceptable RSSI in dBm.
     * RSSI > -60 dBm ≈ within ~2-3 meters of the beacon.
     * Values closer to 0 = stronger signal = closer proximity.
     */
    RSSI_THRESHOLD: -60,

    /** How often the rolling session token rotates (ms) */
    TOKEN_ROTATION_INTERVAL_MS: 30_000,

    /** Number of previous tokens to accept (grace period) */
    TOKEN_GRACE_COUNT: 2,
  },

  /** Hybrid Logical Clock / Anti-Replay settings */
  HLC: {
    /**
     * Maximum allowed clock drift between client and server (ms).
     * Requests with timestamps outside this window are rejected.
     */
    MAX_DRIFT_MS: 5_000,

    /** How long to retain used nonces before purging (ms) */
    NONCE_TTL_MS: 60_000,

    /** Nonce cache cleanup interval (ms) */
    NONCE_CLEANUP_INTERVAL_MS: 30_000,
  },

  /** WebSocket configuration */
  WS: {
    /** Heartbeat ping interval (ms) */
    HEARTBEAT_INTERVAL_MS: 15_000,

    /** Connection considered dead after this many missed heartbeats */
    MAX_MISSED_HEARTBEATS: 3,
  },

  /** WebAuthn attestation settings */
  ATTESTATION: {
    /**
     * Require direct attestation to verify hardware backing.
     * Set to 'none' for development/testing.
     */
    TYPE: (process.env.ATTESTATION_TYPE ?? 'none') as 'direct' | 'indirect' | 'none',

    /**
     * Require User Verification (biometric/PIN).
     * This ensures the authenticator verified the user's identity.
     */
    USER_VERIFICATION: 'required' as const,
  },
} as const;
