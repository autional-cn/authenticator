import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Smartphone, Trash2, AlertCircle } from 'lucide-react';
import { LoadingScreen, ErrorState } from '@autional-cn/ui';
import { extractList, GeneratedTypes } from '@autional-cn/shared';
import { getTrustedDevices, revokeTrustedDevice } from '@/lib/api';
import BottomNav from '@/components/BottomNav';
import { toSlugged, useTenantSlug } from '../../lib/slug';

export default function DevicesPage() {
	const navigate = useNavigate();
	const slug = useTenantSlug();
	const { t } = useTranslation();
	const [devices, setDevices] = useState<GeneratedTypes.TrustedDeviceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	useEffect(() => {
		getTrustedDevices()
			.then((res) => {
				setDevices(extractList<GeneratedTypes.TrustedDeviceItem>(res));
			})
			.catch((err) => {
				setError(t('devices.loadFailed'));
				console.error(err);
			})
			.finally(() => setLoading(false));
	}, [t]);

	const handleDelete = async (id?: string) => {
		if (!id) return;
		if (!confirm(t('devices.revokeConfirm'))) return;
		setDeletingId(id);
		try {
			await revokeTrustedDevice(id);
			setDevices((prev) => prev.filter((d) => d.id !== id));
		} catch (err) {
			console.error(err);
			alert(t('devices.revokeFailed'));
		} finally {
			setDeletingId(null);
		}
	};

	const formatDate = (iso?: string) => {
		if (!iso) return t('devices.unknownDate');
		try {
			return new Date(iso).toLocaleDateString('zh-CN');
		} catch {
			return iso;
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-auth-border bg-auth-bg/80 px-4 py-3 backdrop-blur-md">
				<button
					onClick={() => navigate(toSlugged('/settings', slug))}
					className="rounded-lg p-1.5 text-neutral-400 hover:bg-auth-elevated hover:text-neutral-0 transition-colors"
					aria-label={t('common.back')}
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<h1 className="text-lg font-bold text-neutral-0">{t('devices.title')}</h1>
			</header>

			<div className="flex-1 px-4 py-4">
				{loading ? (
					<LoadingScreen />
				) : error ? (
					<ErrorState description={error} />
				) : devices.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Smartphone className="h-12 w-12 text-neutral-600 mb-3" />
						<p className="text-sm text-neutral-400">{t('devices.empty')}</p>
						<p className="mt-1 text-xs text-neutral-600">{t('devices.emptyHint')}</p>
					</div>
				) : (
					<div className="space-y-2">
						{devices.map((device) => (
							<div
								key={device.id}
								className="flex items-center gap-3 rounded-xl border border-auth-border bg-auth-surface p-3"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
									<Smartphone className="h-5 w-5 text-primary-400" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium text-neutral-0 truncate">
										{device.deviceName || t('devices.unnamed')}
									</p>
									<p className="text-[11px] text-neutral-500">
										{formatDate(device.createdAt)}
										{device.ipAddress ? ` · ${device.ipAddress}` : ''}
									</p>
								</div>
								<button
									onClick={() => handleDelete(device.id)}
									disabled={deletingId === device.id}
									className="rounded-lg p-2 text-neutral-500 hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
									aria-label={t('devices.revokeTitle')}
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				)}

				<div className="mt-4 rounded-lg bg-auth-elevated p-3">
					<div className="flex items-start gap-2">
						<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
						<p className="text-xs text-neutral-500">{t('devices.revokeNotice')}</p>
					</div>
				</div>
			</div>

			<BottomNav />
		</div>
	);
}
