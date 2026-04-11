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
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse, } from '@simplewebauthn/server';
import { CONFIG } from '../config.js';
import { storeCredential, getStudentCredentials, getCredential, updateCredentialCounter, storeChallenge, getAndConsumeChallenge, } from '../store/memory-store.js';
// ─── Known Hardware-Backed AAGUIDs ───────────────────────────────
// These AAGUIDs correspond to authenticators known to use secure
// hardware (TPM, Secure Enclave, StrongBox). This is a subset;
// in production, use the FIDO Metadata Service (MDS).
const HARDWARE_BACKED_AAGUIDS = new Set([
    // Apple iCloud Keychain (Secure Enclave)
    'fbfc3007-154e-4ecc-8c0b-6e020557d7bd',
    // Google Passkey (Android StrongBox/TEE)
    'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4',
    // Windows Hello (TPM)
    '08987058-cadc-4b81-b6e1-30de50dcbe96',
    // YubiKey 5 Series
    'cb69481e-8ff7-4039-93ec-0a2729a154a8',
    'ee882879-721c-4913-9775-3dfcce97072a',
]);
// ─── Registration ────────────────────────────────────────────────
/**
 * Generate WebAuthn registration options for a new student.
 * The student's browser will use these to create a new passkey.
 */
export async function createRegistrationOptions(studentId, studentName, studentEmail) {
    // Get existing credentials to exclude (prevent re-registration)
    const existingCreds = getStudentCredentials(studentId);
    const excludeCredentials = existingCreds.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports,
    }));
    const opts = {
        rpName: CONFIG.RP.name,
        rpID: CONFIG.RP.id,
        userName: studentEmail,
        userDisplayName: studentName,
        // Request direct attestation for hardware verification
        attestationType: CONFIG.ATTESTATION.TYPE,
        authenticatorSelection: {
            // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
            authenticatorAttachment: 'platform',
            // Require user verification (biometric or PIN)
            userVerification: CONFIG.ATTESTATION.USER_VERIFICATION,
            // Create a resident credential (discoverable)
            residentKey: 'preferred',
        },
        excludeCredentials,
    };
    const options = await generateRegistrationOptions(opts);
    // Store the challenge for later verification
    storeChallenge(`reg:${studentId}`, options.challenge, 120_000);
    return options;
}
/**
 * Verify the registration response from the student's browser.
 * Extracts and stores the public key + checks hardware attestation.
 */
export async function verifyRegistration(studentId, response) {
    const expectedChallenge = getAndConsumeChallenge(`reg:${studentId}`);
    if (!expectedChallenge) {
        return { verified: false, isHardwareBacked: false, error: 'Challenge expired or not found' };
    }
    const opts = {
        response,
        expectedChallenge,
        expectedOrigin: CONFIG.RP.origin,
        expectedRPID: CONFIG.RP.id,
        requireUserVerification: true,
    };
    let verification;
    try {
        verification = await verifyRegistrationResponse(opts);
    }
    catch (err) {
        return {
            verified: false,
            isHardwareBacked: false,
            error: `Registration verification failed: ${err.message}`,
        };
    }
    if (!verification.verified || !verification.registrationInfo) {
        return { verified: false, isHardwareBacked: false, error: 'Verification returned false' };
    }
    const { registrationInfo } = verification;
    // ─── Hardware Attestation Check ────────────────────────────
    // Check if the AAGUID indicates a hardware-backed authenticator
    const aaguid = registrationInfo.aaguid;
    const isHardwareBacked = HARDWARE_BACKED_AAGUIDS.has(aaguid);
    // Check the attestation format (tpm, packed with hardware backing, etc.)
    // Note: When attestationType is 'none', fmt will be 'none'
    const fmt = registrationInfo.fmt;
    const hardwareFormats = ['tpm', 'android-key', 'apple'];
    const isHardwareFormat = hardwareFormats.includes(fmt);
    console.log(`[WebAuthn] Registration: AAGUID=${aaguid}, fmt=${fmt}, ` +
        `hwBacked=${isHardwareBacked}, hwFormat=${isHardwareFormat}`);
    // Store the credential
    const credential = {
        credentialId: registrationInfo.credential.id,
        credentialPublicKey: registrationInfo.credential.publicKey,
        counter: registrationInfo.credential.counter,
        isHardwareBacked: isHardwareBacked || isHardwareFormat,
        aaguid,
        transports: response.response.transports,
    };
    storeCredential(studentId, credential);
    return { verified: true, isHardwareBacked: credential.isHardwareBacked };
}
// ─── Authentication (Assertion) ──────────────────────────────────
/**
 * Generate WebAuthn authentication options (challenge).
 * Used when a student wants to verify their attendance.
 */
export async function createAuthenticationOptions(studentId) {
    const existingCreds = getStudentCredentials(studentId);
    if (existingCreds.length === 0) {
        throw new Error(`No credentials found for student ${studentId}. Register first.`);
    }
    const allowCredentials = existingCreds.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports,
    }));
    const opts = {
        rpID: CONFIG.RP.id,
        allowCredentials,
        userVerification: CONFIG.ATTESTATION.USER_VERIFICATION,
    };
    const options = await generateAuthenticationOptions(opts);
    // Store challenge for verification
    storeChallenge(`auth:${studentId}`, options.challenge, 120_000);
    return options;
}
/**
 * Verify the authentication assertion from the student's browser.
 * This confirms the student possesses the private key matching
 * the stored public key, and that biometric verification occurred.
 */
export async function verifyAuthentication(studentId, response) {
    const expectedChallenge = getAndConsumeChallenge(`auth:${studentId}`);
    if (!expectedChallenge) {
        return {
            verified: false,
            userVerified: false,
            isHardwareBacked: false,
            error: 'Authentication challenge expired or not found',
        };
    }
    // Find the credential being used
    const credential = getCredential(response.id);
    if (!credential) {
        return {
            verified: false,
            userVerified: false,
            isHardwareBacked: false,
            error: 'Credential not found. Has this device been registered?',
        };
    }
    const opts = {
        response,
        expectedChallenge,
        expectedOrigin: CONFIG.RP.origin,
        expectedRPID: CONFIG.RP.id,
        requireUserVerification: true,
        credential: {
            id: credential.credentialId,
            publicKey: credential.credentialPublicKey,
            counter: credential.counter,
            transports: credential.transports,
        },
    };
    let verification;
    try {
        verification = await verifyAuthenticationResponse(opts);
    }
    catch (err) {
        return {
            verified: false,
            userVerified: false,
            isHardwareBacked: credential.isHardwareBacked,
            error: `Authentication verification failed: ${err.message}`,
        };
    }
    if (!verification.verified) {
        return {
            verified: false,
            userVerified: false,
            isHardwareBacked: credential.isHardwareBacked,
            error: 'Signature verification failed',
        };
    }
    const { authenticationInfo } = verification;
    // ─── User Verification (UV) Flag Check ─────────────────────
    // Bit 0x04 of authenticator flags = User was Verified
    // This means the authenticator performed biometric/PIN check
    const userVerified = authenticationInfo.userVerified;
    if (!userVerified) {
        return {
            verified: false,
            userVerified: false,
            isHardwareBacked: credential.isHardwareBacked,
            error: 'Biometric verification required — UV (User Verified) flag not set. ' +
                'The authenticator did not confirm user identity.',
        };
    }
    // Update the credential counter (prevents cloning attacks)
    updateCredentialCounter(credential.credentialId, authenticationInfo.newCounter);
    return {
        verified: true,
        userVerified: true,
        isHardwareBacked: credential.isHardwareBacked,
    };
}
//# sourceMappingURL=webauthn.service.js.map