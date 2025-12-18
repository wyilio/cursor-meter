import * as https from 'https';
import { UsageSummaryResponse } from './types';

const BASE_URL = 'cursor.com';
const API_PATH = '/api/usage-summary';

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

