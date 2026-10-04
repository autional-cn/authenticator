import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * W4/A3：devices 页数据源 = Push 订阅（communication push subscriptions）。
 * 撤销 = DELETE ?endpoint=（真删持久）；页面不展示 IP（AU-19 随数据源改判）。
 */
const { mockGetPushSubscriptions, mockUnregisterPushSubscription } = vi.hoisted(() => ({
	mockGetPushSubscriptions: vi.fn(),
	mockUnregisterPushSubscription: vi.fn(),
}));

vi.mock('@/lib/push', () => ({
	getPushSubscriptions: (...args: unknown[]) => mockGetPushSubscriptions(...args),
	unregisterPushSubscription: (...args: unknown[]) => mockUnregisterPushSubscription(...args),
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

describe('DevicesPage (W4/A3 · Push 订阅数据源)', () => {
	it('订阅行渲染 deviceName + createdAt（非空列表可产生）', async () => {
		mockGetPushSubscriptions.mockResolvedValue([
			{
				id: 'sub-1',
				endpoint: 'https://push.example/ep-1',
				deviceName: 'Authenticator Web',
				deviceType: 'web',
				createdAt: '2026-01-05T12:00:00Z',
			},
		]);
		renderDevices();

		await waitFor(() => {
			expect(screen.getByText('Authenticator Web')).toBeInTheDocument();
		});
		expect(screen.getByText(/2026/)).toBeInTheDocument();
	});

	it('撤销以 endpoint 调用 DELETE 且行消失（真删持久方向）', async () => {
		mockGetPushSubscriptions.mockResolvedValue([
			{
				id: 'sub-1',
				endpoint: 'https://push.example/ep-1',
				deviceName: 'Chrome 桌面',
				deviceType: 'web',
				createdAt: '2026-01-05T12:00:00Z',
			},
		]);
		mockUnregisterPushSubscription.mockResolvedValue(undefined);
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		renderDevices();

		await waitFor(() => {
			expect(screen.getByText('Chrome 桌面')).toBeInTheDocument();
		});

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '撤销设备' }));
		});
		confirmSpy.mockRestore();

		await waitFor(() => {
			expect(mockUnregisterPushSubscription).toHaveBeenCalledWith('https://push.example/ep-1');
		});
		await waitFor(() => {
			expect(screen.queryByText('Chrome 桌面')).toBeNull();
		});
	});

	it('空列表 → 空态（empty + emptyHint）', async () => {
		mockGetPushSubscriptions.mockResolvedValue([]);
		renderDevices();

		await waitFor(() => {
			expect(screen.getByText('暂无已注册设备')).toBeInTheDocument();
		});
		expect(screen.getByText('在设置中启用 Push 通知即可注册')).toBeInTheDocument();
	});
});
