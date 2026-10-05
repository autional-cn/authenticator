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

const { mockGetPushHistory } = vi.hoisted(() => ({
	mockGetPushHistory: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/lib/api', () => ({
	getPushHistory: mockGetPushHistory,
}));

vi.mock('@/components/BottomNav', () => ({
	default: () => <div data-testid="bottom-nav" />,
}));

import ActivityPage from '../activity/page';

function renderActivity() {
	return render(
		<MemoryRouter initialEntries={['/activity']}>
			<ActivityPage />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('ActivityPage', () => {
	it('renders header "活动记录"', async () => {
		renderActivity();
		expect(screen.getByText('活动记录')).toBeInTheDocument();
	});

	it('AU-23 renders filter tabs: 全部, 已批准, 已拒绝, 待处理, 已过期', async () => {
		renderActivity();
		expect(screen.getByText('全部')).toBeInTheDocument();
		expect(screen.getByText('已批准')).toBeInTheDocument();
		expect(screen.getByText('已拒绝')).toBeInTheDocument();
		expect(screen.getByText('待处理')).toBeInTheDocument();
		expect(screen.getByText('已过期')).toBeInTheDocument();
	});

	it('shows "暂无活动记录" when empty', async () => {
		renderActivity();
		await waitFor(() => {
			expect(screen.getByText('暂无活动记录')).toBeInTheDocument();
		});
	});

	it('bottom nav is present', async () => {
		renderActivity();
		expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
	});

	it('"返回" button navigates back', async () => {
		renderActivity();
		const backBtn = screen.getByLabelText('返回');
		await act(async () => {
			fireEvent.click(backBtn);
		});
		expect(mockNavigate).toHaveBeenCalledWith('/settings');
	});
});

describe('ActivityPage AU-23 / AU-24 筛选与分页', () => {
	function mockTwoPages() {
		// total=60 > PAGE_SIZE=50：page=1 时 hasMore=true，page=2 时 hasMore=false
		mockGetPushHistory.mockImplementation((params?: Record<string, unknown>) => {
			if (params?.page === 2) {
				return Promise.resolve({
					items: [
						{ challengeId: 'c2', status: 'pending', createdAt: '2026-05-25T07:30:00Z' },
						{ challengeId: 'c3', status: 'denied', createdAt: '2026-05-25T08:10:00Z' },
					],
					total: 60,
					pagination: { page: 2, pageSize: 50, total: 60, hasNext: false, hasPrev: true },
				});
			}
			return Promise.resolve({
				items: [
					{ challengeId: 'c1', status: 'approved', createdAt: '2026-05-25T07:00:00Z' },
					{ challengeId: 'c2', status: 'pending', createdAt: '2026-05-25T07:30:00Z' },
				],
				total: 60,
				pagination: { page: 1, pageSize: 50, total: 60, hasNext: true, hasPrev: false },
			});
		});
	}

	it('AU-23 点「已过期」→ 带 status=expired 重取第 1 页', async () => {
		mockGetPushHistory.mockResolvedValue({ items: [] });
		renderActivity();
		await waitFor(() => {
			expect(mockGetPushHistory).toHaveBeenCalledWith({ page: 1, page_size: 50 });
		});

		await act(async () => {
			fireEvent.click(screen.getByText('已过期'));
		});

		await waitFor(() => {
			expect(mockGetPushHistory).toHaveBeenLastCalledWith({
				status: 'expired',
				page: 1,
				page_size: 50,
			});
		});
	});

	it('AU-24 加载更多：追加 + 去重 + 页脚进度 + 到底提示', async () => {
		mockTwoPages();
		renderActivity();
		await waitFor(() => {
			expect(screen.getByText('已加载 2/60 条')).toBeInTheDocument();
		});
		expect(screen.getByText('加载更多')).toBeInTheDocument();
		expect(screen.queryByText('没有更多了')).toBeNull();

		await act(async () => {
			fireEvent.click(screen.getByText('加载更多'));
		});

		expect(mockGetPushHistory).toHaveBeenLastCalledWith({ page: 2, page_size: 50 });
		expect(screen.getByText('已加载 3/60 条')).toBeInTheDocument();
		// c2 两页重复 → 去重后条目状态标签「待处理」/「已拒绝」各恰 1 个（selector=span 排除同名 tab 按钮）
		expect(screen.getAllByText('待处理', { selector: 'span' })).toHaveLength(1);
		expect(screen.getAllByText('已拒绝', { selector: 'span' })).toHaveLength(1);
		expect(screen.queryByText('加载更多')).toBeNull();
		expect(screen.getByText('没有更多了')).toBeInTheDocument();
	});

	it('AU-24 切 tab 重置分页：先加载第 2 页再切「已过期」→ 回 page=1 且带 status', async () => {
		mockTwoPages();
		renderActivity();
		await waitFor(() => {
			expect(screen.getByText('加载更多')).toBeInTheDocument();
		});
		await act(async () => {
			fireEvent.click(screen.getByText('加载更多'));
		});
		expect(mockGetPushHistory).toHaveBeenLastCalledWith({ page: 2, page_size: 50 });

		await act(async () => {
			fireEvent.click(screen.getByText('已过期'));
		});

		await waitFor(() => {
			expect(mockGetPushHistory).toHaveBeenLastCalledWith({
				status: 'expired',
				page: 1,
				page_size: 50,
			});
		});
	});

	it('AU-23 已过期记录渲染 CalendarX 图标（语义令牌，非 default 灰）', async () => {
		mockGetPushHistory.mockResolvedValue({
			items: [{ challengeId: 'e1', status: 'expired', createdAt: '2026-05-25T08:00:00Z' }],
			total: 1,
		});
		const { container } = renderActivity();

		await waitFor(() => {
			expect(container.querySelector('.lucide-calendar-x')).not.toBeNull();
		});
		const icon = container.querySelector('.lucide-calendar-x')!;
		expect(icon.getAttribute('class')).toContain('text-[var(--color-text-muted)]');
	});
});
