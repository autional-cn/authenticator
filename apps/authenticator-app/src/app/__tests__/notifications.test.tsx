import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const {
	mockNotifications,
	mockNotificationsUnreadCount,
	mockNotificationsReadByIdPut,
	mockNotificationsReadAllPut,
} = vi.hoisted(() => ({
	mockNotifications: vi.fn().mockResolvedValue({ items: [] }),
	mockNotificationsUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
	mockNotificationsReadByIdPut: vi.fn().mockResolvedValue({}),
	mockNotificationsReadAllPut: vi.fn().mockResolvedValue({}),
}));

vi.mock('@autional-cn/shared', async () => {
	const actual = await vi.importActual('@autional-cn/shared');
	return {
		...actual,
		useAuthStore: {
			...(actual as unknown as { useAuthStore: Record<string, unknown> }).useAuthStore,
			getState: () => ({ user: { id: 'test-user' } }),
		},
		useAuth: () => ({
			isAuthenticated: true,
			user: { id: 'test-user', email: 'dev@example.com', username: 'testuser' },
			userId: 'test-user',
			accessToken: 'mock-token',
			currentTenantId: null,
			permissions: [],
			tenants: [],
		}),
		// NotificationsPage 通过 GeneratedApi（@autional-cn/shared re-export）调用通知 API
		GeneratedApi: {
			notifications: mockNotifications,
			notificationsUnreadCount: mockNotificationsUnreadCount,
			notificationsReadByNotificationsPut: mockNotificationsReadByIdPut,
			notificationsReadAllPut: mockNotificationsReadAllPut,
		},
	};
});

vi.mock('@/components/BottomNav', () => ({
	default: () => <div data-testid="bottom-nav" />,
}));

import NotificationsPage from '../notifications/page';
import i18n from '../../i18n';

function renderNotifications() {
	return render(
		<MemoryRouter initialEntries={['/notifications']}>
			<NotificationsPage />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(async () => {
	await i18n.changeLanguage('zh-CN');
});

describe('NotificationsPage', () => {
	it('renders header "通知中心" and "刷新" button', async () => {
		renderNotifications();
		expect(screen.getByText('通知中心')).toBeInTheDocument();
		expect(screen.getByLabelText('刷新')).toBeInTheDocument();
	});

	it('renders filter tabs: 全部, 未读, 已读', async () => {
		renderNotifications();
		expect(screen.getByText('全部')).toBeInTheDocument();
		expect(screen.getByText('未读')).toBeInTheDocument();
		expect(screen.getByText('已读')).toBeInTheDocument();
	});

	it('shows "暂无通知" when empty', async () => {
		renderNotifications();
		await waitFor(() => {
			expect(screen.getByText('暂无通知')).toBeInTheDocument();
		});
	});

	it('bottom nav is present', async () => {
		renderNotifications();
		expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
	});

	it('"返回" button navigates back', async () => {
		renderNotifications();
		const backBtn = screen.getByLabelText('返回');
		await act(async () => {
			fireEvent.click(backBtn);
		});
		expect(mockNavigate).toHaveBeenCalledWith('/');
	});

	it('AU-12 未读角标读运行时键 unreadCount（3 → 头部角标 3）', async () => {
		mockNotificationsUnreadCount.mockResolvedValue({ unreadCount: 3 });
		renderNotifications();

		await waitFor(() => {
			expect(screen.getByText('3')).toBeInTheDocument();
		});
	});

	it('AU-14 未读 tab 空态 → 「暂无未读通知」（与全部 tab 空态区分）', async () => {
		renderNotifications();
		await waitFor(() => {
			expect(screen.getByText('暂无通知')).toBeInTheDocument();
		});

		await act(async () => {
			fireEvent.click(screen.getByText('未读'));
		});

		expect(screen.getByText('暂无未读通知')).toBeInTheDocument();
		expect(screen.queryByText('暂无通知')).toBeNull();
	});

	it('AU-11 已读且无动作条目渲染为非按钮；未读条目仍为按钮', async () => {
		mockNotifications.mockResolvedValue({
			items: [
				{ id: 'n1', title: '未读条目', isRead: false },
				{ id: 'r1', title: '已读条目', isRead: true },
			],
		});
		renderNotifications();

		await waitFor(() => {
			expect(screen.getByText('已读条目')).toBeInTheDocument();
		});
		expect(screen.getByText('已读条目').closest('button')).toBeNull();
		expect(screen.getByText('未读条目').closest('button')).not.toBeNull();
	});

	it('AU-16 日期随语言切换（en-US → Jan 5 形态；中置 UTC 防时区抖动）', async () => {
		await i18n.changeLanguage('en-US');
		mockNotifications.mockResolvedValue({
			items: [{ id: 'old', title: '旧通知', isRead: true, createdAt: '2026-01-05T12:00:00Z' }],
		});
		renderNotifications();

		await waitFor(() => {
			expect(screen.getByText('Jan 5')).toBeInTheDocument();
		});
	});
});
