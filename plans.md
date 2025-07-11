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

## Next Implementation Steps
1. **Zero setting** - Set work coordinate system (G54) zero points
2. **Feed rate controls** - Adjust feed rate and spindle speed overrides
3. **File operations** - Load and send G-code files to CNC
4. **Probing workflows** - Tool length and workpiece probing routines
5. **Spindle control** - Start/stop spindle with speed control

## Technical Architecture
- Framework-free HTML/CSS/JavaScript
- Web Serial API for direct USB communication
- Client-side only (no backend server required)
- Progressive Web App capabilities for offline use


