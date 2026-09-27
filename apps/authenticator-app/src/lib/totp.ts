/**
 * TOTP (Time-based One-Time Password) generator
 * Implements RFC 6238 using Web Crypto API
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode a Base32 string to Uint8Array
 */
export function base32Decode(input: string): Uint8Array {
	const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
	const output: number[] = [];
	let bits = 0;
	let value = 0;

	for (const char of cleaned) {
		value = (value << 5) | BASE32_ALPHABET.indexOf(char);
		bits += 5;
		if (bits >= 8) {
			output.push((value >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}

	return new Uint8Array(output);
}

/**
 * Convert a counter number to an 8-byte big-endian buffer
 */
function counterToBytes(counter: number): Uint8Array {
	const buf = new ArrayBuffer(8);
	const view = new DataView(buf);
	view.setBigUint64(0, BigInt(counter), false);
	return new Uint8Array(buf);
}

const ALGORITHM_MAP: Record<string, 'SHA-1' | 'SHA-256' | 'SHA-512'> = {
	SHA1: 'SHA-1',
	SHA256: 'SHA-256',
	SHA512: 'SHA-512',
};

async function hmac(
	key: Uint8Array,
	message: Uint8Array,
	hashName: 'SHA-1' | 'SHA-256' | 'SHA-512',
): Promise<Uint8Array> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key as BufferSource,
		{ name: 'HMAC', hash: hashName },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, message as BufferSource);
	return new Uint8Array(signature);
}

export interface TOTPResult {
	code: string;
	remainingSeconds: number;
	progress: number;
}

export async function generateTOTP(
	secret: string,
	period = 30,
	digits = 6,
	algorithm = 'SHA1',
): Promise<TOTPResult> {
	const hashName = ALGORITHM_MAP[algorithm] || 'SHA-1';
	const key = base32Decode(secret);
	const now = Math.floor(Date.now() / 1000);
	const counter = Math.floor(now / period);
	const remainingSeconds = period - (now % period);
	const progress = remainingSeconds / period;

	const msg = counterToBytes(counter);
	const hash = await hmac(key, msg, hashName);

	const offset = hash[hash.length - 1] & 0x0f;
	const binary =
		((hash[offset] & 0x7f) << 24) |
		((hash[offset + 1] & 0xff) << 16) |
		((hash[offset + 2] & 0xff) << 8) |
		(hash[offset + 3] & 0xff);

	const otp = binary % Math.pow(10, digits);
	const code = otp.toString().padStart(digits, '0');

	return { code, remainingSeconds, progress };
}

export async function generateHOTP(
	secret: string,
	counter: number,
	digits = 6,
	algorithm = 'SHA1',
): Promise<string> {
	const hashName = ALGORITHM_MAP[algorithm] || 'SHA-1';
	const key = base32Decode(secret);
	const msg = counterToBytes(counter);
	const hash = await hmac(key, msg, hashName);

	const offset = hash[hash.length - 1] & 0x0f;
	const binary =
		((hash[offset] & 0x7f) << 24) |
		((hash[offset + 1] & 0xff) << 16) |
		((hash[offset + 2] & 0xff) << 8) |
		(hash[offset + 3] & 0xff);

	const otp = binary % Math.pow(10, digits);
	return otp.toString().padStart(digits, '0');
}

/**
 * Validate that a secret contains only valid Base32 characters
 * and can produce a valid TOTP.
 */
export async function validateSecret(secret: string): Promise<boolean> {
	const cleaned = secret.replace(/\s/g, '').toUpperCase();
	if (cleaned.length === 0) return false;
	// Must contain only A-Z and 2-7
	if (!/^[A-Z2-7]+$/.test(cleaned)) return false;
	// Must be at least 16 chars (128 bits) for reasonable security
	if (cleaned.length < 16) return false;
	try {
		const result = await generateTOTP(secret);
		return result.code.length === 6 && /^\d{6}$/.test(result.code);
	} catch {
		return false;
	}
}
