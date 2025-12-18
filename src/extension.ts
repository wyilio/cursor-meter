import * as vscode from 'vscode';
import { fetchUsageSummary } from './api';

const TOKEN_STORAGE_KEY = 'cursor.workosToken';
let statusBarItem: vscode.StatusBarItem | undefined;
let refreshTimer: NodeJS.Timeout | undefined;
let debounceTimer: NodeJS.Timeout | undefined;

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
 * Creates or updates the status bar item
 */
function createStatusBarItem(): vscode.StatusBarItem {
	if (!statusBarItem) {
		statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		statusBarItem.command = 'cursor-meter.refresh';
		statusBarItem.tooltip = 'Click to refresh Cursor usage';
	}
	return statusBarItem;
}

/**
 * Updates the status bar with usage information
 */
function updateStatusBar(used: number, limit: number): void {
	const statusBar = createStatusBarItem();
	const percentage = limit > 0 ? ((used / limit) * 100).toFixed(1) : '0.0';
	statusBar.text = `Cursor Meter: ${used}/${limit} (${percentage}%)`;
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
 * This method is called when your extension is activated
 */
export async function activate(context: vscode.ExtensionContext) {
	try {
		console.log('[CURSOR-METER] Extension activating...');

		// Create status bar item
		createStatusBarItem();

		// Register refresh command
		const refreshCommand = vscode.commands.registerCommand('cursor-meter.refresh', () => {
			refreshUsage(context);
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
		});

		// Listen for when documents are saved (another indicator of completion)
		const documentSaveListener = vscode.workspace.onDidSaveTextDocument(() => {
			// Refresh immediately on save (no debounce needed)
			refreshUsage(context);
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
