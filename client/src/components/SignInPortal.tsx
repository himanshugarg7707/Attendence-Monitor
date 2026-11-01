/**
 * ═══════════════════════════════════════════════════════════════
 *  SignInPortal — Institutional Sign-In
 *
 *  Clean, standard login screen:
 *  - User enters their ID
 *  - System routes them to their portal (faculty if ID contains 'faculty', else student)
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import type { CampusAuthUser } from '../types';

interface SignInPortalProps {
  onSignIn: (user: CampusAuthUser) => void;
  onOpenRegister: () => void;
}

export function isFacultyId(id: string): boolean {
  if (!id) return false;
  const lower = id.trim().toLowerCase();
  return lower.includes('faculty') || lower.startsWith('fac') || lower.startsWith('prof');
}

export function SignInPortal({ onSignIn, onOpenRegister }: SignInPortalProps) {
  const [campusId, setCampusId] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sessionFromUrl = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('session')
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = campusId.trim();
    if (!trimmedId) {
      setError('Please enter your Institutional ID or Roll Number.');
      return;
    }

    const isFaculty = isFacultyId(trimmedId);
    const role: 'faculty' | 'student' = isFaculty ? 'faculty' : 'student';
    const defaultName = isFaculty ? 'Faculty Instructor' : 'Student';
    const finalName = fullName.trim() || defaultName;

    onSignIn({
      id: trimmedId,
      name: finalName,
      role,
      department: isFaculty ? 'Computer Science & Engineering' : 'Undergraduate Program',
    });
  };

  return (
    <div style={{ maxWidth: '440px', margin: 'var(--space-8) auto' }}>
      <div className="glass-card" style={{ padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Sign In
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
            Campus Attendance System
          </p>
        </div>

        {sessionFromUrl && (
          <div
            style={{
              padding: '6px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--accent-blue)',
              textAlign: 'center',
              marginBottom: 'var(--space-4)',
            }}
          >
            Scanned classroom QR • Session #{sessionFromUrl}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: 'var(--font-size-xs)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="portal-campus-id">
              Institutional ID / Roll Number
            </label>
            <input
              id="portal-campus-id"
              className="form-input"
              type="text"
              autoFocus
              placeholder="e.g. Roll No or Faculty ID"
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="form-label" htmlFor="portal-full-name">
              Full Name <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              id="portal-full-name"
              className="form-input"
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 600,
            }}
          >
            Sign In
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onOpenRegister}
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            First time student? Register passkey
          </button>
        </div>
      </div>
    </div>
  );
}
