import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

import NotFoundPage from '../not-found/page';

/**
 * AU-29 回归锁：404「返回首页」恒指裸根漏斗 `/`，不得随无效 slug 自指
 * （旧实现 toSlugged('/', slug) → /<无效 slug>/ = 当前 URL）。
 */
describe('NotFoundPage (AU-29)', () => {
	it('任意无效 slug 下「返回首页」href 恒为 /，且不含当前 slug（自指回归锁）', () => {
		render(
			<MemoryRouter initialEntries={['/bogus-slug-not-exist/settings']}>
				<Routes>
					<Route path="/:tenantSlug/*" element={<NotFoundPage />} />
				</Routes>
			</MemoryRouter>,
		);

		const link = screen.getByRole('link', { name: '返回首页' });
		expect(link).toHaveAttribute('href', '/');
		expect(link.getAttribute('href')).not.toContain('bogus-slug-not-exist');
	});

	it('另一 slug 语境同样恒为 /（多语境一致）', () => {
		render(
			<MemoryRouter initialEntries={['/another-unknown/device-sync']}>
				<Routes>
					<Route path="/:tenantSlug/*" element={<NotFoundPage />} />
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/');
	});
});
