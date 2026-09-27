import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import i18n from '../../i18n';

/**
 * 语言切换响应式测试 — 覆盖 BUG：语言切换后 documentElement.lang 未同步（a11y/浏览器翻译不一致）
 * 以及 en-US 资源键完整性（home.multiSelect 等）
 */
describe('i18n language switching', () => {
	const originalLang = document.documentElement.lang;

	beforeEach(async () => {
		await i18n.changeLanguage('zh-CN');
	});

	afterEach(() => {
		document.documentElement.lang = originalLang;
	});

	it('syncs documentElement.lang on language change', async () => {
		expect(document.documentElement.lang).toBe('zh-CN');
		await i18n.changeLanguage('en-US');
		expect(i18n.language).toBe('en-US');
		expect(document.documentElement.lang).toBe('en-US');
	});

	it('switches home.multiSelect to English after changeLanguage', async () => {
		expect(i18n.t('home.multiSelect')).toBe('多选');
		await i18n.changeLanguage('en-US');
		expect(i18n.t('home.multiSelect')).toBe('Multi-select');
	});

	it('switches home.searchPlaceholder to English', async () => {
		expect(i18n.t('home.searchPlaceholder')).toBe('搜索账户...');
		await i18n.changeLanguage('en-US');
		expect(i18n.t('home.searchPlaceholder')).toBe('Search accounts...');
	});

	it('round-trips back to zh-CN', async () => {
		await i18n.changeLanguage('en-US');
		await i18n.changeLanguage('zh-CN');
		expect(i18n.t('home.multiSelect')).toBe('多选');
		expect(document.documentElement.lang).toBe('zh-CN');
	});
});
