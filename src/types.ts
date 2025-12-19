/**
 * Response from /api/usage-summary endpoint
 */
export interface UsageSummaryResponse {
	billingCycleStart: string;
	billingCycleEnd: string;
	membershipType: string;
	limitType: string;
	isUnlimited: boolean;
	autoModelSelectedDisplayMessage: string;
	namedModelSelectedDisplayMessage: string;
	individualUsage: {
		plan: {
			enabled: boolean;
			used: number;
			limit: number;
			remaining: number;
			breakdown: {
				included: number;
				bonus: number;
				total: number;
			};
			autoSpend: number;
			apiSpend: number;
			autoLimit: number;
			apiLimit: number;
		};
		onDemand: {
			enabled: boolean;
			used: number;
			limit: number;
			remaining: number;
		};
	};
	teamUsage: Record<string, unknown>;
}

/**
 * Usage event from /api/dashboard/get-filtered-usage-events endpoint
 */
export interface UsageEvent {
	timestamp: string;
	model: string;
	kind: string;
	requestsCosts: number;
	usageBasedCosts: string | number;
	isTokenBasedCall: boolean;
	tokenUsage: {
		inputTokens?: number;
		outputTokens?: number;
		cacheWriteTokens?: number;
		cacheReadTokens?: number;
		totalCents: number;
	};
	owningUser: string;
	cursorTokenFee: number;
	isChargeable: boolean;
}

/**
 * Response from /api/dashboard/get-filtered-usage-events endpoint
 */
export interface UsageEventsResponse {
	totalUsageEventsCount: number;
	usageEventsDisplay: UsageEvent[];
}

