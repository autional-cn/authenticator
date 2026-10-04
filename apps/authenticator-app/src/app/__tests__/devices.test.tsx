import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * AU-19 回归锁：设备行读运行时契约键 `ip`（identity DeviceResponse json:"ip"）。
 * shared 生成物字段 ipAddress 陈旧 —— 旧码读 ipAddress 时本测试首例即红。
 */
const { mockGetTrustedDevices, mockRevokeTrustedDevice } = vi.hoisted(() => ({
	mockGetTrustedDevices: vi.fn(),
	mockRevokeTrustedDevice: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
	getTrustedDevices: (...args: unknown[]) => mockGetTrustedDevices(...args),
	revokeTrustedDevice: (...args: unknown[]) => mockRevokeTrustedDevice(...args),
}));

vi.mock('@/components/BottomNav', () => ({
	default: () => <div data-testid="bottom-nav" />,
}));

import DevicesPage from '../devices/page';

function renderDevices() {
	return render(
		<MemoryRouter initialEntries={['/devices']}>
			<DevicesPage />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('DevicesPage (AU-19)', () => {
	it('行含运行时 ip 键 → IP 文本可见（读 ipAddress 的旧码为不可见回归锁）', async () => {
		mockGetTrustedDevices.mockResolvedValue({
			items: [
				{
					id: 'd1',
					deviceName: 'Chrome',
					createdAt: '2026-01-05T12:00:00Z',
					ip: '203.0.113.7',
				},
			],
		});
		renderDevices();

		await waitFor(() => {
			expect(screen.getByText(/203\.0\.113\.7/)).toBeInTheDocument();
		});
	});

	it('ip 缺省（仅陈旧 ipAddress）→ 日期行无「 · 」段、陈旧键不渲染', async () => {
		mockGetTrustedDevices.mockResolvedValue({
			items: [
				{
					id: 'd2',
					deviceName: 'Firefox',
					createdAt: '2026-01-05T12:00:00Z',
					ipAddress: '10.0.0.1',
				},
			],
		});
		renderDevices();

		await waitFor(() => {
			expect(screen.getByText('Firefox')).toBeInTheDocument();
		});
		expect(screen.queryByText(/ · /)).toBeNull();
		expect(screen.queryByText(/10\.0\.0\.1/)).toBeNull();
	});
});
