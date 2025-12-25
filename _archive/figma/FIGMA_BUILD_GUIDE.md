# FIGMA_BUILD_GUIDE.md

AUTUS Tesla Shell — Figma Build Guide

## Purpose

Step-by-step guide to recreate AUTUS Tesla Shell UI in Figma with locked specifications.
Follow exactly to ensure pixel-perfect implementation.

## Step 1: Create Page and Frame

- Create new Figma file named "AUTUS Tesla Shell"
- Create page named "Shell"
- Create frame:
  - Name: Shell
  - Width: 1440px
  - Height: 900px
  - Background: #0B0D10

## Step 2: Set Up Grid

- Select Shell frame
- Add layout grid:
  - Type: Columns
  - Count: 12
  - Margin: 80px
  - Gutter: 24px
  - Color: rgba(255, 0, 0, 0.1) (for visibility during build)

## Step 3: Create Color Styles

Create the following color styles:

- BG/Base: #0B0D10
- BG/Panel: #0F141A
- BG/Overlay: rgba(15, 20, 26, 0.85)
- Text/Primary: rgba(255, 255, 255, 0.92)
- Text/Secondary: rgba(255, 255, 255, 0.62)
- Text/Muted: rgba(255, 255, 255, 0.42)
- Accent/Good: #3DDC97
- Accent/Warn: #FFCC66
- Accent/Bad: #FF5C5C
- Stroke/Weak: rgba(255, 255, 255, 0.10)
- Stroke/Strong: rgba(255, 255, 255, 0.16)

## Step 4: Create Text Styles

Create the following text styles:

- Title/Station
  - Font: Inter (or SF Pro)
  - Size: 14px
  - Weight: Semibold (600)
  - Letter spacing: -1%
- Body/Primary
  - Size: 13px
  - Weight: Medium (500)
- Body/Secondary
  - Size: 12px
  - Weight: Regular (400)
- Meta/HUD
  - Size: 11px
  - Weight: Regular (400)
- Numeric
  - Same as Body/Primary
  - Enable tabular figures

## Step 5: Create 7 Layer Groups

Create 7 top-level frames inside Shell frame in this order (bottom to top):

- L0_ExternalField
  - Position: 0, 0
  - Size: 1440 x 900
  - Lock this layer
- L1_SystemBar
  - Position: 0, 0
  - Size: 1440 x 56
- L2_EntityPanel
  - Position: 0, 56
  - Size: 312 x 768 (900 - 56 - 76)
- L3_CoreCanvas
  - Position: 312, 56
  - Size: 1128 x 768
- L4_FlowDock
  - Position: 0, 824
  - Size: 1440 x 76
- L5_ContextOverlay
  - Position: 0, 0
  - Size: 1440 x 900
  - Set visibility: hidden (for prototype)
- L6_Override
  - Position: 0, 0
  - Size: 1440 x 900
  - Set visibility: hidden (for prototype)

## Step 6: Build L0_ExternalField

- Add rectangle fill with radial gradients:
  - Gradient 1: center 70% 20%, size 1100x700, rgba(255,255,255,0.08) to transparent
  - Gradient 2: center 20% 80%, size 900x700, rgba(61,220,151,0.08) to transparent
- Lock layer

## Step 7: Build L1_SystemBar Component

Create component "L1_SystemBar":

- Frame: 1440 x 56, auto-layout horizontal, padding 0 14px, gap 10px
- Fill: rgba(10, 12, 15, 0.55)
- Effects: Background blur 10px
- Stroke: bottom 1px Stroke/Weak

Contents (left to right):

- Brand icon
  - Frame: 34 x 34, radius 10px
  - Fill: linear gradient rgba(255,255,255,0.12) to rgba(255,255,255,0.04)
  - Stroke: 1px Stroke/Weak
  - Shadow: 0 10px 30px rgba(0,0,0,0.35)
  - Text "A" centered, 14px bold
- Breadcrumb
  - Frame: auto-layout vertical, gap 2px
  - Title: "HOME", Title/Station style
  - Subtitle: "Station · Line · Alternate Route", Meta/HUD style, Text/Muted
- Spacer (fill container)
- Status pill
  - Frame: auto-layout horizontal, height 30px, padding 0 10px, radius 999px
  - Fill: rgba(255,255,255,0.06)
  - Stroke: 1px Stroke/Weak
  - Dot: 8 x 8, radius 999px, fill Accent/Good
  - Text: "Online", Body/Secondary style
- Clock pill
  - Same as status pill
  - Text: "--:--", monospace
- Icon button (toast)
  - Frame: 34 x 34, radius 12px
  - Fill: rgba(255,255,255,0.06)
  - Stroke: 1px Stroke/Weak
  - Icon: 16 x 16, bell icon
- Icon button (drawer)
  - Same as above
  - Icon: hamburger menu

## Step 8: Build L2_EntityPanel Component

Create component "L2_EntityPanel":

- Frame: 312 x 768, auto-layout vertical, padding 12px, gap 10px
- Fill: rgba(10, 12, 15, 0.35)
- Effects: Background blur 10px
- Stroke: right 1px Stroke/Weak

Contents:

- Entity Card
  - Frame: fill width, auto-layout vertical, radius 16px
  - Fill: linear gradient rgba(255,255,255,0.08) to rgba(255,255,255,0.04)
  - Stroke: 1px Stroke/Weak
  - Shadow: 0 18px 60px rgba(0,0,0,0.55)
  - Header: padding 12px 12px 10px, title + badge
  - Body: padding 12px, KV grid + risk bar
- Section title "Flow (Station/Line)"
  - Text: 11px uppercase, Text/Muted
  - Padding: 8px 2px 0
- Flow list
  - Frame: fill width, radius 16px
  - Fill: rgba(255,255,255,0.04)
  - Stroke: 1px Stroke/Weak
  - 6 rows (HOME, MAP, CONTROLS, ALT_INFO, ALT_RISK, ALT_POLICY)
- Section title "Quick Actions"
- Quick actions list
  - 3 rows (info_missing, risk_over, reset)

## Step 9: Build L3_CoreCanvas Component Set

Create component set "L3_CoreCanvas" with 3 variants:

### Variant: HOME

- Frame: 1128 x 768, padding 16px 18px
- Background: radial gradient overlays
- Grid background (52px, opacity 35%)
- Contents:
  - Search bar (560px max, 40px height, radius 999px)
  - HUD panel (760px max, 120px height, 3 columns, radius 20px)

### Variant: MAP

- Frame: 1128 x 768, padding 0px
- Grid background (52px, opacity 7%)
- Contents:
  - Search bar (420px, 36px height)
  - Map layer with routes and stations
  - Focus marker (12px, Accent/Good with glow)
  - HUD panel (560px, 96px height, 2 columns)

### Variant: CONTROLS

- Same as HOME
- Add Controls panel (420px, radius 22px, top-right)

## Step 10: Build L4_FlowDock Component

Create component "L4_FlowDock":

- Frame: 1440 x 76, auto-layout horizontal, padding 10px 14px
- Fill: rgba(10, 12, 15, 0.55)
- Effects: Background blur 10px
- Stroke: top 1px Stroke/Weak
- Justify: space-between

Contents:

- Left section
  - Temperature slot (42px height, radius 999px)
  - Media slot (same)
- Center section
  - Frame: auto-layout horizontal, padding 8px 10px, radius 999px, gap 10px
  - Fill: rgba(255,255,255,0.05)
  - Stroke: 1px Stroke/Weak
  - 4 dock apps (42 x 42, radius 16px each)
- Right section
  - Debug pill "ALT: none"

## Step 11: Build L5_ContextOverlay Components

Create component set "L5_ContextOverlay":

### Toast component

- Position: top 14px, right 14px
- Frame: 360px max, radius 18px
- Fill: rgba(10, 12, 15, 0.80)
- Effects: Background blur 14px
- Stroke: 1px Stroke/Strong
- Padding: 12px
- Contents: dot, title, body, close button

### Drawer component

- Position: bottom calc(76px + 14px), center
- Frame: 720px max, radius 22px
- Fill: rgba(10, 12, 15, 0.82)
- Effects: Background blur 16px
- Stroke: 1px Stroke/Strong
- Header with title and close button
- Body with 4-column grid of drawer items

## Step 12: Build L6_Override Component

Create component "L6_Override":

- Frame: 1440 x 900
- Fill: rgba(0, 0, 0, 0.6)
- Alert card (centered):
  - Frame: 400px width, radius 22px
  - Fill: rgba(15, 20, 26, 0.95)
  - Effects: Background blur 20px
  - Stroke: 2px Accent/Warn
  - Padding: 24px
  - Contents: icon, title, description, acknowledge button

## Step 13: Create Prototype Connections

### Station Navigation

- HOME dock button → L3_CoreCanvas HOME variant
- MAP dock button → L3_CoreCanvas MAP variant
- CONTROLS dock button → L3_CoreCanvas CONTROLS variant

### Overlay Triggers

- Drawer dock button → L5_ContextOverlay Drawer (smart animate)
- Toast icon button → L5_ContextOverlay Toast (dissolve)
- Drawer close button → dismiss drawer

### Alternate Override

- Create interaction: On ALT trigger → show L6_Override
- Alert acknowledge button → hide L6_Override

## Step 14: Final Checklist

- All 7 layer groups exist with exact names
- Frame is 1440 x 900
- Grid is 12 columns, 80px margin, 24px gutter
- All color styles match token values
- All text styles match typography specs
- L1_SystemBar height is 56px
- L2_EntityPanel width is 312px
- L4_FlowDock height is 76px
- Dock app size is 42 x 42
- All radius values are 16, 20, or 999 only
- HUD has max 3 KPIs
- Background blur applied to panels
- Prototype connections work

## Do Not Rules

- Do not use radius values other than 10, 12, 16, 20, 22, or 999
- Do not add colors outside the token set
- Do not add more than 3 KPIs to HUD
- Do not change layer names from specification
- Do not add external plugins or fonts
- Do not use effects other than blur and shadow specified
- Do not change grid settings from 12/80/24
- Do not add additional layers beyond the 7 specified


