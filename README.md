# cursor-meter README

PoC extension demonstrating the integration of Cursor usage analytics from the web dashboard. 

More features are planned but currently keeping this as simple as possible.

If you just need to see percent of usage limit, you should use Cursor's built-in Usage Summary in chat by setting Usage Summary to `Always` under Agent Settings in Cursor Settings.

Cursor's Usage Summary only displays usage in rounded percentages. This extension displays usage accurate to within 0.1 percentage points.

## Features

Shows Cursor usage as a status bar: 
ex. `Cursor: 595/40000 (1.5%)` where 595 is $5.95

## Installation

Verify your Cursor account:
1. Navigate to https://cursor.com/dashboard and opening Inspect by right clicking on your browser. 
2. Click the Application tab and find the option under Cookies for https://cursor.com
3. Copy the value for `WorkosCursorSessionToken`
4. Paste the token in Cursor where the extension asks for the token. If you don't see the prompt in Cursor, do Command+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux) and run `Cursor Meter: Change WorkOS Token`
