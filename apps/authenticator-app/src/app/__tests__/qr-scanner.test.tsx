import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * AU-04 回归锁：QR 扫描降级出路 ——
 * hang ≤ SCANNER_START_TIMEOUT_MS 内退出 spinner；错误文案全本地化；CTA 一键手动输入。
 */
const mockStart = vi.fn();
const mockStop = vi.fn();
vi.mock('html5-qrcode', () => ({
	Html5Qrcode: class {
		start(...args: unknown[]) {
			return mockStart(...args);
		}
		stop() {
			return mockStop();
		}
	},
}));

import QrScanner, { SCANNER_START_TIMEOUT_MS } from '../../components/QrScanner';

async function flushAsync() {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mockStop.mockResolvedValue(undefined);
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('QrScanner 降级出路 (AU-04)', () => {
	it('T1 start 永不 settle（hang）→ 超时后 spinner 消失、本地化超时文案、CTA 可见', async () => {
		mockStart.mockImplementation(() => new Promise(() => {}));
		render(<QrScanner onScan={vi.fn()} onManualFallback={vi.fn()} />);
		await flushAsync();

		expect(document.querySelector('.animate-spin')).not.toBeNull();

		await act(async () => {
			await vi.advanceTimersByTimeAsync(SCANNER_START_TIMEOUT_MS);
		});

		expect(document.querySelector('.animate-spin')).toBeNull();
		expect(screen.getByText('摄像头启动超时。可改用手动输入添加账户')).toBeInTheDocument();
		expect(screen.getByText('改用手动输入')).toBeInTheDocument();
	});

	it('T2 CTA 点击 → onManualFallback 被调（真实出路）', async () => {
		mockStart.mockImplementation(() => new Promise(() => {}));
		const onManualFallback = vi.fn();
		render(<QrScanner onScan={vi.fn()} onManualFallback={onManualFallback} />);
		await flushAsync();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(SCANNER_START_TIMEOUT_MS);
		});

		await act(async () => {
			fireEvent.click(screen.getByText('改用手动输入'));
		});
		expect(onManualFallback).toHaveBeenCalledTimes(1);
	});

	it('T3 start reject Permission denied → 本地化拒权文案，裸英文原文零渲染', async () => {
		mockStart.mockRejectedValue(new Error('Permission denied'));
		render(<QrScanner onScan={vi.fn()} />);
		await flushAsync();
		await flushAsync();

		expect(
			screen.getByText('摄像头权限被拒绝，请在浏览器设置中允许访问后重试'),
		).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('Permission denied');
		// 未传 onManualFallback → 不渲染 CTA
		expect(screen.queryByText('改用手动输入')).toBeNull();
	});

	it('T4 start 正常 resolve → spinner 消失、无错误卡（回归保护）', async () => {
		mockStart.mockResolvedValue(undefined);
		render(<QrScanner onScan={vi.fn()} />);
		await flushAsync();
		await flushAsync();

		expect(document.querySelector('.animate-spin')).toBeNull();
		expect(screen.queryByText('无法访问摄像头')).toBeNull();
		expect(screen.queryByText('摄像头启动超时。可改用手动输入添加账户')).toBeNull();
	});
});
