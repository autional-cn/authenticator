import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, Search, X, LayoutGrid, List, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@autional-cn/ui';
import { useAuthenticatorStore } from '@/lib/store';
import { generateTOTP } from '@/lib/totp';
import TotpCard from '@/components/TotpCard';
import EmptyState from '@/components/EmptyState';
import BottomNav from '@/components/BottomNav';
import NetworkStatus from '@/components/NetworkStatus';
import { LanguageSwitcher } from '@autional-cn/ui';
import { toSlugged, useTenantSlug } from '../lib/slug';

export default function HomePage() {
	const navigate = useNavigate();
	const slug = useTenantSlug();
	const { t } = useTranslation();
	const {
		accounts,
		removeAccount,
		toggleAccountPin,
		searchQuery,
		setSearchQuery,
		selectedGroup,
		setSelectedGroup,
	} = useAuthenticatorStore();
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
	const [batchMode, setBatchMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Extract all unique groups
	const groups = useMemo(() => {
		const set = new Set<string>();
		accounts.forEach((a) => {
			if (a.group) set.add(a.group);
		});
		return Array.from(set).sort();
	}, [accounts]);

	// Filter accounts by search + group
	const filteredAccounts = useMemo(() => {
		let result = accounts;

		if (selectedGroup) {
			result = result.filter((a) => a.group === selectedGroup);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(a) =>
					a.name.toLowerCase().includes(q) ||
					a.username.toLowerCase().includes(q) ||
					(a.group?.toLowerCase().includes(q) ?? false),
			);
		}

		return [...result].sort((a, b) => {
			const aPin = a.pinned ? 1 : 0;
			const bPin = b.pinned ? 1 : 0;
			if (aPin !== bPin) return bPin - aPin;
			const aOrder = a.order ?? 0;
			const bOrder = b.order ?? 0;
			if (aOrder !== bOrder) return aOrder - bOrder;
			return b.createdAt - a.createdAt;
		});
	}, [accounts, searchQuery, selectedGroup]);

	const handlePinAccount = (id: string) => {
		toggleAccountPin(id);
	};

	const exitBatchMode = useCallback(() => {
		setBatchMode(false);
		setSelectedIds(new Set());
	}, []);

	const toggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleBatchCopy = useCallback(async () => {
		const selectedAccounts = filteredAccounts.filter((a) => selectedIds.has(a.id));
		if (selectedAccounts.length === 0) return;

		try {
			const codes = await Promise.all(
				selectedAccounts.map(async (a) => {
					const result = await generateTOTP(a.secret, a.period, a.digits, a.algorithm);
					return result.code;
				}),
			);

			const text = codes.join('\n');
			await navigator.clipboard.writeText(text);
			showToast(t('home.batchCopied', { n: codes.length }), 'success');
		} catch {
			showToast(t('home.copyFailed'), 'error');
		}
	}, [filteredAccounts, selectedIds, t]);

	const handleEditAccount = (id: string) => {
		navigate(toSlugged(`/account?id=${id}`, slug));
	};

	return (
		<div className="flex h-full flex-col">
			{/* Network Status Banner */}
			<NetworkStatus />

			{/* Header */}
			<header className="sticky top-0 z-10 flex items-center border-b border-auth-border bg-auth-bg/80 h-[var(--layout-header-height)] px-4 backdrop-blur-md">
				<div className="flex items-center gap-2">
					<ShieldCheck className="h-6 w-6 text-primary-500" />
					<h1 className="text-lg font-bold text-neutral-0">{t('home.title')}</h1>
					<LanguageSwitcher className="ml-auto mr-2" />
					<span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-medium text-primary-400">
						{t('home.accountsCount', { n: accounts.length })}
					</span>
					<button
						onClick={() => {
							if (batchMode) {
								exitBatchMode();
							} else {
								setBatchMode(true);
							}
						}}
						className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
							batchMode ? 'bg-primary-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
						}`}
					>
						{batchMode ? t('common.cancel') : t('home.multiSelect')}
					</button>
				</div>

				{/* Search Bar */}
				<div className="mt-3 flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t('home.searchPlaceholder')}
							aria-label={t('home.searchPlaceholder')}
							className="w-full rounded-xl border border-auth-border bg-auth-elevated py-2 pl-9 pr-8 text-sm text-neutral-0 placeholder-neutral-600 outline-none transition-colors focus:border-primary-500"
						/>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery('')}
								className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-neutral-500 hover:text-neutral-300"
								aria-label={t('home.clearFilter')}
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
					<button
						onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
						className="rounded-xl border border-auth-border bg-auth-elevated p-2 text-neutral-400 hover:text-neutral-200"
						aria-label={viewMode === 'list' ? t('home.gridView') : t('home.listView')}
					>
						{viewMode === 'list' ? (
							<LayoutGrid className="h-4 w-4" />
						) : (
							<List className="h-4 w-4" />
						)}
					</button>
				</div>

				{/* Group Filter Chips */}
				{groups.length > 0 && (
					<div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
						<button
							onClick={() => setSelectedGroup(null)}
							className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
								selectedGroup === null
									? 'bg-primary-600 text-white'
									: 'bg-auth-elevated text-neutral-400 hover:text-neutral-200'
							}`}
						>
							{t('home.filterAll')}
						</button>
						{groups.map((g) => (
							<button
								key={g}
								onClick={() => setSelectedGroup(g === selectedGroup ? null : g)}
								className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
									g === selectedGroup
										? 'bg-primary-600 text-white'
										: 'bg-auth-elevated text-neutral-400 hover:text-neutral-200'
								}`}
							>
								{g}
							</button>
						))}
					</div>
				)}
			</header>

			{/* Content */}
			<div className="flex-1 px-4 py-4">
				<h2 className="sr-only">{t('nav.accounts')}</h2>
				{filteredAccounts.length === 0 ? (
					accounts.length === 0 ? (
						<EmptyState />
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<p className="text-sm text-neutral-400">{t('home.noMatch')}</p>
							<button
								onClick={() => {
									setSearchQuery('');
									setSelectedGroup(null);
								}}
								className="mt-2 text-xs text-primary-400 hover:text-primary-300"
							>
								{t('home.clearFilter')}
							</button>
						</div>
					)
				) : (
					<div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
						{filteredAccounts.map((account) => (
							<div key={account.id}>
								<TotpCard
									account={account}
									onDelete={removeAccount}
									onEdit={handleEditAccount}
									onPin={handlePinAccount}
									batchMode={batchMode}
									isSelected={selectedIds.has(account.id)}
									onToggleSelect={toggleSelect}
								/>
							</div>
						))}
					</div>
				)}
			</div>

			{batchMode && selectedIds.size > 0 && (
				<button
					onClick={handleBatchCopy}
					className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-primary-600/25 transition-transform active:scale-95"
				>
					<Copy className="h-4 w-4" />
					{t('home.batchCopy', { n: selectedIds.size })}
				</button>
			)}

			<BottomNav />
		</div>
	);
}
