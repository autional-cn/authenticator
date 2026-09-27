import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: { 'zh-CN': { translation: zhCN }, 'en-US': { translation: enUS } },
		fallbackLng: 'zh-CN',
		supportedLngs: ['zh-CN', 'en-US'],
		keySeparator: false,
		returnNull: false,
		interpolation: { escapeValue: false },
		detection: {
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
			lookupLocalStorage: 'authenticator-app-lang',
		},
	});

// 同步 <html lang> — 语言切换后更新 documentElement.lang（a11y/浏览器翻译/SEO）
const syncHtmlLang = (lng: string | undefined) => {
	if (typeof document !== 'undefined') {
		document.documentElement.lang = lng || 'zh-CN';
	}
};
i18n.on('languageChanged', syncHtmlLang);
// 初始化完成后立即同步一次（覆盖 index.html 硬编码的 lang）
if (i18n.isInitialized) {
	syncHtmlLang(i18n.language);
} else {
	i18n.on('initialized', syncHtmlLang);
}

export default i18n;
