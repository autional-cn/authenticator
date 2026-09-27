import type { LoginScanResult } from '@/components/QrScanner';

export interface LoginChallengeStatus {
	status: string;
	number_matching?: string;
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
}

export function parseAutionalLoginUri(url: string): LoginScanResult | null {
	try {
		const parsed = new URL(
			url.startsWith('authms://') ? url.replace('authms://', 'https://') : url,
		);
		const token = parsed.searchParams.get('token') || parsed.searchParams.get('session_token');
		if (!token) return null;
		return { token, numberMatching: parsed.searchParams.get('nm') || undefined };
	} catch {
		return null;
	}
}

export { LoginScanResult };
