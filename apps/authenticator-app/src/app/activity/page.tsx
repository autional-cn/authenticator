import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldCheck, ShieldX, Clock, AlertCircle } from 'lucide-react';
import { LoadingScreen, ErrorState } from '@autional-cn/ui';
import { GeneratedTypes } from '@autional-cn/shared';
import { getPushHistory } from '@/lib/api';
import BottomNav from '@/components/BottomNav';
import { toSlugged, useTenantSlug } from '../../lib/slug';

const STATUS_MAP: Record<string, { labelKey: string }> = {
	approved: { labelKey: 'activity.approved' },
	denied: { labelKey: 'activity.denied' },
	pending: { labelKey: 'activity.pending' },
	expired: { labelKey: 'activity.expired' },
};

export default function ActivityPage() {
	const navigate = useNavigate();
	const slug = useTenantSlug();
	const { t } = useTranslation();
	const [items, setItems] = useState<GeneratedTypes.PushHistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<string>('all');

	useEffect(() => {
		getPushHistory({ page: 1, page_size: 50 })
			.then((res) => {
				setItems(res?.items ?? []);
			})
			.catch((err) => {
				setError(t('activity.loadFailed'));
				console.error(err);
			})
			.finally(() => setLoading(false));
	}, [t]);

	const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);

	const getStatusIcon = (status?: string) => {
		switch (status) {
			case 'approved':
				return <ShieldCheck className="h-5 w-5 text-success" />;
			case 'denied':
				return <ShieldX className="h-5 w-5 text-danger" />;
			case 'pending':
				return <Clock className="h-5 w-5 text-warning" />;
			default:
				return <AlertCircle className="h-5 w-5 text-neutral-400" />;
		}
	};

	const getStatusLabel = (status?: string) => {
		return t(STATUS_MAP[status ?? '']?.labelKey ?? status ?? '');
	};

	const formatTime = (iso?: string) => {
		if (!iso) return '';
		try {
			const d = new Date(iso);
			return d.toLocaleString('zh-CN', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return iso;
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-auth-border bg-auth-bg/80 h-[var(--layout-header-height)] px-4 backdrop-blur-md">
				<button
					onClick={() => navigate(toSlugged('/settings', slug))}
					className="rounded-lg p-1.5 text-neutral-400 hover:bg-auth-elevated hover:text-neutral-0 transition-colors"
					aria-label={t('common.back')}
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<h1 className="text-lg font-bold text-neutral-0">{t('activity.title')}</h1>
			</header>

			{/* Filter Tabs */}
			<div className="flex gap-1.5 overflow-x-auto border-b border-auth-border px-4 py-2 scrollbar-hide">
				{[
					{ key: 'all', labelKey: 'activity.all' },
					{ key: 'approved', labelKey: 'activity.approved' },
					{ key: 'denied', labelKey: 'activity.denied' },
					{ key: 'pending', labelKey: 'activity.pending' },
				].map((f) => (
					<button
						key={f.key}
						onClick={() => setFilter(f.key)}
						className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
							filter === f.key
								? 'bg-primary-600 text-white'
								: 'bg-auth-elevated text-neutral-400 hover:text-neutral-200'
						}`}
					>
						{t(f.labelKey)}
					</button>
				))}
			</div>

			<div className="flex-1 px-4 py-4">
				{loading ? (
					<LoadingScreen />
				) : error ? (
					<ErrorState description={error} />
				) : filtered.length === 0 ? (
					<div className="py-12 text-center text-sm text-neutral-400">{t('activity.empty')}</div>
				) : (
					<div className="space-y-2">
						{filtered.map((item) => (
							<div
								key={item.challengeId}
								className="flex items-start gap-3 rounded-xl border border-auth-border bg-auth-surface p-3"
							>
								<div className="mt-0.5">{getStatusIcon(item.status)}</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-neutral-0">
											{getStatusLabel(item.status)}
										</span>
										<span className="text-[11px] text-neutral-500">
											{formatTime(item.createdAt)}
										</span>
									</div>
									{item.loginContext && (
										<p className="mt-0.5 truncate text-xs text-neutral-400">{item.loginContext}</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<BottomNav />
		</div>
	);
}
