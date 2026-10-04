import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff } from 'lucide-react';

export default function SettingsNetworkStatusCard({ isOnline }: { isOnline: boolean }) {
	const { t } = useTranslation();

	return (
		<section>
			<div
				className={`rounded-xl border p-3 flex items-center gap-3 ${isOnline ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'}`}
			>
				{isOnline ? (
					<Wifi className="h-4 w-4 text-success" />
				) : (
					<WifiOff className="h-4 w-4 text-warning" />
				)}
				<div className="flex-1">
					<span className={`text-sm font-medium ${isOnline ? 'text-success' : 'text-warning'}`}>
						{isOnline ? t('settings.online') : t('settings.offline')}
					</span>
					<p className="text-[11px] text-[var(--color-text-secondary)]">
						{isOnline ? t('settings.onlineDesc') : t('settings.offlineDesc')}
					</p>
				</div>
			</div>
		</section>
	);
}
