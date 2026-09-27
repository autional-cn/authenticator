import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

interface MockStoreState {
	accounts: unknown[];
}
let storeState: MockStoreState = { accounts: [] };
vi.mock('@/lib/store', () => ({
	useAuthenticatorStore: (selector?: unknown) =>
		typeof selector === 'function'
			? (selector as (state: unknown) => unknown)(storeState)
			: storeState,
}));

const mockRefetch = vi.fn();
const mockSync = vi.fn();
interface MockDevice {
	id: string;
	deviceName: string;
	deviceFingerprint: string;
	lastSyncAt: string;
	accountCount: number;
}
let mockDevices: MockDevice[] = [];
let mockLoading = false;
let mockError: string | null = null;

vi.mock('@/hooks/use-cloud-backup', () => ({
	useCloudBackup: () => ({
		backup: null,
		loading: false,
		error: null,
		refetch: vi.fn(),
	}),
	useUploadCloudBackup: () => ({
		upload: vi.fn(),
		uploading: false,
		error: null,
	}),
	useDownloadCloudBackup: () => ({
		download: vi.fn(),
		downloading: false,
		error: null,
	}),
	useDeviceSyncList: () => ({
		devices: mockDevices,
		loading: mockLoading,
		error: mockError,
		refetch: mockRefetch,
	}),
	useSyncDevice: () => ({
		sync: mockSync,
		syncing: false,
		error: null,
	}),
}));

import DeviceSyncPage from '../device-sync/page';

function renderPage() {
	return render(
		<MemoryRouter initialEntries={['/device-sync']}>
			<DeviceSyncPage />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	storeState = { accounts: [] };
	mockDevices = [];
	mockLoading = false;
	mockError = null;
});

describe('DeviceSyncPage', () => {
	it('renders header', async () => {
		renderPage();
		expect(screen.getByText('设备同步')).toBeInTheDocument();
	});

	it('renders section headers', async () => {
		renderPage();
		expect(screen.getByText('同步设备列表')).toBeInTheDocument();
		expect(screen.getByText('操作')).toBeInTheDocument();
	});

	it('renders sync button', async () => {
		renderPage();
		expect(screen.getByText('同步本设备')).toBeInTheDocument();
	});

	it('renders refresh button', async () => {
		renderPage();
		expect(screen.getByText('刷新设备列表')).toBeInTheDocument();
	});

	it('shows empty state when no synced devices', async () => {
		mockDevices = [];
		renderPage();
		expect(screen.getByText('暂无已同步的设备')).toBeInTheDocument();
		expect(screen.getByText('同步设备后可在多设备间共享 TOTP 账户数据')).toBeInTheDocument();
	});

	it('shows loading spinner when fetching devices', async () => {
		mockLoading = true;
		renderPage();
		const spinners = document.querySelectorAll('.animate-spin');
		expect(spinners.length).toBeGreaterThan(0);
	});

	it('shows error banner when error is set', async () => {
		mockError = '获取设备列表失败';
		renderPage();
		expect(screen.getByText('获取设备列表失败')).toBeInTheDocument();
	});

	it('renders device list when devices exist', async () => {
		mockDevices = [
			{
				id: 'dev-1',
				deviceName: 'iPhone 15',
				deviceFingerprint: 'a1b2c3d4e5f6g7h8',
				lastSyncAt: '2025-01-15T08:00:00.000Z',
				accountCount: 12,
			},
			{
				id: 'dev-2',
				deviceName: 'MacBook Pro',
				deviceFingerprint: 'x1y2z3w4v5u6t7s8',
				lastSyncAt: '2025-01-14T20:30:00.000Z',
				accountCount: 8,
			},
		];
		renderPage();

		expect(screen.getByText('iPhone 15')).toBeInTheDocument();
		expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
		expect(screen.getByText('· 12 个账户')).toBeInTheDocument();
		expect(screen.getByText('· 8 个账户')).toBeInTheDocument();
	});

	it('shows device fingerprint truncated', async () => {
		mockDevices = [
			{
				id: 'dev-1',
				deviceName: 'iPhone',
				deviceFingerprint: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9',
				lastSyncAt: '2025-01-15T08:00:00.000Z',
				accountCount: 3,
			},
		];
		renderPage();

		const fingerprint = screen.getByTitle('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9');
		expect(fingerprint).toBeInTheDocument();
		expect(fingerprint.textContent).toBe('a1b2c3...q7r8s9');
	});

	it('sync button is disabled when no accounts', async () => {
		storeState.accounts = [];
		renderPage();
		const syncBtn = screen.getByText('同步本设备').closest('button')!;
		expect(syncBtn).toBeDisabled();
	});

	it('sync button is enabled when accounts exist', async () => {
		storeState.accounts = [{ id: '1', name: 'Test', username: 'u' }];
		renderPage();
		const syncBtn = screen.getByText('同步本设备').closest('button')!;
		expect(syncBtn).not.toBeDisabled();
	});

	it('clicking sync triggers sync function', async () => {
		storeState.accounts = [
			{ id: '1', name: 'Test', username: 'u', secret: 'S1', algorithm: 'SHA1' },
		];
		renderPage();
		const syncBtn = screen.getByText('同步本设备').closest('button')!;
		await act(async () => {
			fireEvent.click(syncBtn);
		});
		expect(mockSync).toHaveBeenCalled();
	});

	it('clicking refresh calls refetch', async () => {
		renderPage();
		const refreshBtn = screen.getByText('刷新设备列表').closest('button')!;
		await act(async () => {
			fireEvent.click(refreshBtn);
		});
		expect(mockRefetch).toHaveBeenCalled();
	});

	it('back button navigates to settings', async () => {
		renderPage();
		const backBtn = screen.getByRole('button', { name: '返回' });
		await act(async () => {
			fireEvent.click(backBtn);
		});
		expect(mockNavigate).toHaveBeenCalledWith('/settings');
	});

	it('shows security note', async () => {
		renderPage();
		expect(screen.getByText(/服务器加密存储/)).toBeInTheDocument();
	});
});
