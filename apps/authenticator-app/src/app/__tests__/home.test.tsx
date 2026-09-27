import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const mockGenerateTOTP = vi.fn();
vi.mock('@/lib/totp', () => ({
	generateTOTP: (...args: unknown[]) => mockGenerateTOTP(...args),
}));

interface MockStoreState {
	accounts: unknown[];
	isLoading: boolean;
	isUnlocked: boolean;
	hasPin: boolean;
	unlockError: string | null;
	searchQuery: string;
	selectedGroup: string | null;
	setSearchQuery: (query: string) => void;
	setSelectedGroup: (group: string | null) => void;
	removeAccount: (id: string) => void;
	updateAccount: (id: string, updates: unknown) => void;
	reorderAccounts: (accounts: unknown[]) => void;
	loadAccounts: (accounts: unknown[]) => void;
	addAccount: (account: unknown) => void;
	importAccounts: (accounts: unknown[]) => void;
	setUnlocked: (unlocked: boolean) => void;
	setHasPin: (hasPin: boolean) => void;
	setUnlockError: (error: string | null) => void;
	setLoading: (loading: boolean) => void;
}
let storeState: MockStoreState = {
	accounts: [],
	isLoading: false,
	isUnlocked: true,
	hasPin: false,
	unlockError: null,
	searchQuery: '',
	selectedGroup: null,
	setSearchQuery: vi.fn(),
	setSelectedGroup: vi.fn(),
	removeAccount: vi.fn(),
	updateAccount: vi.fn(),
	reorderAccounts: vi.fn(),
	loadAccounts: vi.fn(),
	addAccount: vi.fn(),
	importAccounts: vi.fn(),
	setUnlocked: vi.fn(),
	setHasPin: vi.fn(),
	setUnlockError: vi.fn(),
	setLoading: vi.fn(),
};
vi.mock('@/lib/store', () => ({
	useAuthenticatorStore: (selector?: unknown) =>
		typeof selector === 'function'
			? (selector as (state: unknown) => unknown)(storeState)
			: storeState,
}));

import HomePage from '../page';

function renderHome() {
	return render(
		<MemoryRouter initialEntries={['/']}>
			<HomePage />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGenerateTOTP.mockResolvedValue({ code: '123456', remainingSeconds: 25, progress: 0.83 });
	storeState = {
		accounts: [],
		isLoading: false,
		isUnlocked: true,
		hasPin: false,
		unlockError: null,
		searchQuery: '',
		selectedGroup: null,
		setSearchQuery: vi.fn(),
		setSelectedGroup: vi.fn(),
		removeAccount: vi.fn(),
		updateAccount: vi.fn(),
		reorderAccounts: vi.fn(),
		loadAccounts: vi.fn(),
		addAccount: vi.fn(),
		importAccounts: vi.fn(),
		setUnlocked: vi.fn(),
		setHasPin: vi.fn(),
		setUnlockError: vi.fn(),
		setLoading: vi.fn(),
	};
});

describe('HomePage', () => {
	describe('empty state', () => {
		it('renders header with brand', async () => {
			renderHome();
			expect(screen.getByText('Autional Authenticator')).toBeInTheDocument();
		});

		it('shows empty state with add account CTA', async () => {
			renderHome();
			expect(screen.getByText('暂无账户')).toBeInTheDocument();
			expect(screen.getByText('添加账户')).toBeInTheDocument();
			expect(screen.getByText('0 个账户')).toBeInTheDocument();
		});

		it('add account CTA navigates to /add', async () => {
			renderHome();
			const button = screen.getByText('添加账户');
			await act(async () => {
				fireEvent.click(button);
			});
			expect(mockNavigate).toHaveBeenCalledWith('/add');
		});

		it('shows search input', async () => {
			renderHome();
			expect(screen.getByPlaceholderText('搜索账户...')).toBeInTheDocument();
		});
	});

	describe('with accounts', () => {
		beforeEach(() => {
			storeState = {
				...storeState,
				accounts: [
					{
						id: '1',
						name: 'GitHub',
						username: 'dev@example.com',
						secret: 'SECRET1',
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						createdAt: 1700000000000,
					},
					{
						id: '2',
						name: 'Google',
						username: 'user@gmail.com',
						secret: 'SECRET2',
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						group: 'Work',
						createdAt: 1700000001000,
					},
					{
						id: '3',
						name: 'AWS',
						username: 'admin@company.com',
						secret: 'SECRET3',
						algorithm: 'SHA256',
						digits: 6,
						period: 30,
						group: 'Work',
						createdAt: 1700000002000,
					},
				],
			};
		});

		it('renders account cards', async () => {
			renderHome();
			expect(screen.getByText('GitHub')).toBeInTheDocument();
			expect(screen.getByText('Google')).toBeInTheDocument();
			expect(screen.getByText('AWS')).toBeInTheDocument();
			expect(screen.getByText('3 个账户')).toBeInTheDocument();
		});

		it('displays TOTP codes on cards', async () => {
			renderHome();
			await waitFor(() => {
				expect(screen.getAllByText('123456')).toHaveLength(3);
			});
		});

		it('shows group filter chips', async () => {
			renderHome();
			expect(screen.getByText('全部')).toBeInTheDocument();
			expect(screen.getByText('Work')).toBeInTheDocument();
		});

		it('clicking group chip filters', async () => {
			renderHome();
			const chip = screen.getByText('Work');
			await act(async () => {
				fireEvent.click(chip);
			});
			expect(storeState.setSelectedGroup).toHaveBeenCalledWith('Work');
		});

		it('clicking "全部" clears group filter', async () => {
			renderHome();
			const chip = screen.getByText('全部');
			await act(async () => {
				fireEvent.click(chip);
			});
			expect(storeState.setSelectedGroup).toHaveBeenCalledWith(null);
		});
	});

	describe('search', () => {
		beforeEach(() => {
			storeState = {
				...storeState,
				accounts: [
					{
						id: '1',
						name: 'GitHub',
						username: 'dev@example.com',
						secret: 'S1',
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						createdAt: 1700000000000,
					},
					{
						id: '2',
						name: 'Google',
						username: 'user@gmail.com',
						secret: 'S2',
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						createdAt: 1700000001000,
					},
				],
			};
		});

		it('search input triggers setSearchQuery', async () => {
			const user = userEvent.setup();
			renderHome();
			const input = screen.getByPlaceholderText('搜索账户...');
			await user.type(input, 'Git');
			expect(storeState.setSearchQuery).toHaveBeenCalled();
		});
	});

	describe('view mode toggle', () => {
		beforeEach(() => {
			storeState = {
				...storeState,
				accounts: [
					{
						id: '1',
						name: 'GitHub',
						username: 'dev@example.com',
						secret: 'S1',
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						createdAt: 1700000000000,
					},
				],
			};
		});

		it('toggles between list and grid view', async () => {
			renderHome();
			const toggleBtn = screen.getByRole('button', { name: '网格视图' });
			await act(async () => {
				fireEvent.click(toggleBtn);
			});
			expect(screen.getByRole('button', { name: '列表视图' })).toBeInTheDocument();
		});
	});
});
