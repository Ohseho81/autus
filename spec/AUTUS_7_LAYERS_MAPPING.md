# AUTUS_7_LAYERS_MAPPING.md

AUTUS 7-Layer Architecture Mapping — Locked

## Purpose

AUTUS Shell uses a 7-layer DOM/Figma structure to separate concerns and enable consistent overlay behavior.
Each layer has a specific z-index range and visual responsibility.

## Layer Definitions

### L0_ExternalField

- z-index: 0
- Purpose: ambient background gradients, radial glows
- Contents: radial-gradient overlays for visual depth
- Interaction: none (static background)

### L1_SystemBar

- z-index: 10
- Purpose: top navigation bar
- Contents:
  - Brand icon (34x34, radius 10)
  - Breadcrumb with station title and subtitle
  - Status pill with connection dot
  - Clock pill with monospace time
  - Icon buttons (toast trigger, drawer trigger)
- Interaction: icon buttons open overlays

### L2_EntityPanel

- z-index: 20
- Purpose: left sidebar for entity state and flow navigation
- Contents:
  - Entity Card with header, body, risk bar
  - Flow list with station rows
  - Quick actions list (simulate triggers, reset)
- Interaction: rows navigate to stations, quick actions trigger alternates

### L3_CoreCanvas

- z-index: 30
- Purpose: main content area with view variants
- Variants:
  - HOME: search bar (560px), grid background, 3-column HUD
  - MAP: search bar (420px), map grid, 2-column HUD, focus marker, routes
  - CONTROLS: controls panel overlay within canvas
- Interaction: search input, controls toggles

### L4_FlowDock

- z-index: 40
- Purpose: bottom dock with app shortcuts and status slots
- Contents:
  - Temperature slot
  - Media slot
  - Dock apps (HOME, MAP, CONTROLS, Drawer)
  - Debug pill showing alternate state
- Interaction: dock apps navigate stations, open drawer

### L5_ContextOverlay

- z-index: 50
- Purpose: contextual overlays (toast, drawer)
- Contents:
  - Toast notification (top-right)
  - Drawer sheet (bottom-center)
- Interaction: close buttons, backdrop click to dismiss

### L6_Override

- z-index: 60
- Purpose: full-screen override for critical states
- Contents:
  - Dim overlay (rgba(0,0,0,0.6))
  - Alert card with alternate route info
- Trigger: alternate route active (ALT_INFO, ALT_RISK, ALT_POLICY)
- Interaction: acknowledge button to dismiss

## z-index Summary

- L0_ExternalField: 0
- L1_SystemBar: 10
- L2_EntityPanel: 20
- L3_CoreCanvas: 30
- L4_FlowDock: 40
- L5_ContextOverlay: 50
- L6_Override: 60

## DOM Structure

```
<div class="app">
  <!-- L0_ExternalField -->
  <div class="external-field"></div>
  
  <!-- L1_SystemBar -->
  <header class="system-bar"></header>
  
  <!-- L2_EntityPanel -->
  <aside class="entity-panel"></aside>
  
  <!-- L3_CoreCanvas -->
  <main class="core-canvas"></main>
  
  <!-- L4_FlowDock -->
  <nav class="flow-dock"></nav>
  
  <!-- L5_ContextOverlay -->
  <div class="context-overlay"></div>
  
  <!-- L6_Override -->
  <div class="override-layer"></div>
</div>
```

## Figma Layer Groups

- Create 7 top-level frames or groups
- Name each group exactly: L0_ExternalField, L1_SystemBar, L2_EntityPanel, L3_CoreCanvas, L4_FlowDock, L5_ContextOverlay, L6_Override
- Lock L0 to prevent accidental edits
- Use auto-layout for L1, L2, L4
- Use variants for L3 (HOME, MAP)
- Use component sets for L5 (Toast, Drawer)
- Use visibility toggle for L6


