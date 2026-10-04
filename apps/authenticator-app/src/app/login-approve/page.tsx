'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@autional-cn/ui';
import { GeneratedApi, extractApiErrorMessage } from '@autional-cn/shared';

// Autional QR login approval page
// Entry: /login-approve?token=xxx&nm=123456
// Or deep-linked from push notification

interface LoginChallengeState {
	status: 'loading' | 'pending' | 'approved' | 'denied' | 'expired' | 'error';
	numberMatching?: string;
	errorMessage?: string;
}

export default function LoginApprovePage() {
	const [searchParams] = useSearchParams();
	const { t } = useTranslation();
	const token = searchParams.get('token') || '';
	const numberMatching = searchParams.get('nm') || '';
	const [state, setState] = useState<LoginChallengeState>({
		status: 'loading',
		numberMatching,
	});

	useEffect(() => {
		if (!token) {
			setState({ status: 'error', errorMessage: t('loginApprove.missingParams') });
			return;
		}
		setState((prev) => ({ ...prev, status: 'pending' }));
	}, [token, t]);

	const handleApprove = async () => {
		setState((prev) => ({ ...prev, status: 'loading' }));
		try {
			await GeneratedApi.authQrLoginConfirmPost({ token });
			setState((prev) => ({ ...prev, status: 'approved' }));
		} catch (err: unknown) {
			setState({
				status: 'error',
				errorMessage: extractApiErrorMessage(err, t('loginApprove.approveFailed')),
			});
		}
	};

	const handleDeny = async () => {
		setState((prev) => ({ ...prev, status: 'loading' }));
		try {
			await GeneratedApi.authQrLoginCancelPost({ token });
			setState((prev) => ({ ...prev, status: 'denied' }));
		} catch (err: unknown) {
			setState({
				status: 'error',
				errorMessage: extractApiErrorMessage(err, t('loginApprove.operationFailed')),
			});
		}
	};

	if (state.status === 'loading') {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
			</div>
		);
	}

	if (state.status === 'error') {
		return (
			<div className="flex min-h-screen items-center justify-center px-4">
				<div className="w-full max-w-sm space-y-4 text-center">
					<div className="text-red-500 text-lg">!</div>
					<p className="text-sm text-[var(--color-text-muted)]">{state.errorMessage}</p>
					<Button onClick={() => setState({ status: 'pending', numberMatching })}>
						{t('common.retry')}
					</Button>
				</div>
			</div>
		);
	}

	if (state.status === 'approved') {
		return (
			<div className="flex min-h-screen items-center justify-center px-4">
				<div className="w-full max-w-sm space-y-4 text-center">
					<div className="rounded-full bg-green-100 w-16 h-16 flex items-center justify-center mx-auto">
						<span className="text-2xl text-green-600"></span>
					</div>
					<h1 className="text-xl font-bold">{t('loginApprove.approvedTitle')}</h1>
					<p className="text-sm text-[var(--color-text-muted)]">{t('loginApprove.approvedDesc')}</p>
				</div>
			</div>
		);
	}

	if (state.status === 'denied') {
		return (
			<div className="flex min-h-screen items-center justify-center px-4">
				<div className="w-full max-w-sm space-y-4 text-center">
					<div className="rounded-full bg-red-100 w-16 h-16 flex items-center justify-center mx-auto">
						<span className="text-2xl text-red-600"></span>
					</div>
					<h1 className="text-xl font-bold">{t('loginApprove.deniedTitle')}</h1>
					<p className="text-sm text-[var(--color-text-muted)]">{t('loginApprove.deniedDesc')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="text-center">
					<h1 className="text-xl font-bold">{t('loginApprove.requestTitle')}</h1>
					<p className="mt-2 text-sm text-[var(--color-text-muted)]">{t('loginApprove.requestDesc')}</p>
				</div>

				{numberMatching && (
					<div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
						<p className="text-xs text-[var(--color-text-muted)] mb-2">{t('loginApprove.confirmNumber')}</p>
						<span className="text-3xl font-bold tracking-widest text-blue-700">
							{numberMatching}
						</span>
						<p className="mt-2 text-xs text-blue-600">{t('loginApprove.numberHint')}</p>
					</div>
				)}

				<div className="flex gap-3">
					<Button variant="danger" fullWidth onClick={handleDeny}>
						{t('loginApprove.deny')}
					</Button>
					<Button variant="primary" fullWidth onClick={handleApprove}>
						{t('loginApprove.approve')}
					</Button>
				</div>
			</div>
		</div>
	);
}
