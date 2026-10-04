import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';

export default function SettingsAccount({ onLogout }: { onLogout: () => void }) {
	const { t } = useTranslation();

	return (
		<section>
			<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
				{t('settings.account')}
			</h2>
			<div className="rounded-xl border border-auth-border bg-auth-surface">
				<button
					onClick={onLogout}
					className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-auth-elevated/50 transition-colors"
				>
					<div className="flex items-center gap-3">
						<LogOut className="h-4 w-4 text-danger" />
						<span className="text-sm text-danger">{t('settings.logout')}</span>
					</div>
				</button>
			</div>
		</section>
	);
}
