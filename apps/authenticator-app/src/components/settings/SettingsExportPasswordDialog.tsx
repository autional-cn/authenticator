import { useTranslation } from 'react-i18next';

export default function SettingsExportPasswordDialog({
	open,
	value,
	onChange,
	onExport,
	onCancel,
}: {
	open: boolean;
	value: string;
	onChange: (v: string) => void;
	onExport: (p: string | null) => void;
	onCancel: () => void;
}) {
	const { t } = useTranslation();

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="w-full max-w-xs rounded-xl border border-auth-border bg-auth-surface p-5">
				<h3 className="text-base font-semibold text-neutral-0 mb-1">
					{t('settings.exportPasswordTitle')}
				</h3>
				<p className="text-xs text-neutral-400 mb-4">{t('settings.exportPasswordDesc')}</p>
				<input
					id="export-password"
					name="export_password"
					type="password"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={t('settings.exportPasswordPlaceholder')}
					className="w-full rounded-lg border border-auth-border bg-auth-elevated px-3 py-2 text-sm text-neutral-0 placeholder-neutral-600 outline-none focus:border-primary-500 mb-3"
				/>
				<div className="flex gap-2">
					<button
						onClick={onCancel}
						className="flex-1 rounded-lg bg-auth-elevated py-2 text-sm font-medium text-neutral-300 hover:bg-auth-border transition-colors"
					>
						{t('common.cancel')}
					</button>
					<button
						onClick={() => onExport(value.trim() || null)}
						className="flex-1 rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
					>
						{t('settings.exportBackup')}
					</button>
				</div>
			</div>
		</div>
	);
}
