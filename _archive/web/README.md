# AUTUS Tesla Shell — Web Demo

AUTUS Tesla-like Shell web implementation with Station/Line/Alternate state machine.

## Files

- `tesla-shell.html` — Main demo file (self-contained HTML with embedded CSS and JS)
- `tokens.css` — Design tokens (imported by tesla-shell.html)

## How to Open Locally

### Option 1: Direct File Open

Open `tesla-shell.html` directly in a modern browser (Chrome, Firefox, Safari, Edge).

```bash
open tesla-shell.html
```

### Option 2: Local HTTP Server

For full functionality, serve via HTTP:

```bash
cd /path/to/autus/web
python3 -m http.server 8080
```

Then open `http://localhost:8080/tesla-shell.html` in browser.

## What to Test

### HOME/MAP/CONTROLS Toggles

- Click dock buttons (Home, Map, Controls) to switch views
- Click search bar chips (HOME, MAP, CONTROLS) to switch views
- Click flow list rows in left panel to navigate stations
- Type station name in search bar and press Enter

### Alternate Route Triggers

- Click "Simulate: info_missing" in Quick Actions to trigger ALT_INFO
- Click "Simulate: risk_over" in Quick Actions to trigger ALT_RISK
- Enable "Policy Gate" toggle in CONTROLS to trigger ALT_POLICY
- Click "Reset to normal" to clear all triggers

### Overlay System

- Click bell icon (top-right) to show toast notification
- Click hamburger icon (top-right) or drawer dock button to open drawer
- Click drawer items to navigate or trigger simulations
- Toast auto-dismisses after 3 seconds or click X to close

### Controls Panel

- Navigate to CONTROLS station to see controls panel
- Toggle "Auto Alternate Route" to enable/disable automatic alternate routing
- Toggle "Policy Gate" to enable/disable policy_block trigger
- Toggle "External Noise" to enable live value drift simulation

### Override Layer

- When alternate route is active, L6_Override shows alert card
- Click "Acknowledge" button to dismiss and reset triggers

## Keyboard Shortcuts

- Enter in search bar: navigate to typed station name

## Frame Size

Demo is optimized for 1440x900 viewport.
For best experience, view at 100% zoom or resize browser window to match.

## Layer Structure

The demo implements 7 layers:

- L0_ExternalField — ambient background gradients
- L1_SystemBar — top navigation bar
- L2_EntityPanel — left sidebar with entity state
- L3_CoreCanvas — main content (HOME/MAP/CONTROLS variants)
- L4_FlowDock — bottom dock with app shortcuts
- L5_ContextOverlay — toast and drawer overlays
- L6_Override — full-screen alert for alternate routes


