/**
 * ═══════════════════════════════════════════════════════════════
 *  DashboardView — Professor's Live Attendance Dashboard
 *
 *  Real-time view of student attendance verifications.
 *  When a student verifies, their profile card "pops" onto the
 *  screen via WebSocket broadcast in <100ms.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { StudentCard } from './StudentCard';
import { StatusIndicator } from './StatusIndicator';
import * as api from '../services/api';

export function DashboardView() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [className, setClassName] = useState('CS-301 Data Structures');
  const [professorId] = useState('prof-001');
  const [isStarting, setIsStarting] = useState(false);

  const ws = useWebSocket(sessionId);

  const handleStartSession = useCallback(async () => {
    setIsStarting(true);
    const res = await api.startSession(professorId, className);
    if (res.success && res.data) {
      setSessionId((res.data as any).id);
    }
    setIsStarting(false);
  }, [professorId, className]);

  const handleEndSession = useCallback(async () => {
    if (sessionId) {
      await api.endSession(sessionId);
      setSessionId(null);
    }
  }, [sessionId]);

  return (
    <div>
      {/* ── Session Control Bar ── */}
      {!sessionId ? (
        <div className="glass-card" style={{ maxWidth: 600, margin: '0 auto var(--space-8)' }}>
          <div className="glass-card-header">
            <div
              className="glass-card-icon"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              🏫
            </div>
            <div>
              <div className="glass-card-title">Start Attendance Session</div>
              <div className="glass-card-desc">
                Create a new session for your class. Students will connect via BLE.
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dashboard-class-name">Class Name</label>
            <input
              id="dashboard-class-name"
              className="form-input"
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. CS-301 Data Structures"
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleStartSession}
            disabled={isStarting || !className}
            id="start-session-btn"
          >
            {isStarting ? (
              <>
                <span className="spinner" /> Starting...
              </>
            ) : (
              <>🚀 Start Session</>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* ── Session Info Bar ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div>
              <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                {className}
              </h2>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 'var(--space-1)',
                }}
              >
                Session: {sessionId}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <StatusIndicator
                status={ws.isConnected ? 'connected' : 'disconnected'}
                label={ws.isConnected ? 'Live' : 'Connecting...'}
              />
              <button
                className="btn btn-danger"
                onClick={handleEndSession}
                id="end-session-btn"
              >
                End Session
              </button>
            </div>
          </div>

          {/* ── Stats Bar ── */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-value emerald">{ws.students.length}</div>
              <div className="stat-label">Verified</div>
            </div>
            <div className="stat-item">
              <div className="stat-value blue">
                {ws.students.length > 0
                  ? `${(ws.students.reduce((sum, s) => sum + s.signalStrength, 0) / ws.students.length).toFixed(0)}`
                  : '—'}
              </div>
              <div className="stat-label">Avg RSSI (dBm)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value violet">
                {ws.students.length > 0
                  ? `${ws.students.reduce(
                      (sum: number, s) =>
                        sum + s.verificationSteps.reduce((t: number, step) => t + step.durationMs, 0),
                      0,
                    ) / ws.students.length | 0}`
                  : '—'}
              </div>
              <div className="stat-label">Avg Verify (ms)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value amber">
                {ws.isConnected ? '◉' : '○'}
              </div>
              <div className="stat-label">WebSocket</div>
            </div>
          </div>

          {/* ── Student Cards Grid ── */}
          {ws.students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👋</div>
              <div className="empty-state-text">Waiting for students...</div>
              <div className="empty-state-hint">
                Students need to connect via BLE proximity and verify with their passkey.
                <br />
                Share the Session ID above with your class.
              </div>
            </div>
          ) : (
            <div className="student-cards-grid">
              {ws.students.map((student, i) => (
                <StudentCard
                  key={`${student.studentId}-${student.verifiedAt}`}
                  student={student}
                  index={i}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
