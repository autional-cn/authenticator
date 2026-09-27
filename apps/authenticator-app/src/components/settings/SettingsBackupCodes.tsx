import { useTranslation } from 'react-i18next';
import { KeyRound, AlertCircle } from 'lucide-react';

export default function SettingsBackupCodes({
	backupCodes,
	backupCodesCount,
	showBackupCodes,
	loading,
	error,
	onGenerate,
	onCopy,
}: {
	backupCodes: string[] | null;
	backupCodesCount: number;
	showBackupCodes: boolean;
	loading: boolean;
	error?: string | null;
	onGenerate: () => void;
	onCopy: () => void;
}) {
	const { t } = useTranslation();

	return (
		<div className="px-4 py-3">
			<div className="flex items-center gap-3 mb-2">
				<KeyRound className="h-4 w-4 text-neutral-400" />
				<span className="text-sm text-neutral-0">{t('settings.backupCodes')}</span>
				{backupCodesCount > 0 && (
					<span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
						{t('settings.backupCodesCount', { count: backupCodesCount })}
					</span>
				)}
			</div>
			<p className="text-[11px] text-neutral-500 mb-2">{t('settings.backupCodesDescription')}</p>
			{error && (
				<div className="mb-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-xs text-danger">
					<AlertCircle className="h-3.5 w-3.5 shrink-0" />
					{error}
				</div>
			)}
			{showBackupCodes && backupCodes && (
				<div className="mb-3 rounded-lg bg-auth-elevated p-3">
					<div className="grid grid-cols-2 gap-2">
						{backupCodes.map((code, i) => (
							<code key={i} className="text-center text-xs font-mono text-neutral-300">
								{code}
							</code>
						))}
					</div>
					<button
						onClick={onCopy}
						className="mt-2 w-full rounded-lg bg-auth-border py-1.5 text-xs text-neutral-300 hover:text-neutral-0 transition-colors"
					>
						{t('settings.backupCodesCopyAll')}
					</button>
				</div>
			)}
			<button
				onClick={onGenerate}
				disabled={loading}
				className="rounded-lg border border-auth-border bg-auth-elevated px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-neutral-0 transition-colors disabled:opacity-50"
			>
				{loading
					? t('settings.backupCodesGenerating')
					: backupCodesCount > 0
						? t('settings.backupCodesRegenerate')
						: t('settings.backupCodesGenerate')}
			</button>
		</div>
	);
}
