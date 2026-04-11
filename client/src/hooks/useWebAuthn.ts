/**
 * useWebAuthn Hook — Browser-side FIDO2/WebAuthn integration.
 * Uses @simplewebauthn/browser for passkey registration & authentication.
 */

import { useState, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAssertionOptions,
} from '../services/api';

interface WebAuthnState {
  isRegistered: boolean;
  isAuthenticating: boolean;
  error: string | null;
  lastAssertion: unknown | null;
}

export function useWebAuthn(studentId: string) {
  const [state, setState] = useState<WebAuthnState>({
    isRegistered: false,
    isAuthenticating: false,
    error: null,
    lastAssertion: null,
  });

  /**
   * Register a new passkey for this student.
   * Triggers the browser's biometric/PIN prompt.
   */
  const register = useCallback(
    async (studentName: string, studentEmail: string) => {
      setState(prev => ({ ...prev, isAuthenticating: true, error: null }));

      try {
        // 1. Get registration options from server
        const optionsRes = await getRegistrationOptions(studentId, studentName, studentEmail);
        if (!optionsRes.success || !optionsRes.data) {
          throw new Error(optionsRes.error ?? 'Failed to get registration options');
        }

        // 2. Create credential via browser WebAuthn API
        const credential = await startRegistration({ optionsJSON: optionsRes.data as any });

        // 3. Send credential to server for verification
        const verifyRes = await verifyRegistration(studentId, credential);
        if (!verifyRes.success) {
          throw new Error(verifyRes.error ?? 'Registration verification failed');
        }

        setState(prev => ({
          ...prev,
          isRegistered: true,
          isAuthenticating: false,
        }));

        return true;
      } catch (err) {
        setState(prev => ({
          ...prev,
          isAuthenticating: false,
          error: `Registration failed: ${(err as Error).message}`,
        }));
        return false;
      }
    },
    [studentId],
  );

  /**
   * Authenticate with an existing passkey.
   * Returns the signed assertion for attendance verification.
   */
  const authenticate = useCallback(async () => {
    setState(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      // 1. Get authentication options (challenge) from server
      const optionsRes = await getAssertionOptions(studentId);
      if (!optionsRes.success || !optionsRes.data) {
        throw new Error(optionsRes.error ?? 'Failed to get authentication options');
      }

      // 2. Sign the challenge via browser WebAuthn API
      const assertion = await startAuthentication({ optionsJSON: optionsRes.data as any });

      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        lastAssertion: assertion,
      }));

      return assertion;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        error: `Authentication failed: ${(err as Error).message}`,
      }));
      return null;
    }
  }, [studentId]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    register,
    authenticate,
    clearError,
  };
}
