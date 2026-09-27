import { describe, it, expect, vi, beforeEach } from 'vitest';
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
	mockNotificationsUnreadCount: vi.fn().mockResolvedValue({ count: 0 }),
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
});
