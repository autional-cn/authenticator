import { getBrandInfo } from '@/lib/icons';

interface BrandIconProps {
	name: string;
	username?: string;
	size?: number;
	className?: string;
}

export default function BrandIcon({ name, username, size = 32, className = '' }: BrandIconProps) {
	const brand = getBrandInfo(name, username);

	return (
		<div
			className={`flex shrink-0 items-center justify-center rounded-lg font-bold ${className}`}
			style={{
				width: size,
				height: size,
				backgroundColor: brand.bgColor,
				color: brand.color,
				fontSize: size * 0.45,
				lineHeight: 1,
			}}
			title={brand.name}
		>
			{brand.initial}
		</div>
	);
}
