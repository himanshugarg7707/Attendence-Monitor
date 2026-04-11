/**
 * ═══════════════════════════════════════════════════════════════
 *  ProximityComponent — Mobile-Side BLE Handshake
 *
 *  Student-facing UI for attendance verification:
 *  1. Scan for classroom BLE beacon (or simulate for demo)
 *  2. Display real-time RSSI signal strength
 *  3. Trigger WebAuthn biometric authentication
 *  4. Submit attendance with proximity + biometric + HLC data
 *
 *  💡 React Native Equivalent:
 *  In a real mobile app, replace useBluetooth() with
 *  react-native-ble-plx's BleManager.startDeviceScan()
 *  to get real RSSI values from the hardware.
 *
 *  💡 iOS Foreground Service:
 *  Call this in your React Native app startup to keep BLE alive:
 *  ```
 *  BleManager.enableForegroundService(true,
 *    'Attendance Active',
 *    'Scanning for classroom proximity'
 *  );
 *  ```
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { useBluetooth } from '../hooks/useBluetooth';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { StatusIndicator } from './StatusIndicator';
import { tickHLC, generateNonce } from '../services/hlc';
import * as api from '../services/api';
import type { AttendanceResult, VerificationStep } from '../types';

export function ProximityComponent() {
  const [studentId, setStudentId] = useState('student-001');
  const [classroomId, setClassroomId] = useState('');
  const [simulatedRSSI, setSimulatedRSSI] = useState(-45);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);

  const bluetooth = useBluetooth();
  const webauthn = useWebAuthn(studentId);

  // Determine the RSSI to display
  const currentRSSI = bluetooth.rssi ?? simulatedRSSI;
  const isInRange = currentRSSI > -60;

  // Map RSSI to visual percentage
  const rssiPercent = Math.max(0, Math.min(100, ((currentRSSI + 100) / 100) * 100));
  const rssiClass = currentRSSI > -50 ? 'strong' : currentRSSI > -65 ? 'medium' : 'weak';

  /**
   * Full attendance verification flow:
   * BLE Proximity → WebAuthn Biometric → Server Verification
   */
  const handleVerify = useCallback(async () => {
    if (!classroomId) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      // Step 1: Authenticate with WebAuthn (biometric prompt)
      const assertion = await webauthn.authenticate();
      if (!assertion) {
        setIsSubmitting(false);
        return;
      }

      // Step 2: Generate HLC timestamp and nonce
      const hlcTimestamp = tickHLC();
      const nonce = generateNonce();

      // Step 3: Build and submit the attendance request
      const payload = {
        studentId,
        classroomId,
        proximity: {
          signalStrength: currentRSSI,
          rollingSessionToken: bluetooth.sessionToken ?? 'demo-token',
          beaconUUID: '0000fff0-0000-1000-8000-00805f9b34fb',
        },
        hlcTimestamp,
        nonce,
        webauthnAssertion: assertion,
      };

      const response = await api.verifyAttendance(payload);

      if (response.data) {
        setResult(response.data as AttendanceResult);
      } else {
        setResult({
          verified: false,
          studentName: '',
          timestamp: new Date().toISOString(),
          verificationSteps: [],
          error: response.error ?? 'Unknown error',
        });
      }
    } catch (err) {
      setResult({
        verified: false,
        studentName: '',
        timestamp: new Date().toISOString(),
        verificationSteps: [],
        error: (err as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [classroomId, studentId, currentRSSI, bluetooth.sessionToken, webauthn]);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* ── Proximity Aura Visualization ── */}
      <div className="glass-card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="glass-card-header">
          <div
            className="glass-card-icon"
            style={{
              background: isInRange
                ? 'linear-gradient(135deg, #059669, #10b981)'
                : 'linear-gradient(135deg, #e11d48, #f43f5e)',
            }}
          >
            📡
          </div>
          <div>
            <div className="glass-card-title">Proximity Scanner</div>
            <div className="glass-card-desc">
              {isInRange
                ? 'You are within range of the classroom beacon'
                : 'Move closer to the classroom to verify attendance'}
            </div>
          </div>
        </div>

        {/* Aura Animation */}
        <div className="proximity-aura-container">
          <div className="proximity-aura-ring" />
          <div className="proximity-aura-ring" />
          <div className="proximity-aura-ring" />
          <div className="proximity-aura">
            {isInRange ? '✅' : '📶'}
          </div>
        </div>

        {/* RSSI Meter */}
        <div className="rssi-meter">
          <div className="rssi-meter-label">
            <span>Signal: {currentRSSI} dBm</span>
            <span>
              {currentRSSI > -50
                ? 'Excellent'
                : currentRSSI > -60
                  ? 'Good'
                  : currentRSSI > -75
                    ? 'Too Far'
                    : 'No Signal'}
            </span>
          </div>
          <div className="rssi-meter-bar">
            <div
              className={`rssi-meter-fill ${rssiClass}`}
              style={{ width: `${rssiPercent}%` }}
            />
          </div>
        </div>

        {/* RSSI Simulator Slider (for demo without real BLE) */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <label
            className="form-label"
            htmlFor="rssi-slider"
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <span>Simulate RSSI (demo)</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{simulatedRSSI} dBm</span>
          </label>
          <input
            id="rssi-slider"
            type="range"
            className="range-slider"
            min={-100}
            max={-20}
            value={simulatedRSSI}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSimulatedRSSI(val);
              bluetooth.simulateProximity(val, 'demo-token');
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
            }}
          >
            <span>-100 (far)</span>
            <span style={{ color: 'var(--accent-emerald)' }}>
              -60 threshold ──▶
            </span>
            <span>-20 (close)</span>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
          <StatusIndicator
            status={isInRange ? 'connected' : 'disconnected'}
            label={isInRange ? 'In Range' : 'Out of Range'}
          />
          <StatusIndicator
            status={webauthn.isRegistered ? 'connected' : 'disconnected'}
            label={webauthn.isRegistered ? 'Passkey Ready' : 'No Passkey'}
          />
        </div>
      </div>

      {/* ── Verification Form ── */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div
            className="glass-card-icon"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
          >
            🔐
          </div>
          <div>
            <div className="glass-card-title">Verify Attendance</div>
            <div className="glass-card-desc">
              Authenticate with your passkey to record attendance
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="proximity-student-id">Student</label>
          <select
            id="proximity-student-id"
            className="form-input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="student-001">Arjun Mehta (student-001)</option>
            <option value="student-002">Priya Sharma (student-002)</option>
            <option value="student-003">Rahul Gupta (student-003)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="proximity-classroom-id">
            Classroom Session ID
          </label>
          <input
            id="proximity-classroom-id"
            className="form-input"
            type="text"
            placeholder="Paste session ID from professor"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          />
        </div>

        {/* Error Display */}
        {(webauthn.error || bluetooth.error) && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '0.5rem',
              color: 'var(--accent-rose)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {webauthn.error || bluetooth.error}
          </div>
        )}

        <button
          className={`btn ${isInRange ? 'btn-success' : 'btn-danger'} btn-lg`}
          style={{ width: '100%' }}
          onClick={handleVerify}
          disabled={!isInRange || isSubmitting || !classroomId}
          id="verify-attendance-btn"
        >
          {isSubmitting ? (
            <>
              <span className="spinner" /> Verifying...
            </>
          ) : !isInRange ? (
            <>❌ Too Far ({currentRSSI} dBm &lt; -60 dBm)</>
          ) : (
            <>🔐 Verify Attendance</>
          )}
        </button>
      </div>

      {/* ── Verification Result ── */}
      {result && (
        <div className="glass-card" style={{ marginTop: 'var(--space-5)' }}>
          <div className="glass-card-header">
            <div
              className="glass-card-icon"
              style={{
                background: result.verified
                  ? 'linear-gradient(135deg, #059669, #10b981)'
                  : 'linear-gradient(135deg, #e11d48, #f43f5e)',
              }}
            >
              {result.verified ? '✅' : '❌'}
            </div>
            <div>
              <div className="glass-card-title">
                {result.verified ? 'Attendance Verified!' : 'Verification Failed'}
              </div>
              <div className="glass-card-desc">
                {result.verified
                  ? `${result.studentName} — ${new Date(result.timestamp).toLocaleTimeString()}`
                  : result.error}
              </div>
            </div>
          </div>

          {/* Verification Steps Breakdown */}
          {result.verificationSteps.length > 0 && (
            <ul className="verification-steps">
              {result.verificationSteps.map((step: VerificationStep, i: number) => (
                <li
                  key={i}
                  className="verification-step"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`step-icon ${step.passed ? 'pass' : 'fail'}`}>
                    {step.passed ? '✓' : '✗'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="step-name">{step.name}</div>
                    <div className="step-detail">{step.details}</div>
                  </div>
                  <div className="step-duration">{step.durationMs.toFixed(1)}ms</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
