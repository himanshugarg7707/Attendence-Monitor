/**
 * RegisterView — WebAuthn passkey registration UI.
 * Students use this to create a new biometric credential.
 */

import { useState } from 'react';
import { useWebAuthn } from '../hooks/useWebAuthn';

interface RegisterViewProps {
  onSuccess?: () => void;
  onBackToSignIn?: () => void;
}

export function RegisterView({ onSuccess, onBackToSignIn }: RegisterViewProps) {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const webauthn = useWebAuthn(studentId);

  const handleRegister = async () => {
    if (!studentId || !studentName || !studentEmail) return;
    const result = await webauthn.register(studentName, studentEmail);
    if (result) {
      setSuccess(true);
      try {
        localStorage.setItem(
          'student_profile',
          JSON.stringify({ id: studentId, name: studentName, email: studentEmail }),
        );
      } catch {
        // Ignore
      }
      if (onSuccess) {
        setTimeout(onSuccess, 1500); // 1.5s delay to see the success message
      }
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="glass-card-header">
        <div
          className="glass-card-icon"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          🔑
        </div>
        <div>
          <div className="glass-card-title">Register Passkey</div>
          <div className="glass-card-desc">
            Create a biometric credential for attendance verification
          </div>
        </div>
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Passkey Registered!
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Your biometric credential has been stored securely.
            <br />
            You can now verify attendance using the Proximity tab.
          </div>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label" htmlFor="register-student-id">Student ID</label>
             <input
              id="register-student-id"
              className="form-input"
              type="text"
              placeholder="e.g. stu-1234"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              className="form-input"
              type="text"
              placeholder="Enter your full name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">University Email</label>
            <input
              id="register-email"
              className="form-input"
              type="email"
              placeholder="student@university.edu"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
            />
          </div>

          {webauthn.error && (
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
              {webauthn.error}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleRegister}
            disabled={webauthn.isAuthenticating || !studentName || !studentEmail}
            id="register-passkey-btn"
          >
            {webauthn.isAuthenticating ? (
              <>
                <span className="spinner" /> Waiting for biometric...
              </>
            ) : (
              <>🔐 Register Passkey</>
            )}
          </button>

          {onBackToSignIn && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onBackToSignIn}
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}
              >
                ← Back to Sign-In Portal
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
