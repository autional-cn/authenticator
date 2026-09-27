import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { LanguageSwitcher } from '@autional-cn/ui';

export default function SettingsHeader({ onBack }: { onBack: () => void }) {
	const { t } = useTranslation();

	return (
		<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-auth-border bg-auth-bg/80 px-4 py-3 backdrop-blur-md">
			<button
				onClick={onBack}
				className="rounded-lg p-1.5 text-neutral-400 hover:bg-auth-elevated hover:text-neutral-0 transition-colors"
				aria-label={t('account.goBack')}
			>
				<ArrowLeft className="h-5 w-5" />
			</button>
			<h1 className="text-lg font-bold text-neutral-0">{t('settings.title')}</h1>
			<LanguageSwitcher className="ml-auto" />
		</header>
	);
}
