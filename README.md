# CNC Panel

A progressive web application for controlling the Genmitsu 3030 ProVer max CNC machine using the Web Serial API.

## Features

- Framework-free HTML/JavaScript implementation
- Direct serial communication via Web Serial API
- Real-time status monitoring
- Connection management

## Getting Started

### Prerequisites

- Chrome or Edge browser (Web Serial API support required)
- Genmitsu 3030 ProVer max CNC with USB connection
- Python 3 (for web server option)
- Both computers on the same network (for remote access)

### Running the Application

#### Option 1: Local File (Direct)
1. Open `index.html` in Chrome or Edge browser
2. Click "Connect to CNC" button
3. Select your CNC's serial port when prompted
4. The application will connect and display real-time status

#### Option 2: Web Server (Recommended for Remote Access)
1. **On the computer connected to the CNC:**
   ```bash
   # Start the web server
   python3 server.py
   # Or use the convenience script
   ./start-server.sh
   ```
   
2. **From any computer on the same network:**
   - Open Chrome or Edge browser
   - Navigate to `http://[CNC-COMPUTER-IP]:8080`
   - The server will display the IP address when it starts
   
3. **Connect to CNC:**
   - Click "Connect to CNC" button
   - Select your CNC's serial port when prompted
   - The application will connect and display real-time status

**Note:** The Web Serial API only works when the browser is running on the same computer as the CNC. The web server allows you to access the interface remotely, but the serial connection must be made from the computer physically connected to the CNC.

## IMPORTANT: Web Serial API Limitations

The Web Serial API has strict security requirements:

1. **Must run on the same computer as the CNC** - The browser must be running on the computer that has the CNC connected via USB
2. **Requires secure context** - Must use HTTPS or localhost
3. **Chrome/Edge only** - Firefox and Safari don't support Web Serial API yet

### Recommended Setup for Remote Access

If you want to control the CNC from a different computer, you have two options:

#### Option A: Run Browser on CNC Computer
1. Start the web server on any computer: `python3 server.py`
2. Open Chrome/Edge **on the computer connected to the CNC**
3. Navigate to `http://localhost:8080` (or the server's IP)
4. Connect to the CNC via Web Serial API

#### Option B: Use VNC/Remote Desktop
1. Use VNC or Remote Desktop to connect to the CNC computer
2. Open Chrome/Edge through the remote session
3. Access the web interface locally on the CNC computer

### Current Features

- **Connection Management**: Connect/disconnect to CNC via USB
- **Status Monitoring**: Real-time machine state and position display
- **Communication Log**: View all commands sent and responses received
- **Error Handling**: Clear error messages for troubleshooting

### Browser Compatibility

This application requires the Web Serial API, which is currently supported in:
- Chrome 89+
- Edge 89+
- Other Chromium-based browsers

## Technical Details

- **Communication Protocol**: Grbl firmware commands
- **Baud Rate**: 115200
- **Status Updates**: Real-time via `?` status requests
- **Position Display**: Work coordinates (WPos)

## Development

The application consists of:
- `index.html` - Main interface
- `cnc-serial.js` - Web Serial API implementation
- `server.py` - Simple HTTP server for remote access
- `start-server.sh` - Linux/Mac server startup script
- `start-server.bat` - Windows server startup script
- Framework-free vanilla JavaScript

### Server Details
- Default port: 8080
- Custom port: `python3 server.py [port]`
- CORS enabled for cross-origin requests
- Serves static files from project directory

## Next Steps

- Add G-code sending capabilities
- Implement homing and probing functions
- Add job file loading and execution
- Create panel mode for kiosk usage
