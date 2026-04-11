/**
 * ═══════════════════════════════════════════════════════════════════
 *  WebAuthn / FIDO2 Service
 *
 *  Handles passkey registration and authentication using
 *  @simplewebauthn/server. Includes Hardware Attestation checks
 *  to verify biometric signatures originate from a secure enclave
 *  (TPM), preventing software-level fingerprint spoofing.
 * ═══════════════════════════════════════════════════════════════════
 */
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types';
/**
 * Generate WebAuthn registration options for a new student.
 * The student's browser will use these to create a new passkey.
 */
export declare function createRegistrationOptions(studentId: string, studentName: string, studentEmail: string): Promise<import("@simplewebauthn/types").PublicKeyCredentialCreationOptionsJSON>;
/**
 * Verify the registration response from the student's browser.
 * Extracts and stores the public key + checks hardware attestation.
 */
export declare function verifyRegistration(studentId: string, response: RegistrationResponseJSON): Promise<{
    verified: boolean;
    isHardwareBacked: boolean;
    error?: string;
}>;
/**
 * Generate WebAuthn authentication options (challenge).
 * Used when a student wants to verify their attendance.
 */
export declare function createAuthenticationOptions(studentId: string): Promise<import("@simplewebauthn/types").PublicKeyCredentialRequestOptionsJSON>;
/**
 * Verify the authentication assertion from the student's browser.
 * This confirms the student possesses the private key matching
 * the stored public key, and that biometric verification occurred.
 */
export declare function verifyAuthentication(studentId: string, response: AuthenticationResponseJSON): Promise<{
    verified: boolean;
    userVerified: boolean;
    isHardwareBacked: boolean;
    error?: string;
}>;
//# sourceMappingURL=webauthn.service.d.ts.map