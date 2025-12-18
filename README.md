# cursor-meter README

PoC extension demonstrating the integration of Cursor usage analytics from the web dashboard. 

## Features

Shows Cursor usage as a status bar: 
ex. `Cursor: 595/40000 (1.5%)`

## Installation

Currently unpublished and PoC. If you want to give this a try, `git clone` and run these commands in root:

```bash
git clone https://github.com/<your-username>/cursor-meter.git
cd cursor-meter
vsce package --no-dependencies
cursor --install-extension cursor-meter-0.0.1.vsix
```

Verify your Cursor account by:
1. Navigating to https://cursor.com/dashboard and opening Inspect by right clicking on your browser. 
2. Clicking the Application tab and finding the option under Cookies for https://cursor.com
3. Copying the value for `WorkosCursorSessionToken
4. Paste the token in Cursor where the extension asks for the token. If you don't see the prompt in Cursor, do Command+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux) and run `Cursor Meter: Change WorkOS Token`
