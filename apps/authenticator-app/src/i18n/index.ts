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

// 同步 <html lang> 与 document.title — 语言切换后更新（a11y/浏览器翻译/SEO）
const syncDocumentMeta = () => {
	if (typeof document !== 'undefined') {
		document.documentElement.lang = i18n.language || 'zh-CN';
		document.title = i18n.t('app.title');
	}
};
i18n.on('languageChanged', syncDocumentMeta);
// 初始化完成后立即同步一次（覆盖 index.html 硬编码的 lang/title）
if (i18n.isInitialized) {
	syncDocumentMeta();
} else {
	i18n.on('initialized', syncDocumentMeta);
}

export default i18n;
