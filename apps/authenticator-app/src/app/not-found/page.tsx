import { Link } from 'react-router';
import { FileQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toSlugged, useTenantSlug } from '@/lib/slug';

/**
 * NotFoundPage — 404（TASK-428，ADR-4）
 *
 * 贴合 authenticator 设计（mobile-first，纯 Tailwind + CSS 变量，无 antd）。
 * 返回链接必须带 slug（basename 恒 /，裸路径会再次 404）。
 */
export default function NotFoundPage() {
	const slug = useTenantSlug();
	const { t } = useTranslation();
	const homePath = toSlugged('/', slug);
	return (
		<div className="flex h-full flex-col items-center justify-center px-4 text-center">
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-500/10">
				<FileQuestion size={40} className="text-primary-500" />
			</div>
			<h1 className="mt-6 text-4xl font-bold text-neutral-0">404</h1>
			<p className="mt-2 text-base text-neutral-300">{t('notFound.title')}</p>
			<p className="mt-1 text-sm text-neutral-500">{t('notFound.desc')}</p>
			<Link
				to={homePath}
				className="mt-8 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-500"
			>
				{t('notFound.backHome')}
			</Link>
		</div>
	);
}
