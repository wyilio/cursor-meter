import * as https from 'https';
import { UsageSummaryResponse, UsageEventsResponse } from './types';

const BASE_URL = 'cursor.com';
const API_PATH = '/api/usage-summary';
const USAGE_EVENTS_PATH = '/api/dashboard/get-filtered-usage-events';

/**
 * Fetches usage summary from Cursor API
 * @param token The WorkosCursorSessionToken cookie value
 * @returns Promise resolving to usage summary data
 */
export async function fetchUsageSummary(token: string): Promise<UsageSummaryResponse> {
	return new Promise<UsageSummaryResponse>((resolve, reject) => {
		const options: https.RequestOptions = {
			hostname: BASE_URL,
			path: API_PATH,
			method: 'GET',
			headers: {
				'accept': '*/*',
				'Cookie': `WorkosCursorSessionToken=${token}`,
				'referer': 'https://cursor.com/dashboard?tab=billing',
			},
		};

		const req = https.request(options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk.toString();
			});

			res.on('end', () => {
				try {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						const parsed = JSON.parse(data) as UsageSummaryResponse;
						resolve(parsed);
					} else {
						console.error(`[CURSOR-METER] HTTP error ${res.statusCode}: ${data}`);
						reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
					}
				} catch (error) {
					console.error('[CURSOR-METER] Failed to parse response:', error);
					reject(new Error(`Failed to parse response: ${error}`));
				}
			});
		});

		req.on('error', (error) => {
			console.error('[CURSOR-METER] Request failed:', error);
			reject(error);
		});

		req.end();
	});
}

/**
 * Fetches filtered usage events from Cursor API
 * @param token The WorkosCursorSessionToken cookie value
 * @param startDate Start date timestamp in milliseconds
 * @param endDate End date timestamp in milliseconds
 * @param pageSize Number of events to fetch (default: 5)
 * @returns Promise resolving to usage events data
 */
export async function fetchUsageEvents(
	token: string,
	startDate?: string,
	endDate?: string,
	pageSize: number = 5
): Promise<UsageEventsResponse> {
	return new Promise<UsageEventsResponse>((resolve, reject) => {
		// Default to last 7 days if no dates provided
		const now = Date.now();
		const defaultStartDate = (now - 7 * 24 * 60 * 60 * 1000).toString();
		const defaultEndDate = now.toString();

		const requestData = JSON.stringify({
			teamId: 0,
			startDate: startDate || defaultStartDate,
			endDate: endDate || defaultEndDate,
			page: 1,
			pageSize: pageSize,
		});

		const options: https.RequestOptions = {
			hostname: BASE_URL,
			path: USAGE_EVENTS_PATH,
			method: 'POST',
			headers: {
				'accept': '*/*',
				'content-type': 'application/json',
				'origin': 'https://cursor.com',
				'referer': 'https://cursor.com/dashboard?tab=usage',
				'Cookie': `WorkosCursorSessionToken=${token}`,
			},
		};

		const req = https.request(options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk.toString();
			});

			res.on('end', () => {
				try {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						const parsed = JSON.parse(data) as UsageEventsResponse;
						resolve(parsed);
					} else {
						console.error(`[CURSOR-METER] HTTP error ${res.statusCode}: ${data}`);
						reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
					}
				} catch (error) {
					console.error('[CURSOR-METER] Failed to parse response:', error);
					reject(new Error(`Failed to parse response: ${error}`));
				}
			});
		});

		req.on('error', (error) => {
			console.error('[CURSOR-METER] Request failed:', error);
			reject(error);
		});

		req.write(requestData);
		req.end();
	});
}

