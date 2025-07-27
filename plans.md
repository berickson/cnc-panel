# CNC Panel Development Plans

## Next Development Priorities
[x] UI should target 7" 1024×600 touch, no keyboard, no mouse
[x] Support kiosk mode, powers on with CNC
- [x] simplify and shrink down coordinate display
- [x] touch should not select text
- [x] console is hidden by default, maybe show it with a button
- [x] utilize full width
[*] Work coordinate management
- [ ] XY position presets with localStorage persistence
- [ ] Z offset validity tracking (valid/unknown after tool changes)
- [ ] Z surface probing functionality
- [ ] Tool change position and workflow
- [ ] Visual indicators for Z offset status
- [ ] Integration with existing zero controls
- [ ] **Safety improvements for presets**: Moving to saved XY presets should first move to safe high Z height before XY movement
- [ ] **Probe offset configuration**: Add configurable probe offset to account for probe tip thickness/diameter  
- [ ] **Enhanced probing workflow**: Improve probing speed, extend probe distance, add double-check cycle (probe → up 3mm → slow probe → retract)
- [x] **Auto-generated preset names**: Remove text input requirement - generate automatic names (Preset 1, Preset 2, etc.) or use timestamps
- [x] **Preset renaming capability**: Add ability to rename existing presets after they're created (click to edit name)
- [ ] **Error display clearing**: Clear error display at bottom when clearing alarms/errors (if machine allows error clearing)
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




