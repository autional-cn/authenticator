import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Activity, ChevronRight } from 'lucide-react';
import { toSlugged, useTenantSlug } from '../../lib/slug';

export default function SettingsActivity() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const slug = useTenantSlug();

	return (
		<section>
			<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
				{t('settings.activity')}
			</h2>
			<button
				onClick={() => navigate(toSlugged('/activity', slug))}
				className="flex w-full items-center justify-between rounded-xl border border-auth-border bg-auth-surface px-4 py-3 text-left hover:bg-auth-elevated/50 transition-colors"
			>
				<div className="flex items-center gap-3">
					<Activity className="h-4 w-4 text-neutral-400" />
					<span className="text-sm text-neutral-0">{t('settings.activityRecord')}</span>
				</div>
				<ChevronRight className="h-4 w-4 text-neutral-500" />
			</button>
		</section>
	);
}
