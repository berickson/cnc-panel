cnc-panel will be a progressive web application that can be used to do basic CNC operations over a serial
cnc-panel should be "framework free" using standard html
Operations will include things like homing, probing, launching jobs, showing status, etc.
It can be run from a web page directly, or in "panel mode"
The initial target will ONLY be for my Genmitsu 3030 ProVer max CNC

## Communication Implementation Plan

### Web Serial API Approach
1. **Feature detection** - Check if Web Serial API is available in browser
2. **Fallback message** - Suggest compatible browser (Chrome/Edge) if not supported
3. **Serial connection management** - Connect/disconnect handling with proper error handling
4. **G-code sending/receiving** - Command queue and response parsing for Grbl firmware
5. **Status monitoring** - Real-time position and status updates from CNC

### Technical Details
- Target Grbl firmware (common on Genmitsu 3030 ProVer max)
- Default baud rate: 115200
- USB-to-serial communication via browser Web Serial API
- No backend server required - pure client-side solution

## Initial Implementation (Proof of Concept)
- Create basic HTML page with connect/disconnect buttons
- Implement Web Serial API connection to CNC
- Send status request commands (? for Grbl status)
- Display real-time status information to prove connection is working
- Show connection state and basic machine position/status


