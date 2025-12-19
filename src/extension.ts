import * as vscode from 'vscode';
import { fetchUsageSummary, fetchUsageEvents } from './api';
import { UsageEvent } from './types';

const TOKEN_STORAGE_KEY = 'cursor.workosToken';
let statusBarItem: vscode.StatusBarItem | undefined;
let refreshTimer: NodeJS.Timeout | undefined;
let debounceTimer: NodeJS.Timeout | undefined;
let cachedLastEvent: UsageEvent | undefined;
let lastEventFetchTime: number = 0;
const EVENT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Prompts the user to enter their WorkOS token and stores it securely
 */
async function promptForToken(context: vscode.ExtensionContext): Promise<string | undefined> {
	try {
		const token = await vscode.window.showInputBox({
			prompt: 'Enter your WorkosCursorSessionToken cookie value',
			placeHolder: 'Paste token here...',
			password: true,
			ignoreFocusOut: true,
			title: 'Cursor Meter - Authentication Required',
		});

		if (token && token.trim()) {
			await context.secrets.store(TOKEN_STORAGE_KEY, token.trim());
			console.log('[CURSOR-METER] Token stored securely');
			return token.trim();
		}
		return undefined;
	} catch (error) {
		console.error('[CURSOR-METER] Failed to save token:', error);
		vscode.window.showErrorMessage(`Failed to save token: ${error}`);
		return undefined;
	}
}

/**
 * Gets the stored token, prompting if not found
 */
async function getToken(context: vscode.ExtensionContext): Promise<string | undefined> {
	let token = await context.secrets.get(TOKEN_STORAGE_KEY);
	if (!token) {
		console.log('[CURSOR-METER] No token found, prompting user...');
		token = await promptForToken(context);
	}
	return token;
}

/**
 * Fetches the last usage event (lazy loading)
 * Only fetches after Cursor requests or when cache is stale
 */
async function fetchLastEvent(context: vscode.ExtensionContext, force: boolean = false): Promise<void> {
	const now = Date.now();
	
	// Use cache if it's still fresh (less than 5 minutes old) and not forcing
	if (!force && cachedLastEvent && (now - lastEventFetchTime) < EVENT_CACHE_DURATION) {
		return;
	}
	
	try {
		const token = await getToken(context);
		if (!token) {
			return;
		}
		
		console.log('[CURSOR-METER] Fetching last usage event...');
		const usageEvents = await fetchUsageEvents(token, undefined, undefined, 1);
		
		if (usageEvents.usageEventsDisplay.length > 0) {
			cachedLastEvent = usageEvents.usageEventsDisplay[0];
			lastEventFetchTime = now;
			
			// Update tooltip
			updateTooltip();
		}
	} catch (error) {
		console.warn('[CURSOR-METER] Failed to fetch last usage event:', error);
		// Don't update tooltip on error, keep cached value
	}
}

/**
 * Updates the tooltip with cached or placeholder content
 */
function updateTooltip(): void {
	if (statusBarItem) {
		statusBarItem.tooltip = createUsageTooltip(cachedLastEvent);
	}
}

/**
 * Creates or updates the status bar item
 */
function createStatusBarItem(): vscode.StatusBarItem {
	if (!statusBarItem) {
		statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		statusBarItem.command = 'cursor-meter.refresh';
		updateTooltip();
	}
	return statusBarItem;
}

/**
 * Creates a markdown tooltip with the last usage event details
 */
function createUsageTooltip(event: UsageEvent | undefined): vscode.MarkdownString {
	const markdown = new vscode.MarkdownString();
	markdown.isTrusted = true;
	
	if (!event) {
		markdown.appendMarkdown('### Cursor Usage Details\n\n');
		markdown.appendMarkdown('Click to refresh and load usage details.');
		return markdown;
	}
	
	const totalCost = event.requestsCosts + event.tokenUsage.totalCents;
	const timestamp = formatTimestamp(event.timestamp);
	
	markdown.appendMarkdown('### Last Request\n\n');
	markdown.appendMarkdown(`**${event.model}**\n\n`);
	markdown.appendMarkdown(`📅 ${timestamp}\n\n`);
	markdown.appendMarkdown(`**Cost Breakdown:**\n`);
	markdown.appendMarkdown(`- Base Request: \`${formatCents(event.requestsCosts)}\`\n`);
	markdown.appendMarkdown(`- Token Usage: \`${formatCents(event.tokenUsage.totalCents)}\`\n`);
	markdown.appendMarkdown(`- **Total: \`${formatCents(totalCost)}\`**\n\n`);
	
	markdown.appendMarkdown(`**Token Usage:**\n`);
	if (event.tokenUsage.inputTokens !== undefined) {
		markdown.appendMarkdown(`- Input: \`${formatTokens(event.tokenUsage.inputTokens)}\`\n`);
	}
	if (event.tokenUsage.outputTokens !== undefined) {
		markdown.appendMarkdown(`- Output: \`${formatTokens(event.tokenUsage.outputTokens)}\`\n`);
	}
	if (event.tokenUsage.cacheWriteTokens !== undefined) {
		markdown.appendMarkdown(`- Cache Write: \`${formatTokens(event.tokenUsage.cacheWriteTokens)}\`\n`);
	}
	if (event.tokenUsage.cacheReadTokens !== undefined) {
		markdown.appendMarkdown(`- Cache Read: \`${formatTokens(event.tokenUsage.cacheReadTokens)}\`\n`);
	}
	
	const status = event.kind.includes('INCLUDED') ? '✅ INCLUDED' : '💰 CHARGED';
	markdown.appendMarkdown(`\n**Status:** ${status}`);
	
	return markdown;
}

/**
 * Updates the status bar with usage information
 */
function updateStatusBar(used: number, limit: number): void {
	const statusBar = createStatusBarItem();
	const percentage = limit > 0 ? ((used / limit) * 100).toFixed(1) : '0.0';
	statusBar.text = `Cursor Meter: ${used}/${limit} (${percentage}%)`;
	
	// Use cached event if available, otherwise show placeholder
	statusBar.tooltip = createUsageTooltip(cachedLastEvent);
	
	statusBar.show();
}

/**
 * Sets status bar to error state
 */
function setStatusBarError(message: string): void {
	const statusBar = createStatusBarItem();
	statusBar.text = `$(error) Cursor Meter: ${message}`;
	statusBar.show();
}

/**
 * Refreshes usage data and updates the status bar
 */
async function refreshUsage(context: vscode.ExtensionContext): Promise<void> {
	try {
		const token = await getToken(context);
		if (!token) {
			setStatusBarError('No token');
			return;
		}

		console.log('[CURSOR-METER] Fetching usage summary...');
		const usageSummary = await fetchUsageSummary(token);

		const plan = usageSummary.individualUsage.plan;
		if (plan.enabled) {
			updateStatusBar(plan.used, plan.limit);
			console.log(`[CURSOR-METER] Usage: ${plan.used}/${plan.limit} (${((plan.used / plan.limit) * 100).toFixed(1)}%)`);
		} else {
			setStatusBarError('Plan disabled');
		}
	} catch (error) {
		console.error('[CURSOR-METER] Failed to refresh usage:', error);
		setStatusBarError('Refresh failed');
		
		// If it's an auth error, clear token and prompt again
		if (error instanceof Error && error.message.includes('401')) {
			await context.secrets.delete(TOKEN_STORAGE_KEY);
			vscode.window.showWarningMessage('Authentication failed. Please re-enter your token.');
		}
	}
}

/**
 * Sets up periodic refresh timer
 */
function setupRefreshTimer(context: vscode.ExtensionContext): void {
	if (refreshTimer) {
		clearInterval(refreshTimer);
	}
	// Refresh every 30 minutes
	refreshTimer = setInterval(() => {
		refreshUsage(context);
	}, 30 * 60 * 1000);
}

/**
 * Debounced refresh - refreshes after user stops editing for a short period
 */
function debouncedRefresh(context: vscode.ExtensionContext): void {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	// Wait 2 seconds after last edit before refreshing
	debounceTimer = setTimeout(() => {
		refreshUsage(context);
	}, 2000);
}

/**
 * Formats a timestamp to a readable date/time string
 */
function formatTimestamp(timestamp: string): string {
	const date = new Date(parseInt(timestamp));
	return date.toLocaleString();
}

/**
 * Formats cents to dollars
 */
function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(4)}`;
}

/**
 * Formats token count with commas
 */
function formatTokens(tokens: number | undefined): string {
	if (tokens === undefined) {
		return '0';
	}
	return tokens.toLocaleString();
}



/**
 * This method is called when your extension is activated
 */
export async function activate(context: vscode.ExtensionContext) {
	try {
		console.log('[CURSOR-METER] Extension activating...');

		// Create status bar item
		createStatusBarItem();

		// Register refresh command
		const refreshCommand = vscode.commands.registerCommand('cursor-meter.refresh', async () => {
			await refreshUsage(context);
			// Also refresh the last event when manually refreshing
			await fetchLastEvent(context, true);
		});

		// Register command to set/change token
		const setTokenCommand = vscode.commands.registerCommand('cursor-meter.setToken', async () => {
			const token = await promptForToken(context);
			if (token) {
				vscode.window.showInformationMessage('WorkOS token updated successfully!');
				await refreshUsage(context);
			}
		});

		// Listen for document changes (indicates AI completion or edits)
		const documentChangeListener = vscode.workspace.onDidChangeTextDocument(() => {
			debouncedRefresh(context);
			// Fetch last event after a Cursor request (debounced to avoid too many requests)
			// Wait 3 seconds after edit to allow the usage to be recorded
			setTimeout(() => {
				fetchLastEvent(context, true); // Force fetch after actual Cursor request
			}, 3000);
		});

		// Listen for when documents are saved (another indicator of completion)
		const documentSaveListener = vscode.workspace.onDidSaveTextDocument(() => {
			// Refresh immediately on save (no debounce needed)
			refreshUsage(context);
			// Fetch last event after save (actual Cursor request)
			fetchLastEvent(context, true);
		});

		context.subscriptions.push(
			statusBarItem!,
			refreshCommand,
			setTokenCommand,
			documentChangeListener,
			documentSaveListener
		);

		// Initial refresh
		await refreshUsage(context);

		// Setup periodic refresh
		setupRefreshTimer(context);

		console.log('[CURSOR-METER] Extension activated successfully');
	} catch (error) {
		console.error('[CURSOR-METER] Error activating extension:', error);
		vscode.window.showErrorMessage(`Cursor Meter activation error: ${error}`);
	}
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
	if (refreshTimer) {
		clearInterval(refreshTimer);
	}
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
}
