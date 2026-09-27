import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Cloud, Smartphone, ChevronRight } from 'lucide-react';
import { toSlugged, useTenantSlug } from '../../lib/slug';

export default function SettingsCloud() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const slug = useTenantSlug();

	return (
		<section>
			<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
				{t('settings.cloud')}
			</h2>
			<div className="rounded-xl border border-auth-border bg-auth-surface">
				<button
					onClick={() => navigate(toSlugged('/cloud-backup', slug))}
					className="flex w-full items-center justify-between border-b border-auth-border px-4 py-3 text-left hover:bg-auth-elevated/50 transition-colors"
				>
					<div className="flex items-center gap-3">
						<Cloud className="h-4 w-4 text-neutral-400" />
						<span className="text-sm text-neutral-0">{t('settings.cloudBackup')}</span>
					</div>
					<ChevronRight className="h-4 w-4 text-neutral-500" />
				</button>
				<button
					onClick={() => navigate(toSlugged('/device-sync', slug))}
					className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-auth-elevated/50 transition-colors"
				>
					<div className="flex items-center gap-3">
						<Smartphone className="h-4 w-4 text-neutral-400" />
						<span className="text-sm text-neutral-0">{t('settings.deviceSync')}</span>
					</div>
					<ChevronRight className="h-4 w-4 text-neutral-500" />
				</button>
			</div>
		</section>
	);
}
