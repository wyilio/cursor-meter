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

