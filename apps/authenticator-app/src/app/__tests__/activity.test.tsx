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

	it('renders filter tabs: 全部, 已批准, 已拒绝, 待处理', async () => {
		renderActivity();
		expect(screen.getByText('全部')).toBeInTheDocument();
		expect(screen.getByText('已批准')).toBeInTheDocument();
		expect(screen.getByText('已拒绝')).toBeInTheDocument();
		expect(screen.getByText('待处理')).toBeInTheDocument();
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
