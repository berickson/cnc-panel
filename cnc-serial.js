class CNCSerial {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.is_connected = false;
    this.message_buffer = '';
    this.last_activity_time = 0;
    this.activity_check_interval = null;
    this.pending_commands = new Set(); // Track commands we sent
    this.final_status_timeout = null; // For delayed final status request
    
    // UI elements
    this.connect_button = document.getElementById('connect_button');
    this.disconnect_button = document.getElementById('disconnect_button');
    this.status_button = document.getElementById('status_button');
    this.status_indicator = document.getElementById('status_indicator');
    this.status_text = document.getElementById('status_text');
    this.log_element = document.getElementById('communication_log');
    this.error_container = document.getElementById('error_container');
    this.copy_log_button = document.getElementById('copy_log_button');
    
    // Manual control elements
    this.emergency_stop_button = document.getElementById('emergency_stop_button');
    this.step_size_input = document.getElementById('step_size_input');
    this.step_01_button = document.getElementById('step_01_button');
    this.step_1_button = document.getElementById('step_1_button');
    this.step_10_button = document.getElementById('step_10_button');
    
    // Jog buttons
    this.jog_x_plus_button = document.getElementById('jog_x_plus_button');
    this.jog_x_minus_button = document.getElementById('jog_x_minus_button');
    this.jog_y_plus_button = document.getElementById('jog_y_plus_button');
    this.jog_y_minus_button = document.getElementById('jog_y_minus_button');
    this.jog_z_plus_button = document.getElementById('jog_z_plus_button');
    this.jog_z_minus_button = document.getElementById('jog_z_minus_button');
    
    // Home buttons
    this.home_all_button = document.getElementById('home_all_button');
    this.home_x_button = document.getElementById('home_x_button');
    this.home_y_button = document.getElementById('home_y_button');
    this.home_z_button = document.getElementById('home_z_button');
    
    // Status elements
    this.machine_state = document.getElementById('machine_state');
    this.x_position = document.getElementById('x_position');
    this.y_position = document.getElementById('y_position');
    this.z_position = document.getElementById('z_position');
    
    // Log initialization info
    this.log(`CNC Panel initialized`);
    this.log(`Current URL: ${window.location.href}`);
    this.log(`Hostname: ${window.location.hostname}`);
    this.log(`Protocol: ${window.location.protocol}`);
    this.log(`Secure context: ${window.isSecureContext}`);
    this.log(`User agent: ${navigator.userAgent}`);
    
    this.initialize_event_listeners();
    this.check_web_serial_support();
  }
  
  check_web_serial_support() {
    this.log('Checking Web Serial API support...');
    
    if (!('serial' in navigator)) {
      this.show_error('Web Serial API not supported. Please use Chrome or Edge browser.');
      this.log('ERROR: Web Serial API not found in navigator object');
      this.connect_button.disabled = true;
      return false;
    }
    
    // Check if we're in a secure context
    if (!window.isSecureContext) {
      this.show_error('Web Serial API requires a secure context (HTTPS or localhost).');
      this.log('ERROR: Not in secure context');
      this.connect_button.disabled = true;
      return false;
    }
    
    // Check if we're accessing from localhost/same origin
    const is_localhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '';
    
    if (!is_localhost) {
      this.show_error('Web Serial API requires the page to be accessed from the same computer as the CNC. Please open this page directly on the computer connected to the CNC.');
      this.log(`ERROR: Accessing from ${window.location.hostname}, but Web Serial API requires localhost access`);
      this.connect_button.disabled = true;
      return false;
    }
    
    this.log('Web Serial API support confirmed');
    return true;
  }
  
  initialize_event_listeners() {
    this.connect_button.addEventListener('click', () => this.connect());
    this.disconnect_button.addEventListener('click', () => this.disconnect());
    this.status_button.addEventListener('click', () => this.request_status());
    this.copy_log_button.addEventListener('click', () => this.copy_log());
    
    // Emergency stop
    this.emergency_stop_button.addEventListener('click', () => this.emergency_stop());
    
    // Step size controls
    this.step_01_button.addEventListener('click', () => this.set_step_size(0.1));
    this.step_1_button.addEventListener('click', () => this.set_step_size(1));
    this.step_10_button.addEventListener('click', () => this.set_step_size(10));
    
    // Jog controls
    this.jog_x_plus_button.addEventListener('click', () => this.jog('X', '+'));
    this.jog_x_minus_button.addEventListener('click', () => this.jog('X', '-'));
    this.jog_y_plus_button.addEventListener('click', () => this.jog('Y', '+'));
    this.jog_y_minus_button.addEventListener('click', () => this.jog('Y', '-'));
    this.jog_z_plus_button.addEventListener('click', () => this.jog('Z', '+'));
    this.jog_z_minus_button.addEventListener('click', () => this.jog('Z', '-'));
    
    // Home controls
    this.home_all_button.addEventListener('click', () => this.home_all());
    this.home_x_button.addEventListener('click', () => this.home_axis('X'));
    this.home_y_button.addEventListener('click', () => this.home_axis('Y'));
    this.home_z_button.addEventListener('click', () => this.home_axis('Z'));
  }
  
  async connect() {
    try {
      this.clear_error();
      this.log('Attempting to connect...');
      
      // Double-check support before attempting connection
      if (!this.check_web_serial_support()) {
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
      
      this.is_connected = true;
      this.update_connection_status();
      
      this.log('Connected successfully!');
      
      // Start reading responses
      this.start_reading();
      
      // Send initial commands to wake up Grbl
      await this.send_command('\r\n\r\n');
      await this.delay(100);
      await this.send_command('$X'); // Unlock Grbl
      await this.delay(100);
      
      // Enable real-time status reports (send status on machine state changes)
      await this.send_command('$10=1'); // Status report mask - enable WPos reporting
      await this.delay(100);
      
      await this.request_status(); // Get initial status
      
      // Check for activity every 500ms and request status if there was recent activity
      this.activity_check_interval = setInterval(() => {
        const now = Date.now();
        if (this.is_connected && (now - this.last_activity_time) < 1000 && (now - this.last_activity_time) > 100) {
          this.request_status();
        }
      }, 500);
      
      this.log('Connected - monitoring for activity');
      
    } catch (error) {
      this.show_error(`Connection failed: ${error.message}`);
      this.log(`Error: ${error.message}`);
      
      // Provide more specific error messages
      if (error.name === 'NotFoundError') {
        this.show_error('No serial ports found or user cancelled port selection.');
      } else if (error.name === 'SecurityError') {
        this.show_error('Security error: Web Serial API may not be available in this context.');
      } else if (error.name === 'NotAllowedError') {
        this.show_error('Permission denied: User did not grant access to serial port.');
      }
    }
  }
  
  async disconnect() {
    try {
      // Clear any pending final status request
      if (this.final_status_timeout) {
        clearTimeout(this.final_status_timeout);
        this.final_status_timeout = null;
      }
      
      // Stop activity monitoring
      if (this.activity_check_interval) {
        clearInterval(this.activity_check_interval);
        this.activity_check_interval = null;
      }
      
      // Stop status polling
      if (this.status_interval) {
        clearInterval(this.status_interval);
        this.status_interval = null;
      }
      
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
      
      this.is_connected = false;
      this.message_buffer = '';
      this.update_connection_status();
      this.log('Disconnected');
      
    } catch (error) {
      this.show_error(`Disconnect failed: ${error.message}`);
    }
  }
  
  async start_reading() {
    try {
      while (this.port && this.port.readable && this.is_connected) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        this.log(`← ${text.trim()}`);
        
        // Add to buffer and process complete messages
        this.message_buffer += text;
        this.process_buffer();
      }
    } catch (error) {
      if (this.is_connected) {
        this.log(`Read error: ${error.message}`);
      }
    }
  }
  
  process_buffer() {
    let lines = this.message_buffer.split('\n');
    
    // Keep the last line in buffer (might be incomplete)
    this.message_buffer = lines.pop() || '';
    
    // Process complete lines
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        this.parse_response(trimmed);
      }
    }
    
    // Also check for complete status messages that might not end with newline
    const status_match = this.message_buffer.match(/<[^>]*>/);
    if (status_match) {
      this.parse_response(status_match[0]);
      this.message_buffer = this.message_buffer.replace(status_match[0], '');
    }
  }
  
  async send_command(command) {
    if (!this.writer || !this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    try {
      const data = new TextEncoder().encode(command + '\n');
      await this.writer.write(data);
      this.log(`→ ${command}`);
      
      // Track this command so we can ignore its "ok" response
      this.pending_commands.add(command);
    } catch (error) {
      this.show_error(`Send failed: ${error.message}`);
    }
  }
  
  async request_status() {
    await this.send_command('?');
  }
  
  parse_response(response) {
    const trimmed = response.trim();
    
    // Handle "ok" responses - check if this is from our own command or external activity
    if (trimmed === 'ok') {
      if (this.pending_commands.size > 0) {
        // This "ok" is likely from our own command - remove oldest pending command
        const oldest_command = this.pending_commands.values().next().value;
        this.pending_commands.delete(oldest_command);
      } else {
        // This "ok" is from external activity (manual jogging)
        this.last_activity_time = Date.now();
        
        // Schedule a final status request 500ms after activity stops
        if (this.final_status_timeout) {
          clearTimeout(this.final_status_timeout);
        }
        this.final_status_timeout = setTimeout(() => {
          if (this.is_connected) {
            this.request_status();
          }
        }, 500);
      }
    }
    
    // Track activity for other non-status responses
    if (!trimmed.startsWith('<') && 
        !trimmed.endsWith('>') && 
        trimmed !== 'ok' && 
        !trimmed.startsWith('Grbl')) {
      this.last_activity_time = Date.now();
    }
    
    // Parse Grbl status report format: <State|WPos:0.000,0.000,0.000|...>
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      const status_data = trimmed.slice(1, -1); // Remove < >
      const parts = status_data.split('|');
      
      if (parts.length > 0) {
        // Machine state (Idle, Run, Hold, etc.)
        this.machine_state.textContent = parts[0];
        
        // Parse work position or machine position
        for (const part of parts) {
          if (part.startsWith('WPos:') || part.startsWith('MPos:')) {
            const coords = part.substring(5).split(',');
            if (coords.length >= 3) {
              this.x_position.textContent = parseFloat(coords[0]).toFixed(3);
              this.y_position.textContent = parseFloat(coords[1]).toFixed(3);
              this.z_position.textContent = parseFloat(coords[2]).toFixed(3);
            }
          }
        }
      }
    }
    
    // Handle other responses
    if (trimmed === 'ok') {
      // Command completed successfully
    } else if (trimmed.startsWith('error:')) {
      this.show_error(`CNC Error: ${trimmed}`);
    } else if (trimmed.startsWith('Grbl')) {
      this.log(`System info: ${trimmed}`);
    }
  }
  
  update_connection_status() {
    if (this.is_connected) {
      this.status_indicator.classList.add('connected');
      this.status_text.textContent = 'Connected';
      this.connect_button.disabled = true;
      this.disconnect_button.disabled = false;
      this.status_button.disabled = false;
      
      // Enable manual controls when connected
      this.emergency_stop_button.disabled = false;
      this.enable_jog_controls(true);
    } else {
      this.status_indicator.classList.remove('connected');
      this.status_text.textContent = 'Disconnected';
      this.connect_button.disabled = false;
      this.disconnect_button.disabled = true;
      this.status_button.disabled = true;
      
      // Disable manual controls when disconnected
      this.emergency_stop_button.disabled = true;
      this.enable_jog_controls(false);
      
      // Reset status display
      this.machine_state.textContent = 'Unknown';
      this.x_position.textContent = '0.000';
      this.y_position.textContent = '0.000';
      this.z_position.textContent = '0.000';
    }
  }
  
  enable_jog_controls(enabled) {
    this.jog_x_plus_button.disabled = !enabled;
    this.jog_x_minus_button.disabled = !enabled;
    this.jog_y_plus_button.disabled = !enabled;
    this.jog_y_minus_button.disabled = !enabled;
    this.jog_z_plus_button.disabled = !enabled;
    this.jog_z_minus_button.disabled = !enabled;
    this.home_all_button.disabled = !enabled;
    this.home_x_button.disabled = !enabled;
    this.home_y_button.disabled = !enabled;
    this.home_z_button.disabled = !enabled;
  }
  
  emergency_stop() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('EMERGENCY STOP triggered');
    // Send immediate halt command (real-time command, doesn't need \n)
    if (this.writer) {
      this.writer.write(new TextEncoder().encode('!'));
      this.log('→ ! (Emergency Stop)');
    }
  }
  
  set_step_size(size) {
    this.step_size_input.value = size;
  }
  
  get_step_size() {
    return parseFloat(this.step_size_input.value) || 1;
  }
  
  async jog(axis, direction) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    const step_size = this.get_step_size();
    const distance = direction === '+' ? step_size : -step_size;
    const command = `$J=G91${axis}${distance}F1000`;
    
    await this.send_command(command);
  }
  
  async home_all() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Starting home all axes...');
    await this.send_command('$H');
  }
  
  async home_axis(axis) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log(`Starting home ${axis} axis...`);
    await this.send_command(`$H${axis}`);
  }
  
  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.log_element.textContent += `[${timestamp}] ${message}\n`;
    this.log_element.scrollTop = this.log_element.scrollHeight;
  }
  
  show_error(message) {
    this.error_container.innerHTML = `<div class="error">${message}</div>`;
  }
  
  clear_error() {
    this.error_container.innerHTML = '';
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  copy_log() {
    navigator.clipboard.writeText(this.log_element.textContent).then(() => {
      // Temporarily change button text to show success
      const original_text = this.copy_log_button.textContent;
      this.copy_log_button.textContent = 'Copied!';
      setTimeout(() => {
        this.copy_log_button.textContent = original_text;
      }, 1000);
    }).catch(err => {
      this.show_error('Failed to copy log: ' + err.message);
    });
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  new CNCSerial();
});
