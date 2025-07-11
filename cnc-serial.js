class CNCSerial {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.messageBuffer = ''; // Add buffer for partial messages
        
        // UI elements
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.statusBtn = document.getElementById('statusBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.logElement = document.getElementById('log');
        this.errorContainer = document.getElementById('errorContainer');
        
        // Status elements
        this.machineState = document.getElementById('machineState');
        this.xPosition = document.getElementById('xPosition');
        this.yPosition = document.getElementById('yPosition');
        this.zPosition = document.getElementById('zPosition');
        
        // Log initialization info
        this.log(`CNC Panel initialized`);
        this.log(`Current URL: ${window.location.href}`);
        this.log(`Hostname: ${window.location.hostname}`);
        this.log(`Protocol: ${window.location.protocol}`);
        this.log(`Secure context: ${window.isSecureContext}`);
        this.log(`User agent: ${navigator.userAgent}`);
        
        this.initializeEventListeners();
        this.checkWebSerialSupport();
    }
    
    checkWebSerialSupport() {
        this.log('Checking Web Serial API support...');
        
        if (!('serial' in navigator)) {
            this.showError('Web Serial API not supported. Please use Chrome or Edge browser.');
            this.log('ERROR: Web Serial API not found in navigator object');
            this.connectBtn.disabled = true;
            return false;
        }
        
        // Check if we're in a secure context
        if (!window.isSecureContext) {
            this.showError('Web Serial API requires a secure context (HTTPS or localhost).');
            this.log('ERROR: Not in secure context');
            this.connectBtn.disabled = true;
            return false;
        }
        
        // Check if we're accessing from localhost/same origin
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '';
        
        if (!isLocalhost) {
            this.showError('Web Serial API requires the page to be accessed from the same computer as the CNC. Please open this page directly on the computer connected to the CNC.');
            this.log(`ERROR: Accessing from ${window.location.hostname}, but Web Serial API requires localhost access`);
            this.connectBtn.disabled = true;
            return false;
        }
        
        this.log('Web Serial API support confirmed');
        return true;
    }
    
    initializeEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.statusBtn.addEventListener('click', () => this.requestStatus());
    }
    
    async connect() {
        try {
            this.clearError();
            this.log('Attempting to connect...');
            
            // Double-check support before attempting connection
            if (!this.checkWebSerialSupport()) {
                return;
            }
            
            this.log('Requesting serial port...');
            
            // Request a port and open a connection
            this.port = await navigator.serial.requestPort();
            
            this.log('Opening connection at 115200 baud...');
            await this.port.open({ baudRate: 115200 });
            
            // Set up reader and writer
            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            
            this.isConnected = true;
            this.updateConnectionStatus();
            
            this.log('Connected successfully!');
            
            // Start reading responses
            this.startReading();
            
            // Send initial commands to wake up Grbl
            await this.sendCommand('\r\n\r\n');
            await this.delay(100);
            await this.sendCommand('$X'); // Unlock Grbl
            await this.delay(100);
            await this.requestStatus();
            
        } catch (error) {
            this.showError(`Connection failed: ${error.message}`);
            this.log(`Error: ${error.message}`);
            
            // Provide more specific error messages
            if (error.name === 'NotFoundError') {
                this.showError('No serial ports found or user cancelled port selection.');
            } else if (error.name === 'SecurityError') {
                this.showError('Security error: Web Serial API may not be available in this context.');
            } else if (error.name === 'NotAllowedError') {
                this.showError('Permission denied: User did not grant access to serial port.');
            }
        }
    }
    
    async disconnect() {
        try {
            if (this.reader) {
                await this.reader.cancel();
                await this.reader.releaseLock();
                this.reader = null;
            }
            
            if (this.writer) {
                await this.writer.releaseLock();
                this.writer = null;
            }
            
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            
            this.isConnected = false;
            this.messageBuffer = ''; // Clear buffer on disconnect
            this.updateConnectionStatus();
            this.log('Disconnected');
            
        } catch (error) {
            this.showError(`Disconnect failed: ${error.message}`);
        }
    }
    
    async startReading() {
        try {
            while (this.port && this.port.readable && this.isConnected) {
                const { value, done } = await this.reader.read();
                if (done) break;
                
                const text = new TextDecoder().decode(value);
                this.log(`← ${text.trim()}`);
                
                // Add to buffer and process complete messages
                this.messageBuffer += text;
                this.processBuffer();
            }
        } catch (error) {
            if (this.isConnected) {
                this.log(`Read error: ${error.message}`);
            }
        }
    }
    
    processBuffer() {
        let lines = this.messageBuffer.split('\n');
        
        // Keep the last line in buffer (might be incomplete)
        this.messageBuffer = lines.pop() || '';
        
        // Process complete lines
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                this.parseResponse(trimmed);
            }
        }
        
        // Also check for complete status messages that might not end with newline
        const statusMatch = this.messageBuffer.match(/<[^>]*>/);
        if (statusMatch) {
            this.parseResponse(statusMatch[0]);
            this.messageBuffer = this.messageBuffer.replace(statusMatch[0], '');
        }
    }
    
    async sendCommand(command) {
        if (!this.writer || !this.isConnected) {
            this.showError('Not connected to CNC');
            return;
        }
        
        try {
            const data = new TextEncoder().encode(command + '\n');
            await this.writer.write(data);
            this.log(`→ ${command}`);
        } catch (error) {
            this.showError(`Send failed: ${error.message}`);
        }
    }
    
    async requestStatus() {
        await this.sendCommand('?');
    }
    
    parseResponse(response) {
        const trimmed = response.trim();
        
        // Parse Grbl status report format: <State|WPos:0.000,0.000,0.000|...>
        if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
            const statusData = trimmed.slice(1, -1); // Remove < >
            const parts = statusData.split('|');
            
            if (parts.length > 0) {
                // Machine state (Idle, Run, Hold, etc.)
                this.machineState.textContent = parts[0];
                
                // Parse work position or machine position
                for (const part of parts) {
                    if (part.startsWith('WPos:') || part.startsWith('MPos:')) {
                        const coords = part.substring(5).split(',');
                        if (coords.length >= 3) {
                            this.xPosition.textContent = parseFloat(coords[0]).toFixed(3);
                            this.yPosition.textContent = parseFloat(coords[1]).toFixed(3);
                            this.zPosition.textContent = parseFloat(coords[2]).toFixed(3);
                        }
                    }
                }
            }
        }
        
        // Handle other responses
        if (trimmed === 'ok') {
            // Command completed successfully
        } else if (trimmed.startsWith('error:')) {
            this.showError(`CNC Error: ${trimmed}`);
        } else if (trimmed.startsWith('Grbl')) {
            this.log(`System info: ${trimmed}`);
        }
    }
    
    updateConnectionStatus() {
        if (this.isConnected) {
            this.statusIndicator.classList.add('connected');
            this.statusText.textContent = 'Connected';
            this.connectBtn.disabled = true;
            this.disconnectBtn.disabled = false;
            this.statusBtn.disabled = false;
        } else {
            this.statusIndicator.classList.remove('connected');
            this.statusText.textContent = 'Disconnected';
            this.connectBtn.disabled = false;
            this.disconnectBtn.disabled = true;
            this.statusBtn.disabled = true;
            
            // Reset status display
            this.machineState.textContent = 'Unknown';
            this.xPosition.textContent = '0.000';
            this.yPosition.textContent = '0.000';
            this.zPosition.textContent = '0.000';
        }
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logElement.textContent += `[${timestamp}] ${message}\n`;
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }
    
    showError(message) {
        this.errorContainer.innerHTML = `<div class="error">${message}</div>`;
    }
    
    clearError() {
        this.errorContainer.innerHTML = '';
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CNCSerial();
});
