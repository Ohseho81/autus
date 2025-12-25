# UI_TESLA_SHELL_LOCK.md

AUTUS Tesla-like Shell UI Specification — Locked

## Purpose

AUTUS Tesla-like Shell provides a minimal, dark, blur-panel interface for Station/Line/Alternate navigation.
AUTUS Shell follows a 7-layer architecture with strict pixel locks and design tokens.

## Frame

- Width: 1440px
- Height: 900px
- Background: #0B0D10

## Grid

- Columns: 12
- Margin: 80px
- Gutter: 24px

## Layer Order (Top-Level Groups)

- L0_ExternalField — ambient background gradients
- L1_SystemBar — top bar with brand, breadcrumb, status pills, icon buttons
- L2_EntityPanel — left sidebar with entity card, flow list, quick actions
- L3_CoreCanvas — main content area (HOME variant or MAP variant)
- L4_FlowDock — bottom dock with apps, temperature, media slots
- L5_ContextOverlay — toast notifications, drawer sheet
- L6_Override — full-screen dim with alert card when alternate active

## Component List

- L1_SystemBar
  - Brand icon 34x34 radius 10
  - Breadcrumb (title + subtitle)
  - Status pill (dot + text)
  - Clock pill (monospace)
  - Icon buttons 34x34 radius 12
- L2_EntityPanel
  - Entity Card (header + body + risk bar)
  - Section title
  - Flow list (station rows)
  - Quick actions list
- L3_CoreCanvas
  - Search bar
  - Grid background
  - HUD panel
  - Controls panel (CONTROLS station only)
- L4_FlowDock
  - Temperature slot
  - Media slot
  - Dock apps 42x42 radius 16
  - Debug pill
- L5_ContextOverlay
  - Toast notification
  - Drawer sheet
- L6_Override
  - Dim overlay
  - Alert card

## Pixel Values

- Top bar height: 56px
- Left panel width: 312px
- Left panel padding: 12px
- Left panel radius: 16px
- Dock height: 76px
- Dock padding: 10px 14px
- Dock app size: 42x42
- Dock app radius: 16px
- Overlay sheet max width: 720px
- Overlay sheet radius: 22px
- HUD home height: 120px
- HUD home radius: 20px
- HUD home columns: 3
- HUD home gap: 10px
- HUD map height: 96px
- HUD map radius: 20px
- HUD map columns: 2
- Search home width: 560px max
- Search home height: 40px
- Search home radius: 999px
- Search map width: 420px
- Search map height: 36px
- Search map radius: 999px
- Map canvas padding: 0px (full immersion)
- Home canvas padding: 16px 18px

## Rules

### Do

- Use only radius 16 or 20 for panels (exception: pills use 999)
- Use max 3 primary KPIs in HUD
- Use backdrop-filter blur on panels
- Use tabular figures for numeric displays
- Use locked color tokens from tokens.css
- Use locked typography scales

### Do Not

- Do not add extra KPIs beyond 3
- Do not use colors outside the token set
- Do not use radius values other than 16, 20, or 999
- Do not add external dependencies
- Do not use inline styles for tokens (use CSS variables)

## HOME vs MAP Diffs

- HOME: L3 padding 16px 18px, Search width 560px, HUD 3 columns height 120px
- MAP: L3 padding 0px, Search width 420px, HUD 2 columns height 96px
- MAP: grid background opacity 6–8%
- MAP: center focus marker 12px Accent/Good with glow
- MAP: route lines (normal 2px, active 3px, alternate 3px dashed)

## Prototype Interactions

- Dock HOME button → L3_CoreCanvas HOME variant
- Dock MAP button → L3_CoreCanvas MAP variant
- Dock CONTROLS button → show Controls panel
- Dock Drawer button → open L5_ContextOverlay drawer
- Quick action info_missing → trigger ALT_INFO → show L6_Override
- Quick action risk_over → trigger ALT_RISK → show L6_Override
- Quick action reset → clear all alternates → hide L6_Override
- Toggle auto_alternate → enable/disable automatic alternate routing
- Toggle policy_gate → enable/disable policy_block trigger
- Toggle external_noise → enable/disable live value drift


