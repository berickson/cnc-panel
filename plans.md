# CNC Panel Development Plans

## Next Development Priorities
[ ] UI should target 7" 1024×600 touch, no keyboard, no mouse
[ ] Support kiosk mode, powers on with CNC
[ ] Load gcode files from disk and send to CNC
- [ ] job progres
[ ] Auto home and zero presets
- [ ] Job execution with start/stop/pause controls
- [ ] Progress tracking and time estimation
[ ] PWA and offline
[ ] Simple commands like flatten face

## Technical Debt and Improvements

### Code Quality
- [ ] **Refactor G-code command generation**: Replace hardcoded command strings with readable helper functions
  - Current: `$J=G91${axis}${distance}F1000` (hard to read/maintain)
  - Proposed: `GRBL.jog(axis, distance)` or similar structured approach
  - Commands to refactor: jog, setWorkZero, home, move, etc.
- [ ] Add comprehensive error handling for all Grbl error codes
- [ ] Implement unit tests for core functionality




