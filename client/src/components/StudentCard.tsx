/**
 * StudentCard — Animated profile card for the dashboard.
 * Pops onto screen when a student verifies attendance.
 */

import type { StudentVerifiedPayload } from '../types';

interface StudentCardProps {
  student: StudentVerifiedPayload;
  index: number;
}

const AVATAR_COLORS = ['emerald', 'blue', 'violet', 'amber', 'rose'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRSSIStrength(rssi: number): { label: string; percent: number; className: string } {
  // Map RSSI (-100 to 0) to a percentage
  const percent = Math.max(0, Math.min(100, ((rssi + 100) / 100) * 100));
  if (rssi > -50) return { label: 'Excellent', percent, className: 'strong' };
  if (rssi > -65) return { label: 'Good', percent, className: 'strong' };
  if (rssi > -75) return { label: 'Fair', percent, className: 'medium' };
  return { label: 'Weak', percent, className: 'weak' };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function StudentCard({ student, index }: StudentCardProps) {
  const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = getInitials(student.studentName);
  const rssiInfo = getRSSIStrength(student.signalStrength);

  // Count passed/failed steps
  const passedSteps = student.verificationSteps.filter((s: { passed: boolean }) => s.passed).length;
  const totalSteps = student.verificationSteps.length;

  return (
    <div
      className="student-card"
      style={{ animationDelay: `${index * 50}ms` }}
      id={`student-card-${student.studentId}`}
    >
      <div className="student-card-header">
        <div className={`student-avatar ${colorClass}`}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="student-name">{student.studentName}</div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{student.studentId}</span>
            <span>•</span>
            <span className="student-time">✓ {formatTime(student.verifiedAt)}</span>
          </div>
        </div>
      </div>

      {/* RSSI Signal Meter */}
      <div className="rssi-meter">
        <div className="rssi-meter-label">
          <span>Signal: {student.signalStrength} dBm</span>
          <span>{rssiInfo.label}</span>
        </div>
        <div className="rssi-meter-bar">
          <div
            className={`rssi-meter-fill ${rssiInfo.className}`}
            style={{ width: `${rssiInfo.percent}%` }}
          />
        </div>
      </div>

      {/* Verification Badges */}
      <div className="verification-badges">
        <span className="badge success">🔐 Biometric ✓</span>
        {student.hotspotConnected && (
          <span className="badge success" title={student.hotspotSSID || 'Faculty Hotspot'}>
            📶 Hotspot ✓
          </span>
        )}
        <span className="badge success">📡 Proximity ✓</span>
        {student.networkLatencyMs && (
          <span className="badge info" style={{ fontFamily: 'var(--font-mono)' }}>
            ⚡ {student.networkLatencyMs}ms
          </span>
        )}
        <span className="badge info">
          {passedSteps}/{totalSteps} checks
        </span>
      </div>
    </div>
  );
}
