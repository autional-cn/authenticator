import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NetworkStatus() {
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const { t } = useTranslation();

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	if (isOnline) return null;

	return (
		<div className="flex items-center justify-center gap-1.5 bg-warning/10 px-3 py-1.5 text-xs text-warning">
			<WifiOff className="h-3.5 w-3.5" />
			<span>{t('home.offlineMode')}</span>
		</div>
	);
}
