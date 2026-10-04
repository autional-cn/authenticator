import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Html5Qrcode } from 'html5-qrcode';
import {
	isOtpauthMigrationUri,
	parseOtpauthMigration,
	type MigratedAccount,
} from '@/lib/otpauth-migration';
import { parseAutionalLoginUri } from '@/lib/login-approve';

interface ScanResult {
	secret: string;
	name: string;
	username: string;
	algorithm: 'SHA1' | 'SHA256' | 'SHA512';
	digits: number;
	period: number;
}

export interface LoginScanResult {
	token: string;
	numberMatching?: string;
}

interface QrScannerProps {
	onScan: (result: ScanResult) => void;
	onMigration?: (accounts: MigratedAccount[]) => void;
	onScanLogin?: (result: LoginScanResult) => void;
	onError?: (error: string) => void;
	/** 降级出路：一键切手动输入（无摄像头/拒权/引擎 hang 时展示） */
	onManualFallback?: () => void;
}

/** 摄像头启动超时护栏（ms）：引擎 hang 时 ≤ 此时间退出 spinner 进入诚实错误态。audit 观察 5s+ 永转；8s 防慢机型误杀。 */
export const SCANNER_START_TIMEOUT_MS = 8000;

/** 错误 → 本地化文案映射（兜底终止英文/技术文案外泄）。 */
function mapCameraError(err: unknown, t: TFunction): string {
	const msg = err instanceof Error ? err.message : String(err);
	if (msg === 'scanner-start-timeout') return t('qr.cameraTimeout');
	if (/permission|notallowed|denied/i.test(msg)) return t('qr.cameraPermissionDenied');
	if (/notfound|no camera|not found/i.test(msg)) return t('qr.noCamera');
	return t('qr.cameraFailed');
}

export default function QrScanner({ onScan, onMigration, onScanLogin, onError, onManualFallback }: QrScannerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [hasCamera, setHasCamera] = useState(true);
	const { t } = useTranslation();

	// 回调经 ref 保存最新引用：摄像头 scanner.start 是重操作，effect 只启动一次，
	// 避免父组件每次渲染新建回调导致 scanner 反复 stop/start（循环重启摄像头）。
	const callbacksRef = useRef({ onScan, onMigration, onScanLogin, onError, t });
	useEffect(() => {
		callbacksRef.current = { onScan, onMigration, onScanLogin, onError, t };
	});

	useEffect(() => {
		let cancelled = false;

		async function stopScanner() {
			if (scannerRef.current) {
				try {
					await scannerRef.current.stop();
				} catch {
					// ignore
				}
				scannerRef.current = null;
			}
		}

		async function startScanner() {
			try {
				const { Html5Qrcode } = await import('html5-qrcode');
				if (cancelled || !containerRef.current) return;

				const scannerId = 'qr-scanner-region';
				// Create inner div for scanner
				const scannerDiv = document.createElement('div');
				scannerDiv.id = scannerId;
				scannerDiv.style.width = '100%';
				scannerDiv.style.height = '100%';
				scannerDiv.style.borderRadius = '12px';
				scannerDiv.style.overflow = 'hidden';
				containerRef.current.innerHTML = '';
				containerRef.current.appendChild(scannerDiv);

				const scanner = new Html5Qrcode(scannerId);
				scannerRef.current = scanner;

				// AU-04：超时竞速 —— scanner.start 是重操作，无摄像头/引擎 hang 时可能永不 settle，
				// 竞速 reject（'scanner-start-timeout'）落回 catch 走诚实错误态 + 手动输入出路。
				await Promise.race([
					scanner.start(
						{ facingMode: 'environment' },
						{
							fps: 10,
							qrbox: { width: 200, height: 200 },
						},
						(decodedText: string) => {
							const cb = callbacksRef.current;
							if (isOtpauthMigrationUri(decodedText)) {
								const accounts = parseOtpauthMigration(decodedText);
								if (accounts.length > 0) {
									cb.onMigration?.(accounts);
									void stopScanner();
								} else {
									cb.onError?.(cb.t('qr.migrationParseError'));
								}
								return;
							}
							const parsed = parseOtpAuthUrl(decodedText);
							if (parsed) {
								cb.onScan(parsed);
								void stopScanner();
								return;
							}
							const loginChallenge = parseAutionalLoginUri(decodedText);
							if (loginChallenge) {
								cb.onScanLogin?.(loginChallenge);
								void stopScanner();
								return;
							}
							cb.onError?.(cb.t('qr.unrecognized'));
						},
						() => {
							// QR scan error (no QR in frame) — ignore
						},
					),
					new Promise<never>((_, reject) =>
						setTimeout(
							() => reject(new Error('scanner-start-timeout')),
							SCANNER_START_TIMEOUT_MS,
						),
					),
				]);

				if (!cancelled) {
					setIsLoading(false);
				}
			} catch (err) {
				if (!cancelled) {
					// 先停底层（防超时后晚到的初始化把摄像头留在运行态），再置诚实错误态
					void stopScanner();
					setError(mapCameraError(err, callbacksRef.current.t));
					setHasCamera(false);
					setIsLoading(false);
				}
			}
		}

		startScanner();

		return () => {
			cancelled = true;
			void stopScanner();
		};
	}, []);

	if (error || !hasCamera) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl bg-auth-surface border border-auth-border py-10 text-center">
				<Camera className="mb-3 h-10 w-10 text-[var(--color-text-muted)]" />
				<p className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">{t('qr.noCamera')}</p>
				<p className="max-w-[240px] text-xs text-[var(--color-text-muted)]">{error}</p>
				{onManualFallback && (
					<button
						type="button"
						onClick={onManualFallback}
						className="mt-4 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-500"
					>
						{t('qr.manualFallback')}
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="relative aspect-square w-full overflow-hidden rounded-xl border border-auth-border bg-black">
			<div ref={containerRef} className="h-full w-full" />
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/80">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
				</div>
			)}
			{/* Scan overlay */}
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div className="relative h-[200px] w-[200px]">
					<div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-primary-500" />
					<div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-primary-500" />
					<div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-primary-500" />
					<div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-primary-500" />
				</div>
			</div>
			<p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
				{t('qr.scanHint')}
			</p>
		</div>
	);
}

/**
 * Parse otpauth:// URL into account fields.
 * Format: otpauth://totp/{issuer}:{account}?secret=...&issuer=...&algorithm=...&digits=...&period=...
 */
function parseOtpAuthUrl(url: string): ScanResult | null {
	if (!url.startsWith('otpauth://')) return null;

	try {
		const parsed = new URL(url);
		const secret = parsed.searchParams.get('secret');
		if (!secret) return null;

		const path = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
		let issuer = parsed.searchParams.get('issuer') || '';
		let username = '';

		const colonIndex = path.indexOf(':');
		if (colonIndex > 0) {
			issuer = issuer || path.slice(0, colonIndex);
			username = path.slice(colonIndex + 1);
		} else {
			username = path;
		}

		const rawAlg = (parsed.searchParams.get('algorithm') || 'SHA1').toUpperCase();
		const algorithm = (rawAlg === 'SHA256' || rawAlg === 'SHA512' ? rawAlg : 'SHA1') as
			| 'SHA1'
			| 'SHA256'
			| 'SHA512';
		const digits = parseInt(parsed.searchParams.get('digits') || '6', 10);
		const period = parseInt(parsed.searchParams.get('period') || '30', 10);

		return {
			secret: secret.replace(/\s/g, '').toUpperCase(),
			name: issuer || 'Unknown',
			username: username || 'Unknown',
			algorithm,
			digits,
			period,
		};
	} catch {
		return null;
	}
}
