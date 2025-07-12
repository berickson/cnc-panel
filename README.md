# CNC Panel

A web-based control panel for the Genmitsu 3030 ProVer Max CNC machine using the Web Serial API.

## Features

- **Direct USB Connection**: No additional software required - connects directly to CNC via Web Serial API
- **Auto-Connect**: Automatically reconnects to previously paired CNC on page load
- **Advanced Jogging**: Tap for precise steps, hold for continuous movement (0.1mm, 1mm, 10mm steps)
- **Work Coordinate System**: Set and navigate work zero points with real-time position display
- **Touch-Friendly**: Works on touch enabled devices
- **Real-Time Monitoring**: Live position updates and activity detection

## Quick Start

### Running
1. Start local web server
```bash
python3 server.py
```
2. open http://localhost:8080 in chrome browser
3. Click "Connect to CNC" and select your CNC's USB port
<br/>
Panel will auto-connect on future visits


## Interface Guide

### Connection Panel
- **Auto-connects** to previously paired CNC on page load
- **Status indicator** shows connection state
- **Communication log** displays all commands and responses

### Manual Controls
- **Tap jog buttons**: Move by step size (0.1, 1, or 10mm)
- **Hold jog buttons**: Continuous movement until released
- **Step size buttons**: Quick-set common distances
- **Home buttons**: Move to limit switches (requires limit switches)

### Work Coordinate System
- **MPos**: Machine coordinates (absolute position)
- **WPos**: Work coordinates (relative to your workpiece zero)
- **Set Zero buttons**: Define current position as zero point
- **Navigation buttons**: Move to saved zero positions

### Safety
- **Hardware E-Stop Required**: Software relies on your CNC's physical emergency stop
- **Limit Switch Support**: Homing operations require properly wired limit switches
- **Error Messages**: Clear feedback for troubleshooting

## Controls Reference

| Action | Method |
|--------|--------|
| Connect to CNC | Click "Connect to CNC" (first time only) |
| Jog precisely | Tap jog buttons |
| Jog continuously | Hold jog buttons |
| Set work zero | Position tool, click zero buttons |
| Go to work zero | Click "Go X0Y0" |
| Home machine | Click "Home All" or individual axis |
| Copy debug log | Click "Copy Log" |
| Check settings | Press 'S' key while connected |

## Technical Details

- **Framework**: Vanilla HTML/CSS/JavaScript
- **Communication**: Direct Web Serial API to USB
- **Protocol**: Grbl firmware commands
- **Baud Rate**: 115200
- **Update Rate**: 20Hz during movement, 2-second settling
- **Coordinates**: G54 work coordinate system

## Troubleshooting

**Connection Issues:**
- Ensure Chrome/Edge browser on CNC computer
- Check USB cable connection
- Try refreshing page and reconnecting

**Movement Issues:**
- Check machine state in status panel
- Ensure not in alarm state
- Verify step size setting

**Safety Reminder**: Always ensure your CNC's hardware emergency stop is functional and easily accessible during operation.

