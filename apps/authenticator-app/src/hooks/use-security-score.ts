export function useSecurityScore(
	accountsCount: number,
	hasPin: boolean,
	pushEnabled: boolean,
	hasBackupCodes: boolean,
): number {
	let score = 0;
	score += Math.min(accountsCount * 4, 40);
	if (hasPin) score += 20;
	if (pushEnabled) score += 20;
	if (hasBackupCodes) score += 20;
	return Math.min(100, score);
}
