import { describe, it, expect } from 'vitest';
import { base32Decode, generateTOTP, generateHOTP, validateSecret } from './totp';

describe('base32Decode', () => {
	it('decodes a standard base32 string', () => {
		const result = base32Decode('JBSWY3DPEHPK3PXP');
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(0);
	});

	it('ignores lowercase and whitespace', () => {
		const result1 = base32Decode('jbswy3dpehpk3pxp');
		const result2 = base32Decode('JBSWY 3DPE HPK3 PXP');
		expect(result1).toEqual(result2);
	});

	it('handles empty string', () => {
		const result = base32Decode('');
		expect(result.length).toBe(0);
	});
});

describe('generateTOTP', () => {
	it('generates a 6-digit code for a valid secret', async () => {
		const result = await generateTOTP('JBSWY3DPEHPK3PXP');
		expect(result.code).toMatch(/^\d{6}$/);
		expect(result.remainingSeconds).toBeGreaterThan(0);
		expect(result.remainingSeconds).toBeLessThanOrEqual(30);
		expect(result.progress).toBeGreaterThan(0);
		expect(result.progress).toBeLessThanOrEqual(1);
	});

	it('generates consistent code within same time step', async () => {
		const secret = 'JBSWY3DPEHPK3PXP';
		const result1 = await generateTOTP(secret);
		const result2 = await generateTOTP(secret);
		expect(result1.code).toBe(result2.code);
	});

	it('supports custom digits and period', async () => {
		const result = await generateTOTP('JBSWY3DPEHPK3PXP', 60, 8);
		expect(result.code).toMatch(/^\d{8}$/);
	});

	it('supports SHA256 algorithm', async () => {
		const result = await generateTOTP('JBSWY3DPEHPK3PXP', 30, 6, 'SHA256');
		expect(result.code).toMatch(/^\d{6}$/);
	});

	it('supports SHA512 algorithm', async () => {
		const result = await generateTOTP('JBSWY3DPEHPK3PXP', 30, 6, 'SHA512');
		expect(result.code).toMatch(/^\d{6}$/);
	});

	it('SHA1 and SHA256 produce different codes with same inputs', async () => {
		const sha1 = await generateTOTP('JBSWY3DPEHPK3PXP', 30, 6, 'SHA1');
		const sha256 = await generateTOTP('JBSWY3DPEHPK3PXP', 30, 6, 'SHA256');
		expect(sha1.code).not.toBe(sha256.code);
	});

	it('ignores unrecognized algorithm name and falls back to SHA1', async () => {
		const result = await generateTOTP('JBSWY3DPEHPK3PXP', 30, 6, 'UNKNOWN');
		expect(result.code).toMatch(/^\d{6}$/);
	});

	it('returns correct timing info', async () => {
		const result = await generateTOTP('JBSWY3DPEHPK3PXP');
		expect(result.remainingSeconds + (Math.floor(Date.now() / 1000) % 30)).toBe(30);
	});
});

describe('validateSecret', () => {
	it('returns true for a valid base32 secret', async () => {
		const valid = await validateSecret('JBSWY3DPEHPK3PXP');
		expect(valid).toBe(true);
	});

	it('returns false for invalid characters', async () => {
		const result = await validateSecret('INVALID1!@#');
		expect(result).toBe(false);
	});

	it('returns false for too short secret', async () => {
		const valid = await validateSecret('JBSWY3DP');
		expect(valid).toBe(false);
	});

	it('returns false for empty string', async () => {
		const valid = await validateSecret('');
		expect(valid).toBe(false);
	});

	it('returns false for whitespace-only string', async () => {
		const valid = await validateSecret('   ');
		expect(valid).toBe(false);
	});
});

describe('generateHOTP', () => {
	it('RFC 4226 test vector — counter 0', async () => {
		const code = await generateHOTP('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 0, 6, 'SHA1');
		expect(code).toBe('755224');
	});

	it('RFC 4226 test vector — counter 1', async () => {
		const code = await generateHOTP('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1, 6, 'SHA1');
		expect(code).toBe('287082');
	});

	it('RFC 4226 test vector — counter 2', async () => {
		const code = await generateHOTP('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 2, 6, 'SHA1');
		expect(code).toBe('359152');
	});
	it('generates a 6-digit code', async () => {
		const code = await generateHOTP('JBSWY3DPEHPK3PXP', 0);
		expect(code).toMatch(/^\d{6}$/);
	});

	it('different counters produce different codes', async () => {
		const code0 = await generateHOTP('JBSWY3DPEHPK3PXP', 0);
		const code1 = await generateHOTP('JBSWY3DPEHPK3PXP', 1);
		expect(code0).not.toBe(code1);
	});

	it('supports SHA256 algorithm', async () => {
		const code = await generateHOTP('JBSWY3DPEHPK3PXP', 0, 6, 'SHA256');
		expect(code).toMatch(/^\d{6}$/);
	});

	it('supports 8-digit codes', async () => {
		const code = await generateHOTP('JBSWY3DPEHPK3PXP', 0, 8);
		expect(code).toMatch(/^\d{8}$/);
	});

	it('same inputs produce consistent code', async () => {
		const code1 = await generateHOTP('JBSWY3DPEHPK3PXP', 5, 6, 'SHA1');
		const code2 = await generateHOTP('JBSWY3DPEHPK3PXP', 5, 6, 'SHA1');
		expect(code1).toBe(code2);
	});
});
