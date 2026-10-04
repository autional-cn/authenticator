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
	const { t, i18n } = useTranslation();
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
			return new Date(iso).toLocaleDateString(i18n.language);
		} catch {
			return iso;
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-auth-border bg-auth-bg/80 h-[var(--layout-header-height)] px-4 backdrop-blur-md">
				<button
					onClick={() => navigate(toSlugged('/settings', slug))}
					className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-auth-elevated hover:text-[var(--color-text-primary)] transition-colors"
					aria-label={t('common.back')}
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t('devices.title')}</h1>
			</header>

			<div className="flex-1 px-4 py-4">
				{loading ? (
					<LoadingScreen />
				) : error ? (
					<ErrorState description={error} />
				) : devices.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Smartphone className="h-12 w-12 text-[var(--color-text-muted)] mb-3" />
						<p className="text-sm text-[var(--color-text-secondary)]">{t('devices.empty')}</p>
						<p className="mt-1 text-xs text-[var(--color-text-muted)]">{t('devices.emptyHint')}</p>
					</div>
				) : (
					<div className="space-y-2">
						{devices.map((device) => {
							// 运行时契约 = identity DeviceResponse json:"ip"（shared 生成物 ipAddress 陈旧）
							const ip = (device as { ip?: string }).ip;
							return (
								<div
									key={device.id}
									className="flex items-center gap-3 rounded-xl border border-auth-border bg-auth-surface p-3"
								>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
										<Smartphone className="h-5 w-5 text-primary-400" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
											{device.deviceName || t('devices.unnamed')}
										</p>
										<p className="text-[11px] text-[var(--color-text-muted)]">
											{formatDate(device.createdAt)}
											{ip ? ` · ${ip}` : ''}
										</p>
									</div>
								<button
									onClick={() => handleDelete(device.id)}
									disabled={deletingId === device.id}
									className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
									aria-label={t('devices.revokeTitle')}
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
							);
						})}
					</div>
				)}

				<div className="mt-4 rounded-lg bg-auth-elevated p-3">
					<div className="flex items-start gap-2">
						<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
						<p className="text-xs text-[var(--color-text-muted)]">{t('devices.revokeNotice')}</p>
					</div>
				</div>
			</div>

			<BottomNav />
		</div>
	);
}
