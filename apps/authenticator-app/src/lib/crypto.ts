/**
 * Web Crypto API wrappers for Autional Authenticator
 * - PBKDF2 key derivation (PIN → AES key)
 * - AES-GCM encryption/decryption for account data
 */

const PBKDF2_ITERATIONS = 100_000;

export function arrayBufferToBase64(buffer: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < buffer.byteLength; i++) {
		binary += String.fromCharCode(buffer[i]);
	}
	return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

export async function generateDeviceKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey(
		{ name: 'AES-GCM', length: 256 },
		true, // extractable so we can wrap it with PIN
		['encrypt', 'decrypt'],
	);
}

export async function exportDeviceKey(key: CryptoKey): Promise<Uint8Array> {
	const buf = await crypto.subtle.exportKey('raw', key);
	return new Uint8Array(buf);
}

export async function importDeviceKey(raw: Uint8Array): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		raw as BufferSource,
		'AES-GCM',
		true, // must be extractable: setPinProtection() calls exportDeviceKey() to re-wrap with PIN key
		['encrypt', 'decrypt'],
	);
}

export async function derivePinKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
	const pinData = new TextEncoder().encode(pin);
	const baseKey = await crypto.subtle.importKey('raw', pinData as BufferSource, 'PBKDF2', false, [
		'deriveKey',
	]);
	const algo: Pbkdf2Params = {
		name: 'PBKDF2',
		salt: salt as BufferSource,
		iterations: PBKDF2_ITERATIONS,
		hash: 'SHA-256',
	};
	return crypto.subtle.deriveKey(algo, baseKey, { name: 'AES-GCM', length: 256 }, true, [
		'encrypt',
		'decrypt',
	]);
}

export async function deriveKeyFromBytes(
	keyBytes: Uint8Array,
	salt: Uint8Array,
): Promise<CryptoKey> {
	const baseKey = await crypto.subtle.importKey('raw', keyBytes as BufferSource, 'PBKDF2', false, [
		'deriveKey',
	]);
	const algo: Pbkdf2Params = {
		name: 'PBKDF2',
		salt: salt as BufferSource,
		iterations: 1,
		hash: 'SHA-256',
	};
	return crypto.subtle.deriveKey(algo, baseKey, { name: 'AES-GCM', length: 256 }, true, [
		'encrypt',
		'decrypt',
	]);
}

export async function encryptWithKey(
	plaintext: string,
	key: CryptoKey,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(plaintext);
	const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
	return { ciphertext: new Uint8Array(cipherBuf), iv };
}

export async function decryptWithKey(
	ciphertext: Uint8Array,
	iv: Uint8Array,
	key: CryptoKey,
): Promise<string> {
	const decrypted = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: iv as BufferSource },
		key,
		ciphertext as BufferSource,
	);
	return new TextDecoder().decode(decrypted);
}
