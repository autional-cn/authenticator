import { describe, it, expect } from 'vitest';
import { parseOtpauthMigration, isOtpauthMigrationUri } from './otpauth-migration';

/**
 * Build a minimal otpauth-migration URI for testing.
 *
 * We encode a simple Payload with one MigrationOtp:
 *   secret = bytes [0x01, 0x02, 0x03, 0x04, 0x05]
 *   name   = "Test"
 *   issuer = "Example"
 *   algorithm = SHA1 (1)
 *   digits = 6 (1)
 *   type = TOTP (2)
 */
function buildMigrationUri(): string {
	// MigrationOtp protobuf bytes
	const otpParts: number[] = [];

	// field 1 (secret): wire 2, length 5, bytes [1,2,3,4,5]
	otpParts.push(0x0a, 0x05, 0x01, 0x02, 0x03, 0x04, 0x05);
	// field 2 (name): wire 2, length 4, "Test"
	otpParts.push(0x12, 0x04, 0x54, 0x65, 0x73, 0x74);
	// field 3 (issuer): wire 2, length 7, "Example"
	otpParts.push(0x1a, 0x07, 0x45, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65);
	// field 4 (algorithm): wire 0, varint 1 (SHA1)
	otpParts.push(0x20, 0x01);
	// field 5 (digits): wire 0, varint 1 (6 digits)
	otpParts.push(0x28, 0x01);
	// field 6 (type): wire 0, varint 2 (TOTP)
	otpParts.push(0x30, 0x02);

	const otpBytes = new Uint8Array(otpParts);

	// Payload protobuf bytes: field 1, wire 2, length = otpBytes.length
	const payloadLen = otpBytes.length;
	const payloadParts: number[] = [0x0a];
	// encode varint for payloadLen
	let n = payloadLen;
	while (n >= 0x80) {
		payloadParts.push((n & 0x7f) | 0x80);
		n >>>= 7;
	}
	payloadParts.push(n);

	const payload = new Uint8Array(payloadParts.length + otpBytes.length);
	payload.set(new Uint8Array(payloadParts), 0);
	payload.set(otpBytes, payloadParts.length);

	// base64url encode
	let binary = '';
	for (let i = 0; i < payload.length; i++) {
		binary += String.fromCharCode(payload[i]);
	}
	const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	return `otpauth-migration://offline?data=${b64}`;
}

describe('otpauth-migration parser', () => {
	it('detects migration URI', () => {
		expect(isOtpauthMigrationUri('otpauth-migration://offline?data=abc')).toBe(true);
		expect(isOtpauthMigrationUri('otpauth://totp/Example:user@example.com')).toBe(false);
	});

	it('parses a single-account migration payload', () => {
		const uri = buildMigrationUri();
		const accounts = parseOtpauthMigration(uri);

		expect(accounts).toHaveLength(1);
		expect(accounts[0].name).toBe('Example');
		expect(accounts[0].issuer).toBe('Example');
		expect(accounts[0].algorithm).toBe('SHA1');
		expect(accounts[0].digits).toBe(6);
		expect(accounts[0].period).toBe(30);
		expect(accounts[0].secret).toBeTruthy();
	});

	it('returns empty array for invalid URI', () => {
		expect(parseOtpauthMigration('not-a-uri')).toHaveLength(0);
		expect(parseOtpauthMigration('otpauth-migration://offline?data=!!!')).toHaveLength(0);
	});

	it('returns empty array for standard otpauth URI', () => {
		const uri = 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
		expect(parseOtpauthMigration(uri)).toHaveLength(0);
	});
});
