/**
 * ═══════════════════════════════════════════════════════════════
 *  ClassRadar — Interactive Real-Time Proximity Radar
 *  Visualizes classroom proximity, signal propagation, and
 *  verified student locations relative to the faculty beacon.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import type { StudentVerifiedPayload } from '../types';

interface ClassRadarProps {
  students: StudentVerifiedPayload[];
  hotspotSSID?: string;
  onStudentClick?: (student: StudentVerifiedPayload) => void;
}

export function ClassRadar({ students, hotspotSSID, onStudentClick }: ClassRadarProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentVerifiedPayload | null>(null);

  // Convert RSSI (-100 to -20) to radius percentage (15% to 85%)
  const getRadius = (rssi: number) => {
    const clamped = Math.max(-95, Math.min(-25, rssi));
    // -25 is closest (center = 18%), -95 is furthest (edge = 88%)
    const normalized = (clamped - (-25)) / (-95 - (-25));
    return 18 + normalized * 70;
  };

  return (
    <div className="radar-container glass-card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: '1.25rem' }}>🎯</span>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>Live Classroom Proximity Radar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="radar-status-dot pulse-emerald" />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            SCANNING 360° {hotspotSSID ? `• [${hotspotSSID}]` : ''}
          </span>
        </div>
      </div>

      <div className="radar-screen">
        {/* Radar concentric range rings */}
        <div className="radar-ring ring-1">
          <span className="radar-ring-label">&lt; 1m (-40dBm)</span>
        </div>
        <div className="radar-ring ring-2">
          <span className="radar-ring-label">2-3m (-60dBm GATE)</span>
        </div>
        <div className="radar-ring ring-3">
          <span className="radar-ring-label">5m (-75dBm)</span>
        </div>

        {/* Crosshair grid lines */}
        <div className="radar-crosshair-h" />
        <div className="radar-crosshair-v" />

        {/* Sweeping radar scanner */}
        <div className="radar-sweep" />

        {/* Faculty Beacon at Center */}
        <div className="radar-center-beacon" title="Faculty Beacon / Hotspot Hub">
          <span>📡</span>
          <div className="beacon-pulse" />
        </div>

        {/* Verified Student Blips on Radar */}
        {students.map((student, idx) => {
          // Deterministic angle based on student ID hash
          const hash = student.studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + idx * 45;
          const angleDeg = (hash % 360) * (Math.PI / 180);
          const radiusPct = getRadius(student.signalStrength);

          // Polar to Cartesian in percentage from center (50%, 50%)
          const x = 50 + radiusPct * 0.45 * Math.cos(angleDeg);
          const y = 50 + radiusPct * 0.45 * Math.sin(angleDeg);

          const isSelected = selectedStudent?.studentId === student.studentId;

          return (
            <div
              key={`${student.studentId}-${idx}`}
              className={`radar-blip ${isSelected ? 'active' : ''}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${idx * 120}ms`,
              }}
              onClick={() => {
                setSelectedStudent(student);
                if (onStudentClick) onStudentClick(student);
              }}
            >
              <div className="radar-blip-dot" />
              <div className="radar-blip-ring" />
              <div className="radar-blip-tag">
                {student.studentName.split(' ')[0]} ({student.signalStrength}dBm)
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Student Radar Detail Card */}
      {selectedStudent && (
        <div className="radar-selected-popup" style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                {selectedStudent.studentName[0]}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedStudent.studentName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {selectedStudent.studentId}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge success">RSSI: {selectedStudent.signalStrength} dBm</span>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  marginLeft: '0.5rem',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedStudent(null)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--space-6)',
          marginTop: 'var(--space-3)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> In Safe Attendance Zone (&gt; -60 dBm)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Hotspot Verified
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Sweeping Beacon
        </span>
      </div>
    </div>
  );
}
