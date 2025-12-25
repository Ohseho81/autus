# MAP_PIXEL_DERIVATION_LOCK.md

AUTUS Shell MAP View Pixel Derivation — Locked

## Purpose

MAP view derives from HOME view with specific L3_CoreCanvas changes.
MAP provides full-immersion canvas with route visualization and compact HUD.

## Derivation from HOME

MAP view inherits all layers except L3_CoreCanvas.
L3_CoreCanvas changes are listed below.

## L3_CoreCanvas (MAP) Changes

### Canvas Padding

- HOME: 16px 18px
- MAP: 0px (full immersion)

### Map Background

- Grid opacity: 6–8% (reduced from 35%)
- Background color: same grid pattern
- Full bleed to edges

### Search Bar

- HOME width: 560px max
- MAP width: 420px
- HOME height: 40px
- MAP height: 36px
- Position: top-left with 16px margin
- Radius: 999px (unchanged)

### Center Focus Marker

- Size: 12px
- Color: Accent/Good (#3DDC97)
- Glow: 0 0 12px rgba(61, 220, 151, 0.6)
- Position: center of canvas

### Route Lines

#### Normal Route

- Stroke width: 2px
- Stroke color: Text/Secondary (rgba(255, 255, 255, 0.62))
- Stroke style: solid

#### Active Route

- Stroke width: 3px
- Stroke color: Accent/Good (#3DDC97)
- Stroke style: solid
- Glow: 0 0 8px rgba(61, 220, 151, 0.4)

#### Alternate Route

- Stroke width: 3px
- Stroke color: Accent/Warn (#FFCC66)
- Stroke style: dashed (6px dash, 4px gap)
- Glow: 0 0 8px rgba(255, 204, 102, 0.4)

### Station Nodes

- Base size: 10px
- Color: Text/Secondary (rgba(255, 255, 255, 0.62))
- Active ring size: 14px
- Active ring opacity: 12%
- Active ring color: Accent/Good (#3DDC97)

### HUD Panel

- HOME width: 760px max
- MAP width: 560px max
- HOME height: 120px
- MAP height: 96px
- HOME columns: 3
- MAP columns: 2
- Radius: 20px (unchanged)
- Position: bottom center, 12px above dock
- Background: rgba(0, 0, 0, 0.38) (unchanged)

### HUD Tile (MAP)

- Radius: 16px (unchanged)
- Padding: 10px (unchanged)
- Min-height: 60px (reduced from 70px)

## Unchanged Elements

- L0_ExternalField: same gradients
- L1_SystemBar: same layout, 56px height
- L2_EntityPanel: same layout, 312px width
- L4_FlowDock: same layout, 76px height
- L5_ContextOverlay: same components
- L6_Override: same components

## Visual Hierarchy Changes

- HOME: search prominent, HUD secondary
- MAP: canvas prominent, search compact, HUD minimal

## Route Rendering Rules

- Routes render as SVG paths within canvas
- Normal routes appear behind active routes
- Alternate routes appear with animation (dash offset)
- Station nodes render at path intersections
- Active station has pulsing ring animation

## Map Interaction

- Pan: drag canvas (future)
- Zoom: scroll wheel (future)
- Station select: click node to navigate
- Route select: click path to view details

## Coordinate System

- Origin: top-left of canvas
- X axis: left to right
- Y axis: top to bottom
- Units: pixels
- Station positions: absolute coordinates


