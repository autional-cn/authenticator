import { ErrorBoundary as SharedErrorBoundary } from '@autional-cn/ui';
import { AlertTriangle } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
	children: ReactNode;
}

export default function ErrorBoundary({ children }: Props) {
	const isDev = import.meta.env.DEV;
	const { t } = useTranslation();

	const handleHardReset = () => {
		if (confirm(t('error.confirmReset'))) {
			localStorage.removeItem('authms-authenticator-v2');
			localStorage.removeItem('authms-authenticator-storage');
			window.location.reload();
		}
	};

	const fallback = (
		<main
			className="flex h-screen flex-col items-center justify-center px-6 text-center"
			role="alert"
		>
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20">
				<AlertTriangle className="h-8 w-8 text-rose-600" />
			</div>
			<h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
				{t('error.title')}
			</h2>
			<p className="mb-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
				{t('error.description')}
			</p>
			{isDev && (
				<details className="mt-4 max-w-lg text-left text-xs text-neutral-500 dark:text-neutral-400">
					<summary className="cursor-pointer">{t('error.detailsDev')}</summary>
					<p className="mt-2">{t('error.viewConsole')}</p>
				</details>
			)}
			<div className="mt-6 flex gap-3">
				<button
					onClick={() => window.location.reload()}
					className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
				>
					{t('error.retry')}
				</button>
				<button
					onClick={handleHardReset}
					className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
				>
					{t('error.resetData')}
				</button>
			</div>
		</main>
	);

	return <SharedErrorBoundary fallback={fallback}>{children}</SharedErrorBoundary>;
}
