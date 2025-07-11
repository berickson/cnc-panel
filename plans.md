# CNC Panel Development Plans

## Completed Features ✅

### Phase 1: Basic Connection and Status
- ✅ Web Serial API implementation
- ✅ Connection management with error handling
- ✅ Real-time status monitoring
- ✅ Auto-connection to previously paired devices
- ✅ Communication logging with copy functionality

### Phase 2: Manual Controls
- ✅ Basic jog controls (X/Y/Z axes)
- ✅ **Advanced tap/hold jogging**:
  - ✅ Tap for stepped movement
  - ✅ Hold for continuous movement
  - ✅ Proper jog cancel implementation
- ✅ Configurable step sizes (0.1mm, 1mm, 10mm)
- ✅ Touch support for mobile devices
- ✅ Homing operations (all axes and individual)
- ✅ **Removed software emergency stop** (hardware e-stop is safer and more reliable)

### Phase 3: Work Coordinate System
- ✅ Enhanced position display (MPos and WPos)
- ✅ Work coordinate zero setting (individual and combined axes)
- ✅ WCO (Work Coordinate Offset) parsing and calculation
- ✅ Auto-detection of existing work coordinate offsets
- ✅ Safe navigation to work/machine coordinates
- ✅ Removed confirmation dialogs for faster workflow

### Phase 4: Activity Detection and Status Updates
- ✅ High-frequency status polling during activity (20Hz)
- ✅ 2-second settling time after jogging stops
- ✅ Detection of external activity (built-in controller)
- ✅ Command tracking to distinguish internal vs external commands

## Current Status

The CNC panel now provides professional-grade manual control functionality with:
- **Professional jogging behavior**: Tap for precision, hold for positioning
- **Real-time position feedback**: Both machine and work coordinates
- **Intelligent activity detection**: Responds to both web and built-in controller usage
- **Fast workflow**: No confirmation dialogs, immediate zero setting

## Next Development Priorities

### Phase 5: UI Optimization for Small Displays
- [ ] **7-inch display optimization**: Redesign interface to fit 7" touch monitors (1024x600 typical resolution)
  - Larger touch targets for workshop use
  - Optimized spacing and font sizes
  - Vertical layout considerations
  - Responsive design for different orientations
- [ ] **Mobile/tablet layout improvements**: Better touch interface scaling
- [ ] **Compact mode toggle**: Switch between full and compact layouts

### Phase 6: Kiosk Mode Implementation
- [ ] **Fullscreen kiosk mode**: Dedicated panel interface without browser chrome
  - Auto-enter fullscreen on load option
  - Hide browser navigation and address bar
  - Prevent accidental navigation away from panel
- [ ] **Simplified operator interface**: Large buttons, essential controls only
- [ ] **Workshop-friendly design**: High contrast, readable in various lighting
- [ ] **Screen timeout prevention**: Keep display always on during operation
- [ ] **Auto-reconnect**: Attempt to reconnect to CNC automatically on startup

### Phase 7: Feed Rate and Overrides
- [ ] Real-time feed rate override controls (10-200%)
- [ ] Spindle speed override controls  
- [ ] Rapid rate override controls
- [ ] Display current override percentages

### Phase 8: Spindle Control
- [ ] Spindle start/stop control
- [ ] Spindle speed setting (RPM)
- [ ] Spindle direction control (CW/CCW)
- [ ] Coolant control (if applicable)

### Phase 9: G-code File Handling
- [ ] G-code file upload and parsing
- [ ] G-code preview and validation
- [ ] Job execution with start/stop/pause controls
- [ ] Progress tracking and time estimation
- [ ] Job queue management

### Phase 10: Panel Mode (Enhanced)
- [ ] **Hardware integration**: Support for dedicated panel hardware
  - Physical emergency stop integration detection
  - External jog wheel/MPG support
  - Hardware button mapping
- [ ] **Multi-user access controls**: Operator vs setup modes
- [ ] **Machine-specific configurations**: Save/load settings per machine

## Technical Debt and Improvements

### Code Quality
- [ ] **Refactor G-code command generation**: Replace hardcoded command strings with readable helper functions
  - Current: `$J=G91${axis}${distance}F1000` (hard to read/maintain)
  - Proposed: `GRBL.jog(axis, distance)` or similar structured approach
  - Commands to refactor: jog, setWorkZero, home, move, etc.
- [ ] Add comprehensive error handling for all Grbl error codes
- [ ] Implement unit tests for core functionality
- [ ] Add TypeScript for better type safety
- [ ] Code documentation and inline comments

### User Experience
- [ ] **7-inch display support**: Optimize for small workshop monitors
- [ ] **Kiosk mode**: Fullscreen dedicated operation mode
- [ ] Keyboard shortcuts for common operations
- [ ] Customizable interface layouts
- [ ] Dark/light theme options (workshop lighting considerations)
- [ ] Multi-language support

### Performance
- [ ] Optimize status polling algorithms
- [ ] Implement efficient G-code parsing
- [ ] Add caching for frequently used data
- [ ] Memory usage optimization

## Architecture Decisions

### Current Approach
- **Framework-free**: Pure HTML/CSS/JavaScript for simplicity and performance
- **Direct Web Serial**: No middleware or servers required for CNC communication
- **Real-time updates**: Event-driven status monitoring
- **Mobile-first**: Touch-friendly interface design

### Future Considerations
- **PWA features**: Offline capability, app-like experience, kiosk mode support
- **WebRTC**: Potential for remote operation over networks
- **WebAssembly**: For complex G-code processing if needed
- **Service Workers**: For background task management and auto-reconnect

## Safety and Reliability

### Implemented Safety Features
- ✅ Connection state validation before commands
- ✅ Comprehensive error handling and user feedback
- ✅ Safe coordinate system operations
- ✅ **Reliance on hardware emergency stop** for maximum safety

### Planned Safety Enhancements
- [ ] Soft limits enforcement
- [ ] Travel boundary visualization
- [ ] Collision detection warnings
- [ ] Safe height management for tool changes
- [ ] Automatic recovery procedures

**Safety Philosophy**: This software intentionally does not implement a software emergency stop, as hardware-based emergency stops are significantly more reliable and faster. Always ensure your CNC machine's hardware emergency stop is functional and easily accessible during operation.

## Testing and Validation

### Current Testing
- ✅ Manual testing on Genmitsu 3030 ProVer Max
- ✅ Cross-browser compatibility (Chrome/Edge)
- ✅ Touch device testing

### Planned Testing
- [ ] Automated testing framework
- [ ] Other Grbl-compatible machines
- [ ] Stress testing with continuous operation
- [ ] Performance benchmarking
- [ ] Security testing for Web Serial API usage

## Documentation

### Current Documentation
- ✅ README with setup instructions
- ✅ Feature documentation
- ✅ Browser compatibility notes

### Planned Documentation
- [ ] Video tutorials for common operations
- [ ] Troubleshooting guide
- [ ] API documentation for extensibility
- [ ] Safety procedures and best practices

## Workshop Integration Requirements

### 7-Inch Display Considerations
- **Resolution**: Typically 1024x600 or 800x480
- **Touch targets**: Minimum 44px for reliable touch interaction
- **Viewing distance**: Arms length operation in workshop environment
- **Durability**: Interface should handle workshop conditions

### Kiosk Mode Requirements
- **Boot-to-browser**: Integration with embedded systems/Raspberry Pi
- **Crash recovery**: Automatic restart if browser crashes
- **Network resilience**: Handle network disconnections gracefully
- **Power management**: Sleep/wake behavior for workshop schedules
- **Security**: Lock down browser to prevent tampering

### Workshop Environment
- **Lighting**: High contrast for various workshop lighting conditions
- **Noise**: Visual feedback important in noisy environments
- **Dust/debris**: Touch interface should handle partial occlusion
- **Temperature**: Stable operation in workshop temperature ranges


