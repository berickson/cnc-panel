cnc-panel will be a progressive web application that can be used to do basic CNC operations over a serial
cnc-panel should be "framework free" using standard html
Operations will include things like homing, probing, launching jobs, showing status, etc.
It can be run from a web page directly, or in "panel mode"
The initial target will ONLY be for my Genmitsu 3030 ProVer max CNC

## Completed Features ✅
- ✅ Web Serial API connection management with feature detection
- ✅ Browser compatibility checking (Chrome/Edge requirement)
- ✅ Serial connection with proper error handling and user feedback
- ✅ Real-time status display (machine state, X/Y/Z positions)
- ✅ Activity-based status monitoring (updates when jogging manually)
- ✅ Communication log with copy functionality
- ✅ Connection status indicator
- ✅ Grbl firmware integration (115200 baud, status parsing)
- ✅ Response buffering for multi-chunk messages
- ✅ Command tracking to distinguish external vs internal activity
- ✅ Emergency stop functionality (immediate halt command)
- ✅ Manual jog controls for X/Y/Z axes with configurable step sizes
- ✅ Homing operations (all axes and individual axes)
- ✅ Work coordinate system (G54) zero setting with individual and combined axis controls
- ✅ Enhanced position display showing both machine (MPos) and work (WPos) coordinates
- ✅ Safe navigation to work and machine coordinates (preserving Z height)

## Next Implementation Steps
1. **Feed rate controls** - Adjust feed rate and spindle speed overrides
2. **File operations** - Load and send G-code files to CNC
3. **Probing workflows** - Tool length and workpiece probing routines
4. **Spindle control** - Start/stop spindle with speed control

## Zeroing Implementation Plan

### Work Coordinate System (WCS) Zero Setting
The zeroing functionality will allow users to set the work coordinate system origin (G54) at the current machine position.

#### UI Components
- **Zero All Axes** - Set X, Y, and Z zero at current position (`G10 L20 P1 X0 Y0 Z0`)
- **Zero Individual Axes** - Set X, Y, or Z zero independently
  - X0: `G10 L20 P1 X0`
  - Y0: `G10 L20 P1 Y0`  
  - Z0: `G10 L20 P1 Z0`
  - X0Y0: `G10 L20 P1 X0 Y0` (common operation)
- **Safe Navigation** - Move without affecting Z height
  - Go X0Y0: `G0 X0 Y0` (go to work zero, preserve Z)
  - Go Machine Zero: `G53 G0 X0 Y0` (go to machine zero, preserve Z)
- **Current WCS Display** - Show current work coordinates vs machine coordinates

#### Technical Implementation
1. **Zero Setting Commands**:
   - Use `G10 L20 P1` commands to set work coordinate system offsets
   - P1 = G54 coordinate system (most common)
   - L20 = Set coordinate system origin at current position

2. **Position Display Enhancement**:
   - Show both Machine Position (MPos) and Work Position (WPos)
   - Parse both from Grbl status reports
   - Highlight which coordinate system is currently displayed

3. **Safety Considerations**:
   - Confirm dialog before setting zeros (especially Z-axis)
   - Navigation commands preserve Z height to avoid crashes
   - Visual indication when WCS is set vs machine coordinates

#### UI Layout Plan
```
┌─ Work Coordinate System ─────────────────┐
│ Current Position:                        │
│ [MPos] X: 15.234  Y: 23.156  Z: -2.500  │
│ [WPos] X:  1.234  Y:  3.156  Z:  0.000  │
│                                          │
│ Set Zero:                                │
│ [All 0] [X0] [Y0] [Z0] [X0Y0]           │
│                                          │
│ Navigation:                              │
│ [Go X0Y0] [Go Machine X0Y0]              │
└──────────────────────────────────────────┘
```

#### Commands to Implement
- `G10 L20 P1 X0 Y0 Z0` - Zero all axes (All 0 button)
- `G10 L20 P1 X0` - Zero X axis only (X0 button)
- `G10 L20 P1 Y0` - Zero Y axis only (Y0 button)
- `G10 L20 P1 Z0` - Zero Z axis only (Z0 button)
- `G10 L20 P1 X0 Y0` - Zero X and Y axes (X0Y0 button)
- `G0 X0 Y0` - Go to work X0Y0, preserve Z (Go X0Y0 button)
- `G53 G0 X0 Y0` - Go to machine X0Y0, preserve Z (Go Machine X0Y0 button)
- `G54` - Ensure G54 coordinate system is active

#### Status Display Updates
- Parse both MPos and WPos from status reports
- Toggle between coordinate system displays
- Color coding: Machine coords (blue), Work coords (green)
- Show active coordinate system (G54/G55/etc.)

## Technical Architecture
- Framework-free HTML/CSS/JavaScript
- Web Serial API for direct USB communication
- Client-side only (no backend server required)
- Progressive Web App capabilities for offline use


