import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { TotpAccount } from '@/lib/store';

/**
 * AU-03 回归锁：卡片内按钮与卡片导航隔离 ——
 * 复制/删除图标/删除浮层的点击一律 stopPropagation，不得触发 onEdit（进编辑页）。
 * AU-16①：删除图标 aria-label 走 i18n key card.deleteAccount。
 */
const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock('@autional-cn/ui', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@autional-cn/ui')>();
	return { ...actual, showToast: mockShowToast };
});

const mockGenerateTOTP = vi.fn();
vi.mock('@/lib/totp', () => ({
	generateTOTP: (...args: unknown[]) => mockGenerateTOTP(...args),
}));

import TotpCard from '../../components/TotpCard';

const account: TotpAccount = {
	id: '1',
	name: 'GitHub',
	username: 'dev@example.com',
	secret: 'SECRET1',
	type: 'totp',
	algorithm: 'SHA1',
	digits: 6,
	period: 30,
	createdAt: 1700000000000,
};

function renderCard() {
	const props = { account, onDelete: vi.fn(), onEdit: vi.fn(), onPin: vi.fn() };
	render(<TotpCard {...props} />);
	return props;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGenerateTOTP.mockResolvedValue({ code: '123456', remainingSeconds: 25, progress: 0.83 });
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText: vi.fn().mockResolvedValue(undefined) },
		configurable: true,
	});
});

describe('TotpCard (AU-03 / AU-16①)', () => {
	it('AU-03 点复制 → 复制成功且不触发 onEdit', async () => {
		const props = renderCard();
		await screen.findByText('123456');

		await act(async () => {
			fireEvent.click(screen.getByText('123456'));
		});

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123456');
		expect(props.onEdit).not.toHaveBeenCalled();
	});

	it('AU-03 点删除图标 → 浮层现，onEdit 零调用；取消 → 浮层收且 onEdit 零调用', async () => {
		const props = renderCard();
		await screen.findByText('123456');

		await act(async () => {
			fireEvent.click(screen.getByLabelText('删除账户'));
		});
		expect(screen.getByText('确认删除此账户？')).toBeInTheDocument();
		expect(props.onEdit).not.toHaveBeenCalled();

		await act(async () => {
			fireEvent.click(screen.getByText('取消'));
		});
		expect(screen.queryByText('确认删除此账户？')).toBeNull();
		expect(props.onEdit).not.toHaveBeenCalled();
	});

	it('AU-03 浮层确认删除 → onDelete 恰 1 次，onEdit 零调用', async () => {
		const props = renderCard();
		await screen.findByText('123456');

		await act(async () => {
			fireEvent.click(screen.getByLabelText('删除账户'));
		});
		await act(async () => {
			fireEvent.click(screen.getByText('删除'));
		});

		expect(props.onDelete).toHaveBeenCalledTimes(1);
		expect(props.onDelete).toHaveBeenCalledWith('1');
		expect(props.onEdit).not.toHaveBeenCalled();
	});

	it('AU-16① 删除图标 aria-label 走 i18n（zh「删除账户」）', async () => {
		renderCard();
		await screen.findByText('123456');
		expect(screen.getByLabelText('删除账户')).toBeInTheDocument();
	});
});
