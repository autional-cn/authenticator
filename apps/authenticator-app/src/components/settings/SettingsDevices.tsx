import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Smartphone } from 'lucide-react';
import { toSlugged, useTenantSlug } from '../../lib/slug';

export default function SettingsDevices() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const slug = useTenantSlug();

	return (
		<section>
			<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
				{t('settings.devices')}
			</h2>
			<div className="rounded-xl border border-auth-border bg-auth-surface">
				<div className="flex items-center gap-3 px-4 py-3">
					<Smartphone className="h-4 w-4 text-neutral-400" />
					<div className="flex-1">
						<span className="text-sm text-neutral-0">{t('settings.registeredDevices')}</span>
						<p className="text-[11px] text-neutral-400">{t('settings.devicesSubtitle')}</p>
					</div>
					<button
						onClick={() => navigate(toSlugged('/devices', slug))}
						className="rounded-lg bg-auth-elevated px-3 py-1.5 text-xs text-neutral-300 hover:text-neutral-0 transition-colors"
					>
						{t('settings.devicesView')}
					</button>
				</div>
			</div>
		</section>
	);
}
