/**
 * PWA offline tests — verify core functions work without network connectivity.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { base32Decode, generateTOTP, generateHOTP } from '../totp';
import type { TotpAccount } from '../store';

const mockLocalStorage: Record<string, string> = {};

function mockStorageGetItem(key: string): string | null {
	return mockLocalStorage[key] ?? null;
}
function mockStorageSetItem(key: string, value: string): void {
	mockLocalStorage[key] = value;
}
function mockStorageRemoveItem(key: string): void {
	delete mockLocalStorage[key];
}

beforeEach(() => {
	Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
});

describe('TOTP generation — offline', () => {
	it('generateTOTP produces valid 6-digit code when navigator.onLine is false', async () => {
		const origOnline = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
		Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

		try {
			const result = await generateTOTP('JBSWY3DPEHPK3PXP');
			expect(result.code).toMatch(/^\d{6}$/);
			expect(result.remainingSeconds).toBeGreaterThan(0);
			expect(result.remainingSeconds).toBeLessThanOrEqual(30);
			expect(result.progress).toBeGreaterThan(0);
			expect(result.progress).toBeLessThanOrEqual(1);
		} finally {
			if (origOnline) {
				Object.defineProperty(navigator, 'onLine', origOnline);
			} else {
				Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
			}
		}
	});

	it('generateTOTP via base32Decode works without any API calls', async () => {
		const secret = 'JBSWY3DPEHPK3PXP';
		const decoded = base32Decode(secret);
		expect(decoded).toBeInstanceOf(Uint8Array);
		expect(decoded.length).toBeGreaterThan(0);

		const result = await generateTOTP(secret);
		expect(result.code.length).toBe(6);
	});

	it('generateTOTP returns consistent code within same time step (offline)', async () => {
		const origOnline = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
		Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

		try {
			const secret = 'JBSWY3DPEHPK3PXP';
			const r1 = await generateTOTP(secret);
			const r2 = await generateTOTP(secret);
			expect(r1.code).toBe(r2.code);
		} finally {
			if (origOnline) {
				Object.defineProperty(navigator, 'onLine', origOnline);
			} else {
				Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
			}
		}
	});

	it('generateHOTP produces valid code offline', async () => {
		const origOnline = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
		Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

		try {
			const code = await generateHOTP('JBSWY3DPEHPK3PXP', 0);
			expect(code).toMatch(/^\d{6}$/);
		} finally {
			if (origOnline) {
				Object.defineProperty(navigator, 'onLine', origOnline);
			} else {
				Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
			}
		}
	});
});

describe('Storage — offline', () => {
	it('loadWithoutPin reads from localStorage when offline', async () => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: {
				getItem: mockStorageGetItem,
				setItem: mockStorageSetItem,
				removeItem: mockStorageRemoveItem,
			},
			writable: true,
		});

		const { initializeStorage, saveAccounts, loadWithoutPin } = await import('../storage');

		await initializeStorage();
		await saveAccounts([
			{
				id: 'offline_acc',
				name: 'OfflineService',
				username: 'offline@test.com',
				secret: 'JBSWY3DPEHPK3PXP',
				algorithm: 'SHA1',
				digits: 6,
				period: 30,
				type: 'totp',
				createdAt: 1700000000000,
			} as TotpAccount,
		]);

		const origOnline = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
		Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

		try {
			const loaded = await loadWithoutPin();
			expect(loaded).toHaveLength(1);
			expect(loaded[0].id).toBe('offline_acc');
			expect(loaded[0].name).toBe('OfflineService');
		} finally {
			if (origOnline) {
				Object.defineProperty(navigator, 'onLine', origOnline);
			} else {
				Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
			}
		}
	});

	it('loadWithoutPin returns empty array for empty storage (offline)', async () => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: {
				getItem: mockStorageGetItem,
				setItem: mockStorageSetItem,
				removeItem: mockStorageRemoveItem,
			},
			writable: true,
		});

		const { loadWithoutPin } = await import('../storage');

		const origOnline = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
		Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

		try {
			const result = await loadWithoutPin();
			expect(result).toEqual([]);
		} finally {
			if (origOnline) {
				Object.defineProperty(navigator, 'onLine', origOnline);
			} else {
				Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
			}
		}
	});
});
