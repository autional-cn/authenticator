import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
	ArrowLeft,
	Bell,
	Mail,
	Shield,
	Info,
	AlertTriangle,
	CheckCheck,
	RefreshCw,
	ExternalLink,
} from 'lucide-react';
import { LoadingScreen, ErrorState } from '@autional-cn/ui';
import { useAuth } from '@autional-cn/shared';
import { GeneratedApi } from '@autional-cn/shared';
import BottomNav from '@/components/BottomNav';
import { toSlugged, useTenantSlug } from '../../lib/slug';

interface NotificationItem {
	id: string;
	title?: string;
	content?: string;
	type?: string;
	priority?: string;
	isRead?: boolean;
	actionUrl?: string;
	createdAt?: string;
	readAt?: string;
	metadata?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	system: Bell,
	security: Shield,
	email: Mail,
	info: Info,
	warning: AlertTriangle,
};

const TYPE_COLORS: Record<string, string> = {
	security: 'text-warning',
	warning: 'text-warning',
	system: 'text-primary-400',
	email: 'text-info',
	info: 'text-[var(--color-text-secondary)]',
};

export default function NotificationsPage() {
	const navigate = useNavigate();
	const slug = useTenantSlug();
	const { t } = useTranslation();
	const { userId } = useAuth();

	const [items, setItems] = useState<NotificationItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [unreadCount, setUnreadCount] = useState(0);
	const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
	const [markingAll, setMarkingAll] = useState(false);

	const fetchNotifications = useCallback(
		async (silent = false) => {
			if (!userId) return;
			if (!silent) setLoading(true);
			setError(null);
			try {
				const res = (await GeneratedApi.notifications({
					page: 1,
					page_size: 50,
				})) as { items?: NotificationItem[] };
				setItems(res?.items || []);
			} catch {
				setError(t('notifications.loadFailed'));
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[userId, t],
	);

	const fetchUnreadCount = useCallback(async () => {
		if (!userId) return;
		try {
			const res = (await GeneratedApi.notificationsUnreadCount()) as {
				count?: number;
				data?: { count?: number };
			};
			setUnreadCount(res?.count ?? res?.data?.count ?? 0);
		} catch {
			// 未读计数获取失败时保持 0
		}
	}, [userId]);

	useEffect(() => {
		fetchNotifications();
		fetchUnreadCount();
	}, [fetchNotifications, fetchUnreadCount]);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchNotifications();
		fetchUnreadCount();
	};

	const handleMarkRead = async (id: string) => {
		try {
			await GeneratedApi.notificationsReadByNotificationsPut(id);
			setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
			setUnreadCount((prev) => Math.max(0, prev - 1));
		} catch {
			// 标记已读失败时静默
		}
	};

	const handleMarkAllRead = async () => {
		setMarkingAll(true);
		try {
			await GeneratedApi.notificationsReadAllPut();
			setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
			setUnreadCount(0);
		} catch {
			// 全部已读失败时静默
		}
		setMarkingAll(false);
	};

	const handleActionUrl = (url?: string) => {
		if (!url) return;
		if (url.startsWith('http')) {
			window.open(url, '_blank', 'noopener');
		} else if (url.startsWith('/')) {
			// 站内相对路径（action_url 形态，seed 示例 /profile/mfa 等）→ 带 slug
			navigate(toSlugged(url, slug));
		} else {
			// 防御：非站内相对形态（无前导 /）原样导航，避免破坏异常值
			navigate(url);
		}
	};

	const filtered =
		filter === 'all'
			? items
			: filter === 'unread'
				? items.filter((i) => !i.isRead)
				: items.filter((i) => i.isRead);

	const getTypeIcon = (type?: string) => {
		const iconKey = type || 'info';
		const Icon = TYPE_ICONS[iconKey] || TYPE_ICONS.info;
		return <Icon className={`h-5 w-5 ${TYPE_COLORS[iconKey] || 'text-[var(--color-text-secondary)]'}`} />;
	};

	const formatTime = (iso?: string) => {
		if (!iso) return '';
		try {
			const d = new Date(iso);
			const now = new Date();
			const diffMs = now.getTime() - d.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			if (diffMins < 1) return t('notifications.justNow');
			if (diffMins < 60) return t('notifications.minutesAgo', { n: diffMins });
			const diffHours = Math.floor(diffMins / 60);
			if (diffHours < 24) return t('notifications.hoursAgo', { n: diffHours });
			const diffDays = Math.floor(diffHours / 24);
			if (diffDays < 7) return t('notifications.daysAgo', { n: diffDays });
			return d.toLocaleDateString('zh-CN', {
				month: 'short',
				day: 'numeric',
			});
		} catch {
			return iso;
		}
	};

	const getPriorityStyles = (priority?: string) => {
		if (priority === 'high') return 'border-l-2 border-l-danger';
		if (priority === 'medium') return 'border-l-2 border-l-warning';
		return '';
	};

	return (
		<div className="flex h-full flex-col">
			<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-auth-border bg-auth-bg/80 h-[var(--layout-header-height)] px-4 backdrop-blur-md">
				<button
					onClick={() => navigate(toSlugged('/', slug))}
					className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-auth-elevated hover:text-[var(--color-text-primary)] transition-colors"
					aria-label={t('common.back')}
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t('notifications.title')}</h1>
				<div className="ml-auto flex items-center gap-2">
					{unreadCount > 0 && (
						<span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-medium text-white">
							{unreadCount}
						</span>
					)}
					<button
						onClick={handleRefresh}
						disabled={refreshing}
						className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-auth-elevated hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
						aria-label={t('notifications.refresh')}
					>
						<RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
					</button>
					{items.some((i) => !i.isRead) && (
						<button
							onClick={handleMarkAllRead}
							disabled={markingAll}
							className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-auth-elevated hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
							aria-label={t('notifications.markAllRead')}
						>
							<CheckCheck className="h-5 w-5" />
						</button>
					)}
				</div>
			</header>

			<div className="flex gap-1.5 overflow-x-auto border-b border-auth-border px-4 py-2 scrollbar-hide">
				{[
					{ key: 'all', labelKey: 'activity.all' },
					{ key: 'unread', labelKey: 'notifications.unread' },
					{ key: 'read', labelKey: 'notifications.read' },
				].map((f) => (
					<button
						key={f.key}
						onClick={() => setFilter(f.key as typeof filter)}
						className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
							filter === f.key
								? 'bg-primary-600 text-white'
								: 'bg-auth-elevated text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
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
					<ErrorState description={error} onRetry={() => fetchNotifications()} />
				) : filtered.length === 0 ? (
					<div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
						{t('notifications.empty')}
					</div>
				) : (
					<div className="space-y-2">
						{filtered.map((item) => (
							<button
								key={item.id}
								onClick={() => {
									if (!item.isRead) handleMarkRead(item.id);
									if (item.actionUrl) handleActionUrl(item.actionUrl);
								}}
								className={`w-full text-left rounded-xl border border-auth-border bg-auth-surface p-3 transition-colors hover:bg-auth-elevated ${getPriorityStyles(item.priority)} ${!item.isRead ? 'bg-auth-elevated/50' : ''}`}
							>
								<div className="flex items-start gap-3">
									<div className="mt-0.5 shrink-0">{getTypeIcon(item.type)}</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between">
											<span
												className={`text-sm truncate ${!item.isRead ? 'font-semibold text-[var(--color-text-primary)]' : 'font-medium text-[var(--color-text-primary)]'}`}
											>
												{item.title || t('notifications.defaultTitle')}
											</span>
											<div className="flex items-center gap-2 shrink-0 ml-2">
												{!item.isRead && <span className="h-2 w-2 rounded-full bg-primary-500" />}
												<span className="text-[11px] text-[var(--color-text-muted)]">
													{formatTime(item.createdAt)}
												</span>
											</div>
										</div>
										{item.content && (
											<p
												className={`mt-0.5 text-xs line-clamp-2 ${!item.isRead ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-secondary)]'}`}
											>
												{item.content}
											</p>
										)}
										{item.actionUrl && (
											<div className="mt-1 flex items-center gap-1 text-[11px] text-primary-400">
												<ExternalLink className="h-3 w-3" />
												<span>{t('notifications.viewDetails')}</span>
											</div>
										)}
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>

			<BottomNav />
		</div>
	);
}
