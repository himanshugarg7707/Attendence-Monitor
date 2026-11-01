/**
 * ═══════════════════════════════════════════════════════════════
 *  FacultyView — Faculty Attendance Command Portal
 *
 *  Production Interface for Instructors:
 *  - Faculty Profile & Hotspot Configuration
 *  - Real-time Session Broadcast & Live QR Code Projector
 *  - Live Classroom Radar Scope & Attendance Roster
 *  - Official Microsoft Excel (.xlsx) Attendance Export
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useWebSocket } from '../hooks/useWebSocket';
import { StudentCard } from './StudentCard';
import { ClassRadar } from './ClassRadar';
import { playSuccessChime, toggleMute, getMuteState } from '../utils/audio';
import { generateFacultyAttendanceExcel } from '../utils/excelReport';
import * as api from '../services/api';

interface FacultyProfile {
  id: string;
  name: string;
  department: string;
  hotspotSSID: string;
}

const DEFAULT_PROFILE: FacultyProfile = {
  id: 'FAC-101',
  name: 'Prof. Rajesh Sharma',
  department: 'Computer Science & Engineering',
  hotspotSSID: 'Prof_Sharma_Hotspot',
};

function getSavedProfile(): FacultyProfile {
  try {
    const saved = localStorage.getItem('faculty_profile');
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore
  }
  return DEFAULT_PROFILE;
}

interface FacultyViewProps {
  currentUser?: { id: string; name: string; department?: string };
}

export function FacultyView({ currentUser }: FacultyViewProps = {}) {
  const [profile, setProfile] = useState<FacultyProfile>(() => {
    const saved = getSavedProfile();
    return {
      ...saved,
      id: currentUser?.id || saved.id,
      name: currentUser?.name || saved.name,
      department: currentUser?.department || saved.department,
    };
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfile((prev) => ({
        ...prev,
        id: currentUser.id,
        name: currentUser.name || prev.name,
        department: currentUser.department || prev.department,
      }));
    }
  }, [currentUser]);

  // Session parameters
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [className, setClassName] = useState('CS-402 Distributed Systems');
  const [hotspotSSID, setHotspotSSID] = useState(profile.hotspotSSID);
  const [requireHotspot, setRequireHotspot] = useState(true);
  const [hotspotGateway, setHotspotGateway] = useState('192.168.43.1');
  const [isStarting, setIsStarting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrTargetUrl, setQrTargetUrl] = useState<string>('');
  const [currentToken, setCurrentToken] = useState<string>('');
  const [audioMuted, setAudioMuted] = useState(getMuteState());
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const ws = useWebSocket(sessionId);
  const previousStudentCount = useRef<number>(0);

  // Save profile changes to local storage
  const handleSaveProfile = (updated: FacultyProfile) => {
    setProfile(updated);
    setHotspotSSID(updated.hotspotSSID);
    try {
      localStorage.setItem('faculty_profile', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    setIsEditingProfile(false);
  };

  // Play audio chime when a student verifies
  useEffect(() => {
    if (ws.students.length > previousStudentCount.current) {
      playSuccessChime();
    }
    previousStudentCount.current = ws.students.length;
  }, [ws.students]);

  // Session elapsed timer
  useEffect(() => {
    if (!sessionStartTime) return;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Generate QR Code that redirects student phones to the original Vercel site
  useEffect(() => {
    if (!sessionId) return;

    // Use official production Vercel site as requested by user, or current origin if deployed
    const baseUrl = window.location.origin.includes('vercel.app')
      ? window.location.origin
      : 'https://attendence-monitor.vercel.app';

    const params = new URLSearchParams();
    params.set('session', sessionId);
    if (hotspotSSID) params.set('hotspot', hotspotSSID);
    if (className) params.set('class', className);
    if (currentToken) params.set('token', currentToken);

    const redirectUrl = `${baseUrl}/?${params.toString()}`;
    setQrTargetUrl(redirectUrl);

    QRCode.toDataURL(redirectUrl, {
      width: 340,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [sessionId, className, hotspotSSID]);

  // Start Session
  const handleStartSession = useCallback(async () => {
    setIsStarting(true);
    const res = await api.startSession({
      professorId: profile.id,
      facultyName: profile.name,
      department: profile.department,
      className,
      hotspotSSID: requireHotspot ? hotspotSSID : undefined,
      hotspotGateway,
      requireHotspot,
    });

    if (res.success && res.data) {
      setSessionId((res.data as any).id);
      setCurrentToken((res.data as any).currentToken || '');
      setSessionStartTime(Date.now());
      setElapsedSeconds(0);
    }
    setIsStarting(false);
  }, [profile, className, requireHotspot, hotspotSSID, hotspotGateway]);

  // End Session
  const handleEndSession = useCallback(async () => {
    if (sessionId) {
      if (confirm('Are you sure you want to end this attendance session?')) {
        await api.endSession(sessionId);
        setSessionId(null);
        setSessionStartTime(null);
      }
    }
  }, [sessionId]);

  // Toggle Mute
  const handleToggleMute = () => {
    const updated = toggleMute();
    setAudioMuted(updated);
  };

  // Export Official Excel Report (.xlsx)
  const handleExportExcel = () => {
    if (ws.students.length === 0) {
      alert('No students have verified attendance yet in this session.');
      return;
    }
    generateFacultyAttendanceExcel({
      className,
      facultyName: profile.name,
      facultyId: profile.id,
      department: profile.department,
      sessionId: sessionId || 'SESSION',
      hotspotSSID,
      sessionDate: new Date().toLocaleDateString(),
      students: ws.students,
    });
  };

  // Export Attendance CSV
  const handleExportCSV = () => {
    if (ws.students.length === 0) return;
    const headers = ['Student ID', 'Student Name', 'Verified At', 'RSSI (dBm)', 'Hotspot Verified', 'Hotspot SSID'];
    const rows = ws.students.map((s) => [
      `"${s.studentId}"`,
      `"${s.studentName}"`,
      `"${new Date(s.verifiedAt).toLocaleString()}"`,
      s.signalStrength,
      s.hotspotConnected ? 'YES' : 'NO',
      `"${s.hotspotSSID || hotspotSSID || 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance-${className.replace(/\s+/g, '_')}-${sessionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary
  const handleCopySummary = () => {
    const text = `📋 Attendance Report: ${className}\nFaculty: ${profile.name} (${profile.id})\nSession ID: ${sessionId}\nVerified: ${ws.students.length} students\nHotspot Shield: ${hotspotSSID}\nTime: ${new Date().toLocaleString()}`;
    navigator.clipboard.writeText(text);
    alert('Attendance summary copied to clipboard!');
  };

  // Search filter
  const filteredStudents = ws.students.filter((s) => {
    const q = searchFilter.toLowerCase();
    return s.studentName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
  });

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ── Faculty Identity Banner ── */}
      <div className="faculty-hero-banner glass-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="faculty-avatar-badge">
              👨‍🏫
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
                {profile.department}
              </div>
              <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>
                {profile.name}
              </h2>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Faculty ID: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{profile.id}</span> • Hotspot: <strong style={{ color: 'var(--accent-emerald)' }}>{profile.hotspotSSID}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {!sessionId && (
              <button
                className="btn btn-sm"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
              >
                ✏️ {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            )}

            <button
              className="btn btn-sm"
              onClick={handleToggleMute}
              title={audioMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
            >
              {audioMuted ? '🔇 Audio Off' : '🔊 Chimes Active'}
            </button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditingProfile && !sessionId && (
          <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>
              Update Faculty Credentials
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <label className="form-label" htmlFor="faculty-id-input" style={{ fontSize: 'var(--font-size-xs)' }}>Faculty ID</label>
                <input
                  id="faculty-id-input"
                  className="form-input"
                  type="text"
                  value={profile.id}
                  onChange={(e) => setProfile({ ...profile, id: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="faculty-name-input" style={{ fontSize: 'var(--font-size-xs)' }}>Full Name</label>
                <input
                  id="faculty-name-input"
                  className="form-input"
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="faculty-dept-input" style={{ fontSize: 'var(--font-size-xs)' }}>Department</label>
                <input
                  id="faculty-dept-input"
                  className="form-input"
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="faculty-hotspot-input" style={{ fontSize: 'var(--font-size-xs)' }}>Default Hotspot Name</label>
                <input
                  id="faculty-hotspot-input"
                  className="form-input"
                  type="text"
                  value={profile.hotspotSSID}
                  onChange={(e) => setProfile({ ...profile, hotspotSSID: e.target.value })}
                />
              </div>
            </div>
            <button
              className="btn btn-sm btn-primary"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={() => handleSaveProfile(profile)}
            >
              Save Profile
            </button>
          </div>
        )}
      </div>

      {/* ── If No Session is Active: Show Configuration Form ── */}
      {!sessionId ? (
        <div className="glass-card" style={{ width: '100%', marginBottom: 'var(--space-6)' }}>
          <div className="glass-card-header">
            <div
              className="glass-card-icon"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
            >
              📡
            </div>
            <div>
              <div className="glass-card-title">Launch Attendance Session</div>
              <div className="glass-card-desc">
                Configure classroom course title and hotspot verification
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="faculty-class-name">Course / Classroom Title</label>
            <input
              id="faculty-class-name"
              className="form-input"
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. CS-402 Distributed Systems"
            />
          </div>

          {/* Hotspot Configuration */}
          <div className="hotspot-config-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.25rem' }}>📶</span>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Faculty Wi-Fi Hotspot Shield</span>
              </div>
              <label className="toggle-switch" title="Toggle Hotspot Requirement">
                <input
                  type="checkbox"
                  checked={requireHotspot}
                  onChange={(e) => setRequireHotspot(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
              Enable your personal mobile/laptop hotspot. Only students connected to this hotspot can mark attendance, establishing a physical classroom perimeter.
            </p>

            {requireHotspot && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="faculty-hotspot-ssid" style={{ fontSize: 'var(--font-size-xs)' }}>
                    Your Hotspot SSID (Wi-Fi Name)
                  </label>
                  <input
                    id="faculty-hotspot-ssid"
                    className="form-input"
                    type="text"
                    value={hotspotSSID}
                    onChange={(e) => setHotspotSSID(e.target.value)}
                    placeholder="e.g. Prof_Hotspot_5G"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="faculty-gateway-ip" style={{ fontSize: 'var(--font-size-xs)' }}>
                    Gateway IP / Subnet
                  </label>
                  <input
                    id="faculty-gateway-ip"
                    className="form-input"
                    type="text"
                    value={hotspotGateway}
                    onChange={(e) => setHotspotGateway(e.target.value)}
                    placeholder="e.g. 192.168.43.1"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 'var(--space-6)' }}
            onClick={handleStartSession}
            disabled={isStarting || !className}
            id="faculty-start-session-btn"
          >
            {isStarting ? (
              <>
                <span className="spinner" /> Starting Session...
              </>
            ) : (
              <>🚀 Start Classroom Attendance Session</>
            )}
          </button>
        </div>
      ) : (
        /* ── Active Session Live Command Center ── */
        <div>
          {/* Active Session Info Bar */}
          <div className="glass-card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="pulse-emerald" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--accent-emerald)', letterSpacing: '0.05em' }}>
                    SESSION ACTIVE &amp; BROADCASTING
                  </span>
                  <span className="badge info" style={{ fontFamily: 'var(--font-mono)' }}>⏱ {formatElapsed(elapsedSeconds)}</span>
                </div>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>
                  {className}
                </h1>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    SESSION ID: <strong style={{ color: 'var(--accent-blue)', fontSize: '1.1rem' }}>{sessionId}</strong>
                  </div>
                  {requireHotspot && (
                    <div className="badge success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📶 Hotspot:</span> <strong>{hotspotSSID}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsProjectorOpen(true)}
                >
                  📽️ Projector QR
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleExportExcel}
                  disabled={ws.students.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                  title="Download official Microsoft Excel attendance report (.xlsx)"
                >
                  📗 Export Excel (.xlsx)
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportCSV}
                  disabled={ws.students.length === 0}
                >
                  📥 CSV
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopySummary}
                >
                  📋 Copy Summary
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleEndSession}
                  id="faculty-end-session-btn"
                >
                  🛑 End Session
                </button>
              </div>
            </div>
          </div>

          {/* ── Stats Telemetry Bar ── */}
          <div className="stats-bar" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stat-item">
              <div className="stat-value emerald">{ws.students.length}</div>
              <div className="stat-label">Verified Present</div>
            </div>
            <div className="stat-item">
              <div className="stat-value blue">
                {ws.students.length > 0
                  ? `${(ws.students.reduce((sum, s) => sum + s.signalStrength, 0) / ws.students.length).toFixed(0)} dBm`
                  : '—'}
              </div>
              <div className="stat-label">Avg Signal (RSSI)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value violet">
                {ws.students.length > 0
                  ? `${(ws.students.filter((s) => s.hotspotConnected).length / ws.students.length * 100).toFixed(0)}%`
                  : requireHotspot ? '100% Req' : 'Optional'}
              </div>
              <div className="stat-label">Hotspot Match</div>
            </div>
            <div className="stat-item">
              <div className="stat-value amber">
                {ws.isConnected ? 'ONLINE' : 'Connecting...'}
              </div>
              <div className="stat-label">Live Sync</div>
            </div>
          </div>

          {/* ── Live Proximity Radar Scope ── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <ClassRadar students={ws.students} hotspotSSID={hotspotSSID} />
          </div>

          {/* ── Real-Time Verified Student Grid ── */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                  Class Attendance Roster ({ws.students.length})
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  Students verified in this active session
                </div>
              </div>

              {/* Live Search */}
              <input
                type="text"
                placeholder="Search by name or ID..."
                className="form-input"
                style={{ width: 240, padding: '6px 12px', fontSize: '0.85rem' }}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            {ws.students.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
                <div className="empty-state-icon" style={{ fontSize: '3rem' }}>📡</div>
                <div className="empty-state-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  Waiting for students to join...
                </div>
                <div className="empty-state-hint" style={{ maxWidth: 440, margin: 'var(--space-2) auto' }}>
                  Students connect to Wi-Fi Hotspot <strong>{hotspotSSID}</strong> and scan the Projector QR above to mark attendance.
                </div>
              </div>
            ) : (
              <div className="student-cards-grid">
                {filteredStudents.map((student, i) => (
                  <StudentCard
                    key={`${student.studentId}-${student.verifiedAt}`}
                    student={student}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Projector Mode Modal ── */}
      {isProjectorOpen && sessionId && (
        <div className="modal-backdrop" onClick={() => setIsProjectorOpen(false)}>
          <div className="modal-content glass-card projector-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.5rem' }}>📽️</span>
                <span style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>Classroom Projector Display</span>
              </div>
              <button
                className="btn btn-sm"
                onClick={() => setIsProjectorOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
                {className}
              </h2>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Faculty: {profile.name} • {profile.department}
              </div>

              {/* Large QR Code */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Classroom QR Code" style={{ width: 280, height: 280, display: 'block' }} />
                ) : (
                  <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Direct Redirect Link */}
              {qrTargetUrl && (
                <div style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Scan with phone camera to open: </span>
                  <a
                    href={qrTargetUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    {qrTargetUrl}
                  </a>
                </div>
              )}

              {/* Instructions */}
              <div style={{ marginTop: 'var(--space-4)', maxWidth: 440, margin: 'var(--space-4) auto 0' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>STEP 1: CONNECT TO CLASSROOM WI-FI</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-blue)', margin: '4px 0' }}>
                    📶 {hotspotSSID}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>STEP 2: SCAN QR WITH PHONE CAMERA OR ENTER PIN</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '4px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {sessionId}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
