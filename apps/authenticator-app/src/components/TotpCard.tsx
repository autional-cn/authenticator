import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Trash2, ArrowUp, Pencil } from 'lucide-react';
import { showToast } from '@autional-cn/ui';
import { generateTOTP, TOTPResult } from '@/lib/totp';
import type { TotpAccount } from '@/lib/store';
import CountdownRing from './CountdownRing';
import BrandIcon from './BrandIcon';
import ContextMenu from './ContextMenu';

interface TotpCardProps {
	account: TotpAccount;
	onDelete: (id: string) => void;
	onEdit?: (id: string) => void;
	onPin?: (id: string) => void;
	batchMode?: boolean;
	isSelected?: boolean;
	onToggleSelect?: (id: string) => void;
}

export default function TotpCard({
	account,
	onDelete,
	onEdit,
	onPin,
	batchMode,
	isSelected,
	onToggleSelect,
}: TotpCardProps) {
	const { t } = useTranslation();
	const [totp, setTotp] = useState<TOTPResult | null>(null);
	const [copied, setCopied] = useState(false);
	const [showDelete, setShowDelete] = useState(false);

	const refresh = useCallback(async () => {
		const result = await generateTOTP(
			account.secret,
			account.period,
			account.digits,
			account.algorithm,
		);
		setTotp(result);
	}, [account.secret, account.period, account.digits, account.algorithm]);

	useEffect(() => {
		refresh();
		const interval = setInterval(refresh, 1000);
		return () => clearInterval(interval);
	}, [refresh]);

	const handleCopy = async () => {
		if (!totp) return;
		await navigator.clipboard.writeText(totp.code);
		setCopied(true);
		showToast(t('account.copied'), 'success');
		setTimeout(() => setCopied(false), 2000);
		setTimeout(() => {
			navigator.clipboard.writeText('').catch(() => {});
		}, 30000);
	};

	const menuItems = [
		{
			label: t('card.copyCode'),
			icon: <Copy className="h-3.5 w-3.5" />,
			onClick: handleCopy,
		},
		{
			label: t('card.editAccount'),
			icon: <Pencil className="h-3.5 w-3.5" />,
			onClick: () => onEdit?.(account.id),
		},
		{
			label: account.pinned ? t('account.cancelPin') : t('account.pinTop'),
			icon: <ArrowUp className="h-3.5 w-3.5" />,
			onClick: () => {
				onPin?.(account.id);
				showToast(account.pinned ? t('account.unpinned') : t('account.pinned'), 'success');
			},
		},
		{
			label: t('common.delete'),
			icon: <Trash2 className="h-3.5 w-3.5" />,
			danger: true,
			onClick: () => setShowDelete(true),
		},
	];

	return (
		<ContextMenu items={menuItems} disabled={batchMode}>
			<div
				className={`relative overflow-hidden rounded-xl border p-4 transition-all cursor-pointer ${
					isSelected ? 'border-primary-500 bg-primary-500/5' : 'border-auth-border bg-auth-surface'
				} ${batchMode ? '' : 'active:scale-[0.98]'}`}
				onClick={() => (batchMode ? onToggleSelect?.(account.id) : onEdit?.(account.id))}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						(batchMode ? onToggleSelect : onEdit)?.(account.id);
					}
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2 min-w-0">
						{batchMode && (
							<div
								className={`mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
									isSelected ? 'border-primary-500 bg-primary-500 text-white' : 'border-neutral-600'
								}`}
							>
								{isSelected && <Check className="h-3 w-3" />}
							</div>
						)}
						<BrandIcon name={account.name} username={account.username} size={32} />
						<div className="min-w-0">
							<h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{account.name}</h2>
							<p className="text-xs text-[var(--color-text-secondary)] truncate">{account.username}</p>
						</div>
					</div>
					<button
						onClick={(e) => {
							if (batchMode) e.stopPropagation();
							setShowDelete(!showDelete);
						}}
						className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-danger/10 hover:text-danger transition-colors"
						aria-label="删除账户"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>

				{/* TOTP Code */}
				<div className="flex items-center justify-between">
					<button
						onClick={(e) => {
							if (batchMode) e.stopPropagation();
							handleCopy();
						}}
						className="group flex items-center gap-3"
					>
						<span className="totp-code text-3xl font-mono font-bold tracking-wider text-[var(--color-text-primary)]">
							{totp?.code ?? '------'}
						</span>
						<span className="rounded-md p-1.5 text-[var(--color-text-muted)] group-hover:bg-primary-500/10 group-hover:text-primary-400 transition-colors">
							{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
						</span>
					</button>
					<CountdownRing progress={totp?.progress ?? 1} size={44} strokeWidth={3} />
				</div>

				{/* Delete confirmation overlay */}
				{showDelete && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-auth-surface/95 backdrop-blur-sm gap-3">
						<p className="text-sm text-[var(--color-text-secondary)]">{t('card.confirmDelete')}</p>
						<div className="flex gap-2">
							<button
								onClick={() => setShowDelete(false)}
								className="rounded-lg bg-auth-elevated px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-auth-border transition-colors"
							>
								{t('common.cancel')}
							</button>
							<button
								onClick={() => onDelete(account.id)}
								className="rounded-lg bg-danger px-4 py-1.5 text-xs font-medium text-white hover:bg-danger/80 transition-colors"
							>
								{t('common.delete')}
							</button>
						</div>
					</div>
				)}
			</div>
		</ContextMenu>
	);
}
