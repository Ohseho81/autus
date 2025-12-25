# HOME_PIXEL_LOCK.md

AUTUS Shell HOME View Pixel Specification — Locked

## Purpose

HOME view is the default station in AUTUS Shell.
HOME provides baseline navigation, entity state display, and 3-KPI HUD.

## Frame

- Width: 1440px
- Height: 900px

## L1_SystemBar

- Height: 56px
- Background: rgba(10, 12, 15, 0.55)
- Backdrop-filter: blur(10px)
- Border-bottom: 1px solid rgba(255, 255, 255, 0.10)
- Padding: 0 14px

### Brand Icon

- Size: 34x34
- Radius: 10px
- Background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))
- Border: 1px solid rgba(255, 255, 255, 0.10)

### Breadcrumb

- Title font: 13px semibold
- Subtitle font: 11px regular
- Subtitle color: Text/Muted (#FFFFFF at 42%)

### Status Pill

- Height: 30px
- Padding: 0 10px
- Radius: 999px
- Background: rgba(255, 255, 255, 0.06)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Dot size: 8x8
- Dot color: Accent/Good (#3DDC97)

### Clock Pill

- Same as Status Pill
- Font: monospace 12px

### Icon Button

- Size: 34x34
- Radius: 12px
- Background: rgba(255, 255, 255, 0.06)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Icon size: 16x16

## L2_EntityPanel

- Width: 312px
- Padding: 12px
- Background: rgba(10, 12, 15, 0.35)
- Backdrop-filter: blur(10px)
- Border-right: 1px solid rgba(255, 255, 255, 0.10)

### Entity Card

- Radius: 16px
- Background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Header padding: 12px 12px 10px
- Body padding: 12px

### Section Title

- Font: 11px regular uppercase
- Color: Text/Muted (#FFFFFF at 42%)
- Padding: 8px 2px 0
- Letter-spacing: 0.2px

### Flow List

- Radius: 16px
- Background: rgba(255, 255, 255, 0.04)
- Border: 1px solid rgba(255, 255, 255, 0.10)

### Flow Row

- Padding: 10px 12px
- Border-bottom: 1px solid rgba(255, 255, 255, 0.06)
- Font: 12px regular

### Tag

- Padding: 3px 8px
- Radius: 999px
- Font: 11px
- Border: 1px solid rgba(255, 255, 255, 0.12)

## L3_CoreCanvas (HOME)

- Padding: 16px 18px
- Background: radial gradient overlay

### Search Bar

- Width: 560px max (92% of canvas width)
- Height: 40px
- Radius: 999px
- Background: rgba(0, 0, 0, 0.35)
- Backdrop-filter: blur(10px)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Padding: 10px 12px
- Gap: 10px

### Grid Background

- Line color: rgba(255, 255, 255, 0.045)
- Line width: 1px
- Grid size: 52px
- Opacity: 35%

### HUD Panel

- Width: 760px max (96% of canvas width)
- Height: 120px
- Radius: 20px
- Background: rgba(0, 0, 0, 0.38)
- Backdrop-filter: blur(12px)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Padding: 12px
- Columns: 3
- Gap: 10px

### HUD Tile

- Radius: 16px
- Background: rgba(255, 255, 255, 0.06)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Padding: 10px
- Min-height: 70px

## L4_FlowDock

- Height: 76px
- Padding: 10px 14px
- Background: rgba(10, 12, 15, 0.55)
- Backdrop-filter: blur(10px)
- Border-top: 1px solid rgba(255, 255, 255, 0.10)

### Temperature Slot

- Height: 42px
- Padding: 0 14px
- Radius: 999px
- Background: rgba(255, 255, 255, 0.06)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Font: 12px

### Dock App

- Size: 42x42
- Radius: 16px
- Background: rgba(255, 255, 255, 0.06)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Icon size: 16x16
- Active border: rgba(61, 220, 151, 0.35)
- Active shadow: inset 0 0 0 3px rgba(61, 220, 151, 0.12)

### Dock Center

- Padding: 8px 10px
- Radius: 999px
- Background: rgba(255, 255, 255, 0.05)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Gap: 10px

## L5_ContextOverlay

### Toast

- Width: 360px max
- Radius: 18px
- Background: rgba(10, 12, 15, 0.80)
- Backdrop-filter: blur(14px)
- Border: 1px solid rgba(255, 255, 255, 0.12)
- Padding: 12px
- Position: top 14px, right 14px

### Drawer Sheet

- Width: 720px max
- Radius: 22px
- Background: rgba(10, 12, 15, 0.82)
- Backdrop-filter: blur(16px)
- Border: 1px solid rgba(255, 255, 255, 0.12)
- Position: bottom calc(76px + 14px), center

### Drawer Item

- Radius: 16px
- Background: rgba(255, 255, 255, 0.06)
- Border: 1px solid rgba(255, 255, 255, 0.10)
- Padding: 12px

## L6_Override

### Dim Overlay

- Background: rgba(0, 0, 0, 0.6)
- Opacity: 0 (hidden) / 1 (visible)

### Alert Card

- Width: 400px
- Radius: 22px
- Background: rgba(15, 20, 26, 0.95)
- Backdrop-filter: blur(20px)
- Border: 2px solid Accent/Warn (#FFCC66)
- Padding: 24px
- Position: center


