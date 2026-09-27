/**
 * Autional Authenticator — WebAuthn / Biometric Unlock
 *
 * Provides fingerprint / Face ID unlock as an alternative to PIN.
 * Uses platform authenticator (Touch ID, Face ID, Windows Hello).
 * Supports PRF (hmacGetSecret) extension for key derivation.
 */

const WEBAUTHN_RP_NAME = 'Autional Authenticator';
const WEBAUTHN_RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const STORAGE_KEY = 'authms_webauthn_credential_id';
const PRF_SALT_KEY = 'authms_webauthn_prf_salt';

/** PRF (hmacGetSecret) 扩展：WebAuthn 标准类型未覆盖，按 W3C PRF 扩展规范定义 */
interface PRFExtension {
	prf: { eval: { first: Uint8Array } };
}

/** PRF 扩展的客户端输出结果（getClientExtensionResults 返回） */
interface PRFExtensionOutput {
	prf?: { results?: { first?: ArrayBuffer } };
}

export function isWebAuthnSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.PublicKeyCredential !== undefined &&
		typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
	);
}

export function isPRFSupported(): boolean {
	try {
		return (
			typeof window !== 'undefined' &&
			typeof PublicKeyCredential !== 'undefined' &&
			'getClientExtensionResults' in PublicKeyCredential.prototype
		);
	} catch {
		return false;
	}
}

export async function isBiometricAvailable(): Promise<boolean> {
	if (!isWebAuthnSupported()) return false;
	try {
		return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
	} catch {
		return false;
	}
}

function generatePRFSalt(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(32));
}

function getStoredPRFSalt(): Uint8Array | null {
	try {
		const stored = localStorage.getItem(PRF_SALT_KEY);
		if (!stored) return null;
		const raw = atob(stored);
		return new Uint8Array(raw.length).map((_, i) => raw.charCodeAt(i));
	} catch {
		return null;
	}
}

function storePRFSalt(salt: Uint8Array): void {
	const binary = String.fromCharCode(...Array.from(salt));
	localStorage.setItem(PRF_SALT_KEY, btoa(binary));
}

export async function registerBiometric(): Promise<boolean> {
	if (!isWebAuthnSupported()) return false;

	try {
		const challenge = crypto.getRandomValues(new Uint8Array(32));
		const userId = crypto.getRandomValues(new Uint8Array(16));
		const usePRF = isPRFSupported();
		const prfSalt = usePRF ? generatePRFSalt() : null;

		const publicKey: PublicKeyCredentialCreationOptions = {
			challenge,
			rp: { name: WEBAUTHN_RP_NAME, id: WEBAUTHN_RP_ID },
			user: { id: userId, name: 'authms-user', displayName: 'Autional User' },
			pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
			authenticatorSelection: {
				authenticatorAttachment: 'platform',
				userVerification: 'required',
				residentKey: usePRF ? 'required' : 'discouraged',
			},
			attestation: 'none',
		};

		if (usePRF && prfSalt) {
			(publicKey as PublicKeyCredentialCreationOptions & { extensions: PRFExtension }).extensions =
				{
					prf: { eval: { first: prfSalt } },
				};
		}

		const credential = await navigator.credentials.create({ publicKey });
		if (!credential) return false;

		const cred = credential as PublicKeyCredential;
		localStorage.setItem(STORAGE_KEY, cred.id);

		if (usePRF && prfSalt) {
			storePRFSalt(prfSalt);
		}

		return true;
	} catch (err) {
		console.error('WebAuthn registration failed:', err);
		return false;
	}
}

export async function verifyBiometric(): Promise<Uint8Array | null> {
	if (!isWebAuthnSupported()) return null;

	const credentialId = localStorage.getItem(STORAGE_KEY);
	if (!credentialId) return null;

	try {
		const challenge = crypto.getRandomValues(new Uint8Array(32));
		const prfSalt = getStoredPRFSalt();

		const publicKey: PublicKeyCredentialRequestOptions = {
			challenge,
			rpId: WEBAUTHN_RP_ID,
			allowCredentials: [
				{
					id: Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
						c.charCodeAt(0),
					),
					type: 'public-key',
				},
			],
			userVerification: 'required',
		};

		if (prfSalt) {
			(publicKey as PublicKeyCredentialRequestOptions & { extensions: PRFExtension }).extensions = {
				prf: { eval: { first: prfSalt } },
			};
		}

		const assertion = await navigator.credentials.get({ publicKey });
		if (!assertion) return null;

		if (prfSalt) {
			const extResults = (
				assertion as PublicKeyCredential
			).getClientExtensionResults() as AuthenticationExtensionsClientOutputs & PRFExtensionOutput;
			const prfResult = extResults?.prf?.results?.first;
			if (prfResult instanceof ArrayBuffer) {
				return new Uint8Array(prfResult);
			}
		}

		// Non-PRF path: return proof-of-presence (no key derivation)
		return new Uint8Array(0);
	} catch (err) {
		console.error('WebAuthn verification failed:', err);
		return null;
	}
}

export function getBiometricKey(): Uint8Array | null {
	// To be used with verifyBiometric() result
	// The caller should call verifyBiometric() and use the returned key
	return null;
}

export function hasBiometricRegistered(): boolean {
	if (typeof window === 'undefined') return false;
	return !!localStorage.getItem(STORAGE_KEY);
}

export function hasPRFEnabled(): boolean {
	if (typeof window === 'undefined') return false;
	return !!localStorage.getItem(PRF_SALT_KEY);
}

export function clearBiometric(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(PRF_SALT_KEY);
}
