/**
 * ═══════════════════════════════════════════════════════════════
 *  App — Root Application Component
 *
 *  Role Segregation Architecture:
 *  1. Access Gate: Users enter Campus ID at the Sign-In Portal.
 *  2. Role Check: If the ID string contains "faculty" (or starts with fac/prof),
 *     segregated to FACULTY WORKSPACE. Otherwise, segregated to STUDENT TERMINAL.
 *  3. Strict Role Isolation: Faculty sees only session management,
 *     hotspot broadcast, radar, live roster, and Excel export.
 *     Students see only attendance rate, date-wise history, and 1-tap punch.
 *  4. Instant Sign Out: Quick switch to return to the sign-in portal.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { SignInPortal } from './components/SignInPortal';
import { FacultyView } from './components/FacultyView';
import { StudentAttendView } from './components/StudentAttendView';
import { RegisterView } from './components/RegisterView';
import type { CampusAuthUser } from './types';

function getStoredAuthUser(): CampusAuthUser | null {
  try {
    const saved = localStorage.getItem('campus_auth_session');
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore
  }
  return null;
}

export function App() {
  const [user, setUser] = useState<CampusAuthUser | null>(getStoredAuthUser());
  const [isRegistering, setIsRegistering] = useState(false);

  // Extract session & hotspot query parameters from QR code scan
  const [urlSession] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('session');
  });
  const [urlHotspot] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('hotspot');
  });
  const [urlToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('token');
  });

  const handleSignIn = (authenticatedUser: CampusAuthUser) => {
    setUser(authenticatedUser);
    setIsRegistering(false);
    try {
      localStorage.setItem('campus_auth_session', JSON.stringify(authenticatedUser));
    } catch {
      // Ignore
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setIsRegistering(false);
    try {
      localStorage.removeItem('campus_auth_session');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="app-container">
      {/* ── Top Header ── */}
      <header className="app-header" style={{ marginBottom: user ? 'var(--space-6)' : 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 className="app-title">Campus Attendance</h1>
          </div>

          {/* User Status Bar when Authenticated */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {user.name} <span style={{ color: 'var(--text-muted)' }}>({user.id})</span>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleSignOut}
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '4px 10px',
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Segregated Views ── */}
      <main>
        {/* Unauthenticated State: Sign In Portal or Passkey Registration */}
        {!user && (
          <div>
            {isRegistering ? (
              <RegisterView
                onSuccess={() => setIsRegistering(false)}
                onBackToSignIn={() => setIsRegistering(false)}
              />
            ) : (
              <SignInPortal
                onSignIn={handleSignIn}
                onOpenRegister={() => setIsRegistering(true)}
              />
            )}
          </div>
        )}

        {/* Authenticated State — Strictly segregated */}
        {user && user.role === 'faculty' && (
          <FacultyView currentUser={user} />
        )}

        {user && user.role === 'student' && (
          <div>
            {isRegistering ? (
              <RegisterView
                onSuccess={() => setIsRegistering(false)}
                onBackToSignIn={() => setIsRegistering(false)}
              />
            ) : (
              <StudentAttendView
                currentUser={user}
                initialSessionId={urlSession}
                initialHotspotSSID={urlHotspot}
                initialToken={urlToken}
                onOpenRegister={() => setIsRegistering(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          textAlign: 'center',
          marginTop: 'var(--space-12)',
          paddingBottom: 'var(--space-8)',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        <div>Campus Attendance System</div>
      </footer>
    </div>
  );
}

export default App;
